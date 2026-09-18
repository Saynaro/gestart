import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check } from "lucide-react";
import "./PhoneInput.css";

export const COUNTRIES = [
    { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷", maxDigits: 9, pattern: [1, 2, 2, 2, 2], sample: "6 12 34 56 78" },
    { code: "RU", name: "Russie", dialCode: "+7", flag: "🇷🇺", maxDigits: 10, pattern: [3, 3, 2, 2], sample: "912 345 67 89" },
    { code: "BE", name: "Belgique", dialCode: "+32", flag: "🇧🇪", maxDigits: 9, pattern: [3, 2, 2, 2], sample: "470 12 34 56" },
    { code: "CH", name: "Suisse", dialCode: "+41", flag: "🇨🇭", maxDigits: 9, pattern: [2, 3, 2, 2], sample: "79 123 45 67" },
    { code: "LU", name: "Luxembourg", dialCode: "+352", flag: "🇱🇺", maxDigits: 9, pattern: [3, 3, 3], sample: "621 123 456" },
    { code: "MC", name: "Monaco", dialCode: "+377", flag: "🇲🇨", maxDigits: 8, pattern: [1, 2, 2, 3], sample: "6 12 34 567" },
    { code: "DE", name: "Allemagne", dialCode: "+49", flag: "🇩🇪", maxDigits: 11, pattern: [3, 4, 4], sample: "151 1234 5678" },
    { code: "ES", name: "Espagne", dialCode: "+34", flag: "🇪🇸", maxDigits: 9, pattern: [3, 2, 2, 2], sample: "612 34 56 78" },
    { code: "IT", name: "Italie", dialCode: "+39", flag: "🇮🇹", maxDigits: 10, pattern: [3, 3, 4], sample: "312 345 6789" },
    { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹", maxDigits: 9, pattern: [3, 3, 3], sample: "912 345 678" },
    { code: "GB", name: "Royaume-Uni", dialCode: "+44", flag: "🇬🇧", maxDigits: 10, pattern: [4, 3, 3], sample: "7911 123 456" },
    { code: "NL", name: "Pays-Bas", dialCode: "+31", flag: "🇳🇱", maxDigits: 9, pattern: [1, 4, 4], sample: "6 1234 5678" },
    { code: "MA", name: "Maroc", dialCode: "+212", flag: "🇲🇦", maxDigits: 9, pattern: [1, 2, 2, 2, 2], sample: "6 12 34 56 78" },
    { code: "DZ", name: "Algérie", dialCode: "+213", flag: "🇩🇿", maxDigits: 9, pattern: [1, 2, 2, 2, 2], sample: "6 12 34 56 78" },
    { code: "TN", name: "Tunisie", dialCode: "+216", flag: "🇹🇳", maxDigits: 8, pattern: [2, 3, 3], sample: "20 123 456" },
    { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", maxDigits: 10, pattern: [3, 3, 4], sample: "514 123 4567" },
    { code: "US", name: "États-Unis", dialCode: "+1", flag: "🇺🇸", maxDigits: 10, pattern: [3, 3, 4], sample: "202 555 0123" },
];

/**
 * Format phone digits according to each country's exact chunk pattern and maximum digit count
 */
export function formatPhoneDigits(digits, country) {
    if (!digits) return "";
    let clean = String(digits).replace(/\D/g, "");

    // Strip leading 0 if present (e.g. 0651604316 -> 651604316)
    if (clean.startsWith("0")) {
        clean = clean.substring(1);
    }

    const currentCountry = country || COUNTRIES[0];
    const maxDigits = currentCountry.maxDigits || 15;

    // Restrict strictly to maximum digits for this country
    if (clean.length > maxDigits) {
        clean = clean.substring(0, maxDigits);
    }

    if (!clean) return "";

    const pattern = currentCountry.pattern || [2, 2, 2, 2, 2];
    const parts = [];
    let currentIndex = 0;

    for (const chunkSize of pattern) {
        if (currentIndex >= clean.length) break;
        parts.push(clean.substring(currentIndex, currentIndex + chunkSize));
        currentIndex += chunkSize;
    }

    // Remaining digits if pattern wasn't long enough
    if (currentIndex < clean.length) {
        parts.push(clean.substring(currentIndex));
    }

    return parts.join(" ");
}

/**
 * Parse an incoming string to extract country and local digits
 */
export function parsePhoneNumber(val, defaultCountryCode = "FR") {
    const defaultCountry = COUNTRIES.find(c => c.code === defaultCountryCode) || COUNTRIES[0];
    if (!val || typeof val !== "string") {
        return { country: defaultCountry, digits: "" };
    }

    const trimmed = val.trim();
    
    // Check if starts with a known dial code (e.g. +33, +352, +7, etc.)
    for (const c of COUNTRIES) {
        if (trimmed.startsWith(c.dialCode)) {
            let localPart = trimmed.substring(c.dialCode.length).replace(/\D/g, "");
            if (localPart.startsWith("0")) {
                localPart = localPart.substring(1);
            }
            if (localPart.length > c.maxDigits) {
                localPart = localPart.substring(0, c.maxDigits);
            }
            return { country: c, digits: localPart };
        }
    }

    // Otherwise clean digits and strip leading 0
    let clean = trimmed.replace(/\D/g, "");
    if (clean.startsWith("0")) {
        clean = clean.substring(1);
    }
    if (clean.length > defaultCountry.maxDigits) {
        clean = clean.substring(0, defaultCountry.maxDigits);
    }
    return { country: defaultCountry, digits: clean };
}

function PhoneInput({
    value = "",
    onChange,
    placeholder,
    required = false,
    disabled = false,
    name = "phone",
    id,
    className = "",
    autoFocus = false,
    style = {}
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [placement, setPlacement] = useState("top"); // "top" by default on desktop
    const [searchQuery, setSearchQuery] = useState("");
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Parse initial value or value changes
    const initialParsed = useMemo(() => parsePhoneNumber(value), []);
    const [selectedCountry, setSelectedCountry] = useState(initialParsed.country);
    const [localDigits, setLocalDigits] = useState(initialParsed.digits);

    // Dynamic placement check when dropdown opens on desktop
    useEffect(() => {
        if (isOpen && !isMobile && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            if (rect.top < 260 && (window.innerHeight - rect.bottom > rect.top)) {
                setPlacement("bottom");
            } else {
                setPlacement("top");
            }
        }
    }, [isOpen, isMobile]);

    // Keep state in sync if external value changes drastically
    useEffect(() => {
        if (value !== undefined) {
            const parsed = parsePhoneNumber(value);
            if (parsed.country.code !== selectedCountry.code) {
                setSelectedCountry(parsed.country);
            }
            if (parsed.digits !== localDigits) {
                setLocalDigits(parsed.digits);
            }
        }
    }, [value]);

    // Close dropdown on click outside for desktop
    useEffect(() => {
        if (!isOpen || isMobile) return;
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearchQuery("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, isMobile]);

    const toggleCountryPicker = (e) => {
        if (disabled) return;
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        // Dismiss keyboard first to avoid touch cancellation and provide smooth sheet opening
        if (inputRef.current) {
            inputRef.current.blur();
        }
        setIsOpen(prev => !prev);
    };

    const handleInputChange = (e) => {
        let raw = e.target.value;
        
        // Strip everything except digits
        let digits = raw.replace(/\D/g, "");

        // If user typed / pasted a leading 0, strip it automatically
        if (digits.startsWith("0")) {
            digits = digits.substring(1);
        }

        const currCountry = selectedCountry || COUNTRIES[0];

        // Limit strictly to country's maximum digits
        if (digits.length > (currCountry.maxDigits || 15)) {
            digits = digits.substring(0, currCountry.maxDigits || 15);
        }

        setLocalDigits(digits);

        const formattedLocal = formatPhoneDigits(digits, currCountry);
        const fullFormatted = digits ? `${currCountry.dialCode} ${formattedLocal}` : "";
        if (onChange) {
            onChange(fullFormatted, digits ? `${currCountry.dialCode}${digits}` : "");
        }
    };

    const handleSelectCountry = (country) => {
        setSelectedCountry(country);
        setIsOpen(false);
        setSearchQuery("");
        
        if (!isMobile) {
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 100);
        }

        let digits = localDigits;
        if (digits.length > country.maxDigits) {
            digits = digits.substring(0, country.maxDigits);
            setLocalDigits(digits);
        }

        const formattedLocal = formatPhoneDigits(digits, country);
        const fullFormatted = digits ? `${country.dialCode} ${formattedLocal}` : "";
        if (onChange) {
            onChange(fullFormatted, digits ? `${country.dialCode}${digits}` : "");
        }
    };

    const handleClear = () => {
        setLocalDigits("");
        if (onChange) {
            onChange("", "");
        }
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const filteredCountries = useMemo(() => {
        if (!searchQuery.trim()) return COUNTRIES;
        const q = searchQuery.toLowerCase().trim();
        return COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.dialCode.includes(q) ||
            c.code.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    const safeCountry = selectedCountry || COUNTRIES[0];
    const pattern = safeCountry?.pattern || [2, 2, 2, 2, 2];
    const maxDigits = safeCountry?.maxDigits || 15;
    const displayFormattedValue = formatPhoneDigits(localDigits, safeCountry);

    // Maximum formatted string length with spaces
    const maxFormattedLength = maxDigits + (pattern.length - 1);

    return (
        <div
            className={`phone-input-container ${disabled ? "disabled" : ""} ${className}`}
            style={style}
            ref={dropdownRef}
        >
            {/* Country Selector Button */}
            <button
                type="button"
                className="phone-country-btn"
                onPointerDown={(e) => {
                    // Prevent focus loss conflict on touch start
                    e.preventDefault();
                }}
                onClick={toggleCountryPicker}
                title={`${safeCountry.name} (${safeCountry.dialCode})`}
                aria-label="Sélectionner le pays"
                disabled={disabled}
            >
                <span className="phone-flag">{safeCountry.flag}</span>
                <span className="phone-dial-code">{safeCountry.dialCode}</span>
                <ChevronDown size={14} className={`phone-chevron ${isOpen ? "open" : ""}`} />
            </button>

            {/* Main Phone Number Input */}
            <input
                ref={inputRef}
                type="tel"
                id={id}
                name={name}
                className="phone-number-input"
                value={displayFormattedValue}
                onChange={handleInputChange}
                placeholder={placeholder || safeCountry.sample}
                maxLength={maxFormattedLength}
                required={required}
                disabled={disabled}
                autoFocus={autoFocus}
                autoComplete="off"
            />

            {/* Clear Button */}
            {localDigits && !disabled && (
                <button
                    type="button"
                    className="phone-clear-btn"
                    onClick={handleClear}
                    title="Effacer le numéro"
                    aria-label="Effacer"
                >
                    <X size={14} />
                </button>
            )}

            {/* Mobile Country Picker Modal / Sheet (via Portal) */}
            {isOpen && isMobile && typeof document !== "undefined" && createPortal(
                <div style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999999,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end"
                }}>
                    {/* Backdrop */}
                    <div
                        style={{
                            position: "fixed",
                            inset: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.55)",
                            backdropFilter: "blur(3px)",
                            WebkitBackdropFilter: "blur(3px)"
                        }}
                        onClick={() => {
                            setIsOpen(false);
                            setSearchQuery("");
                        }}
                    />

                    {/* Sheet Content */}
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            maxWidth: "480px",
                            margin: "0 auto",
                            backgroundColor: "var(--card, #ffffff)",
                            color: "var(--foreground, #0f172a)",
                            borderTopLeftRadius: "24px",
                            borderTopRightRadius: "24px",
                            boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.25)",
                            maxHeight: "75vh",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            animation: "phoneMenuSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                            paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag indicator */}
                        <div style={{ display: "flex", justifyContent: "center", paddingTop: "10px", paddingBottom: "6px" }}>
                            <div style={{ width: "36px", height: "4px", borderRadius: "999px", backgroundColor: "var(--border, #cbd5e1)" }} />
                        </div>

                        {/* Sheet Header */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 18px 12px 18px"
                        }}>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                                Indicatif pays
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setSearchQuery("");
                                }}
                                style={{
                                    border: "none",
                                    background: "rgba(0, 0, 0, 0.05)",
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    color: "var(--muted-foreground, #64748b)"
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Search Input Box */}
                        <div style={{ padding: "0 16px 10px 16px" }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 12px",
                                backgroundColor: "var(--muted, #f1f5f9)",
                                borderRadius: "10px",
                                border: "1px solid var(--border, #e2e8f0)"
                            }}>
                                <Search size={15} style={{ color: "var(--muted-foreground, #94a3b8)" }} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Rechercher un pays ou indicatif (+33...)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: "100%",
                                        border: "none",
                                        background: "transparent",
                                        outline: "none",
                                        fontSize: "14px",
                                        color: "var(--foreground, #0f172a)"
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Country List */}
                        <ul style={{
                            margin: 0,
                            padding: "4px 12px",
                            listStyle: "none",
                            overflowY: "auto",
                            flex: 1,
                            maxHeight: "50vh"
                        }}>
                            {filteredCountries.length > 0 ? (
                                filteredCountries.map((c) => {
                                    const isSelected = c.code === selectedCountry.code;
                                    return (
                                        <li key={c.code} style={{ marginBottom: "2px" }}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectCountry(c)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    width: "100%",
                                                    padding: "11px 14px",
                                                    border: "none",
                                                    backgroundColor: isSelected ? "rgba(85, 107, 47, 0.08)" : "transparent",
                                                    borderRadius: "10px",
                                                    cursor: "pointer",
                                                    textAlign: "left",
                                                    color: isSelected ? "#556B2F" : "var(--foreground, #0f172a)",
                                                    fontWeight: isSelected ? 700 : 500,
                                                    fontSize: "14.5px"
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <span style={{ fontSize: "20px", lineHeight: 1 }}>{c.flag}</span>
                                                    <span>{c.name}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <span style={{ fontSize: "13.5px", color: isSelected ? "#556B2F" : "var(--muted-foreground, #64748b)", fontWeight: 600 }}>
                                                        {c.dialCode}
                                                    </span>
                                                    {isSelected && <Check size={16} strokeWidth={2.5} style={{ color: "#556B2F" }} />}
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })
                            ) : (
                                <li style={{ padding: "24px 0", textAlign: "center", color: "var(--muted-foreground, #94a3b8)", fontSize: "13.5px" }}>
                                    Aucun pays trouvé
                                </li>
                            )}
                        </ul>
                    </div>
                </div>,
                document.body
            )}

            {/* Desktop Country Dropdown Picker */}
            {isOpen && !isMobile && (
                <div className={`phone-dropdown-menu placement-${placement}`}>
                    <div className="phone-dropdown-search-wrapper">
                        <Search size={14} style={{ color: "var(--muted-foreground, #94a3b8)" }} />
                        <input
                            type="text"
                            className="phone-dropdown-search-input"
                            placeholder="Rechercher un pays ou indicatif..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <ul className="phone-dropdown-list">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map((c) => {
                                const isSelected = c.code === selectedCountry.code;
                                return (
                                    <li key={c.code}>
                                        <button
                                            type="button"
                                            className={`phone-dropdown-item ${isSelected ? "selected" : ""}`}
                                            onClick={() => handleSelectCountry(c)}
                                        >
                                            <div className="phone-item-left">
                                                <span className="phone-flag">{c.flag}</span>
                                                <span className="phone-item-name">{c.name}</span>
                                            </div>
                                            <span className="phone-item-code">{c.dialCode}</span>
                                        </button>
                                    </li>
                                );
                            })
                        ) : (
                            <li className="phone-dropdown-empty">
                                Aucun pays trouvé
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default PhoneInput;
