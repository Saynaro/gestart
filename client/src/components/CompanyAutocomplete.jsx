import { useState, useEffect, useRef } from 'react';
import { Building2, Loader2, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import './CompanyAutocomplete.css';

/**
 * CompanyAutocomplete Component using official French Government Companies API
 * (recherche-entreprises.api.gouv.fr/search?q=...)
 *
 * Props:
 * - value: string (current input string - name, SIREN or SIRET)
 * - onChange: (val: string) => void
 * - onCompanySelect: (company: { nom, siren, siret, adresse, code_postal, ville, code_ape, libelle_ape, est_active, form_juridique }) => void
 * - placeholder?: string
 * - className?: string
 * - style?: object
 * - inputStyle?: object
 * - id?: string
 * - name?: string
 * - required?: boolean
 * - disabled?: boolean
 */
export default function CompanyAutocomplete({
    value = '',
    onChange,
    onCompanySelect,
    placeholder = "ex: Dupont Climatisation, 632012100...",
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

    // Keep internal query synchronized with external value
    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search to API Recherche Entreprises Data Gouv
    useEffect(() => {
        if (justSelectedRef.current) {
            justSelectedRef.current = false;
            setSuggestions([]);
            setIsOpen(false);
            setLoading(false);
            return;
        }

        if (!query || query.trim().length < 2) {
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
                const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query.trim())}&per_page=5`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error('Erreur API Recherche Entreprises');
                }

                const data = await response.json();

                if (justSelectedRef.current) {
                    setSuggestions([]);
                    setIsOpen(false);
                    setLoading(false);
                    return;
                }

                const results = (data.results || []).map((company) => {
                    const siege = company.siege || {};
                    const adresseFormatee = siege.adresse || 
                        [siege.numero_voie, siege.type_voie, siege.libelle_voie, siege.code_postal, siege.libelle_commune]
                            .filter(Boolean)
                            .join(' ');

                    return {
                        nom: company.nom_complet || company.nom_raison_sociale || '',
                        siren: company.siren || '',
                        siret: siege.siret || company.matching_etablissements?.[0]?.siret || company.siren || '',
                        adresse: adresseFormatee,
                        code_postal: siege.code_postal || '',
                        ville: siege.libelle_commune || '',
                        code_ape: company.activite_principale || '',
                        libelle_ape: company.libelle_activite_principale || '',
                        est_active: company.etat_administratif === "A",
                        form_juridique: company.nature_juridique_formate || ''
                    };
                });

                setSuggestions(results);
                setIsOpen(results.length > 0);
            } catch (err) {
                console.error("Company Autocomplete Error:", err);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 250); // 250ms debounce

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
        setQuery(item.nom);
        setSuggestions([]);
        setIsOpen(false);

        if (onChange) {
            onChange(item.nom);
        }

        if (onCompanySelect) {
            onCompanySelect(item);
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
        <div ref={wrapperRef} className={`company-autocomplete-container ${className}`} style={style}>
            <div className="company-input-wrapper">
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
                    className="company-autocomplete-input"
                    style={inputStyle}
                    autoComplete="off"
                />

                <div className="company-input-status-icon">
                    {loading ? (
                        <Loader2 size={16} className="spin-loader" />
                    ) : (
                        <Building2 size={16} className="building-icon" />
                    )}
                </div>
            </div>

            {/* Suggestions Floating Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <ul className="company-suggestions-dropdown">
                    <div className="dropdown-header">
                        <Building2 size={12} />
                        <span>Annuaire Officiel des Entreprises (SIRENE Data Gouv 🇫🇷)</span>
                    </div>

                    {suggestions.map((item, index) => {
                        const isSelected = index === selectedIndex;
                        return (
                            <li
                                key={index}
                                className={`suggestion-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSelectSuggestion(item)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="company-icon-badge">
                                    <Building2 size={18} />
                                </div>
                                <div className="suggestion-details">
                                    <div className="company-title-row">
                                        <span className="company-name">{item.nom}</span>
                                        {item.est_active ? (
                                            <span className="status-badge active">
                                                <ShieldCheck size={10} /> Actif
                                            </span>
                                        ) : (
                                            <span className="status-badge inactive">
                                                <AlertCircle size={10} /> Inactif
                                            </span>
                                        )}
                                    </div>

                                    <div className="company-meta-row">
                                        {item.siret && (
                                            <span className="meta-chip">SIRET: <strong>{item.siret}</strong></span>
                                        )}
                                        {item.code_ape && (
                                            <span className="meta-chip">APE: <strong>{item.code_ape}</strong></span>
                                        )}
                                    </div>

                                    {item.adresse && (
                                        <span className="company-address-text">{item.adresse}</span>
                                    )}
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
