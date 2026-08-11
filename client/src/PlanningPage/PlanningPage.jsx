import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../HomePage/Homepage.css";
import "./PlanningPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import EventCalendar from "../components/EventCalendar";
import MobilePlanningView from "./MobilePlanningView";
import { ChevronLeft, ChevronRight, Plus, ChevronDown, X, User, Building, Briefcase, Clock, ArrowLeft, Search, AlertTriangle } from "lucide-react";

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
const clientDetails = [];
const clientList = [];

const getGroupedClients = (list) => {
    const grouped = {};
    list.forEach(c => {
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

const technicianList = [
    "Non assigné"
];

// ── Component ─────────────────────────────────────────────────────
import { apiFetch } from "../utils/api";

function PlanningPage() {
    const windowWidth = useWindowWidth();
    const isMobile = windowWidth <= 768;

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchInterventions = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/v1/interventions');
            const rawInterventions = data.data?.interventions || data.interventions || (Array.isArray(data) ? data : []);
            const mappedEvents = rawInterventions.map(item => ({
                id: String(item.id),
                title: item.client ? `${item.client.firstName || ''} ${item.client.lastName || item.client.companyName || ''}`.trim() : (item.title || "Intervention"),
                start: item.scheduledAt || item.start || new Date().toISOString(),
                end: item.end || (item.scheduledAt ? new Date(new Date(item.scheduledAt).getTime() + (item.estimatedDuration || 90) * 60000).toISOString() : new Date().toISOString()),
                extendedProps: {
                    type: item.interventionType?.name || item.type || "Installation",
                    technician: item.technician ? `${item.technician.firstName || ''} ${item.technician.lastName || ''}`.trim() : (item.technicianName || "Non assigné"),
                    address: item.address || item.client?.address || "",
                    city: item.city || item.client?.city || ""
                }
            }));
            setEvents(mappedEvents);
        } catch (err) {
            console.warn("API interventions non disponible:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterventions();
    }, []);

    const [mobileSelectedDate, setMobileSelectedDate] = useState(() => new Date());
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:30");
    const [typeFilter, setTypeFilter] = useState("Tous");
    const [currentTitle, setCurrentTitle] = useState("19 - 25 Mai 2026");
    const [currentView, setCurrentView] = useState("timeGridWeek");
    const calendarRef = useRef(null);

    // Modal state — add
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [newClientName, setNewClientName] = useState(clientList[0]);
    const [newServiceType, setNewServiceType] = useState("Installation");
    const [newTechnician, setNewTechnician] = useState(technicianList[0]);

    // Modal state — edit
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editClientName, setEditClientName] = useState("");
    const [editServiceType, setEditServiceType] = useState("Installation");
    const [editTechnician, setEditTechnician] = useState("Marc D.");

    const [showClientSearch, setShowClientSearch] = useState(false);
    const [clientSearchTarget, setClientSearchTarget] = useState("add"); // "add" or "edit"
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [pendingClientName, setPendingClientName] = useState(""); // highlighted but not yet confirmed

    // Disable page scrolling when modal or client search is open
    useEffect(() => {
        if (showAddModal || showEditModal || showClientSearch) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showAddModal, showEditModal, showClientSearch]);

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

        setNewClientName(clientList[0]);
        setNewServiceType("Installation");
        setNewTechnician(technicianList[0]);
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

        setEditClientName(event.title);
        setEditServiceType(event.extendedProps.type || "Installation");
        setEditTechnician(event.extendedProps.technician || "Non assigné");
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
        setNewClientName(clientList[0]);
        setNewServiceType("Installation");
        setNewTechnician(technicianList[0]);
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
    // Save new event
    const handleAddEventSubmit = async (e) => {
        e.preventDefault();
        if (!newClientName || !selectedSlot) return;

        if (isMobile && isTimeInvalid) {
            alert("L'heure de fin doit être supérieure à l'heure de début !");
            return;
        }

        let startStr = selectedSlot.startStr;

        try {
            await apiFetch('/v1/interventions', {
                method: 'POST',
                body: JSON.stringify({
                    title: `${newServiceType} - ${newClientName}`,
                    scheduledAt: startStr,
                    estimatedDuration: 90,
                    address: "Adresse du client",
                    city: "Nice",
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
        if (!editClientName || !selectedEvent) return;

        try {
            await apiFetch(`/v1/interventions/${selectedEvent.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: `${editServiceType} - ${editClientName}`,
                    description: `Intervention ${editServiceType}`
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

    // Delete event
    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        if (window.confirm("Voulez-vous vraiment supprimer cette intervention ?")) {
            try {
                await apiFetch(`/v1/interventions/${selectedEvent.id}`, {
                    method: 'DELETE'
                });
                await fetchInterventions();
            } catch (err) {
                console.error("Delete intervention API error:", err);
                alert(err.message || "Erreur lors de la suppression");
            } finally {
                setShowEditModal(false);
                setSelectedEvent(null);
            }
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

        setNewClientName(clientList[0]);
        setNewServiceType("Installation");
        setNewTechnician(technicianList[0]);
        setShowAddModal(true);
    };

    const handleMobileOpenEdit = (ev) => {
        setSelectedEvent(ev);
        const start = new Date(ev.start);
        const end = new Date(ev.end);
        const pad = (n) => String(n).padStart(2, "0");
        setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
        setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);

        setEditClientName(ev.title);
        setEditServiceType(ev.extendedProps?.type || "Installation");
        setEditTechnician(ev.extendedProps?.technician || "Non assigné");
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
                                            <select value={newTechnician} onChange={(e) => setNewTechnician(e.target.value)} className="modal-select" required>
                                                {technicianList.map(t => <option key={t} value={t}>{t}</option>)}
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
                                            <select value={editTechnician} onChange={(e) => setEditTechnician(e.target.value)} className="modal-select" required>
                                                {technicianList.map(t => <option key={t} value={t}>{t}</option>)}
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
                                    const isPending = pendingClientName === c.name;
                                    return (
                                        <div 
                                            key={c.name}
                                            className={`client-search-item ${isPending ? 'selected' : ''}`}
                                            onClick={() => {
                                                setPendingClientName(c.name);
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
                                } else {
                                    setEditClientName(pendingClientName);
                                }
                                setShowClientSearch(false);
                                setClientSearchQuery("");
                                setPendingClientName("");
                            }}
                        >
                            Confirmer — {pendingClientName}
                        </button>
                    )}
                    <button 
                        type="button" 
                        className={`client-search-add-btn ${pendingClientName ? 'secondary' : ''}`}
                        onClick={() => {
                            const name = prompt("Nom du nouveau client :");
                            if (name && name.trim()) {
                                clientDetails.push({ name: name.trim(), type: "Particulier" });
                                clientDetails.sort((a, b) => a.name.localeCompare(b.name));
                                if (clientSearchTarget === "add") {
                                    setNewClientName(name.trim());
                                } else {
                                    setEditClientName(name.trim());
                                }
                                setShowClientSearch(false);
                                setClientSearchQuery("");
                                setPendingClientName("");
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
                            onEventChange={setEvents}
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
