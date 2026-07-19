import React, { useState, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";

function DateRangeSelector({ activePreset, onRangeChange, startDate, endDate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [customStart, setCustomStart] = useState(startDate || "");
    const [customEnd, setCustomEnd] = useState(endDate || "");

    useEffect(() => {
        if (startDate) setCustomStart(startDate);
        if (endDate) setCustomEnd(endDate);
    }, [startDate, endDate]);

    const presets = [
        { id: "this_month", label: "Ce mois" },
        { id: "last_3_months", label: "3 derniers mois" },
        { id: "this_year", label: "Cette année" },
        { id: "custom", label: "Personnalisé" }
    ];

    const handlePresetClick = (preset) => {
        if (preset.id === "custom") {
            setIsOpen(!isOpen);
        } else {
            setIsOpen(false);
            let start = new Date();
            let end = new Date();
            if (preset.id === "this_month") {
                start = new Date(start.getFullYear(), start.getMonth(), 1);
                end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            } else if (preset.id === "last_3_months") {
                start = new Date(start.getFullYear(), start.getMonth() - 2, 1);
                end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            } else if (preset.id === "this_year") {
                start = new Date(start.getFullYear(), 0, 1);
                end = new Date(start.getFullYear(), 11, 31);
            }
            
            // Format to YYYY-MM-DD local dates
            const formatDate = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            onRangeChange(preset.id, formatDate(start), formatDate(end));
        }
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (customStart && customEnd) {
            onRangeChange("custom", customStart, customEnd);
            setIsOpen(false);
        }
    };

    const getDisplayRange = () => {
        if (activePreset === "this_month") return "Ce mois";
        if (activePreset === "last_3_months") return "3 derniers mois";
        if (activePreset === "this_year") return "Cette année";
        
        // Format dates for display (DD/MM/YYYY)
        const formatDisplay = (dateStr) => {
            if (!dateStr) return "";
            const [y, m, d] = dateStr.split("-");
            return `${d}/${m}/${y}`;
        };
        return `${formatDisplay(startDate)} — ${formatDisplay(endDate)}`;
    };

    return (
        <div className="date-range-container">
            <div className="date-range-selector-row">
                <div className="presets-list">
                    {presets.filter(p => p.id !== "custom").map((preset) => (
                        <button
                            key={preset.id}
                            className={`preset-btn ${activePreset === preset.id ? "active" : ""}`}
                            onClick={() => handlePresetClick(preset)}
                        >
                            <span>{preset.label}</span>
                        </button>
                    ))}
                </div>

                <button
                    className={`preset-btn custom-preset-btn ${activePreset === "custom" ? "active" : ""}`}
                    onClick={() => handlePresetClick({ id: "custom" })}
                >
                    <Calendar size={14} className="preset-icon" />
                    <span>Personnalisé</span>
                    <ChevronDown size={14} className="dropdown-arrow" />
                </button>
            </div>

            {isOpen && (
                <div className="custom-picker-dropdown">
                    <form onSubmit={handleCustomSubmit} className="custom-picker-form">
                        <div className="picker-inputs">
                            <div className="picker-field">
                                <label>Du</label>
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    required
                                    className="picker-input"
                                />
                            </div>
                            <div className="picker-field">
                                <label>Au</label>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    required
                                    className="picker-input"
                                />
                            </div>
                        </div>
                        <button type="submit" className="picker-submit-btn">
                            Appliquer
                        </button>
                    </form>
                </div>
            )}

            <div className="current-range-badge">
                <Calendar size={14} />
                <span>Période active : <strong>{getDisplayRange()}</strong></span>
            </div>
        </div>
    );
}

export default DateRangeSelector;
