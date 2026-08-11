import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Check } from 'lucide-react';
import './AddressAutocomplete.css';

/**
 * AddressAutocomplete Component using official French Government BAN API
 * (adresse.data.gouv.fr/search/)
 *
 * Props:
 * - value: string (current input string)
 * - onChange: (val: string) => void (when input value changes)
 * - onAddressSelect: (selected: { label, street, postcode, city, coordinates, citycode, context }) => void
 * - placeholder?: string
 * - className?: string
 * - style?: object
 * - inputStyle?: object
 * - id?: string
 * - name?: string
 * - required?: boolean
 * - disabled?: boolean
 */
export default function AddressAutocomplete({
    value = '',
    onChange,
    onAddressSelect,
    placeholder = 'Rechercher une adresse (ex: 8 bd du palais paris)...',
    className = '',
    style = {},
    inputStyle = {},
    id,
    name,
    required = false,
    disabled = false
}) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    const wrapperRef = useRef(null);
    const justSelectedRef = useRef(false);

    // Keep internal query synchronized with external value prop
    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search to API Adresse (BAN data.gouv.fr)
    useEffect(() => {
        if (justSelectedRef.current) {
            justSelectedRef.current = false;
            setSuggestions([]);
            setIsOpen(false);
            setLoading(false);
            return;
        }

        if (!query || query.trim().length < 3) {
            setSuggestions([]);
            setIsOpen(false);
            setLoading(false);
            return;
        }

        const handler = setTimeout(async () => {
            if (justSelectedRef.current) {
                setSuggestions([]);
                setIsOpen(false);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query.trim())}&limit=6&autocomplete=1`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error('Erreur API Adresse');
                }

                const data = await response.json();
                
                if (justSelectedRef.current) {
                    setSuggestions([]);
                    setIsOpen(false);
                    setLoading(false);
                    return;
                }

                const results = (data.features || []).map((item) => ({
                    label: item.properties.label || '',
                    street: item.properties.name || item.properties.street || '',
                    postcode: item.properties.postcode || '',
                    city: item.properties.city || '',
                    citycode: item.properties.citycode || '',
                    context: item.properties.context || '',
                    coordinates: item.geometry?.coordinates || []
                }));

                setSuggestions(results);
                setIsOpen(results.length > 0);
            } catch (err) {
                console.error("Address Autocomplete Error:", err);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 220); // 220ms debounce

        return () => clearTimeout(handler);
    }, [query]);

    const handleInputChange = (e) => {
        justSelectedRef.current = false;
        const val = e.target.value;
        setQuery(val);
        if (onChange) onChange(val);
    };

    const handleSelectSuggestion = (item) => {
        justSelectedRef.current = true;
        const mainAddress = item.street ? `${item.street}, ${item.postcode} ${item.city}`.trim() : item.label;
        
        setQuery(mainAddress);
        setSuggestions([]);
        setIsOpen(false);

        if (onChange) {
            onChange(mainAddress);
        }

        if (onAddressSelect) {
            onAddressSelect(item);
        }
    };

    const handleKeyDown = (e) => {
        if (!isOpen || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            handleSelectSuggestion(suggestions[selectedIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className={`address-autocomplete-container ${className}`} style={style}>
            <div className="address-input-wrapper">
                <input
                    type="text"
                    id={id}
                    name={name}
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className="address-autocomplete-input"
                    style={inputStyle}
                    autoComplete="off"
                />
                
                <div className="address-input-status-icon">
                    {loading ? (
                        <Loader2 size={16} className="spin-loader" />
                    ) : (
                        <MapPin size={16} className="pin-icon" />
                    )}
                </div>
            </div>

            {/* Suggestions Floating Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <ul className="address-suggestions-dropdown">
                    {suggestions.map((item, index) => {
                        const isSelected = index === selectedIndex;
                        return (
                            <li
                                key={index}
                                className={`suggestion-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSelectSuggestion(item)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="suggestion-icon">
                                    <MapPin size={16} />
                                </div>
                                <div className="suggestion-details">
                                    <span className="suggestion-label">{item.label}</span>
                                    <span className="suggestion-context">
                                        {item.context ? item.context : `${item.postcode} ${item.city}`}
                                    </span>
                                </div>
                                {isSelected && (
                                    <div className="suggestion-check">
                                        <Check size={14} />
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
