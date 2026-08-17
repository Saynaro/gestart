import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";
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
    const [placement, setPlacement] = useState("top"); // "top" by default
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Parse initial value or value changes
    const initialParsed = useMemo(() => parsePhoneNumber(value), []);
    const [selectedCountry, setSelectedCountry] = useState(initialParsed.country);
    const [localDigits, setLocalDigits] = useState(initialParsed.digits);

    // Dynamic placement check when dropdown opens
    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            // If space above is too tight (< 260px) and bottom has more space, open bottom
            if (rect.top < 260 && (window.innerHeight - rect.bottom > rect.top)) {
                setPlacement("bottom");
            } else {
                setPlacement("top");
            }
        }
    }, [isOpen]);

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

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearchQuery("");
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

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
        if (inputRef.current) {
            inputRef.current.focus();
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
                onClick={() => !disabled && setIsOpen(prev => !prev)}
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
                autoComplete="tel"
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

            {/* Country Dropdown Picker */}
            {isOpen && (
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
