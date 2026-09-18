import { useState, useEffect, useRef } from 'react';
import { Building2, Loader2, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import './CompanyAutocomplete.css';

export const NAF_DESCRIPTIONS = {
    "43.22B": "Travaux d'installation d'équipements thermiques et de climatisation",
    "4322B": "Travaux d'installation d'équipements thermiques et de climatisation",
    "43.22A": "Travaux d'installation d'eau et de gaz en tous locaux",
    "4322A": "Travaux d'installation d'eau et de gaz en tous locaux",
    "43.21A": "Travaux d'installation électrique dans tous locaux",
    "4321A": "Travaux d'installation électrique dans tous locaux",
    "43.21B": "Travaux d'installation électrique sur la voie publique",
    "4321B": "Travaux d'installation électrique sur la voie publique",
    "43.29A": "Travaux d'isolation",
    "4329A": "Travaux d'isolation",
    "43.29B": "Autres travaux d'installation n.c.a.",
    "4329B": "Autres travaux d'installation n.c.a.",
    "43.32A": "Travaux de menuiserie bois et PVC",
    "4332A": "Travaux de menuiserie bois et PVC",
    "43.32B": "Travaux de menuiserie métallique et serrurerie",
    "4332B": "Travaux de menuiserie métallique et serrurerie",
    "43.34Z": "Travaux de peinture et vitrerie",
    "4334Z": "Travaux de peinture et vitrerie",
    "43.91A": "Travaux de charpente",
    "43.91B": "Travaux de couverture par éléments",
    "43.99C": "Travaux de maçonnerie générale et gros œuvre de bâtiment",
    "4399C": "Travaux de maçonnerie générale et gros œuvre de bâtiment",
    "33.12Z": "Réparation de machines et équipements mécaniques",
    "3312Z": "Réparation de machines et équipements mécaniques",
    "71.12B": "Ingénierie, études techniques",
    "7112B": "Ingénierie, études techniques",
    "62.01Z": "Programmation informatique",
    "6201Z": "Programmation informatique",
    "62.02A": "Conseil en systèmes et logiciels informatiques",
    "6202A": "Conseil en systèmes et logiciels informatiques",
    "70.22Z": "Conseil pour les affaires et autres conseils de gestion",
    "7022Z": "Conseil pour les affaires et autres conseils de gestion"
};

export const formatNafCode = (code, libelle) => {
    if (!code) return "";
    const cleanCode = String(code).trim();
    if (cleanCode.includes('-') && cleanCode.split('-')[1]?.trim()?.length > 2) {
        return cleanCode;
    }
    const pureCode = cleanCode.split('-')[0].trim();
    const desc = libelle || NAF_DESCRIPTIONS[pureCode] || NAF_DESCRIPTIONS[pureCode.replace('.', '')] || "";
    return desc ? `${pureCode} - ${desc}` : pureCode;
};

/**
 * CompanyAutocomplete Component using official French Government Companies API
 * (recherche-entreprises.api.gouv.fr/search?q=...)
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
    const [isFocused, setIsFocused] = useState(false);
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
                setIsFocused(false);
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

        // Do not search/open dropdown if not focused
        if (!isFocused) {
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

                    const apeCode = company.activite_principale || siege.activite_principale || company.matching_etablissements?.[0]?.activite_principale || '';
                    const apeLib = company.libelle_activite_principale || siege.libelle_activite_principale || company.activite_principale_libelle || '';

                    return {
                        nom: company.nom_complet || company.nom_raison_sociale || '',
                        siren: company.siren || '',
                        siret: siege.siret || company.matching_etablissements?.[0]?.siret || company.siren || '',
                        adresse: adresseFormatee,
                        code_postal: siege.code_postal || '',
                        ville: siege.libelle_commune || '',
                        code_ape: apeCode,
                        libelle_ape: apeLib,
                        naf_formate: formatNafCode(apeCode, apeLib),
                        est_active: company.etat_administratif === "A",
                        form_juridique: company.nature_juridique_formate || ''
                    };
                });

                setSuggestions(results);
                if (isFocused && results.length > 0) {
                    setIsOpen(true);
                }
            } catch (err) {
                console.error("Company Autocomplete Error:", err);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 250); // 250ms debounce

        return () => clearTimeout(handler);
    }, [query, isFocused]);

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

    const handleFocus = () => {
        setIsFocused(true);
        if (suggestions.length > 0) {
            setIsOpen(true);
        }
    };

    const handleBlur = (e) => {
        // If clicking inside suggestions dropdown, let onMouseDown handle it
        if (wrapperRef.current && wrapperRef.current.contains(e.relatedTarget)) {
            return;
        }
        setIsFocused(false);
        setIsOpen(false);
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
                    onFocus={handleFocus}
                    onBlur={handleBlur}
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

            {/* Suggestions Floating Dropdown - Only visible when focused and open */}
            {isOpen && isFocused && suggestions.length > 0 && (
                <ul className="company-suggestions-dropdown">
                    {suggestions.map((item, index) => {
                        const isSelected = index === selectedIndex;
                        return (
                            <li
                                key={index}
                                className={`suggestion-item ${isSelected ? 'selected' : ''}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectSuggestion(item);
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSelectSuggestion(item);
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="company-icon-badge">
                                    <Building2 size={15} />
                                </div>
                                <div className="suggestion-details">
                                    <div className="company-title-row">
                                        <span className="company-name">{item.nom}</span>
                                        {item.est_active ? (
                                            <span className="status-badge active">
                                                <ShieldCheck size={9} /> Actif
                                            </span>
                                        ) : (
                                            <span className="status-badge inactive">
                                                <AlertCircle size={9} /> Inactif
                                            </span>
                                        )}
                                    </div>

                                    <div className="company-meta-row">
                                        {item.siret && <span>SIRET: {item.siret}</span>}
                                        {item.code_ape && <span>• APE: {item.code_ape}</span>}
                                        {item.ville && <span>• {item.ville}</span>}
                                    </div>
                                </div>

                                {isSelected && (
                                    <div className="suggestion-check">
                                        <Check size={13} />
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
