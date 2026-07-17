import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../HomePage/Homepage.css";
import "./PlanningPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import EventCalendar from "../components/EventCalendar";
import { ChevronLeft, ChevronRight, Plus, ChevronDown, X, User, Building, Briefcase } from "lucide-react";

const initialEvents = [
    {
        id: "1",
        title: "Martin Dupont",
        start: "2026-05-19T09:00:00",
        end: "2026-05-19T10:30:00",
        extendedProps: {
            type: "Installation",
            technician: "Marc D."
        }
    },
    {
        id: "2",
        title: "Claire Laurent",
        start: "2026-05-22T09:00:00",
        end: "2026-05-22T10:30:00",
        extendedProps: {
            type: "Contrôle",
            technician: ""
        }
    },
    {
        id: "3",
        title: "Jean Moreau",
        start: "2026-05-20T10:00:00",
        end: "2026-05-20T11:30:00",
        extendedProps: {
            type: "Dépannage",
            technician: "Marc D."
        }
    },
    {
        id: "4",
        title: "Sophie Martin",
        start: "2026-05-21T11:00:00",
        end: "2026-05-21T13:00:00",
        extendedProps: {
            type: "Maintenance",
            technician: "Marc D."
        }
    },
    {
        id: "5",
        title: "Pierre Leroy",
        start: "2026-05-23T14:00:00",
        end: "2026-05-23T15:30:00",
        extendedProps: {
            type: "Dépannage",
            technician: "Pierre L."
        }
    },
    {
        id: "6",
        title: "Marie Dubois",
        start: "2026-05-25T16:00:00",
        end: "2026-05-25T17:30:00",
        extendedProps: {
            type: "Contrôle",
            technician: "Marie D."
        }
    }
];

const clientList = [
    "Jane Doe",
    "John Doe",
    "Khalid Sainaro",
    "Martin Dupont",
    "Sophie Bernard",
    "Jean Moreau",
    "Marie Dubois",
    "Claire Laurent",
    "Pierre Leroy"
];

const technicianList = [
    "Marc D.",
    "Pierre L.",
    "Marie D.",
    "Non assigné"
];

function PlanningPage() {
    const [events, setEvents] = useState(initialEvents);
    const [typeFilter, setTypeFilter] = useState("Tous");
    const [currentTitle, setCurrentTitle] = useState("19 - 25 Mai 2026");
    const [currentView, setCurrentView] = useState("timeGridWeek");
    const calendarRef = useRef(null);

    // Modal state for adding a new event
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [newClientName, setNewClientName] = useState(clientList[0]);
    const [newServiceType, setNewServiceType] = useState("Installation");
    const [newTechnician, setNewTechnician] = useState(technicianList[0]);

    // Modal state for editing an existing event
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editClientName, setEditClientName] = useState("");
    const [editServiceType, setEditServiceType] = useState("Installation");
    const [editTechnician, setEditTechnician] = useState("Marc D.");

    const handlePrev = () => {
        calendarRef.current?.getApi().prev();
    };

    const handleNext = () => {
        calendarRef.current?.getApi().next();
    };

    const handleViewChange = (viewName) => {
        setCurrentView(viewName);
        calendarRef.current?.getApi().changeView(viewName);
    };

    const handleDatesSet = (dateInfo) => {
        setCurrentTitle(dateInfo.view.title);
        setCurrentView(dateInfo.view.type);
    };

    // Slot click handler - opens the Add Event modal
    const handleSelectSlot = (selectInfo) => {
        setSelectedSlot(selectInfo);
        setNewClientName(clientList[0]);
        setNewServiceType("Installation");
        setNewTechnician(technicianList[0]);
        setShowAddModal(true);
    };

    // Event click handler - opens the Edit/Delete Modal
    const handleEventClick = (clickInfo) => {
        const { event } = clickInfo;
        setSelectedEvent(event);
        setEditClientName(event.title);
        setEditServiceType(event.extendedProps.type || "Installation");
        setEditTechnician(event.extendedProps.technician || "Non assigné");
        setShowEditModal(true);
    };

    // Form submission to save new event
    const handleAddEventSubmit = (e) => {
        e.preventDefault();
        if (!newClientName || !selectedSlot) return;

        const newEvent = {
            id: String(Date.now()),
            title: newClientName,
            start: selectedSlot.startStr,
            end: selectedSlot.endStr,
            extendedProps: {
                type: newServiceType,
                technician: newTechnician === "Non assigné" ? "" : newTechnician
            }
        };

        setEvents(prev => [...prev, newEvent]);
        setShowAddModal(false);
        setSelectedSlot(null);
    };

    // Save changes for editing event
    const handleEditEventSubmit = (e) => {
        e.preventDefault();
        if (!editClientName || !selectedEvent) return;

        setEvents(prev => prev.map(evt => {
            if (evt.id === selectedEvent.id) {
                return {
                    ...evt,
                    title: editClientName,
                    extendedProps: {
                        ...evt.extendedProps,
                        type: editServiceType,
                        technician: editTechnician === "Non assigné" ? "" : editTechnician
                    }
                };
            }
            return evt;
        }));
        setShowEditModal(false);
        setSelectedEvent(null);
    };

    // Delete event
    const handleDeleteEvent = () => {
        if (!selectedEvent) return;
        setEvents(prev => prev.filter(evt => evt.id !== selectedEvent.id));
        setShowEditModal(false);
        setSelectedEvent(null);
    };

    // Direct header "+ Intervention" button handler - creates an event for current date
    const handleHeaderAddIntervention = () => {
        const calendarApi = calendarRef.current?.getApi();
        const currentDate = calendarApi ? calendarApi.getDate() : new Date();
        
        // Setup slot range
        const start = new Date(currentDate);
        start.setHours(9, 0, 0, 0); // Default to 9:00 AM of visible date
        const end = new Date(start);
        end.setHours(10, 30, 0, 0); // Default to 10:30 AM
        
        const formatZero = (num) => String(num).padStart(2, '0');
        const startStr = `${start.getFullYear()}-${formatZero(start.getMonth() + 1)}-${formatZero(start.getDate())}T${formatZero(start.getHours())}:${formatZero(start.getMinutes())}:00`;
        const endStr = `${end.getFullYear()}-${formatZero(end.getMonth() + 1)}-${formatZero(end.getDate())}T${formatZero(end.getHours())}:${formatZero(end.getMinutes())}:00`;

        setSelectedSlot({
            start,
            end,
            startStr,
            endStr
        });
        setNewClientName(clientList[0]);
        setNewServiceType("Installation");
        setNewTechnician(technicianList[0]);
        setShowAddModal(true);
    };

    const filteredEvents = typeFilter === "Tous"
        ? events
        : events.filter(e => e.extendedProps.type === typeFilter);

    // Helpers to format slot date time inside the modal
    const formatSlotDateTime = (slotInfo) => {
        if (!slotInfo) return "";
        const start = new Date(slotInfo.start);
        const end = new Date(slotInfo.end);
        
        const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const dateStr = start.toLocaleDateString('fr-FR', optionsDate);
        
        const startHour = String(start.getHours()).padStart(2, '0');
        const startMin = String(start.getMinutes()).padStart(2, '0');
        const endHour = String(end.getHours()).padStart(2, '0');
        const endMin = String(end.getMinutes()).padStart(2, '0');
        
        return `${dateStr} de ${startHour}:${startMin} à ${endHour}:${endMin}`;
    };

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
                            
                            {/* Date Navigation */}
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
                        {/* View Selector Pill */}
                        <div className="view-selector-pill">
                            <button 
                                className={`view-btn ${currentView === 'timeGridDay' ? 'active' : ''}`}
                                onClick={() => handleViewChange('timeGridDay')}
                            >
                                Jour
                            </button>
                            <button 
                                className={`view-btn ${currentView === 'timeGridWeek' ? 'active' : ''}`}
                                onClick={() => handleViewChange('timeGridWeek')}
                            >
                                Semaine
                            </button>
                            <button 
                                className={`view-btn ${currentView === 'dayGridMonth' ? 'active' : ''}`}
                                onClick={() => handleViewChange('dayGridMonth')}
                            >
                                Mois
                            </button>
                        </div>

                        {/* Calendar Legends */}
                        <div className="calendar-legends">
                            <div className="legend-item type-installation">
                                <span className="legend-dot"></span>
                                <span>Installation</span>
                            </div>
                            <div className="legend-item type-maintenance">
                                <span className="legend-dot"></span>
                                <span>Maintenance</span>
                            </div>
                            <div className="legend-item type-depannage">
                                <span className="legend-dot"></span>
                                <span>Dépannage</span>
                            </div>
                            <div className="legend-item type-controle">
                                <span className="legend-dot"></span>
                                <span>Contrôle</span>
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

            {createPortal(
                <AnimatePresence>
                    {showAddModal && (
                        <>
                            {/* Overlay backdrop */}
                            <motion.div 
                                className="modal-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowAddModal(false)}
                            />

                            {/* Modal Container - motion.div owns all transforms: x/y for centering + scale/opacity for animation */}
                            <motion.div
                                className="add-event-modal"
                                style={{ x: '-50%', y: '-50%' }}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
                            >
                                <div className="modal-header">
                                    <h3>Nouvelle Intervention</h3>
                                    <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                                        <X size={18} />
                                    </button>
                                </div>

                                <form onSubmit={handleAddEventSubmit} className="modal-form-stack">
                                    {/* Slot Time Info Banner */}
                                    <div className="modal-slot-info">
                                        <span className="slot-info-label">Créneau sélectionné :</span>
                                        <span className="slot-info-val">{formatSlotDateTime(selectedSlot)}</span>
                                    </div>

                                    <div className="modal-field">
                                        <label className="modal-label">
                                            <User size={15} />
                                            <span>Client / Nom du contact</span>
                                        </label>
                                        <div className="modal-select-wrapper">
                                            <select 
                                                value={newClientName}
                                                onChange={(e) => setNewClientName(e.target.value)}
                                                className="modal-select"
                                                required
                                            >
                                                {clientList.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="modal-select-arrow" />
                                        </div>
                                    </div>

                                    <div className="modal-field">
                                        <label className="modal-label">
                                            <Briefcase size={15} />
                                            <span>Type d'intervention</span>
                                        </label>
                                        <div className="modal-select-wrapper">
                                            <select 
                                                value={newServiceType}
                                                onChange={(e) => setNewServiceType(e.target.value)}
                                                className="modal-select"
                                                required
                                            >
                                                <option value="Installation">Installation</option>
                                                <option value="Maintenance">Maintenance</option>
                                                <option value="Dépannage">Dépannage</option>
                                                <option value="Contrôle">Contrôle</option>
                                            </select>
                                            <ChevronDown size={14} className="modal-select-arrow" />
                                        </div>
                                    </div>

                                    <div className="modal-field">
                                        <label className="modal-label">
                                            <Building size={15} />
                                            <span>Technicien assigné</span>
                                        </label>
                                        <div className="modal-select-wrapper">
                                            <select 
                                                value={newTechnician}
                                                onChange={(e) => setNewTechnician(e.target.value)}
                                                className="modal-select"
                                                required
                                            >
                                                {technicianList.map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="modal-select-arrow" />
                                        </div>
                                    </div>

                                    <div className="modal-footer-row">
                                        <button 
                                            type="button" 
                                            className="modal-cancel-btn"
                                            onClick={() => setShowAddModal(false)}
                                        >
                                            Annuler
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="modal-submit-btn"
                                        >
                                            Créer l'intervention
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Modal for editing an existing event */}
            {createPortal(
                <AnimatePresence>
                    {showEditModal && (
                        <>
                            {/* Overlay backdrop */}
                            <motion.div 
                                className="modal-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowEditModal(false)}
                            />

                            {/* Modal Container - motion.div owns all transforms */}
                            <motion.div
                                className="add-event-modal"
                                style={{ x: '-50%', y: '-50%' }}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
                            >
                                <div className="modal-header">
                                    <h3>Modifier l'Intervention</h3>
                                    <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                                        <X size={18} />
                                    </button>
                                </div>

                                <form onSubmit={handleEditEventSubmit} className="modal-form-stack">
                                    {/* Slot Time Info Banner */}
                                    <div className="modal-slot-info">
                                        <span className="slot-info-label">Horaire planifié :</span>
                                        <span className="slot-info-val">{formatSlotDateTime(selectedEvent)}</span>
                                    </div>

                                    <div className="modal-field">
                                        <label className="modal-label">
                                            <User size={15} />
                                            <span>Client / Nom du contact</span>
                                        </label>
                                        <div className="modal-select-wrapper">
                                            <select 
                                                value={editClientName}
                                                onChange={(e) => setEditClientName(e.target.value)}
                                                className="modal-select"
                                                required
                                            >
                                                {clientList.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="modal-select-arrow" />
                                        </div>
                                    </div>

                                    <div className="modal-field">
                                        <label className="modal-label">
                                            <Briefcase size={15} />
                                            <span>Type d'intervention</span>
                                        </label>
                                        <div className="modal-select-wrapper">
                                            <select 
                                                value={editServiceType}
                                                onChange={(e) => setEditServiceType(e.target.value)}
                                                className="modal-select"
                                                required
                                            >
                                                <option value="Installation">Installation</option>
                                                <option value="Maintenance">Maintenance</option>
                                                <option value="Dépannage">Dépannage</option>
                                                <option value="Contrôle">Contrôle</option>
                                            </select>
                                            <ChevronDown size={14} className="modal-select-arrow" />
                                        </div>
                                    </div>

                                    <div className="modal-field">
                                        <label className="modal-label">
                                            <Building size={15} />
                                            <span>Technicien assigné</span>
                                        </label>
                                        <div className="modal-select-wrapper">
                                            <select 
                                                value={editTechnician}
                                                onChange={(e) => setEditTechnician(e.target.value)}
                                                className="modal-select"
                                                required
                                            >
                                                {technicianList.map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="modal-select-arrow" />
                                        </div>
                                    </div>

                                    <div className="modal-footer-row edit-footer-row">
                                        <button 
                                            type="button" 
                                            className="modal-delete-btn"
                                            onClick={handleDeleteEvent}
                                        >
                                            Supprimer
                                        </button>
                                        <div className="footer-right-buttons">
                                            <button 
                                                type="button" 
                                                className="modal-cancel-btn"
                                                onClick={() => setShowEditModal(false)}
                                            >
                                                Annuler
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="modal-submit-btn edit-save-btn"
                                            >
                                                Enregistrer
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

export default PlanningPage;
