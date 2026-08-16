import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../HomePage/Homepage.css";
import "./PlanningPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import EventCalendar from "../components/EventCalendar";
import MobilePlanningView from "./MobilePlanningView";
import { ChevronLeft, ChevronRight, Plus, ChevronDown, X, User, Building, Briefcase, Clock, ArrowLeft, Search, AlertTriangle, Trash2 } from "lucide-react";

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

// ── Component ─────────────────────────────────────────────────────
import { useLocation } from "react-router-dom";
import { apiFetch } from "../utils/api";

function PlanningPage() {
    const location = useLocation();
    const windowWidth = useWindowWidth();
    const isMobile = windowWidth <= 768;

    const [events, setEvents] = useState([]);
    const [clientDetails, setClientDetails] = useState([]);
    const [techniciansList, setTechniciansList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Auto open intervention modal if navigated from Client details with preselected client
    useEffect(() => {
        if (location.state?.clientId || location.state?.clientName) {
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
            setStartTime("09:00");
            setEndTime("10:30");
            setNewClientId(location.state.clientId || "");
            setNewClientName(location.state.clientName || "");
            setNewServiceType("Installation");
            setNewTechnicianId("");
            setShowAddModal(true);
        }
    }, [location.state]);

    const fetchInterventions = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/v1/interventions?limit=100');
            const rawInterventions = data.data?.interventions || data.interventions || (Array.isArray(data) ? data : []);
            const mappedEvents = rawInterventions
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
                            clientId: item.clientId
                        }
                    };
                });
            setEvents(mappedEvents);
        } catch (err) {
            console.warn("API interventions non disponible:", err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const data = await apiFetch('/v1/clients');
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
            setTechniciansList(activeMembers);
        } catch (err) {
            console.warn("API techniciens non disponible:", err.message);
        }
    };

    useEffect(() => {
        fetchInterventions();
        fetchClients();
        fetchTechnicians();
    }, []);

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
    const [newClientId, setNewClientId] = useState("");
    const [newClientName, setNewClientName] = useState("");
    const [newServiceType, setNewServiceType] = useState("Installation");
    const [newTechnicianId, setNewTechnicianId] = useState("");

    // Modal state — edit
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editClientId, setEditClientId] = useState("");
    const [editClientName, setEditClientName] = useState("");
    const [editServiceType, setEditServiceType] = useState("Installation");
    const [editTechnicianId, setEditTechnicianId] = useState("");

    const [showClientSearch, setShowClientSearch] = useState(false);
    const [clientSearchTarget, setClientSearchTarget] = useState("add"); // "add" or "edit"
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [pendingClientName, setPendingClientName] = useState(""); // highlighted but not yet confirmed
    const [pendingClientId, setPendingClientId] = useState("");

    // Confirmation dialog state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
            } else if (showEditModal) {
                setShowEditModal(false);
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [isMobile, showClientSearch, showAddModal, showEditModal]);

    // ── Modal close helpers (keep history stack clean on mobile) ──
    // When the user taps X or Annuler we must consume the history
    // entry we pushed on open, otherwise the next back-swipe will
    // try to close a modal that is already gone.
    const closeAddModal = () => {
        setShowAddModal(false);
        if (isMobile) window.history.back();
    };
    const closeEditModal = () => {
        setShowEditModal(false);
        if (isMobile) window.history.back();
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
        setSelectedSlot(selectInfo);
        const start = new Date(selectInfo.start);
        const end = new Date(selectInfo.end);
        const pad = (n) => String(n).padStart(2, "0");
        setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
        setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);

        setNewClientName("");
        setNewServiceType("Installation");
        setNewTechnicianId("");
        setShowAddModal(true);
    };

    // Event click → open Edit modal
    const handleEventClick = (clickInfo) => {
        const { event } = clickInfo;
        setSelectedEvent(event);
        const start = new Date(event.start);
        const end = new Date(event.end);
        const pad = (n) => String(n).padStart(2, "0");
        setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
        setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);

        const currentClientId = event.extendedProps?.clientId;
        const matched = clientDetails.find(c => c.id === currentClientId) || clientDetails.find(c => c.name === event.title);

        setEditClientId(matched?.id || currentClientId || "");
        setEditClientName(matched?.name || event.title || "");
        setEditServiceType(event.extendedProps?.type || "Installation");
        setEditTechnicianId(event.extendedProps?.technicianId || "");
        setShowEditModal(true);
    };

    // Header "+ Intervention" button
    const handleHeaderAddIntervention = () => {
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
        setStartTime("09:00");
        setEndTime("10:30");
        setNewClientId("");
        setNewClientName("");
        setNewServiceType("Installation");
        setNewTechnicianId("");
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
        if ((!newClientName && !newClientId) || !selectedSlot) return;

        if (isMobile && isTimeInvalid) {
            alert("L'heure de fin doit être supérieure à l'heure de début !");
            return;
        }

        let startStr = selectedSlot.startStr;
        if (!startStr && selectedSlot.start) {
            startStr = new Date(selectedSlot.start).toISOString();
        }

        const matchedClient = clientDetails.find(c => c.id === newClientId) || clientDetails.find(c => c.name === newClientName);
        const finalClientName = matchedClient?.name || newClientName;

        try {
            await apiFetch('/v1/interventions', {
                method: 'POST',
                body: JSON.stringify({
                    clientId: matchedClient?.id || undefined,
                    technicianId: newTechnicianId || undefined,
                    type: newServiceType,
                    serviceType: newServiceType,
                    title: `${newServiceType} - ${finalClientName}`,
                    scheduledAt: startStr,
                    estimatedDuration: 90,
                    address: matchedClient?.rawAddress || matchedClient?.address || "Adresse à renseigner",
                    city: matchedClient?.city || "France",
                    description: `Intervention ${newServiceType}`
                })
            });
            await fetchInterventions();
        } catch (err) {
            console.error("Create intervention API error:", err);
            alert(err.message || "Erreur lors de la planification de l'intervention");
        } finally {
            setShowAddModal(false);
            setSelectedSlot(null);
        }
    };

    // Save edit
    const handleEditEventSubmit = async (e) => {
        e.preventDefault();
        if ((!editClientName && !editClientId) || !selectedEvent) return;

        if (isMobile && isTimeInvalid) {
            alert("L'heure de fin doit être supérieure à l'heure de début !");
            return;
        }

        const matchedClient = clientDetails.find(c => c.id === editClientId) || clientDetails.find(c => c.name === editClientName);
        const finalClientName = matchedClient?.name || editClientName;

        let scheduledAt = selectedEvent.start;
        let estimatedDuration = undefined;
        if (startTime && endTime) {
            const [startH, startM] = startTime.split(":").map(Number);
            const [endH, endM] = endTime.split(":").map(Number);
            const baseDate = selectedEvent.start ? new Date(selectedEvent.start) : new Date();
            baseDate.setHours(startH, startM, 0, 0);
            scheduledAt = baseDate.toISOString();
            estimatedDuration = (endH * 60 + endM) - (startH * 60 + startM);
        }

        try {
            await apiFetch(`/v1/interventions/${selectedEvent.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    clientId: matchedClient?.id || undefined,
                    technicianId: editTechnicianId || null,
                    type: editServiceType,
                    serviceType: editServiceType,
                    title: `${editServiceType} - ${finalClientName}`,
                    description: `Intervention ${editServiceType}`,
                    address: matchedClient?.rawAddress || matchedClient?.address || undefined,
                    city: matchedClient?.city || undefined,
                    scheduledAt,
                    estimatedDuration: estimatedDuration > 0 ? estimatedDuration : undefined
                })
            });
            await fetchInterventions();
        } catch (err) {
            console.error("Update intervention API error:", err);
            alert(err.message || "Erreur lors de la mise à jour");
        } finally {
            setShowEditModal(false);
            setSelectedEvent(null);
        }
    };

    // Handle drag & drop and resize persistence
    const handleCalendarEventChange = async (updatedEvents, changeInfo) => {
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
        : events.filter(e => e.extendedProps.type === typeFilter);

    // Helpers to format slot date time inside the modal
    const formatSlotDateTime = (slotInfo, currentStart, currentEnd) => {
        if (!slotInfo) return "";
        const start = new Date(slotInfo.start);
        const end = slotInfo.end ? new Date(slotInfo.end) : start;
        
        let dateStr = "";
        try {
            const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            dateStr = start.toLocaleDateString('fr-FR', optionsDate);
        } catch (error) {
            console.error("toLocaleDateString error:", error);
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
        setSelectedSlot(slotInfo);
        const start = new Date(slotInfo.start);
        const end = new Date(slotInfo.end);
        const pad = (n) => String(n).padStart(2, "0");
        setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
        setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);

        setNewClientName("");
        setNewServiceType("Installation");
        setNewTechnicianId("");
        setShowAddModal(true);
    };

    const handleMobileOpenEdit = (ev) => {
        setSelectedEvent(ev);
        const start = new Date(ev.start);
        const end = new Date(ev.end);
        const pad = (n) => String(n).padStart(2, "0");
        setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
        setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);

        const currentClientId = ev.extendedProps?.clientId;
        const matched = clientDetails.find(c => c.id === currentClientId) || clientDetails.find(c => c.name === ev.title);

        setEditClientId(matched?.id || currentClientId || "");
        setEditClientName(matched?.name || ev.title || "");
        setEditServiceType(ev.extendedProps?.type || "Installation");
        setEditTechnicianId(ev.extendedProps?.technicianId || "");
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
                                style={{ x: "-50%", y: "-50%" }}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
                            >
                                <div className="modal-header">
                                    <h3>Nouvelle Intervention</h3>
                                    <button className="modal-close-btn" onClick={() => closeAddModal()}><X size={18} /></button>
                                </div>
                                <form onSubmit={handleAddEventSubmit} className="modal-form-stack">
                                    <div className="modal-slot-info">
                                        <span className="slot-info-label">Créneau sélectionné :</span>
                                        <span className="slot-info-val">{formatSlotDateTime(selectedSlot, startTime, endTime)}</span>
                                    </div>
                                    {isMobile && (
                                        <div className="modal-field-row" style={{ display: 'flex', gap: '12px' }}>
                                            <div className="modal-field" style={{ flex: 1 }}>
                                                <label className="modal-label"><Clock size={15} /><span>Début</span></label>
                                                <input 
                                                    type="time" 
                                                    value={startTime} 
                                                    onChange={(e) => setStartTime(e.target.value)} 
                                                    className="modal-input-time"
                                                    required 
                                                />
                                            </div>
                                            <div className="modal-field" style={{ flex: 1 }}>
                                                <label className="modal-label"><Clock size={15} /><span>Fin</span></label>
                                                <input 
                                                    type="time" 
                                                    value={endTime} 
                                                    onChange={(e) => setEndTime(e.target.value)} 
                                                    className="modal-input-time"
                                                    required 
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {isMobile && isTimeInvalid && (
                                        <div style={{
                                            color: '#f59e0b',
                                            fontSize: '12.5px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginTop: '4px',
                                            padding: '0 2px'
                                        }}>
                                            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                                            <span>L'heure de fin doit être supérieure à l'heure de début ({startTime}).</span>
                                        </div>
                                    )}
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
                                    <div className="modal-field">
                                        <label className="modal-label"><Briefcase size={15} /><span>Type d'intervention</span></label>
                                        <div className="modal-select-wrapper">
                                            <select value={newServiceType} onChange={(e) => setNewServiceType(e.target.value)} className="modal-select" required>
                                                <option value="Installation">Installation</option>
                                                <option value="Maintenance">Maintenance</option>
                                                <option value="Dépannage">Dépannage</option>
                                                <option value="Contrôle">Contrôle</option>
                                            </select>
                                            <ChevronDown size={14} className="modal-select-arrow" />
                                        </div>
                                    </div>
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
                                style={{ x: "-50%", y: "-50%" }}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
                            >
                                <div className="modal-header">
                                    <h3>Modifier l'Intervention</h3>
                                    <button className="modal-close-btn" onClick={() => closeEditModal()}><X size={18} /></button>
                                </div>
                                <form onSubmit={handleEditEventSubmit} className="modal-form-stack">
                                    <div className="modal-slot-info">
                                        <span className="slot-info-label">Horaire planifié :</span>
                                        <span className="slot-info-val">{formatSlotDateTime(selectedEvent, startTime, endTime)}</span>
                                    </div>
                                    {isMobile && (
                                        <div className="modal-field-row" style={{ display: 'flex', gap: '12px' }}>
                                            <div className="modal-field" style={{ flex: 1 }}>
                                                <label className="modal-label"><Clock size={15} /><span>Début</span></label>
                                                <input 
                                                    type="time" 
                                                    value={startTime} 
                                                    onChange={(e) => setStartTime(e.target.value)} 
                                                    className="modal-input-time"
                                                    required 
                                                />
                                            </div>
                                            <div className="modal-field" style={{ flex: 1 }}>
                                                <label className="modal-label"><Clock size={15} /><span>Fin</span></label>
                                                <input 
                                                    type="time" 
                                                    value={endTime} 
                                                    onChange={(e) => setEndTime(e.target.value)} 
                                                    className="modal-input-time"
                                                    required 
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {isMobile && isTimeInvalid && (
                                        <div style={{
                                             color: '#f59e0b',
                                             fontSize: '12.5px',
                                             fontWeight: 600,
                                             display: 'flex',
                                             alignItems: 'center',
                                             gap: '6px',
                                             marginTop: '4px',
                                             padding: '0 2px'
                                        }}>
                                            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                                            <span>L'heure de fin doit être supérieure à l'heure de début ({startTime}).</span>
                                        </div>
                                    )}
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
                                    <div className="modal-field">
                                        <label className="modal-label"><Briefcase size={15} /><span>Type d'intervention</span></label>
                                        <div className="modal-select-wrapper">
                                            <select value={editServiceType} onChange={(e) => setEditServiceType(e.target.value)} className="modal-select" required>
                                                <option value="Installation">Installation</option>
                                                <option value="Maintenance">Maintenance</option>
                                                <option value="Dépannage">Dépannage</option>
                                                <option value="Contrôle">Contrôle</option>
                                            </select>
                                            <ChevronDown size={14} className="modal-select-arrow" />
                                        </div>
                                    </div>
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
                                    <div className="modal-footer-row edit-footer-row">
                                        <button type="button" className="modal-delete-btn" onClick={handleDeleteEvent}>Supprimer</button>
                                        <div className="footer-right-buttons">
                                            <button type="button" className="modal-cancel-btn" onClick={() => closeEditModal()}>Annuler</button>
                                            <button type="submit" className="modal-submit-btn edit-save-btn">Enregistrer</button>
                                        </div>
                                    </div>
                                </form>
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
                                            className={`client-search-item ${isPending ? 'selected' : ''}`}
                                            onClick={() => {
                                                setPendingClientName(c.name);
                                                setPendingClientId(c.id);
                                            }}
                                            onDoubleClick={() => {
                                                if (clientSearchTarget === "add") {
                                                    setNewClientName(c.name);
                                                    setNewClientId(c.id);
                                                } else {
                                                    setEditClientName(c.name);
                                                    setEditClientId(c.id);
                                                }
                                                setShowClientSearch(false);
                                                setClientSearchQuery("");
                                                setPendingClientName("");
                                                setPendingClientId("");
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
                                if (clientSearchTarget === "add") {
                                    setNewClientName(pendingClientName);
                                    setNewClientId(pendingClientId);
                                } else {
                                    setEditClientName(pendingClientName);
                                    setEditClientId(pendingClientId);
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
                <MobilePlanningView
                    events={filteredEvents}
                    selectedDate={mobileSelectedDate}
                    setSelectedDate={setMobileSelectedDate}
                    onSelectSlot={handleMobileOpenAdd}
                    onEventClick={handleMobileOpenEdit}
                />
                <SideBar onFabClick={handleMobileFabClick} />
                {sharedModals}
                {clientSearchPortal}
            </div>
        );
    }

    // ── Desktop layout (untouched) ────────────────────────────────
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
                    {/* Custom Header Row */}
                    <div className="calendar-header-row">
                        <div className="header-left-group">
                            <h1 className="content-title">Planning</h1>
                            <div className="calendar-navigation">
                                <button className="nav-arrow-btn" onClick={handlePrev} title="Précédent">
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="calendar-current-range">{currentTitle}</span>
                                <button className="nav-arrow-btn" onClick={handleNext} title="Suivant">
                                    <ChevronRight size={18} />
                                </button>
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
                                    <option value="Tous">Tous</option>
                                    <option value="Installation">Installation</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Dépannage">Dépannage</option>
                                    <option value="Contrôle">Contrôle</option>
                                </select>
                                <ChevronDown size={14} className="dropdown-arrow-icon" />
                            </div>

                            {/* New Intervention Button */}
                            <button className="new-intervention-btn" onClick={handleHeaderAddIntervention}>
                                <Plus size={16} />
                                <span>Intervention</span>
                            </button>
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
                        />
                    </div>
                </motion.div>
            </div>
            {sharedModals}
            {clientSearchPortal}
        </div>
    );
}

export default PlanningPage;
