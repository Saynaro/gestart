import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import ToastNotification from "../components/ToastNotification";
import "../HomePage/Homepage.css";
import "./PlanningPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import EventCalendar from "../components/EventCalendar";
import MobilePlanningView from "./MobilePlanningView";
import { 
    ChevronLeft, ChevronRight, Plus, ChevronDown, X, User, Building, 
    Briefcase, Clock, ArrowLeft, Search, AlertTriangle, Trash2, Calendar, 
    MapPin, FileText, Check, History, CheckCircle2, Camera, PenTool, 
    ExternalLink, Filter, ArrowUpDown, Sparkles, Lock
} from "lucide-react";
import InterventionDetailModal, { getInterventionStatusInfo } from "../ClientPage/components/InterventionDetailModal";
import { getSocket } from "../utils/socket";
import { useSubscription } from "../utils/useSubscription";

// ── Responsive hook ──────────────────────────────────────────────
function useWindowWidth() {
    const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
    useEffect(() => {
        const handler = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);
    return width;
}

const AVAILABLE_SERVICE_TYPES = [
    "Installation",
    "Entretien",
    "Dépannage",
    "Nettoyage",
    "Contrôle",
    "Ramonage",
    "Mise en service"
];

const STATUS_OPTIONS = [
    { value: "all", label: "Tous les statuts", icon: Filter, color: "var(--muted-foreground)" },
    { value: "COMPLETED", label: "Terminé", icon: CheckCircle2, color: "#16A34A" },
    { value: "LATE", label: "En retard", icon: AlertTriangle, color: "#EA580C" },
    { value: "IN_PROGRESS", label: "En travail", icon: Clock, color: "#2563EB" },
    { value: "ARRIVED", label: "Arrivé sur place", icon: MapPin, color: "#7C3AED" },
    { value: "SCHEDULED", label: "En attente", icon: Calendar, color: "#556B2F" },
];

const getItemEffectiveStatus = (item, startOfToday) => {
    if (!item) return "SCHEDULED";
    const status = item.status || "SCHEDULED";
    if (status === "COMPLETED") return "COMPLETED";
    if (status === "CANCELLED") return "CANCELLED";
    if (status === "IN_PROGRESS") return "IN_PROGRESS";
    if (status === "ARRIVED") return "ARRIVED";

    // Item is SCHEDULED or PENDING
    const schedTime = item.scheduledAt ? new Date(item.scheduledAt).getTime() : 0;
    if (schedTime > 0 && schedTime < startOfToday) {
        return "LATE"; // En retard
    }
    return "SCHEDULED"; // En attente
};

const isStatusDisabledForPeriod = (statusValue, period, count) => {
    if (statusValue === "all") return false;
    if (period === "upcoming") {
        if (statusValue === "COMPLETED" || statusValue === "LATE" || statusValue === "ARRIVED" || statusValue === "IN_PROGRESS") {
            return true;
        }
    }
    if (period === "past") {
        if (statusValue === "SCHEDULED" && count === 0) {
            return true;
        }
    }
    return count === 0;
};

// ── Initial data ─────────────────────────────────────────────────
const initialEvents = [];

const getGroupedClients = (list) => {
    const grouped = {};
    (list || []).forEach(c => {
        if (!c || !c.name) return;
        const letter = c.name.charAt(0).toUpperCase();
        if (!grouped[letter]) {
            grouped[letter] = [];
        }
        grouped[letter].push(c);
    });
    return Object.keys(grouped).sort().reduce((acc, key) => {
        acc[key] = grouped[key];
        return acc;
    }, {});
};

import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { useUser } from "../utils/useUser";

// Module-level in-memory cache for instant (0ms) page switching
let cachedEventsData = null;
let cachedRawInterventionsData = null;
let cachedClientsData = null;
let cachedTechniciansData = null;

function PlanningPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const windowWidth = useWindowWidth();
    const isMobile = windowWidth <= 768;
    const { role } = useUser();
    const { isExpired } = useSubscription();
    const isTechnician = role === "TECHNICIAN";

    const addModalDragControls = useDragControls();
    const editModalDragControls = useDragControls();
    const [toast, setToast] = useState(null);

    const [events, setEvents] = useState(() => cachedEventsData || []);
    const [rawInterventions, setRawInterventions] = useState(() => cachedRawInterventionsData || []);
    const [clientDetails, setClientDetails] = useState(() => cachedClientsData || []);
    const [techniciansList, setTechniciansList] = useState(() => cachedTechniciansData || []);
    const [loading, setLoading] = useState(() => !cachedEventsData);

    const [activePlanningTab, setActivePlanningTab] = useState("calendar"); // "calendar" | "past"
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDetailIntervention, setSelectedDetailIntervention] = useState(null);

    // Past / History Filters
    const [historyPeriod, setHistoryPeriod] = useState("past"); // "past" | "all" | "upcoming" | "today"
    const [historyClientFilter, setHistoryClientFilter] = useState("all");
    const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
    const [historySort, setHistorySort] = useState("desc"); // "desc" | "asc"
    const [historySearch, setHistorySearch] = useState("");
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const statusDropdownRef = useRef(null);
    const autoOpenedRef = useRef(false);
    const returnUrlRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
                setStatusDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [statusDropdownOpen]);

    // Auto open intervention modal if navigated from Client details with preselected client
    useEffect(() => {
        if ((location.state?.clientId || location.state?.clientName) && !autoOpenedRef.current) {
            autoOpenedRef.current = true;
            if (isExpired) {
                navigate(location.pathname, { replace: true, state: {} });
                window.dispatchEvent(new CustomEvent('subscription_expired', {
                    detail: { message: "Votre abonnement a expiré. Pour planifier une intervention, veuillez renouveler votre abonnement." }
                }));
                return;
            }
            const targetClientId = location.state.clientId || "";
            const targetClientName = location.state.clientName || "";
            const targetServiceType = location.state.serviceType;
            const targetReturnUrl = location.state.returnUrl || (targetClientId ? `/client?id=${targetClientId}` : null);
            returnUrlRef.current = targetReturnUrl;

            // Clear location.state so closing modal or subsequent re-renders won't re-trigger it
            navigate(location.pathname, { replace: true, state: {} });

            const calendarApi = calendarRef.current?.getApi();
            const currentDate = calendarApi ? calendarApi.getDate() : new Date();
            const start = new Date(currentDate);
            start.setHours(9, 0, 0, 0);
            const end = new Date(start);
            end.setHours(10, 30, 0, 0);
            const pad = (n) => String(n).padStart(2, "0");
            const fmt = (d) =>
                `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
            setSelectedSlot({ start, end, startStr: fmt(start), endStr: fmt(end) });
            setNewDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
            setStartTime("09:00");
            setEndTime("10:30");
            setNewClientId(targetClientId);
            setNewClientName(targetClientName);
            setNewServiceTypes(targetServiceType ? [targetServiceType] : ["Entretien"]);
            setNewTechnicianId("");
            const matched = clientDetails.find(c => c.id === targetClientId || c.name === targetClientName);
            setNewAddress(matched?.rawAddress || matched?.address || "");
            setNewNotes("");
            setShowAddModal(true);

            // Fetch client directly if not already present or address is missing
            if (targetClientId && (!matched || !matched.address)) {
                apiFetch(`/v1/clients/${targetClientId}`)
                    .then(res => {
                        const cl = res.data?.client || res.client || res.data;
                        if (cl) {
                            const addr = `${cl.address || ''} ${cl.city || ''}`.trim() || cl.address || "";
                            if (addr) setNewAddress(addr);
                            const cName = cl.companyName || `${cl.firstName || ''} ${cl.lastName || ''}`.trim();
                            if (cName) setNewClientName(cName);
                        }
                    })
                    .catch(() => {});
            }
        }
    }, [location.state, clientDetails]);

    const fetchInterventions = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const data = await apiFetch('/v1/interventions?limit=200');
            const rawList = data.data?.interventions || data.interventions || (Array.isArray(data) ? data : []);
            cachedRawInterventionsData = rawList;
            setRawInterventions(rawList);
            const mappedEvents = rawList
                .filter(item => item.status !== 'CANCELLED')
                .map(item => {
                    const clientDisplayName = item.client
                        ? (item.client.companyName || `${item.client.firstName || ''} ${item.client.lastName || ''}`.trim())
                        : (item.title || "Intervention");

                    return {
                        id: String(item.id),
                        title: clientDisplayName,
                        start: item.scheduledAt || item.start || new Date().toISOString(),
                        end: item.end || (item.scheduledAt ? new Date(new Date(item.scheduledAt).getTime() + (item.estimatedDuration || 90) * 60000).toISOString() : new Date().toISOString()),
                        extendedProps: {
                            type: item.interventionType?.name || item.type || "Installation",
                            technicianId: item.technicianId || item.technician?.id || "",
                            technician: item.technician ? `${item.technician.firstName || ''} ${item.technician.lastName || ''}`.trim() || item.technician.email : (item.technicianName || "Non assigné"),
                            address: item.address || item.client?.address || "",
                            city: item.city || item.client?.city || "",
                            clientId: item.clientId,
                            description: item.description || "",
                            status: item.status,
                            raw: item
                        }
                    };
                });
            cachedEventsData = mappedEvents;
            setEvents(mappedEvents);
        } catch (err) {
            console.warn("API interventions non disponible:", err.message);
            if (!isBackground && !cachedEventsData) setEvents([]);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const data = await apiFetch('/v1/clients?limit=500');
            const list = data.data?.clients || data.clients || (Array.isArray(data) ? data : []);
            if (list.length > 0) {
                const mapped = list.map(c => ({
                    id: c.id,
                    name: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                    type: c.type === 'COMPANY' || c.companyName ? "Organisation" : "Particulier",
                    email: c.email || "",
                    address: `${c.address || ''} ${c.city || ''}`.trim(),
                    rawAddress: c.address || "",
                    city: c.city || "",
                    phone: c.phone || ""
                })).sort((a, b) => a.name.localeCompare(b.name));
                cachedClientsData = mapped;
                setClientDetails(mapped);
            }
        } catch (err) {
            console.warn("API clients non disponible:", err.message);
        }
    };

    const fetchTechnicians = async () => {
        try {
            const usersData = await apiFetch("/v1/users");
            const userList = usersData.data?.users || usersData.users || (Array.isArray(usersData) ? usersData : []);
            const activeMembers = userList.filter(u => u.isActive !== false);
            cachedTechniciansData = activeMembers;
            setTechniciansList(activeMembers);
        } catch (err) {
            console.warn("API techniciens non disponible:", err.message);
        }
    };

    useEffect(() => {
        fetchInterventions(!!cachedEventsData);
        fetchClients();
        fetchTechnicians();
    }, []);

    // Socket.io real-time updates for interventions
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleSocketRefresh = () => {
            fetchInterventions();
        };

        socket.on("intervention:updated", handleSocketRefresh);
        socket.on("intervention:new", handleSocketRefresh);
        socket.on("intervention:deleted", handleSocketRefresh);

        return () => {
            socket.off("intervention:updated", handleSocketRefresh);
            socket.off("intervention:new", handleSocketRefresh);
            socket.off("intervention:deleted", handleSocketRefresh);
        };
    }, []);

    const filteredHistoryInterventions = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = startOfToday + 86400000;

        return (rawInterventions || []).filter(item => {
            if (historyStatusFilter !== "CANCELLED" && item.status === "CANCELLED") return false;

            const schedTime = item.scheduledAt ? new Date(item.scheduledAt).getTime() : 0;
            if (historyPeriod === "past") {
                const isPast = item.status === "COMPLETED" || (schedTime > 0 && schedTime < startOfToday);
                if (!isPast) return false;
            } else if (historyPeriod === "upcoming") {
                const isUpcoming = schedTime >= startOfToday && item.status !== "COMPLETED";
                if (!isUpcoming) return false;
            } else if (historyPeriod === "today") {
                const isToday = schedTime >= startOfToday && schedTime < endOfToday;
                if (!isToday) return false;
            }

            if (historyClientFilter !== "all" && item.clientId !== historyClientFilter) {
                return false;
            }

            if (historyStatusFilter !== "all") {
                const effStatus = getItemEffectiveStatus(item, startOfToday);
                if (effStatus !== historyStatusFilter) {
                    return false;
                }
            }

            if (historySearch.trim()) {
                const q = historySearch.toLowerCase();
                const clientName = item.client 
                    ? `${item.client.firstName || ''} ${item.client.lastName || ''} ${item.client.companyName || ''}`.toLowerCase() 
                    : "";
                const title = (item.title || "").toLowerCase();
                const address = (item.address || "").toLowerCase();
                const tech = item.technician 
                    ? `${item.technician.firstName || ''} ${item.technician.lastName || ''}`.toLowerCase() 
                    : "";
                if (!clientName.includes(q) && !title.includes(q) && !address.includes(q) && !tech.includes(q)) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
            const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
            return historySort === "asc" ? timeA - timeB : timeB - timeA;
        });
    }, [rawInterventions, historyPeriod, historyClientFilter, historyStatusFilter, historySort, historySearch]);

    const periodCounts = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = startOfToday + 86400000;

        let past = 0;
        let upcoming = 0;
        let today = 0;
        let total = 0;

        (rawInterventions || []).forEach(item => {
            if (item.status === "CANCELLED") return;
            total++;
            const schedTime = item.scheduledAt ? new Date(item.scheduledAt).getTime() : 0;
            if (item.status === "COMPLETED" || (schedTime > 0 && schedTime < startOfToday)) {
                past++;
            }
            if (schedTime >= startOfToday && item.status !== "COMPLETED") {
                upcoming++;
            }
            if (schedTime >= startOfToday && schedTime < endOfToday) {
                today++;
            }
        });

        return { past, all: total, upcoming, today };
    }, [rawInterventions]);

    // Calculate real-time counts for each status within the current period
    const statusCounts = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = startOfToday + 86400000;

        const pool = (rawInterventions || []).filter(item => {
            if (item.status === "CANCELLED") return false;

            const schedTime = item.scheduledAt ? new Date(item.scheduledAt).getTime() : 0;
            if (historyPeriod === "past") {
                const isPast = item.status === "COMPLETED" || (schedTime > 0 && schedTime < startOfToday);
                if (!isPast) return false;
            } else if (historyPeriod === "upcoming") {
                const isUpcoming = schedTime >= startOfToday && item.status !== "COMPLETED";
                if (!isUpcoming) return false;
            } else if (historyPeriod === "today") {
                const isToday = schedTime >= startOfToday && schedTime < endOfToday;
                if (!isToday) return false;
            }

            if (historyClientFilter !== "all" && item.clientId !== historyClientFilter) {
                return false;
            }

            return true;
        });

        const counts = {
            all: pool.length,
            COMPLETED: 0,
            LATE: 0,
            IN_PROGRESS: 0,
            ARRIVED: 0,
            SCHEDULED: 0,
        };

        pool.forEach(item => {
            const eff = getItemEffectiveStatus(item, startOfToday);
            if (counts[eff] !== undefined) {
                counts[eff]++;
            }
        });

        return counts;
    }, [rawInterventions, historyPeriod, historyClientFilter]);

    // Handle period change with smart status auto-reset
    const handlePeriodChange = (newPeriod) => {
        setHistoryPeriod(newPeriod);

        // If current status is not applicable for new period, reset to 'all'
        if (newPeriod === "upcoming" && (historyStatusFilter === "COMPLETED" || historyStatusFilter === "LATE" || historyStatusFilter === "IN_PROGRESS" || historyStatusFilter === "ARRIVED")) {
            setHistoryStatusFilter("all");
        } else if (newPeriod === "past" && historyStatusFilter === "SCHEDULED") {
            setHistoryStatusFilter("all");
        }
    };

    // Auto-safeguard: if current status filter is disabled for this period, reset to 'all'
    useEffect(() => {
        if (historyStatusFilter !== "all") {
            const count = statusCounts[historyStatusFilter] ?? 0;
            if (isStatusDisabledForPeriod(historyStatusFilter, historyPeriod, count)) {
                setHistoryStatusFilter("all");
            }
        }
    }, [historyPeriod, statusCounts, historyStatusFilter]);

    const [mobileSelectedDate, setMobileSelectedDate] = useState(() => new Date());
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:30");
    const [typeFilter, setTypeFilter] = useState("Tous");
    const [currentTitle, setCurrentTitle] = useState("");
    const [currentView, setCurrentView] = useState("timeGridWeek");
    const calendarRef = useRef(null);

    // Modal state — add
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [newDate, setNewDate] = useState(() => {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const [newClientId, setNewClientId] = useState("");
    const [newClientName, setNewClientName] = useState("");
    const [newServiceTypes, setNewServiceTypes] = useState([]);
    const [showAddCustomType, setShowAddCustomType] = useState(false);
    const [addCustomTypeInput, setAddCustomTypeInput] = useState("");
    const [newTechnicianId, setNewTechnicianId] = useState("");
    const [newAddress, setNewAddress] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const addCustomTypeInputRef = useRef(null);
    const editCustomTypeInputRef = useRef(null);

    const scrollToCustomInput = (inputEl) => {
        if (!inputEl) return;
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 320);
    };

    // Modal state — edit
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editDate, setEditDate] = useState(() => {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const [editClientId, setEditClientId] = useState("");
    const [editClientName, setEditClientName] = useState("");
    const [editServiceTypes, setEditServiceTypes] = useState([]);
    const [showEditCustomType, setShowEditCustomType] = useState(false);
    const [editCustomTypeInput, setEditCustomTypeInput] = useState("");
    const [editTechnicianId, setEditTechnicianId] = useState("");
    const [editAddress, setEditAddress] = useState("");
    const [editNotes, setEditNotes] = useState("");

    const [showClientSearch, setShowClientSearch] = useState(false);
    const [clientSearchTarget, setClientSearchTarget] = useState("add"); // "add" or "edit"
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [pendingClientName, setPendingClientName] = useState(""); // highlighted but not yet confirmed
    const [pendingClientId, setPendingClientId] = useState("");

    // Confirmation dialog state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Dynamic duration calculation
    const durationText = useMemo(() => {
        if (!startTime || !endTime) return "";
        const [startH, startM] = startTime.split(":").map(Number);
        const [endH, endM] = endTime.split(":").map(Number);
        if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return "";
        const diff = (endH * 60 + endM) - (startH * 60 + startM);
        if (diff <= 0) return "";
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        if (h > 0 && m > 0) return `${h}h ${m}min`;
        if (h > 0) return `${h}h`;
        return `${m}min`;
    }, [startTime, endTime]);

    // Auto-sync address when client is chosen
    useEffect(() => {
        if (showAddModal && (newClientId || newClientName)) {
            const matched = clientDetails.find(c => (newClientId && c.id === newClientId) || (newClientName && c.name === newClientName));
            if (matched) {
                const addr = matched.address || matched.rawAddress || "";
                if (addr) setNewAddress(addr);
            }
        }
    }, [newClientId, newClientName, clientDetails, showAddModal]);

    useEffect(() => {
        if (showEditModal && (editClientId || editClientName)) {
            const matched = clientDetails.find(c => (editClientId && c.id === editClientId) || (editClientName && c.name === editClientName));
            if (matched && !editAddress) {
                const addr = matched.address || matched.rawAddress || "";
                if (addr) setEditAddress(addr);
            }
        }
    }, [editClientId, editClientName, clientDetails, showEditModal]);

    // Disable page scrolling when modal or client search is open
    useEffect(() => {
        if (showAddModal || showEditModal || showClientSearch || showDeleteConfirm) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showAddModal, showEditModal, showClientSearch, showDeleteConfirm]);

    // ── iOS back button / swipe-right gesture ─────────────────────
    // Push a history entry for each modal layer so that the native
    // back gesture pops them in the right order on iPhone Safari.
    useEffect(() => {
        if (!isMobile) return;

        if (showClientSearch) {
            // Client search is the top layer — push its own entry
            window.history.pushState({ modal: "clientSearch" }, "");
        } else if (showAddModal) {
            window.history.pushState({ modal: "add" }, "");
        } else if (showEditModal) {
            window.history.pushState({ modal: "edit" }, "");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAddModal, showEditModal, showClientSearch, isMobile]);

    useEffect(() => {
        if (!isMobile) return;

        const handlePopState = (e) => {
            // iOS back / swipe triggered — close the topmost layer
            if (showClientSearch) {
                // Go back to the add/edit modal
                setShowClientSearch(false);
                setClientSearchQuery("");
                setPendingClientName("");
                // Keep the underlying modal open — no need to push anything,
                // the popstate already consumed one entry.
            } else if (showAddModal) {
                setShowAddModal(false);
                if (returnUrlRef.current) {
                    const dest = returnUrlRef.current;
                    returnUrlRef.current = null;
                    navigate(dest);
                }
            } else if (showEditModal) {
                setShowEditModal(false);
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [isMobile, showClientSearch, showAddModal, showEditModal, navigate]);

    // ── Modal close helpers (keep history stack clean on mobile) ──
    // When the user taps X or Annuler we must consume the history
    // entry we pushed on open, otherwise the next back-swipe will
    // try to close a modal that is already gone.
    const closeAddModal = () => {
        setShowAddModal(false);
        if (returnUrlRef.current) {
            const dest = returnUrlRef.current;
            returnUrlRef.current = null;
            navigate(dest);
        } else if (location.state?.returnUrl) {
            navigate(location.state.returnUrl);
        } else if (isMobile) {
            window.history.back();
        }
    };
    const closeEditModal = () => {
        setShowEditModal(false);
        if (location.state?.returnUrl) {
            navigate(location.state.returnUrl);
        } else if (isMobile) {
            window.history.back();
        }
    };
    const closeClientSearch = () => {
        setShowClientSearch(false);
        setClientSearchQuery("");
        setPendingClientName("");
        if (isMobile) window.history.back();
    };

    // ── Desktop calendar handlers ──────────────────────────────────
    const handlePrev = () => calendarRef.current?.getApi().prev();
    const handleNext = () => calendarRef.current?.getApi().next();
    const handleToday = () => {
        calendarRef.current?.getApi().today();
        setMobileSelectedDate(new Date());
    };

    const handleViewChange = (viewName) => {
        setCurrentView(viewName);
        calendarRef.current?.getApi().changeView(viewName);
    };

    const handleDatesSet = (dateInfo) => {
        setCurrentTitle(dateInfo.view.title);
        setCurrentView(dateInfo.view.type);
    };

    // Slot click → open Add modal
    const handleSelectSlot = (selectInfo) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour planifier des interventions sur le calendrier, veuillez renouveler votre abonnement." }
            }));
            const api = calendarRef.current?.getApi();
            api?.unselect();
            return;
        }
        setSelectedSlot(selectInfo);
        const start = new Date(selectInfo.start);
        const end = new Date(selectInfo.end);
        const pad = (n) => String(n).padStart(2, "0");
        setNewDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
        setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
        setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);

        setNewClientName("");
        setNewClientId("");
        setNewServiceTypes([]);
        setNewTechnicianId("");
        setNewAddress("");
        setNewNotes("");
        setShowAddCustomType(false);
        setAddCustomTypeInput("");
        setShowAddModal(true);
    };

    // Event click → open Detail modal if completed, otherwise open Edit modal
    const handleEventClick = (clickInfo) => {
        const { event } = clickInfo;
        const status = event.extendedProps?.status;
        const raw = event.extendedProps?.raw;

        if (status === "COMPLETED" || raw?.clientSignature) {
            setSelectedDetailIntervention(raw || event);
            setShowDetailModal(true);
            return;
        }

        setSelectedEvent(event);
        const start = new Date(event.start);
        const end = new Date(event.end);
        const pad = (n) => String(n).padStart(2, "0");
        setEditDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
        setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
        setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);

        const currentClientId = event.extendedProps?.clientId;
        const matched = clientDetails.find(c => c.id === currentClientId) || clientDetails.find(c => c.name === event.title);

        setEditClientId(matched?.id || currentClientId || "");
        setEditClientName(matched?.name || event.title || "");
        
        const rawType = event.extendedProps?.type || "Installation";
        const parsed = rawType.split(/[,+]/).map(s => s.trim()).filter(Boolean);
        setEditServiceTypes(parsed.length > 0 ? parsed : ["Installation"]);

        setEditTechnicianId(event.extendedProps?.technicianId || "");
        setEditAddress(event.extendedProps?.address || matched?.rawAddress || matched?.address || "");
        setEditNotes(event.extendedProps?.description || "");
        setShowEditCustomType(false);
        setEditCustomTypeInput("");
        setShowEditModal(true);
    };

    // Header "+ Intervention" button
    const handleHeaderAddIntervention = () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour créer une intervention, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        const calendarApi = calendarRef.current?.getApi();
        const currentDate = calendarApi ? calendarApi.getDate() : new Date();
        const start = new Date(currentDate);
        start.setHours(9, 0, 0, 0);
        const end = new Date(start);
        end.setHours(10, 30, 0, 0);
        const pad = (n) => String(n).padStart(2, "0");
        const fmt = (d) =>
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
        setSelectedSlot({ start, end, startStr: fmt(start), endStr: fmt(end) });
        setNewDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
        setStartTime("09:00");
        setEndTime("10:30");
        setNewClientId("");
        setNewClientName("");
        setNewServiceTypes([]);
        setNewTechnicianId("");
        setNewAddress("");
        setNewNotes("");
        setShowAddCustomType(false);
        setAddCustomTypeInput("");
        setShowAddModal(true);
    };

    const isTimeInvalid = React.useMemo(() => {
        if (!startTime || !endTime) return false;
        const [startH, startM] = startTime.split(":").map(Number);
        const [endH, endM] = endTime.split(":").map(Number);
        if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;
        return (endH * 60 + endM) <= (startH * 60 + startM);
    }, [startTime, endTime]);

    // Save new event
    const handleAddEventSubmit = async (e) => {
        e.preventDefault();
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour créer une intervention, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        if ((!newClientName && !newClientId)) return;

        if (!newServiceTypes || newServiceTypes.length === 0) {
            alert("Veuillez sélectionner au moins un type d'intervention !");
            return;
        }

        if (isTimeInvalid) {
            alert("L'heure de fin doit être supérieure à l'heure de début !");
            return;
        }

        const [startH, startM] = (startTime || "09:00").split(":").map(Number);
        const [endH, endM] = (endTime || "10:30").split(":").map(Number);
        const durationMinutes = Math.max(15, (endH * 60 + endM) - (startH * 60 + startM));

        const baseDate = newDate ? new Date(newDate) : (selectedSlot?.start ? new Date(selectedSlot.start) : new Date());
        baseDate.setHours(startH, startM, 0, 0);
        const scheduledAtIso = baseDate.toISOString();

        const matchedClient = clientDetails.find(c => c.id === newClientId) || clientDetails.find(c => c.name === newClientName);
        const finalClientName = matchedClient?.name || newClientName || "Client";
        const finalType = newServiceTypes.length > 0 ? newServiceTypes.join(", ") : "Entretien";

        let finalClientId = matchedClient?.id || newClientId;

        // Auto-resolve client ID if missing
        if (!finalClientId && finalClientName && finalClientName !== "Client") {
            try {
                const searchRes = await apiFetch(`/v1/clients?search=${encodeURIComponent(finalClientName)}&limit=1`);
                const found = searchRes.data?.clients?.[0] || searchRes.clients?.[0];
                if (found?.id) {
                    finalClientId = found.id;
                } else {
                    const parts = finalClientName.trim().split(" ");
                    const firstName = parts[0] || finalClientName;
                    const lastName = parts.slice(1).join(" ") || "Client";
                    const createdRes = await apiFetch('/v1/clients', {
                        method: 'POST',
                        body: JSON.stringify({
                            firstName,
                            lastName,
                            phone: "0600000000",
                            address: newAddress || "Adresse à renseigner",
                            city: "France"
                        })
                    });
                    finalClientId = createdRes.data?.client?.id || createdRes.client?.id;
                }
            } catch (err) {
                console.warn("Auto-resolve client error:", err);
            }
        }

        const finalAddress = newAddress || matchedClient?.rawAddress || matchedClient?.address || "Adresse à renseigner";

        try {
            await apiFetch('/v1/interventions', {
                method: 'POST',
                body: JSON.stringify({
                    clientId: finalClientId || undefined,
                    technicianId: newTechnicianId || undefined,
                    type: finalType,
                    serviceType: finalType,
                    title: `${finalType} - ${finalClientName}`,
                    scheduledAt: scheduledAtIso,
                    estimatedDuration: durationMinutes,
                    address: finalAddress,
                    city: matchedClient?.city || "France",
                    description: newNotes || `Intervention ${finalType}`
                })
            });
            await fetchInterventions();
            setShowAddModal(false);
            setSelectedSlot(null);
            if (returnUrlRef.current) {
                const dest = returnUrlRef.current;
                returnUrlRef.current = null;
                navigate(dest, { state: { toast: { message: "Intervention planifiée avec succès !", type: "success" } } });
            } else {
                setToast({ message: "Intervention planifiée avec succès !", type: "success" });
                if (location.state?.returnUrl) {
                    navigate(location.state.returnUrl);
                }
            }
        } catch (err) {
            console.error("Create intervention API error:", err);
            setToast({ message: err.message || "Erreur lors de la planification de l'intervention", isError: true });
        }
    };

    // Save edit
    const handleEditEventSubmit = async (e) => {
        e.preventDefault();
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier une intervention, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        if ((!editClientName && !editClientId) || !selectedEvent) return;

        if (!editServiceTypes || editServiceTypes.length === 0) {
            alert("Veuillez sélectionner au moins un type d'intervention !");
            return;
        }

        if (isTimeInvalid) {
            alert("L'heure de fin doit être supérieure à l'heure de début !");
            return;
        }

        const matchedClient = clientDetails.find(c => c.id === editClientId) || clientDetails.find(c => c.name === editClientName);
        const finalClientName = matchedClient?.name || editClientName;
        const finalType = editServiceTypes.join(", ");

        const [startH, startM] = startTime.split(":").map(Number);
        const [endH, endM] = endTime.split(":").map(Number);
        const durationMinutes = Math.max(15, (endH * 60 + endM) - (startH * 60 + startM));

        const baseDate = editDate ? new Date(editDate) : (selectedEvent.start ? new Date(selectedEvent.start) : new Date());
        baseDate.setHours(startH, startM, 0, 0);
        const scheduledAtIso = baseDate.toISOString();

        try {
            await apiFetch(`/v1/interventions/${selectedEvent.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    clientId: matchedClient?.id || editClientId || undefined,
                    technicianId: editTechnicianId || null,
                    type: finalType,
                    serviceType: finalType,
                    title: `${finalType} - ${finalClientName}`,
                    description: editNotes || `Intervention ${finalType}`,
                    address: editAddress || matchedClient?.rawAddress || matchedClient?.address || undefined,
                    city: matchedClient?.city || undefined,
                    scheduledAt: scheduledAtIso,
                    estimatedDuration: durationMinutes
                })
            });
            await fetchInterventions();
            setToast({ message: "Intervention mise à jour avec succès !", type: "success" });
            setShowEditModal(false);
            setSelectedEvent(null);
            if (location.state?.returnUrl) {
                navigate(location.state.returnUrl);
            }
        } catch (err) {
            console.error("Update intervention API error:", err);
            setToast({ message: err.message || "Erreur lors de la mise à jour", isError: true });
        }
    };

    // Handle drag & drop and resize persistence
    const handleCalendarEventChange = async (updatedEvents, changeInfo) => {
        if (isExpired) {
            if (changeInfo && changeInfo.revert) changeInfo.revert();
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour déplacer des interventions, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setEvents(updatedEvents);
        if (changeInfo && changeInfo.event) {
            const event = changeInfo.event;
            const start = event.start;
            const end = event.end;
            const durationMinutes = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 90;
            const scheduledAt = event.startStr || (start ? start.toISOString() : null);

            try {
                await apiFetch(`/v1/interventions/${event.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        scheduledAt,
                        estimatedDuration: durationMinutes
                    })
                });
            } catch (err) {
                console.error("Error saving dragged intervention:", err);
                if (changeInfo.revert) {
                    changeInfo.revert();
                }
                alert(err.message || "Erreur lors de la mise à jour de l'horaire");
                fetchInterventions();
            }
        }
    };

    // Delete event trigger
    const handleDeleteEvent = () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour supprimer une intervention, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        if (!selectedEvent) return;
        setShowDeleteConfirm(true);
    };

    // Confirm deletion
    const confirmDeleteEvent = async () => {
        if (!selectedEvent) return;
        try {
            setIsDeleting(true);
            await apiFetch(`/v1/interventions/${selectedEvent.id}`, {
                method: 'DELETE'
            });
            setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
            setShowDeleteConfirm(false);
            setShowEditModal(false);
            setSelectedEvent(null);
            await fetchInterventions();
        } catch (err) {
            console.error("Delete intervention API error:", err);
            alert(err.message || "Erreur lors de la suppression");
        } finally {
            setIsDeleting(false);
        }
    };

    // Filtered events
    const filteredEvents = typeFilter === "Tous"
        ? events
        : events.filter(e => {
            const t = e.extendedProps?.type || "";
            return t.includes(typeFilter);
        });

    // Helpers to format slot date time inside the modal
    const formatSlotDateTime = (slotInfo, currentStart, currentEnd) => {
        if (!slotInfo && !newDate) return "";
        const start = slotInfo?.start ? new Date(slotInfo.start) : (newDate ? new Date(newDate) : new Date());
        const end = slotInfo?.end ? new Date(slotInfo.end) : start;
        
        let dateStr = "";
        try {
            const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            dateStr = start.toLocaleDateString('fr-FR', optionsDate);
        } catch (error) {
            const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
            const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
            dateStr = `${days[start.getDay()]} ${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
        }
        
        const displayStart = currentStart || `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        const displayEnd = currentEnd || `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
        
        return `${dateStr} de ${displayStart} à ${displayEnd}`;
    };

    // ── Mobile handlers ───────────────────────────────────────────
    const handleMobileOpenAdd = (slotInfo) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour planifier des interventions, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setSelectedSlot(slotInfo);
        const start = new Date(slotInfo.start);
        const end = new Date(slotInfo.end);
        const pad = (n) => String(n).padStart(2, "0");
        setNewDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
        setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
        setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);

        setNewClientName("");
        setNewClientId("");
        setNewServiceTypes([]);
        setNewTechnicianId("");
        setNewAddress("");
        setNewNotes("");
        setShowAddCustomType(false);
        setAddCustomTypeInput("");
        setShowAddModal(true);
    };

    const handleMobileOpenEdit = (ev) => {
        const raw = ev.extendedProps?.raw || ev;
        if (raw.status === "COMPLETED" || raw.clientSignature || (raw.photos && raw.photos.length > 0)) {
            setSelectedDetailIntervention(raw);
            setShowDetailModal(true);
            return;
        }

        setSelectedEvent(ev);
        const start = new Date(ev.start);
        const end = new Date(ev.end);
        const pad = (n) => String(n).padStart(2, "0");
        setEditDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
        setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
        setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);

        const currentClientId = ev.extendedProps?.clientId;
        const matched = clientDetails.find(c => c.id === currentClientId) || clientDetails.find(c => c.name === ev.title);

        setEditClientId(matched?.id || currentClientId || "");
        setEditClientName(matched?.name || ev.title || "");
        
        const rawType = ev.extendedProps?.type || "Installation";
        const parsed = rawType.split(/[,+]/).map(s => s.trim()).filter(Boolean);
        setEditServiceTypes(parsed.length > 0 ? parsed : ["Installation"]);

        setEditTechnicianId(ev.extendedProps?.technicianId || "");
        setEditAddress(ev.extendedProps?.address || matched?.rawAddress || matched?.address || "");
        setEditNotes(ev.extendedProps?.description || "");
        setShowEditCustomType(false);
        setEditCustomTypeInput("");
        setShowEditModal(true);
    };

    const handleMobileFabClick = () => {
        const start = new Date(mobileSelectedDate);
        start.setHours(9, 0, 0, 0);
        const end = new Date(start);
        end.setHours(10, 30, 0, 0);
        const pad = (n) => String(n).padStart(2, "0");
        const fmt = (d) =>
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
            
        handleMobileOpenAdd({
            start,
            end,
            startStr: fmt(start),
            endStr: fmt(end)
        });
    };

    // ── Shared portal modals (desktop + mobile) ───────────────────
    const sharedModals = (
        <>
            {createPortal(
                <AnimatePresence>
                    {showAddModal && (
                        <>
                            <motion.div
                                className="modal-backdrop"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => closeAddModal()}
                            />
                            <motion.div
                                className="add-event-modal"
                                style={isMobile ? undefined : { x: "-50%", y: "-50%" }}
                                drag={isMobile ? "y" : false}
                                dragListener={false}
                                dragControls={addModalDragControls}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.6 }}
                                onDragEnd={(e, info) => {
                                    if (info.offset.y > 70 || info.velocity.y > 350) {
                                        closeAddModal();
                                    }
                                }}
                                initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                                animate={isMobile ? { y: "0%" } : { opacity: 1, scale: 1 }}
                                exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                            >
                                {isMobile && (
                                    <div
                                        className="bottom-sheet-drag-handle-zone"
                                        onPointerDown={(e) => addModalDragControls.start(e)}
                                        onClick={() => closeAddModal()}
                                        title="Glisser vers le bas pour fermer"
                                    >
                                        <div className="bottom-sheet-drag-handle" />
                                    </div>
                                )}
                                <div className="modal-header">
                                    <h3>Nouvelle Intervention</h3>
                                    <button className="modal-close-btn" onClick={() => closeAddModal()}><X size={18} /></button>
                                </div>
                                <form onSubmit={handleAddEventSubmit} className="modal-form-container">
                                    <div className="modal-form-body">
                                        {/* Date & Time Selectors */}
                                        <div className="modal-datetime-grid">
                                            <div className="modal-field date-col" style={{ margin: 0 }}>
                                                <label className="modal-label"><Calendar size={14} /><span>Date</span></label>
                                                <input 
                                                    type="date" 
                                                    value={newDate} 
                                                    onChange={(e) => setNewDate(e.target.value)} 
                                                    className="modal-input-time"
                                                    required 
                                                />
                                            </div>
                                            <div className="modal-field time-col" style={{ margin: 0 }}>
                                                <label className="modal-label"><Clock size={14} /><span>Début</span></label>
                                                <input 
                                                    type="time" 
                                                    value={startTime} 
                                                    onChange={(e) => setStartTime(e.target.value)} 
                                                    className="modal-input-time"
                                                    required 
                                                />
                                            </div>
                                            <div className="modal-field time-col" style={{ margin: 0 }}>
                                                <label className="modal-label">
                                                    <Clock size={14} />
                                                    <span>Fin {durationText && <small style={{ color: '#556B2F', fontWeight: 700 }}>({durationText})</small>}</span>
                                                </label>
                                                <input 
                                                    type="time" 
                                                    value={endTime} 
                                                    onChange={(e) => setEndTime(e.target.value)} 
                                                    className="modal-input-time"
                                                    required 
                                                />
                                            </div>
                                        </div>

                                    {isTimeInvalid && (
                                        <div style={{
                                            color: '#f59e0b',
                                            fontSize: '12.5px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '2px 0'
                                        }}>
                                            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                                            <span>L'heure de fin doit être supérieure à l'heure de début ({startTime}).</span>
                                        </div>
                                    )}

                                    {/* Client Selector */}
                                    <div className="modal-field">
                                        <label className="modal-label"><User size={15} /><span>Client / Nom du contact</span></label>
                                        <div 
                                            className="modal-select-trigger" 
                                            onClick={() => {
                                                setClientSearchTarget("add");
                                                setPendingClientName(newClientName);
                                                setPendingClientId(newClientId);
                                                setShowClientSearch(true);
                                            }}
                                        >
                                            <span className="trigger-val">{newClientName || "Sélectionner un client..."}</span>
                                            <ChevronDown size={16} className="trigger-arrow" />
                                        </div>
                                    </div>

                                    {/* Multi-Select Types d'intervention */}
                                    <div className="modal-field">
                                        <label className="modal-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Briefcase size={15} />
                                                <span>Type(s) d'intervention</span>
                                            </div>
                                            <span style={{ fontSize: '0.74rem', color: newServiceTypes.length === 0 ? '#f59e0b' : 'var(--muted-foreground)', fontWeight: 600 }}>
                                                {newServiceTypes.length} sélectionné{newServiceTypes.length > 1 ? "s" : ""}
                                            </span>
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                                            {Array.from(new Set([...AVAILABLE_SERVICE_TYPES, ...newServiceTypes])).map((t) => {
                                                const isSelected = newServiceTypes.includes(t);
                                                const isCustom = !AVAILABLE_SERVICE_TYPES.includes(t);
                                                return (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setNewServiceTypes(newServiceTypes.filter(item => item !== t));
                                                            } else {
                                                                setNewServiceTypes([...newServiceTypes, t]);
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '6px 14px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.82rem',
                                                            fontWeight: 500,
                                                            border: isSelected ? '1px solid #556B2F' : '1px solid var(--border)',
                                                            backgroundColor: isSelected ? 'rgba(85, 107, 47, 0.12)' : 'var(--background)',
                                                            color: isSelected ? '#556B2F' : 'var(--foreground)',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            boxSizing: 'border-box',
                                                            transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease'
                                                        }}
                                                    >
                                                        <span>{t}</span>
                                                        {isCustom && isSelected && (
                                                            <span 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setNewServiceTypes(newServiceTypes.filter(item => item !== t));
                                                                }}
                                                                style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.7 }}
                                                            >
                                                                <X size={12} />
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                            {showAddCustomType ? (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        ref={(el) => {
                                                            addCustomTypeInputRef.current = el;
                                                            if (el) scrollToCustomInput(el);
                                                        }}
                                                        type="text"
                                                        placeholder="Autre type..."
                                                        value={addCustomTypeInput}
                                                        onChange={(e) => setAddCustomTypeInput(e.target.value)}
                                                        onFocus={(e) => scrollToCustomInput(e.target)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const val = addCustomTypeInput.trim();
                                                                if (val) {
                                                                    if (!newServiceTypes.includes(val)) {
                                                                        setNewServiceTypes([...newServiceTypes, val]);
                                                                    }
                                                                    setAddCustomTypeInput("");
                                                                    setShowAddCustomType(false);
                                                                }
                                                            }
                                                        }}
                                                        style={{
                                                            width: '120px',
                                                            height: '30px',
                                                            padding: '0 10px',
                                                            fontSize: '0.82rem',
                                                            borderRadius: '16px',
                                                            border: '1px solid #556B2F',
                                                            backgroundColor: 'var(--background)',
                                                            color: 'var(--foreground)',
                                                            outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const val = addCustomTypeInput.trim();
                                                            if (val) {
                                                                if (!newServiceTypes.includes(val)) {
                                                                    setNewServiceTypes([...newServiceTypes, val]);
                                                                }
                                                                setAddCustomTypeInput("");
                                                                setShowAddCustomType(false);
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '14px',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 600,
                                                            backgroundColor: '#556B2F',
                                                            color: '#fff',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        OK
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowAddCustomType(false); setAddCustomTypeInput(""); }}
                                                        style={{
                                                            padding: '4px 6px',
                                                            borderRadius: '14px',
                                                            fontSize: '0.78rem',
                                                            backgroundColor: 'transparent',
                                                            color: 'var(--muted-foreground)',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowAddCustomType(true);
                                                        setTimeout(() => {
                                                            if (addCustomTypeInputRef.current) {
                                                                scrollToCustomInput(addCustomTypeInputRef.current);
                                                                addCustomTypeInputRef.current.focus();
                                                            }
                                                        }, 60);
                                                    }}
                                                    style={{
                                                        padding: '6px 14px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 500,
                                                        border: '1px dashed var(--border)',
                                                        backgroundColor: 'transparent',
                                                        color: 'var(--muted-foreground)',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        boxSizing: 'border-box'
                                                    }}
                                                >
                                                    <Plus size={13} /> Autre
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Technicien assigné */}
                                    <div className="modal-field">
                                        <label className="modal-label"><Building size={15} /><span>Technicien assigné</span></label>
                                        <div className="modal-select-wrapper">
                                            <select 
                                                value={newTechnicianId} 
                                                onChange={(e) => setNewTechnicianId(e.target.value)} 
                                                className="modal-select"
                                            >
                                                <option value="">Non assigné</option>
                                                {techniciansList.map(t => {
                                                    const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email;
                                                    const roleLabel = t.role === 'OWNER' ? ' (Dirigeant)' : t.role === 'MANAGER' ? ' (Manager)' : '';
                                                    return (
                                                        <option key={t.id} value={t.id}>
                                                            {fullName}{roleLabel}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <ChevronDown size={14} className="modal-select-arrow" />
                                        </div>
                                    </div>

                                    {/* Adresse */}
                                    <div className="modal-field">
                                        <label className="modal-label"><MapPin size={15} /><span>Adresse de l'intervention</span></label>
                                        <input 
                                            type="text" 
                                            value={newAddress} 
                                            onChange={(e) => setNewAddress(e.target.value)} 
                                            placeholder="Adresse, étage, code d'accès..."
                                            className="modal-input-time"
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    {/* Instructions / Notes */}
                                    <div className="modal-field">
                                        <label className="modal-label"><FileText size={15} /><span>Instructions & Notes (optionnel)</span></label>
                                        <textarea
                                            value={newNotes}
                                            onChange={(e) => setNewNotes(e.target.value)}
                                            placeholder="Ex: Code porte 45B2, climatisation au 2ème étage..."
                                            rows={2}
                                            style={{
                                                width: '100%',
                                                backgroundColor: 'var(--background)',
                                                border: '1.5px solid var(--border)',
                                                borderRadius: '10px',
                                                padding: '8px 12px',
                                                fontSize: '13.5px',
                                                fontFamily: 'inherit',
                                                color: 'var(--foreground)',
                                                outline: 'none',
                                                resize: 'vertical',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>

                                    <div className="modal-footer-row">
                                        <button type="button" className="modal-cancel-btn" onClick={() => closeAddModal()}>Annuler</button>
                                        <button type="submit" className="modal-submit-btn">Créer l'intervention</button>
                                    </div>
                                </form>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {createPortal(
                <AnimatePresence>
                    {showEditModal && (
                        <>
                            <motion.div
                                className="modal-backdrop"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => closeEditModal()}
                            />
                            <motion.div
                                className="add-event-modal"
                                style={isMobile ? undefined : { x: "-50%", y: "-50%" }}
                                drag={isMobile ? "y" : false}
                                dragListener={false}
                                dragControls={editModalDragControls}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.6 }}
                                onDragEnd={(e, info) => {
                                    if (info.offset.y > 70 || info.velocity.y > 350) {
                                        closeEditModal();
                                    }
                                }}
                                initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                                animate={isMobile ? { y: "0%" } : { opacity: 1, scale: 1 }}
                                exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                            >
                                {isMobile && (
                                    <div
                                        className="bottom-sheet-drag-handle-zone"
                                        onPointerDown={(e) => editModalDragControls.start(e)}
                                        onClick={() => closeEditModal()}
                                        title="Glisser vers le bas pour fermer"
                                    >
                                        <div className="bottom-sheet-drag-handle" />
                                    </div>
                                )}
                                <div className="modal-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <h3 style={{ margin: 0 }}>{isTechnician ? "Détails de l'Intervention" : "Modifier l'Intervention"}</h3>
                                        {selectedEvent?.extendedProps?.raw && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDetailIntervention(selectedEvent.extendedProps.raw);
                                                    setShowDetailModal(true);
                                                }}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #556B2F',
                                                    background: 'rgba(85, 107, 47, 0.1)',
                                                    color: '#556B2F',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                                title="Consulter la fiche détaillée, photos et signature"
                                            >
                                                <FileText size={13} />
                                                <span>Fiche & Photos ↗</span>
                                            </button>
                                        )}
                                    </div>
                                    <button className="modal-close-btn" onClick={() => closeEditModal()}><X size={18} /></button>
                                </div>
                                {isTechnician ? (
                                    <div className="modal-form-container">
                                        <div className="modal-form-body">
                                            <div className="modal-slot-info" style={{ marginBottom: '14px' }}>
                                                <span className="slot-info-label">Horaire planifié :</span>
                                                <span className="slot-info-val">{formatSlotDateTime(selectedEvent, startTime, endTime)}</span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ background: 'var(--card, #FAFAF8)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                                                    <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                                        Client / Nom du contact
                                                    </span>
                                                    <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--foreground)' }}>
                                                        {editClientName || selectedEvent?.title || "Non renseigné"}
                                                    </span>
                                                </div>

                                                <div style={{ background: 'var(--card, #FAFAF8)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                                                    <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                                        Type(s) de prestation
                                                    </span>
                                                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--foreground)' }}>
                                                        {editServiceTypes?.join(", ") || "Installation"}
                                                    </span>
                                                </div>

                                                <div style={{ background: 'var(--card, #FAFAF8)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                                                    <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                                        Technicien assigné
                                                    </span>
                                                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--foreground)' }}>
                                                        {(() => {
                                                            const t = techniciansList.find(tech => tech.id === editTechnicianId);
                                                            return t ? `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email : "Non assigné";
                                                        })()}
                                                    </span>
                                                </div>

                                                {editAddress && (
                                                    <div style={{ background: 'var(--card, #FAFAF8)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                                            Adresse de l'intervention
                                                        </span>
                                                        <span style={{ fontSize: '0.88rem', color: 'var(--foreground)' }}>
                                                            {editAddress}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="modal-footer-row" style={{ justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                className="modal-submit-btn"
                                                style={{ backgroundColor: '#556B2F', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                                                onClick={() => closeEditModal()}
                                            >
                                                Fermer
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleEditEventSubmit} className="modal-form-container">
                                        <div className="modal-form-body">
                                            {/* Date & Time Selectors */}
                                            <div className="modal-datetime-grid">
                                                <div className="modal-field date-col" style={{ margin: 0 }}>
                                                    <label className="modal-label"><Calendar size={14} /><span>Date</span></label>
                                                    <input 
                                                        type="date" 
                                                        value={editDate} 
                                                        onChange={(e) => setEditDate(e.target.value)} 
                                                        className="modal-input-time"
                                                        required 
                                                    />
                                                </div>
                                                <div className="modal-field time-col" style={{ margin: 0 }}>
                                                    <label className="modal-label"><Clock size={14} /><span>Début</span></label>
                                                    <input 
                                                        type="time" 
                                                        value={startTime} 
                                                        onChange={(e) => setStartTime(e.target.value)} 
                                                        className="modal-input-time"
                                                        required 
                                                    />
                                                </div>
                                                <div className="modal-field time-col" style={{ margin: 0 }}>
                                                    <label className="modal-label">
                                                        <Clock size={14} />
                                                        <span>Fin {durationText && <small style={{ color: '#556B2F', fontWeight: 700 }}>({durationText})</small>}</span>
                                                    </label>
                                                    <input 
                                                        type="time" 
                                                        value={endTime} 
                                                        onChange={(e) => setEndTime(e.target.value)} 
                                                        className="modal-input-time"
                                                        required 
                                                    />
                                                </div>
                                            </div>

                                        {isTimeInvalid && (
                                            <div style={{
                                                color: '#f59e0b',
                                                fontSize: '12.5px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '2px 0'
                                            }}>
                                                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                                                <span>L'heure de fin doit être supérieure à l'heure de début ({startTime}).</span>
                                            </div>
                                        )}

                                        {/* Client Selector */}
                                        <div className="modal-field">
                                            <label className="modal-label"><User size={15} /><span>Client / Nom du contact</span></label>
                                            <div 
                                                className="modal-select-trigger" 
                                                onClick={() => {
                                                    setClientSearchTarget("edit");
                                                    setPendingClientName(editClientName);
                                                    setPendingClientId(editClientId);
                                                    setShowClientSearch(true);
                                                }}
                                            >
                                                <span className="trigger-val">{editClientName || "Sélectionner un client..."}</span>
                                                <ChevronDown size={16} className="trigger-arrow" />
                                            </div>
                                        </div>

                                        {/* Multi-Select Types d'intervention */}
                                        <div className="modal-field">
                                            <label className="modal-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Briefcase size={15} />
                                                    <span>Type(s) d'intervention</span>
                                                </div>
                                                <span style={{ fontSize: '0.74rem', color: editServiceTypes.length === 0 ? '#f59e0b' : 'var(--muted-foreground)', fontWeight: 600 }}>
                                                    {editServiceTypes.length} sélectionné{editServiceTypes.length > 1 ? "s" : ""}
                                                </span>
                                            </label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                                                {Array.from(new Set([...AVAILABLE_SERVICE_TYPES, ...editServiceTypes])).map((t) => {
                                                    const isSelected = editServiceTypes.includes(t);
                                                    const isCustom = !AVAILABLE_SERVICE_TYPES.includes(t);
                                                    return (
                                                        <button
                                                            key={t}
                                                            type="button"
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setEditServiceTypes(editServiceTypes.filter(item => item !== t));
                                                                } else {
                                                                    setEditServiceTypes([...editServiceTypes, t]);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '6px 14px',
                                                                borderRadius: '20px',
                                                                fontSize: '0.82rem',
                                                                fontWeight: 500,
                                                                border: isSelected ? '1px solid #556B2F' : '1px solid var(--border)',
                                                                backgroundColor: isSelected ? 'rgba(85, 107, 47, 0.12)' : 'var(--background)',
                                                                color: isSelected ? '#556B2F' : 'var(--foreground)',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                boxSizing: 'border-box',
                                                                transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease'
                                                            }}
                                                        >
                                                            <span>{t}</span>
                                                            {isCustom && isSelected && (
                                                                <span 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditServiceTypes(editServiceTypes.filter(item => item !== t));
                                                                    }}
                                                                    style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.7 }}
                                                                >
                                                                    <X size={12} />
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                                {showEditCustomType ? (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <input
                                                            ref={(el) => {
                                                                editCustomTypeInputRef.current = el;
                                                                if (el) scrollToCustomInput(el);
                                                            }}
                                                            type="text"
                                                            placeholder="Autre type..."
                                                            value={editCustomTypeInput}
                                                            onChange={(e) => setEditCustomTypeInput(e.target.value)}
                                                            onFocus={(e) => scrollToCustomInput(e.target)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    const val = editCustomTypeInput.trim();
                                                                    if (val) {
                                                                        if (!editServiceTypes.includes(val)) {
                                                                            setEditServiceTypes([...editServiceTypes, val]);
                                                                        }
                                                                        setEditCustomTypeInput("");
                                                                        setShowEditCustomType(false);
                                                                    }
                                                                }
                                                            }}
                                                            style={{
                                                                width: '120px',
                                                                height: '30px',
                                                                padding: '0 10px',
                                                                fontSize: '0.82rem',
                                                                borderRadius: '16px',
                                                                border: '1px solid #556B2F',
                                                                backgroundColor: 'var(--background)',
                                                                color: 'var(--foreground)',
                                                                outline: 'none',
                                                                boxSizing: 'border-box'
                                                            }}
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const val = editCustomTypeInput.trim();
                                                                if (val) {
                                                                    if (!editServiceTypes.includes(val)) {
                                                                        setEditServiceTypes([...editServiceTypes, val]);
                                                                    }
                                                                    setEditCustomTypeInput("");
                                                                    setShowEditCustomType(false);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '4px 10px',
                                                                borderRadius: '14px',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 600,
                                                                backgroundColor: '#556B2F',
                                                                color: '#fff',
                                                                border: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            OK
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setShowEditCustomType(false); setEditCustomTypeInput(""); }}
                                                            style={{
                                                                padding: '4px 6px',
                                                                borderRadius: '14px',
                                                                fontSize: '0.78rem',
                                                                backgroundColor: 'transparent',
                                                                color: 'var(--muted-foreground)',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowEditCustomType(true);
                                                            setTimeout(() => {
                                                                if (editCustomTypeInputRef.current) {
                                                                    scrollToCustomInput(editCustomTypeInputRef.current);
                                                                    editCustomTypeInputRef.current.focus();
                                                                }
                                                            }, 60);
                                                        }}
                                                        style={{
                                                            padding: '6px 14px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.82rem',
                                                            fontWeight: 500,
                                                            border: '1px dashed var(--border)',
                                                            backgroundColor: 'transparent',
                                                            color: 'var(--muted-foreground)',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    >
                                                        <Plus size={13} /> Autre
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Technicien assigné */}
                                        <div className="modal-field">
                                            <label className="modal-label"><Building size={15} /><span>Technicien assigné</span></label>
                                            <div className="modal-select-wrapper">
                                                <select 
                                                    value={editTechnicianId} 
                                                    onChange={(e) => setEditTechnicianId(e.target.value)} 
                                                    className="modal-select"
                                                >
                                                    <option value="">Non assigné</option>
                                                    {techniciansList.map(t => {
                                                        const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email;
                                                        const roleLabel = t.role === 'OWNER' ? ' (Dirigeant)' : t.role === 'MANAGER' ? ' (Manager)' : '';
                                                        return (
                                                            <option key={t.id} value={t.id}>
                                                                {fullName}{roleLabel}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <ChevronDown size={14} className="modal-select-arrow" />
                                            </div>
                                        </div>

                                        {/* Adresse */}
                                        <div className="modal-field">
                                            <label className="modal-label"><MapPin size={15} /><span>Adresse de l'intervention</span></label>
                                            <input 
                                                type="text" 
                                                value={editAddress} 
                                                onChange={(e) => setEditAddress(e.target.value)} 
                                                placeholder="Adresse de l'intervention..."
                                                className="modal-input-time"
                                                style={{ width: '100%' }}
                                            />
                                        </div>

                                        {/* Instructions / Notes */}
                                        <div className="modal-field">
                                            <label className="modal-label"><FileText size={15} /><span>Instructions & Notes</span></label>
                                            <textarea
                                                value={editNotes}
                                                onChange={(e) => setEditNotes(e.target.value)}
                                                placeholder="Instructions pour le technicien..."
                                                rows={2}
                                                style={{
                                                    width: '100%',
                                                    backgroundColor: 'var(--background)',
                                                    border: '1.5px solid var(--border)',
                                                    borderRadius: '10px',
                                                    padding: '8px 12px',
                                                    fontSize: '13.5px',
                                                    fontFamily: 'inherit',
                                                    color: 'var(--foreground)',
                                                    outline: 'none',
                                                    resize: 'vertical',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                    </div>

                                        <div className="modal-footer-row edit-footer-row">
                                            <button type="button" className="modal-delete-btn" onClick={handleDeleteEvent}>Supprimer</button>
                                            <div className="footer-right-buttons">
                                                <button type="button" className="modal-cancel-btn" onClick={() => closeEditModal()}>Annuler</button>
                                                <button type="submit" className="modal-submit-btn edit-save-btn">Enregistrer</button>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Custom Delete Confirmation Modal */}
            {createPortal(
                <AnimatePresence>
                    {showDeleteConfirm && (
                        <div 
                            className="modal-backdrop" 
                            style={{ 
                                zIndex: 10000, 
                                position: 'fixed', 
                                top: 0, 
                                left: 0, 
                                right: 0, 
                                bottom: 0, 
                                backgroundColor: 'rgba(0, 0, 0, 0.55)', 
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '16px'
                            }} 
                            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
                        >
                            <motion.div 
                                className="delete-confirm-modal"
                                onClick={(e) => e.stopPropagation()}
                                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92, y: 10 }}
                                transition={{ type: "spring", duration: 0.25, bounce: 0.15 }}
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    width: '100%',
                                    maxWidth: '420px',
                                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                                    textAlign: 'center',
                                    position: 'relative',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FEE2E2',
                                    color: '#DC2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px auto'
                                }}>
                                    <Trash2 size={26} strokeWidth={2.2} />
                                </div>

                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
                                    Supprimer l'intervention ?
                                </h3>

                                <p style={{ fontSize: '0.9rem', color: '#6B7280', lineHeight: 1.45, margin: '0 0 24px 0' }}>
                                    Êtes-vous sûr de vouloir supprimer l'intervention de <strong>{editClientName || selectedEvent?.title || "ce client"}</strong> ? Cette action est irréversible.
                                </p>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={isDeleting}
                                        style={{
                                            flex: 1,
                                            padding: '11px 16px',
                                            borderRadius: '10px',
                                            border: '1px solid #E5E7EB',
                                            backgroundColor: '#FFFFFF',
                                            color: '#374151',
                                            fontSize: '0.92rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDeleteEvent}
                                        disabled={isDeleting}
                                        style={{
                                            flex: 1,
                                            padding: '11px 16px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            backgroundColor: '#DC2626',
                                            color: '#FFFFFF',
                                            fontSize: '0.92rem',
                                            fontWeight: 600,
                                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                                            opacity: isDeleting ? 0.7 : 1,
                                            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {isDeleting ? "Suppression..." : "Supprimer"}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );

    const clientSearchPortal = showClientSearch && createPortal(
        <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) closeClientSearch(); }}>
            <div className="client-search-panel">
                {/* Header */}
                <div className="client-search-header">
                    <button 
                        type="button" 
                        className="client-search-back-btn"
                        onClick={() => closeClientSearch()}
                    >
                        <X size={22} />
                    </button>
                    <h3>Sélectionner un client</h3>
                    <div style={{ width: 34 }}></div>
                </div>

                {/* Search Bar */}
                <div className="client-search-bar-container">
                    <div className="client-search-input-wrapper">
                        <Search size={18} className="client-search-icon" />
                        <input 
                            type="text"
                            placeholder="Nom ou entreprise..."
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            className="client-search-input"
                        />
                    </div>
                </div>

                {/* Grouped Client List */}
                <div className="client-search-list-container">
                    {Object.entries(
                        getGroupedClients(
                            clientDetails.filter(c => 
                                c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
                            )
                        )
                    ).map(([letter, list]) => (
                        <div key={letter} className="client-search-group">
                            <span className="client-search-group-letter">{letter}</span>
                            <div className="client-search-group-items">
                                {list.map(c => {
                                    const isPending = (pendingClientId && pendingClientId === c.id) || pendingClientName === c.name;
                                    return (
                                        <div 
                                            key={c.id || c.name}
                                            className={`client-search-item ${(pendingClientId && pendingClientId === c.id) || pendingClientName === c.name ? 'selected' : ''}`}
                                            onClick={() => {
                                                const addr = c.address || c.rawAddress || "";
                                                if (clientSearchTarget === "add") {
                                                    setNewClientName(c.name);
                                                    setNewClientId(c.id);
                                                    if (addr) setNewAddress(addr);
                                                } else {
                                                    setEditClientName(c.name);
                                                    setEditClientId(c.id);
                                                    if (addr) setEditAddress(addr);
                                                }
                                                closeClientSearch();
                                            }}
                                        >
                                            <span className="client-item-name">{c.name}</span>
                                            <span className={`client-item-badge ${c.type.toLowerCase()}`}>
                                                {c.type === "Particulier" ? "Particulier" : "Organisation"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {/* Empty search state */}
                    {clientDetails.filter(c => 
                        c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
                    ).length === 0 && (
                        <div className="client-search-empty">
                            <span>Aucun client ne correspond à votre recherche</span>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="client-search-footer">
                    {pendingClientName && (
                        <button 
                            type="button" 
                            className="client-search-confirm-btn"
                            onClick={() => {
                                const matched = clientDetails.find(c => c.id === pendingClientId || c.name === pendingClientName);
                                const addr = matched ? (matched.address || matched.rawAddress || "") : "";
                                if (clientSearchTarget === "add") {
                                    setNewClientName(pendingClientName);
                                    setNewClientId(pendingClientId);
                                    if (addr) setNewAddress(addr);
                                } else {
                                    setEditClientName(pendingClientName);
                                    setEditClientId(pendingClientId);
                                    if (addr) setEditAddress(addr);
                                }
                                setShowClientSearch(false);
                                setClientSearchQuery("");
                                setPendingClientName("");
                                setPendingClientId("");
                            }}
                        >
                            Confirmer — {pendingClientName}
                        </button>
                    )}
                    <button 
                        type="button" 
                        className={`client-search-add-btn ${pendingClientName ? 'secondary' : ''}`}
                        onClick={async () => {
                            const name = prompt("Nom et prénom (ou entreprise) du nouveau client :");
                            if (name && name.trim()) {
                                const parts = name.trim().split(" ");
                                const firstName = parts[0] || name.trim();
                                const lastName = parts.slice(1).join(" ") || "Client";
                                try {
                                    const res = await apiFetch('/v1/clients', {
                                        method: 'POST',
                                        body: JSON.stringify({
                                            firstName,
                                            lastName,
                                            phone: "0600000000",
                                            address: "Adresse à renseigner",
                                            city: "France"
                                        })
                                    });
                                    const created = res.data?.client || res.client;
                                    const newEntry = {
                                        id: created?.id || String(Date.now()),
                                        name: name.trim(),
                                        type: "Particulier",
                                        email: "",
                                        address: "Adresse à renseigner",
                                        rawAddress: "Adresse à renseigner",
                                        city: "France"
                                    };
                                    setClientDetails(prev => [...prev, newEntry].sort((a, b) => a.name.localeCompare(b.name)));
                                    if (clientSearchTarget === "add") {
                                        setNewClientName(name.trim());
                                    } else {
                                        setEditClientName(name.trim());
                                    }
                                    setShowClientSearch(false);
                                    setClientSearchQuery("");
                                    setPendingClientName("");
                                } catch (err) {
                                    console.error("Create client error:", err);
                                    alert(err.message || "Erreur lors de la création du client");
                                }
                            }
                        }}
                    >
                        + Ajouter un client
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );

    // ── Mobile layout ─────────────────────────────────────────────
    if (isMobile) {
        return (
            <div className="mobile-planning-view-wrapper">
                <Header />

                {/* Mobile Top Navigation Segmented Switcher */}
                <div className="mobile-planning-segmented-wrap">
                    <div className="mobile-planning-segmented-nav">
                        <button
                            type="button"
                            className={`mobile-plan-tab-btn ${activePlanningTab === "calendar" ? "active" : ""}`}
                            onClick={() => setActivePlanningTab("calendar")}
                        >
                            <Calendar size={15} />
                            <span>Calendrier</span>
                        </button>
                        <button
                            type="button"
                            className={`mobile-plan-tab-btn ${activePlanningTab === "past" ? "active" : ""}`}
                            onClick={() => setActivePlanningTab("past")}
                        >
                            <History size={15} />
                            <span>Passées & Historique</span>
                            {periodCounts.past > 0 && (
                                <span className="tab-counter-badge">{periodCounts.past}</span>
                            )}
                        </button>
                    </div>
                </div>

                {activePlanningTab === "calendar" ? (
                    <div className="mobile-planning-calendar-scroll-wrap">
                        <MobilePlanningView
                            events={filteredEvents}
                            selectedDate={mobileSelectedDate}
                            setSelectedDate={setMobileSelectedDate}
                            onSelectSlot={isTechnician ? () => {} : handleMobileOpenAdd}
                            onEventClick={handleMobileOpenEdit}
                            isExpired={isExpired}
                        />
                    </div>
                ) : (
                    /* Mobile Past Interventions View */
                    <div className="mobile-history-view-container">
                        {/* Search bar */}
                        <div className="mobile-history-search-card">
                            <div className="mobile-history-search-wrap">
                                <Search size={17} className="mobile-history-search-icon" />
                                <input
                                    type="text"
                                    className="mobile-history-search-input"
                                    placeholder="Rechercher client, adresse, tech..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                />
                                {historySearch && (
                                    <button
                                        type="button"
                                        className="mobile-history-clear-btn"
                                        onClick={() => setHistorySearch("")}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Period Pills Scroll */}
                        <div className="mobile-history-periods-scroll">
                            <button
                                type="button"
                                className={`history-period-pill ${historyPeriod === "past" ? "active" : ""}`}
                                onClick={() => handlePeriodChange("past")}
                            >
                                Passées ({periodCounts.past})
                            </button>
                            <button
                                type="button"
                                className={`history-period-pill ${historyPeriod === "all" ? "active" : ""}`}
                                onClick={() => handlePeriodChange("all")}
                            >
                                Toutes ({periodCounts.all})
                            </button>
                            <button
                                type="button"
                                className={`history-period-pill ${historyPeriod === "upcoming" ? "active" : ""}`}
                                onClick={() => handlePeriodChange("upcoming")}
                            >
                                À venir ({periodCounts.upcoming})
                            </button>
                            <button
                                type="button"
                                className={`history-period-pill ${historyPeriod === "today" ? "active" : ""}`}
                                onClick={() => handlePeriodChange("today")}
                            >
                                Aujourd'hui ({periodCounts.today})
                            </button>
                        </div>

                        {/* Status & Client Filters */}
                        <div className="mobile-history-filter-row">
                            <div className="mobile-filter-select-wrap">
                                <span className="mobile-filter-label">Statut :</span>
                                <select
                                    className="mobile-history-select"
                                    value={historyStatusFilter}
                                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label} ({statusCounts[opt.value] ?? 0})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mobile-filter-select-wrap">
                                <span className="mobile-filter-label">Client :</span>
                                <select
                                    className="mobile-history-select"
                                    value={historyClientFilter}
                                    onChange={(e) => setHistoryClientFilter(e.target.value)}
                                >
                                    <option value="all">Tous les clients</option>
                                    {clientDetails.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* List of Interventions */}
                        <div className="mobile-history-items-list">
                            {filteredHistoryInterventions.length === 0 ? (
                                <div className="history-empty-state">
                                    <History size={38} style={{ opacity: 0.4, margin: '0 auto 10px auto', color: '#556B2F' }} />
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700 }}>Aucune intervention trouvée</h4>
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
                                        Aucun résultat pour cette période ou vos filtres.
                                    </p>
                                </div>
                            ) : (
                                filteredHistoryInterventions.map(item => {
                                    const d = item.scheduledAt ? new Date(item.scheduledAt) : null;
                                    const dayNum = d ? d.getDate() : "--";
                                    const monthStr = d ? d.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase() : "";
                                    const timeStr = d ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
                                    const clientName = item.client 
                                        ? `${item.client.firstName || ''} ${item.client.lastName || ''}`.trim() || item.client.companyName || "Client"
                                        : "Client";
                                    const typeName = item.interventionType?.name || item.type || "Intervention";
                                    const techName = item.technician 
                                        ? `${item.technician.firstName || ''} ${item.technician.lastName || ''}`.trim() || item.technician.email
                                        : "Non assigné";
                                    const photos = item.photos || [];
                                    const hasSignature = !!item.clientSignature;
                                    const statusInfo = getInterventionStatusInfo(item);

                                    return (
                                        <div
                                            key={item.id}
                                            className="mobile-history-card"
                                            onClick={() => {
                                                setSelectedDetailIntervention(item);
                                                setShowDetailModal(true);
                                            }}
                                        >
                                            <div className="mobile-history-card-top">
                                                <div className="mobile-card-date-badge">
                                                    <span className="card-day">{dayNum}</span>
                                                    <span className="card-month">{monthStr}</span>
                                                    {timeStr && <span className="card-time">{timeStr}</span>}
                                                </div>

                                                <div className="mobile-card-main-meta">
                                                    <div className="mobile-card-client-row">
                                                        <span className="mobile-card-client">{clientName}</span>
                                                        <span className="history-type-badge">{typeName}</span>
                                                    </div>
                                                    {item.address && (
                                                        <span className="mobile-card-address">
                                                            <MapPin size={12} style={{ color: '#556B2F', flexShrink: 0 }} />
                                                            <span>{item.address}{item.city ? `, ${item.city}` : ''}</span>
                                                        </span>
                                                    )}
                                                    <span className="mobile-card-tech">
                                                        <User size={12} style={{ color: '#556B2F', flexShrink: 0 }} />
                                                        <span>Tech : {techName}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mobile-history-card-bottom">
                                                <div className="history-proof-pills">
                                                    {hasSignature ? (
                                                        <span className="proof-pill signed" title="Signature validée">
                                                            <PenTool size={11} />
                                                            <span>Signée</span>
                                                        </span>
                                                    ) : (
                                                        <span className="proof-pill" style={{ background: 'var(--background)', color: 'var(--muted-foreground)' }}>
                                                            Non signée
                                                        </span>
                                                    )}

                                                    {photos.length > 0 && (
                                                        <span className="proof-pill photos" title={`${photos.length} photo(s)`}>
                                                            <Camera size={11} />
                                                            <span>{photos.length} photo{photos.length > 1 ? 's' : ''}</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span
                                                        className="history-status-badge"
                                                        style={{ background: statusInfo.bg, color: statusInfo.color }}
                                                    >
                                                        {statusInfo.icon}
                                                        {statusInfo.label}
                                                    </span>
                                                    <ChevronRight size={15} style={{ color: 'var(--muted-foreground)' }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Spacer at the bottom to ensure the last card is clear of the FAB and bottom bar */}
                        <div className="mobile-history-bottom-spacer" />
                    </div>
                )}

                <SideBar onFabClick={isTechnician ? null : handleMobileFabClick} hideFab={isTechnician} />
                {sharedModals}
                {clientSearchPortal}

                {/* Modal de consultation détaillée pour mobile (photos, signature, rapport) */}
                <InterventionDetailModal
                    isOpen={showDetailModal}
                    onClose={() => {
                        setShowDetailModal(false);
                    }}
                    intervention={selectedDetailIntervention}
                    client={selectedDetailIntervention?.client}
                />
            </div>
        );
    }

    // ── Desktop layout ────────────────────────────────
    return (
        <div className="home-page">
            <SideBar />
            <div className="main-content">
                <Header />
                <motion.div
                    className="page-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Planning Navigation Tabs Bar */}
                    <div className="planning-top-nav-bar">
                        <div className="planning-main-tabs">
                            <button
                                className={`planning-tab-btn ${activePlanningTab === "calendar" ? "active" : ""}`}
                                onClick={() => setActivePlanningTab("calendar")}
                            >
                                <Calendar size={16} />
                                <span>Calendrier</span>
                            </button>
                            <button
                                className={`planning-tab-btn ${activePlanningTab === "past" ? "active" : ""}`}
                                onClick={() => setActivePlanningTab("past")}
                            >
                                <History size={16} />
                                <span>Interventions passées & Historique</span>
                                {periodCounts.past > 0 && <span className="tab-counter-badge">{periodCounts.past}</span>}
                            </button>
                        </div>

                        {!isTechnician && (
                            <button
                                className="new-intervention-btn"
                                onClick={handleHeaderAddIntervention}
                                style={isExpired ? { opacity: 0.85 } : {}}
                            >
                                {isExpired ? <Lock size={15} /> : <Plus size={16} />}
                                <span>Nouvelle intervention</span>
                            </button>
                        )}
                    </div>

                    {activePlanningTab === "calendar" ? (
                        <>
                            {/* Custom Header Row */}
                            <div className="calendar-header-row">
                                <div className="header-left-group">
                                    <div className="calendar-navigation">
                                        <button className="nav-arrow-btn" onClick={handlePrev} title="Précédent">
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button className="nav-today-btn" onClick={handleToday} title="Aller à aujourd'hui">
                                            Aujourd'hui
                                        </button>
                                        <button className="nav-arrow-btn" onClick={handleNext} title="Suivant">
                                            <ChevronRight size={18} />
                                        </button>
                                        <span className="calendar-current-range">{currentTitle}</span>
                                    </div>
                                </div>

                                <div className="header-right-group">
                                    {/* Filter Dropdown */}
                                    <div className="filter-dropdown-wrapper">
                                        <select
                                            value={typeFilter}
                                            onChange={(e) => setTypeFilter(e.target.value)}
                                            className="filter-select"
                                        >
                                            <option value="Tous">Tous les types</option>
                                            <option value="Installation">Installation</option>
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Dépannage">Dépannage</option>
                                            <option value="Contrôle">Contrôle</option>
                                        </select>
                                        <ChevronDown size={14} className="dropdown-arrow-icon" />
                                    </div>
                                </div>
                            </div>

                            {/* View Selector & Legends Row */}
                            <div className="view-legends-row">
                                <div className="view-selector-pill">
                                    <button
                                        className={`view-btn ${currentView === "timeGridDay" ? "active" : ""}`}
                                        onClick={() => handleViewChange("timeGridDay")}
                                    >
                                        Jour
                                    </button>
                                    <button
                                        className={`view-btn ${currentView === "timeGridWeek" ? "active" : ""}`}
                                        onClick={() => handleViewChange("timeGridWeek")}
                                    >
                                        Semaine
                                    </button>
                                    <button
                                        className={`view-btn ${currentView === "dayGridMonth" ? "active" : ""}`}
                                        onClick={() => handleViewChange("dayGridMonth")}
                                    >
                                        Mois
                                    </button>
                                </div>

                                {/* Calendar Legends */}
                                <div className="calendar-legends">
                                    <div className="legend-item type-installation">
                                        <span className="legend-dot" /><span>Installation</span>
                                    </div>
                                    <div className="legend-item type-maintenance">
                                        <span className="legend-dot" /><span>Maintenance</span>
                                    </div>
                                    <div className="legend-item type-depannage">
                                        <span className="legend-dot" /><span>Dépannage</span>
                                    </div>
                                    <div className="legend-item type-controle">
                                        <span className="legend-dot" /><span>Contrôle</span>
                                    </div>
                                </div>
                            </div>

                            {/* FullCalendar Card Wrapper */}
                            <div className="calendar-card">
                                <EventCalendar
                                    calendarRef={calendarRef}
                                    events={filteredEvents}
                                    onEventChange={handleCalendarEventChange}
                                    onSelectSlot={handleSelectSlot}
                                    onEventClick={handleEventClick}
                                    typeFilter={typeFilter}
                                    currentView={currentView}
                                    onDatesSet={handleDatesSet}
                                    isReadOnly={isTechnician}
                                />
                            </div>
                        </>
                    ) : (
                        /* VUE INTERVENTIONS PASSÉES & HISTORIQUE */
                        <div className="history-view-container">
                            {/* Toolbar & Filters */}
                            <div className="history-toolbar-card">
                                <div className="history-toolbar-top">
                                    <div className="history-search-wrapper">
                                        <Search size={16} className="history-search-icon" />
                                        <input
                                            type="text"
                                            className="history-search-input"
                                            placeholder="Rechercher par client, adresse, technicien, objet..."
                                            value={historySearch}
                                            onChange={(e) => setHistorySearch(e.target.value)}
                                        />
                                    </div>

                                    <div className="history-period-pills">
                                        <button
                                            className={`history-period-pill ${historyPeriod === "past" ? "active" : ""}`}
                                            onClick={() => handlePeriodChange("past")}
                                        >
                                            Passées ({periodCounts.past})
                                        </button>
                                        <button
                                            className={`history-period-pill ${historyPeriod === "all" ? "active" : ""}`}
                                            onClick={() => handlePeriodChange("all")}
                                        >
                                            Toutes ({periodCounts.all})
                                        </button>
                                        <button
                                            className={`history-period-pill ${historyPeriod === "upcoming" ? "active" : ""}`}
                                            onClick={() => handlePeriodChange("upcoming")}
                                        >
                                            À venir ({periodCounts.upcoming})
                                        </button>
                                        <button
                                            className={`history-period-pill ${historyPeriod === "today" ? "active" : ""}`}
                                            onClick={() => handlePeriodChange("today")}
                                        >
                                            Aujourd'hui ({periodCounts.today})
                                        </button>
                                    </div>
                                </div>

                                <div className="history-filters-bottom">
                                    {/* Client Filter */}
                                    <div className="history-filter-select-wrap">
                                        <span className="history-filter-label">Client :</span>
                                        <select
                                            className="history-filter-select"
                                            value={historyClientFilter}
                                            onChange={(e) => setHistoryClientFilter(e.target.value)}
                                        >
                                            <option value="all">Tous les clients</option>
                                            {clientDetails.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Status Filter Custom Dropdown with Lucide Icons */}
                                    <div className="custom-dropdown-container" ref={statusDropdownRef}>
                                        <span className="history-filter-label">Statut :</span>
                                        <button
                                            type="button"
                                            className="custom-dropdown-trigger"
                                            onClick={() => setStatusDropdownOpen(prev => !prev)}
                                        >
                                            {(() => {
                                                const currentOpt = STATUS_OPTIONS.find(o => o.value === historyStatusFilter) || STATUS_OPTIONS[0];
                                                const CurrentIcon = currentOpt.icon;
                                                return (
                                                    <>
                                                        <CurrentIcon size={14} style={{ color: currentOpt.color }} />
                                                        <span>{currentOpt.label}</span>
                                                    </>
                                                );
                                            })()}
                                            <ChevronDown size={14} className={`dropdown-caret ${statusDropdownOpen ? 'open' : ''}`} />
                                        </button>

                                        {statusDropdownOpen && (
                                            <div className="custom-dropdown-menu">
                                                {STATUS_OPTIONS.map(opt => {
                                                    const isSelected = historyStatusFilter === opt.value;
                                                    const count = statusCounts[opt.value] ?? 0;
                                                    const isDisabled = isStatusDisabledForPeriod(opt.value, historyPeriod, count);
                                                    const OptIcon = opt.icon;
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            className={`custom-dropdown-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                                            disabled={isDisabled}
                                                            onClick={() => {
                                                                if (isDisabled) return;
                                                                setHistoryStatusFilter(opt.value);
                                                                setStatusDropdownOpen(false);
                                                            }}
                                                            title={isDisabled ? "Non disponible pour la période sélectionnée" : ""}
                                                        >
                                                            <OptIcon size={14} style={{ color: isDisabled ? 'var(--muted-foreground)' : opt.color }} />
                                                            <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
                                                            <span className="dropdown-item-count">
                                                                {count}
                                                            </span>
                                                            {isSelected && <Check size={13} style={{ color: '#556B2F', marginLeft: 4 }} />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sort Filter */}
                                    <div className="history-filter-select-wrap">
                                        <span className="history-filter-label">Tri :</span>
                                        <select
                                            className="history-filter-select"
                                            value={historySort}
                                            onChange={(e) => setHistorySort(e.target.value)}
                                        >
                                            <option value="desc">Plus récentes d'abord</option>
                                            <option value="asc">Plus anciennes d'abord</option>
                                        </select>
                                    </div>

                                    <div style={{ marginLeft: 'auto', fontSize: '0.84rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                                        {filteredHistoryInterventions.length} intervention{filteredHistoryInterventions.length > 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>

                            {/* List of Interventions */}
                            {loading && filteredHistoryInterventions.length === 0 ? (
                                <div className="history-items-grid">
                                    {[1, 2, 3, 4, 5, 6].map(idx => (
                                        <div key={idx} className="history-card" style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div className="skeleton-shimmer" style={{ width: '130px', height: '16px', borderRadius: '5px' }} />
                                                <div className="skeleton-shimmer" style={{ width: '75px', height: '22px', borderRadius: '9999px' }} />
                                            </div>
                                            <div className="skeleton-shimmer" style={{ width: '65%', height: '14px', borderRadius: '4px', opacity: 0.7 }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                                <div className="skeleton-shimmer" style={{ width: '110px', height: '13px', borderRadius: '4px', opacity: 0.6 }} />
                                                <div className="skeleton-shimmer" style={{ width: '80px', height: '13px', borderRadius: '4px', opacity: 0.6 }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredHistoryInterventions.length === 0 ? (
                                <div className="history-empty-state">
                                    <div className="history-empty-icon">
                                        <History size={28} />
                                    </div>
                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                                        Aucune intervention trouvée
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.86rem' }}>
                                        Modifiez les filtres de recherche ou sélectionnez une autre période.
                                    </p>
                                </div>
                            ) : (
                                <div className="history-items-grid">
                                    {filteredHistoryInterventions.map(item => {
                                        const dateObj = item.scheduledAt ? new Date(item.scheduledAt) : (item.createdAt ? new Date(item.createdAt) : new Date());
                                        const dayNum = dateObj.getDate().toString().padStart(2, '0');
                                        const monthStr = dateObj.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
                                        const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                                        
                                        const clientName = item.client 
                                            ? (item.client.companyName || `${item.client.firstName || ''} ${item.client.lastName || ''}`.trim())
                                            : "Client non spécifié";
                                        const typeName = item.interventionType?.name || item.type || "Intervention";
                                        const techName = item.technician 
                                            ? `${item.technician.firstName || ''} ${item.technician.lastName || ''}`.trim() || item.technician.email
                                            : "Non assigné";
                                        const photos = item.photos || [];
                                        const hasSignature = !!item.clientSignature;
                                        const statusInfo = getInterventionStatusInfo(item);

                                        return (
                                            <div 
                                                key={item.id} 
                                                className="history-item-row"
                                                onClick={() => {
                                                    setSelectedDetailIntervention(item);
                                                    setShowDetailModal(true);
                                                }}
                                            >
                                                <div className="history-row-left">
                                                    <div className="history-date-badge">
                                                        <span className="history-date-day">{dayNum}</span>
                                                        <span className="history-date-month">{monthStr}</span>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.85, marginTop: 2 }}>
                                                            {timeStr}
                                                        </span>
                                                    </div>

                                                    <div className="history-main-info">
                                                        <div className="history-client-title-row">
                                                            <span className="history-client-name">{clientName}</span>
                                                            <span className="history-type-badge">{typeName}</span>
                                                            {item.title && item.title !== clientName && (
                                                                <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
                                                                    — {item.title}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="history-details-subrow">
                                                            {item.address && (
                                                                <span className="history-detail-item">
                                                                    <MapPin size={13} style={{ color: '#556B2F' }} />
                                                                    {item.address}{item.city ? `, ${item.city}` : ''}
                                                                </span>
                                                            )}
                                                            <span className="history-detail-item">
                                                                <User size={13} style={{ color: '#556B2F' }} />
                                                                Tech : {techName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="history-row-right" onClick={(e) => e.stopPropagation()}>
                                                    {/* Proofs: Signature & Photos */}
                                                    <div className="history-proof-pills">
                                                        {hasSignature ? (
                                                            <span className="proof-pill signed" title="Signature client validée">
                                                                <PenTool size={12} />
                                                                <span>Signée</span>
                                                            </span>
                                                        ) : (
                                                            <span className="proof-pill" style={{ background: 'var(--background)', color: 'var(--muted-foreground)' }}>
                                                                Non signée
                                                            </span>
                                                        )}

                                                        {photos.length > 0 && (
                                                            <span className="proof-pill photos" title={`${photos.length} photo(s) avant/après enregistrées`}>
                                                                <Camera size={12} />
                                                                <span>{photos.length} photo{photos.length > 1 ? 's' : ''}</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Status Badge */}
                                                    <span 
                                                        className="history-status-badge"
                                                        style={{ background: statusInfo.bg, color: statusInfo.color }}
                                                    >
                                                        {statusInfo.icon}
                                                        {statusInfo.label}
                                                    </span>

                                                    {/* Open Button */}
                                                    <button 
                                                        className="history-action-btn"
                                                        onClick={() => {
                                                            setSelectedDetailIntervention(item);
                                                            setShowDetailModal(true);
                                                        }}
                                                    >
                                                        <span>Consulter</span>
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
            {sharedModals}
            {clientSearchPortal}

            {/* Modal de consultation détaillée pour toutes interventions */}
            <InterventionDetailModal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                }}
                intervention={selectedDetailIntervention}
                client={selectedDetailIntervention?.client}
            />

            <ToastNotification toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}

export default PlanningPage;
