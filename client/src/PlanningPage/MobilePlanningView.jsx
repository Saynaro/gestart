import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, User, Briefcase, Building, Clock, Lock } from "lucide-react";

function MobilePlanningView({ events, setEvents, onEventClick, onSelectSlot, selectedDate, setSelectedDate, isExpired = false }) {

    // Swipe gesture refs
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    // Helpers to get all days of the selected month
    const getMonthDays = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const numDays = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 1; i <= numDays; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);

    // Filter events of the selected day
    const dayEvents = useMemo(() => {
        return events.filter(e => {
            const eDate = new Date(e.start);
            return eDate.getFullYear() === selectedDate.getFullYear() &&
                   eDate.getMonth() === selectedDate.getMonth() &&
                   eDate.getDate() === selectedDate.getDate();
        });
    }, [events, selectedDate]);

    // Check if a day has any events (to render a small indicator dot in day-strip)
    const hasEventsOnDay = (date) => {
        return events.some(e => {
            const eDate = new Date(e.start);
            return eDate.getFullYear() === date.getFullYear() &&
                   eDate.getMonth() === date.getMonth() &&
                   eDate.getDate() === date.getDate();
        });
    };

    // Helper: is same day
    const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    // Swipe day navigations
    const handlePrevDay = () => {
        const d = new Date(selectedDate);
        d.setDate(selectedDate.getDate() - 1);
        setSelectedDate(d);
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(selectedDate.getDate() + 1);
        setSelectedDate(d);
    };

    // Navigator month navigations
    const handlePrevMonth = () => {
        const d = new Date(selectedDate);
        d.setMonth(selectedDate.getMonth() - 1);
        d.setDate(1);
        setSelectedDate(d);
    };

    const handleNextMonth = () => {
        const d = new Date(selectedDate);
        d.setMonth(selectedDate.getMonth() + 1);
        d.setDate(1);
        setSelectedDate(d);
    };

    // Swipe handlers
    const handleTouchStart = (e) => {
        if (e.targetTouches && e.targetTouches.length > 0) {
            touchStartX.current = e.targetTouches[0].clientX;
            touchEndX.current = e.targetTouches[0].clientX; // Initialize to avoid jumps
        }
    };

    const handleTouchMove = (e) => {
        if (e.targetTouches && e.targetTouches.length > 0) {
            touchEndX.current = e.targetTouches[0].clientX;
        }
    };

    const handleTouchEnd = () => {
        const swipeDistance = touchStartX.current - touchEndX.current;
        const threshold = 55; // swipe sensitivity
        if (swipeDistance > threshold) {
            handleNextDay();
        } else if (swipeDistance < -threshold) {
            handlePrevDay();
        }
    };

    // Auto scroll active day into view
    useEffect(() => {
        const timer = setTimeout(() => {
            const activeEl = document.querySelector(".mobile-day-strip-item.active");
            if (activeEl) {
                activeEl.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center"
                });
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [selectedDate]);

    // Localized formatting helpers (French locale)
    const formatNavigatorMonth = (date) => {
        try {
            const options = { month: 'long', year: 'numeric' };
            let str = date.toLocaleDateString('fr-FR', options);
            if (str && str.length > 0) {
                return str.charAt(0).toUpperCase() + str.slice(1);
            }
        } catch (error) {
            console.error("toLocaleDateString error:", error);
        }
        const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const formatDayName = (date) => {
        try {
            const name = date.toLocaleDateString("fr-FR", { weekday: "short" });
            if (name && name.length > 0) {
                let cleanName = name.charAt(0).toUpperCase() + name.slice(1).replace(".", "");
                return cleanName.substring(0, 3);
            }
        } catch (error) {
            console.error("toLocaleDateString error:", error);
        }
        // Fallback
        const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        return days[date.getDay()];
    };

    const formatTime = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };

    // Create slot details for new event add handler
    const handleAddClick = () => {
        const start = new Date(selectedDate);
        start.setHours(9, 0, 0, 0); // Default to 9:00 AM of selected day
        const end = new Date(start);
        end.setHours(10, 30, 0, 0); // Default to 10:30 AM
        
        const formatZero = (num) => String(num).padStart(2, '0');
        const startStr = `${start.getFullYear()}-${formatZero(start.getMonth() + 1)}-${formatZero(start.getDate())}T${formatZero(start.getHours())}:${formatZero(start.getMinutes())}:00`;
        const endStr = `${end.getFullYear()}-${formatZero(end.getMonth() + 1)}-${formatZero(end.getDate())}T${formatZero(end.getHours())}:${formatZero(end.getMinutes())}:00`;

        onSelectSlot({
            start,
            end,
            startStr,
            endStr
        });
    };

    // Auto scroll day strip to selected date
    const activeDayRef = useRef(null);
    useEffect(() => {
        if (activeDayRef.current) {
            activeDayRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [selectedDate]);

    return (
        <div className="mobile-planning-container">
            {/* Day Navigator */}
            <div className="mobile-day-navigator">
                <button className="mobile-nav-btn" onClick={handlePrevMonth}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="mobile-current-day-label">{formatNavigatorMonth(selectedDate)}</span>
                    {!isSameDay(selectedDate, new Date()) && (
                        <button
                            type="button"
                            className="mobile-today-chip"
                            onClick={() => setSelectedDate(new Date())}
                            style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(95, 75, 219, 0.1)',
                                color: 'var(--sidebar-primary)',
                                border: '1px solid rgba(95, 75, 219, 0.2)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Aujourd'hui
                        </button>
                    )}
                </div>
                <button className="mobile-nav-btn" onClick={handleNextMonth}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Month Days horizontal strip */}
            <div className="mobile-days-strip-container">
                <div className="mobile-days-strip">
                    {monthDays.map((date, index) => {
                        const active = isSameDay(date, selectedDate);
                        const hasEvents = hasEventsOnDay(date);
                        const isToday = isSameDay(date, new Date());
                        
                        return (
                            <button
                                key={index}
                                ref={active ? activeDayRef : null}
                                className={`mobile-day-strip-item ${active ? 'active' : ''} ${isToday ? 'today' : ''}`}
                                onClick={() => setSelectedDate(date)}
                            >
                                <span className="day-name">{formatDayName(date)}</span>
                                <span className="day-number">{date.getDate()}</span>
                                {hasEvents && <span className="day-indicator-dot" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Event List / Day view body with swipe gesture */}
            <div 
                className="mobile-events-scroll-area"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedDate.toDateString()}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="mobile-events-list-wrapper"
                    >
                        {dayEvents.length > 0 ? (
                            <div className="mobile-event-cards-list">
                                {dayEvents.map((evt) => {
                                    const eventTypeClass = `type-${(evt.extendedProps?.type || 'installation').toLowerCase()}`;
                                    
                                    return (
                                        <motion.div
                                            key={evt.id}
                                            className={`mobile-event-card ${eventTypeClass}`}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => onEventClick(evt)}
                                        >
                                            <div className="card-top-row">
                                                <div className="card-time-span">
                                                    <Clock size={14} className="card-icon" />
                                                    <span>{formatTime(evt.start)} – {formatTime(evt.end)}</span>
                                                </div>
                                                <span className="card-badge">{evt.extendedProps?.type || 'Intervention'}</span>
                                            </div>
                                            
                                            <h4 className="card-client-name">
                                                <User size={15} className="card-icon" />
                                                {evt.title}
                                            </h4>
                                            
                                            {evt.extendedProps?.technician && (
                                                <div className="card-technician-info">
                                                    <Building size={14} className="card-icon" />
                                                    <span>Tech: {evt.extendedProps.technician}</span>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="mobile-empty-state-view" onClick={handleAddClick}>
                                <div className="empty-illustration">
                                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="empty-calendar-icon">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                        <circle cx="12" cy="15" r="1.5"></circle>
                                    </svg>
                                </div>
                                <h3>Aucun événement</h3>
                                <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                    {isExpired && <Lock size={13} />}
                                    <span>Appuyez pour planifier une intervention</span>
                                </p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

export default MobilePlanningView;
