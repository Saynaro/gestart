import React, { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import frLocale from "@fullcalendar/react/locales/fr";

import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';

function EventCalendar({ 
    events, 
    onEventChange, 
    onSelectSlot, 
    onEventClick, 
    typeFilter, 
    currentView, 
    calendarRef, 
    onDatesSet 
}) {
    let touchStartX = 0;
    let touchStartY = 0;

    // Handle touch start for swipe detection
    const handleTouchStart = (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    };

    // Handle touch end for swipe detection
    const handleTouchEnd = (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // Verify if swipe is horizontal and exceeds threshold
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
            const api = calendarRef.current?.getApi();
            if (!api) return;

            // Swipe navigation only works in Day View (timeGridDay)
            if (api.view.type === "timeGridDay") {
                if (diffX > 0) {
                    api.prev(); // swipe right -> previous day
                } else {
                    api.next(); // swipe left -> next day
                }
            }
        }
    };

    // Handle event drop (dragging) and event resize
    const handleEventChange = (changeInfo) => {
        const { event } = changeInfo;
        const updatedEvents = events.map(e => {
            if (e.id === event.id) {
                return {
                    ...e,
                    start: event.startStr,
                    end: event.endStr
                };
            }
            return e;
        });
        onEventChange(updatedEvents);
    };

    // Handle time slot select
    const handleSelect = (selectInfo) => {
        // Only open modal if user actually selected a range (not just a click)
        // A real drag-select will have start != end
        onSelectSlot(selectInfo);
        const api = calendarRef.current?.getApi();
        api?.unselect();
    };

    // Custom Event Content Renderer
    const renderEventContent = (eventInfo) => {
        const { event } = eventInfo;
        const type = event.extendedProps && event.extendedProps.type ? event.extendedProps.type : "Installation";
        const technician = event.extendedProps && event.extendedProps.technician ? event.extendedProps.technician : "";
        const client = event.title || "Nouvelle Intervention";
        const timeText = eventInfo.timeText;

        // Duration-based layout modes
        const start = event.start;
        const end = event.end;
        const durationMin = start && end ? (end - start) / 60000 : 90;
        const isCompact = durationMin <= 35;          // ≤35 min: single line
        const isMedium  = !isCompact && durationMin <= 75; // 36–75 min: hide type row

        const typeClass = `type-${type.toLowerCase().replace(/é/g, 'e').replace(/ô/g, 'o')}`;

        if (isCompact) {
            // Compact: single line — time + client + icon
            return (
                <div className={`custom-event-card ${typeClass} compact`}>
                    <div className="event-details">
                        <div className="event-title-row">
                            <div className="title-left-group">
                                {timeText && <span className="event-time-tag">{timeText}</span>}
                                <span className="event-title">{client}</span>
                            </div>
                            <span className="event-warning-icon">!</span>
                        </div>
                    </div>
                </div>
            );
        }

        // Normal / Medium: time on top, then client + icon
        return (
            <div className={`custom-event-card ${typeClass}`}>
                <div className="event-details">
                    {/* Row 1: time */}
                    {timeText && <div className="event-time-tag event-time-block">{timeText}</div>}

                    {/* Row 2: client name + ! icon */}
                    <div className="event-title-row">
                        <span className="event-title">{client}</span>
                        <span className="event-warning-icon">!</span>
                    </div>

                    {/* Row 3: type — hidden on medium */}
                    {!isMedium && <div className="event-type">{type}</div>}

                    {/* Row 4: technician — hidden on medium */}
                    {!isMedium && technician && (
                        <div className="event-tech">
                            <svg className="tech-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span>{technician}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };


    return (
        <div 
            className="calendar-touch-wrapper" 
            onTouchStart={handleTouchStart} 
            onTouchEnd={handleTouchEnd}
        >
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, classicThemePlugin]}
                initialView="timeGridWeek"
                initialDate="2026-05-19"
                locale={frLocale}
                headerToolbar={false}
                events={events}
                eventContent={renderEventContent}
                datesSet={onDatesSet}
                slotMinTime="07:00:00"
                slotMaxTime="19:00:00"
                allDaySlot={false}
                height="auto"
                firstDay={1}
                dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
                slotLabelContent={(info) => `${info.date.getHours()}h`}
                editable={true}
                selectable={true}
                selectMirror={true}
                eventInteractive={true}
                eventColor="transparent"
                eventBorderColor="transparent"
                eventBackgroundColor="transparent"
                eventDrop={handleEventChange}
                eventResize={handleEventChange}
                select={handleSelect}
                eventClick={onEventClick}
            />

        </div>
    );
}

export default EventCalendar;
