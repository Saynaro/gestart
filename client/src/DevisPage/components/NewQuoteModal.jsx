import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash, X, ChevronDown, Search, Eye, FileText, Check, Edit2, ArrowLeft } from "lucide-react";

function NewQuoteModal({ onClose, onCreateQuote }) {
    // Determine screen size dynamically
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Wizard step state on mobile (1 to 4)
    const [step, setStep] = useState(1);

    // Grouped Clients list matching /planning
    const clientDetails = [
        { name: "Jane Doe", type: "Particulier", email: "jane.doe@email.com", address: "12 Rue des Fleurs, 75001 Paris" },
        { name: "John Doe", type: "Particulier", email: "john.doe@email.com", address: "45 Avenue Foch, 69006 Lyon" },
        { name: "Khalid Sainaro", type: "Particulier", email: "khalid@gmail.com", address: "8 Boulevard de l'Industrie, 44000 Nantes" },
        { name: "Martin Dupont", type: "Particulier", email: "martin.dupont@email.com", address: "12 Rue des Fleurs, 75001 Paris" },
        { name: "Sophie Bernard", type: "Particulier", email: "sophie.b@email.com", address: "45 Avenue Foch, 69006 Lyon" },
        { name: "Jean Moreau", type: "Particulier", email: "jean.moreau@email.com", address: "8 Boulevard de l'Industrie, 44000 Nantes" },
        { name: "Marie Dubois", type: "Particulier", email: "marie.dubois@email.com", address: "12 Rue des Fleurs, 75001 Paris" },
        { name: "Claire Laurent", type: "Particulier", email: "claire.laurent@email.com", address: "45 Avenue Foch, 69006 Lyon" },
        { name: "Pierre Leroy", type: "Particulier", email: "pierre.leroy@email.com", address: "8 Boulevard de l'Industrie, 44000 Nantes" },
        { name: "LexCorp", type: "Organisation", email: "contact@lexcorp.com", address: "Metropolis City" },
        { name: "Acme Corp", type: "Organisation", email: "billing@acme.com", address: "109 Rue Saint-Dizier, 54000 Nancy" },
        { name: "Dupont & Co", type: "Organisation", email: "dupontco@gmail.com", address: "12 Rue des Fleurs, 75001 Paris" },
        { name: "Bernard SA", type: "Organisation", email: "contact@bernard.sa", address: "45 Avenue Foch, 69006 Lyon" }
    ].sort((a, b) => a.name.localeCompare(b.name));

    // Mock catalog for supplies matching Screenshot style
    const mockCatalog = [
        { id: "cat1", description: "Filtre climatisation Daikin", unitPrice: 25 },
        { id: "cat2", description: "Recharge Fluide R32 (1kg)", unitPrice: 85 },
        { id: "cat3", description: "Main d'œuvre Entretien (Heure)", unitPrice: 65 },
        { id: "cat4", description: "Frais de déplacement", unitPrice: 45 },
        { id: "cat5", description: "Condenseur climatisation", unitPrice: 420 }
    ].sort((a, b) => a.description.localeCompare(b.description));

    const savedInterventions = [
        "Entretien annuel",
        "Dépannage d'urgence",
        "Mise en service climatisation",
        "Installation pompe à chaleur",
        "Contrôle d'étanchéité"
    ];

    // Form states
    const [selectedClient, setSelectedClient] = useState(clientDetails[0]);
    const [interventionInput, setInterventionInput] = useState("Entretien annuel");
    const [showInterventionDropdown, setShowInterventionDropdown] = useState(false);

    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
    const [tvaRate, setTvaRate] = useState(20);
    const [workDetails, setWorkDetails] = useState("");
    const [internalNotes, setInternalNotes] = useState("");

    // Supplies rows
    const [lines, setLines] = useState([
        { id: Date.now(), description: "", qty: 1, unitPrice: 0 }
    ]);

    // Client Selector Modal portal states
    const [showClientSearch, setShowClientSearch] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [pendingClient, setPendingClient] = useState(null);

    // Supplies Catalog Selector Modal portal states
    const [showCatalogSearch, setShowCatalogSearch] = useState(false);
    const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
    const [activeLineId, setActiveLineId] = useState(null);
    const [pendingCatalogItem, setPendingCatalogItem] = useState(null);

    // Sub-form for creating a brand new catalog item inside the popup
    const [showNewCatalogItemForm, setShowNewCatalogItemForm] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [newItemPrice, setNewItemPrice] = useState("");

    // Sub-form for creating a new client on mobile
    const [showNewClientFormMobile, setShowNewClientFormMobile] = useState(false);
    const [newClientNameMobile, setNewClientNameMobile] = useState("");
    const [newClientEmailMobile, setNewClientEmailMobile] = useState("");

    // Mobile preview overlay toggle
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    // Disable scrolling when mobile preview modal is active
    useEffect(() => {
        if (showMobilePreview) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showMobilePreview]);

    // Totals calculation
    const [subtotalHt, setSubtotalHt] = useState(0);
    const [tvaAmount, setTvaAmount] = useState(0);
    const [totalTtc, setTotalTtc] = useState(0);

    useEffect(() => {
        // Exclude empty helper lines from recap HT calculations
        const validLines = lines.filter(l => l.description.trim() !== "");
        const sub = validLines.reduce((sum, line) => sum + (parseFloat(line.unitPrice) || 0) * (parseInt(line.qty) || 1), 0);
        const tva = sub * (tvaRate / 100);
        setSubtotalHt(sub);
        setTvaAmount(tva);
        setTotalTtc(sub + tva);
    }, [lines, tvaRate]);

    const handleAddLine = () => {
        setLines([...lines, { id: Date.now(), description: "", qty: 1, unitPrice: 0 }]);
    };

    const handleRemoveLine = (id) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const handleLineChange = (id, field, value) => {
        setLines(lines.map(line => {
            if (line.id === id) {
                return { ...line, [field]: value };
            }
            return line;
        }));
    };

    const getGroupedClients = (list) => {
        const grouped = {};
        list.forEach(c => {
            const letter = c.name.charAt(0).toUpperCase();
            if (!grouped[letter]) {
                grouped[letter] = [];
            }
            grouped[letter].push(c);
        });
        return grouped;
    };

    const getGroupedCatalog = (list) => {
        const grouped = {};
        list.forEach(item => {
            const letter = item.description.charAt(0).toUpperCase();
            if (!grouped[letter]) {
                grouped[letter] = [];
            }
            grouped[letter].push(item);
        });
        return grouped;
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!selectedClient) {
            alert("Veuillez sélectionner un client.");
            return;
        }
        if (!interventionInput.trim()) {
            alert("Veuillez renseigner le type d'intervention.");
            return;
        }

        const validLines = lines.filter(l => l.description.trim() !== "");
        if (validLines.length === 0) {
            alert("Veuillez ajouter au moins une prestation ou fourniture.");
            return;
        }

        const newQuote = {
            id: Date.now(),
            clientName: selectedClient.name,
            clientEmail: selectedClient.email,
            clientAddress: selectedClient.address,
            interventionType: interventionInput,
            date: quoteDate,
            tvaRate: tvaRate,
            workDetails: workDetails,
            internalNotes: internalNotes,
            lines: validLines.map(l => ({ description: l.description, qty: parseInt(l.qty) || 1, unitPrice: parseFloat(l.unitPrice) || 0 })),
            subtotalHt: subtotalHt,
            tvaAmount: tvaAmount,
            totalTtc: totalTtc,
            status: "DRAFT"
        };

        onCreateQuote(newQuote);
    };

    const renderQuoteLivePreviewSheet = () => (
        <div className="live-preview-a4-wrapper">
            <div className="live-preview-a4-sheet">
                <div className="pdf-header-row">
                    <div className="pdf-header-left">
                        <div className="pdf-logo-stub" style={{ fontSize: '11pt', padding: '4pt', width: '80pt' }}>
                            <span>CLIMPRO</span>
                        </div>
                        <h3 className="company-name" style={{ fontSize: '10pt' }}>Dupont Climatisation</h3>
                        <p className="company-details" style={{ fontSize: '8pt', lineHeight: 1.3 }}>
                            88 Rue de l'Aviation, 75015 Paris<br />
                            SIRET : 849 203 103 00021
                        </p>
                    </div>
                    <div className="pdf-header-right">
                        <h1 className="doc-type-label" style={{ fontSize: '18pt', marginBottom: '4pt', color: '#556B2F' }}>DEVIS</h1>
                        <table className="doc-meta-table" style={{ fontSize: '8pt' }}>
                            <tbody>
                                <tr>
                                    <td><strong>Numéro :</strong></td>
                                    <td>DEV-2026-TEMP</td>
                                </tr>
                                <tr>
                                    <td><strong>Date :</strong></td>
                                    <td>{new Date(quoteDate).toLocaleDateString("fr-FR")}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pdf-billing-section" style={{ margin: '10pt 0', paddingTop: '8pt' }}>
                    <div className="billing-to-card">
                        <span className="section-label" style={{ fontSize: '7.5pt' }}>DEVIS POUR :</span>
                        <h4 className="client-name" style={{ fontSize: '10pt' }}>{selectedClient ? selectedClient.name : "Aucun client sélectionné"}</h4>
                        <p className="client-details" style={{ fontSize: '8.5pt' }}>
                            {selectedClient ? selectedClient.address : "Adresse non définie"}<br />
                            {selectedClient ? selectedClient.email : ""}
                        </p>
                    </div>
                </div>

                <div className="pdf-intervention-info" style={{ padding: '6pt 8pt', marginBottom: '10pt', fontSize: '8.5pt' }}>
                    <span>Objet : <strong>{interventionInput || "Non spécifié"}</strong></span>
                    {workDetails && (
                        <p className="work-details" style={{ fontSize: '8pt', marginTop: '4pt', paddingTop: '4pt' }}>
                            {workDetails}
                        </p>
                    )}
                </div>

                <table className="pdf-items-table" style={{ fontSize: '8.5pt', marginBottom: '15pt' }}>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th className="text-center" style={{ width: '40px' }}>Qté</th>
                            <th className="text-right" style={{ width: '80px' }}>Unit. HT</th>
                            <th className="text-right" style={{ width: '80px' }}>Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.filter(l => l.description.trim() !== "").map((line, idx) => (
                            <tr key={idx}>
                                <td>{line.description || "—"}</td>
                                <td className="text-center">{line.qty}</td>
                                <td className="text-right">{(line.unitPrice || 0).toLocaleString("fr-FR")} €</td>
                                <td className="text-right">{((line.unitPrice || 0) * (line.qty || 1)).toLocaleString("fr-FR")} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="pdf-summary-block" style={{ marginBottom: '15pt' }}>
                    <table className="pdf-summary-table" style={{ fontSize: '8.5pt', width: '160pt' }}>
                        <tbody>
                            <tr>
                                <td>Sous-total HT :</td>
                                <td>{subtotalHt.toLocaleString("fr-FR")} €</td>
                            </tr>
                            <tr>
                                <td>TVA ({tvaRate}%) :</td>
                                <td>{tvaAmount.toLocaleString("fr-FR")} €</td>
                            </tr>
                            <tr className="grand-total-row">
                                <td><strong>TOTAL TTC :</strong></td>
                                <td><strong>{totalTtc.toLocaleString("fr-FR")} €</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="pdf-footer-section" style={{ fontSize: '7.5pt', paddingTop: '8pt' }}>
                    <span>Validité du devis : 30 jours.</span>
                </div>
            </div>
        </div>
    );

    // ── MOBILE WIZARD INTERFACE ────────────────────────────────────────
    if (isMobile) {
        return (
            <div className="mobile-preview-full-overlay" style={{ backgroundColor: 'var(--background)' }}>

                {/* Progress Header matching screenshot layout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                    <button
                        type="button"
                        onClick={() => {
                            if (step > 1) setStep(step - 1);
                            else onClose();
                        }}
                        style={{ border: 'none', background: 'var(--muted)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground)' }}
                    >
                        <ArrowLeft size={18} />
                    </button>

                    {/* 3 Segments Progress bar matching screenshot */}
                    <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: step >= 1 ? '#556B2F' : 'var(--border)', transition: 'background-color 0.2s' }}></div>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: step >= 2 ? '#556B2F' : 'var(--border)', transition: 'background-color 0.2s' }}></div>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: step >= 3 ? '#556B2F' : 'var(--border)', transition: 'background-color 0.2s' }}></div>
                    </div>

                    {step > 1 && (
                        <button
                            type="button"
                            onClick={() => setShowMobilePreview(true)}
                            style={{ border: 'none', background: 'var(--muted)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground)' }}
                        >
                            <Eye size={18} />
                        </button>
                    )}
                </div>

                {/* Main Steps Content container */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>

                    {/* STEP 1: Client selection */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--foreground)' }}>Quel client facturer ?</h2>

                            <div className="client-search-input-wrapper" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                                <Search size={18} className="client-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Nom ou entreprise..."
                                    value={clientSearchQuery}
                                    onChange={(e) => setClientSearchQuery(e.target.value)}
                                    className="client-search-input"
                                    style={{ color: 'var(--foreground)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                {Object.entries(
                                    getGroupedClients(
                                        clientDetails.filter(c =>
                                            c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
                                        )
                                    )
                                ).map(([letter, list]) => (
                                    <div key={letter} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', paddingLeft: '4px' }}>{letter}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {list.map(c => {
                                                const isSelected = selectedClient && selectedClient.name === c.name;
                                                return (
                                                    <div
                                                        key={c.name}
                                                        onClick={() => {
                                                            setSelectedClient(c);
                                                            setStep(2);
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            backgroundColor: 'var(--card)',
                                                            border: isSelected ? '2px solid #556B2F' : '1px solid var(--border)',
                                                            borderRadius: '12px',
                                                            padding: '16px',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--foreground)' }}>{c.name}</span>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 800,
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            backgroundColor: c.type === 'Particulier' ? 'rgba(85, 107, 47, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                                                            color: c.type === 'Particulier' ? '#556B2F' : '#3b82f6'
                                                        }}>
                                                            {c.type === "Particulier" ? "Particulier test" : "Organisation test"}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Sticky footer button for step 1 */}
                            <div style={{ marginTop: 'auto', paddingTop: '16px', paddingBottom: '32px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowNewClientFormMobile(true)}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: '#556B2F',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Ajouter un client
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Items manager */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--foreground)' }}>Articles</h2>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', marginLeft: '8px' }}>Article test</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setActiveLineId(null);
                                    setCatalogSearchQuery("");
                                    setPendingCatalogItem(null);
                                    setShowCatalogSearch(true);
                                }}
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    backgroundColor: 'var(--card)',
                                    border: '1px dashed #556B2F',
                                    color: '#556B2F',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Plus size={16} /> Ajouter un article
                            </button>

                            {/* Render lines list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {lines.filter(l => l.description.trim() !== "").map((line, idx) => (
                                    <div key={line.id} style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 700 }}>Article {idx + 1}</span>
                                            <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '2px 0', color: 'var(--foreground)' }}>{line.description}</h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                                {/* Qty controller inputs */}
                                                <input
                                                    type="number"
                                                    value={line.qty}
                                                    onChange={(e) => handleLineChange(line.id, "qty", parseInt(e.target.value) || 1)}
                                                    style={{ width: '45px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.8rem', padding: '2px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                                                    min="1"
                                                />
                                                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>× {line.unitPrice} € HT</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '0.95rem' }}>{(line.qty * line.unitPrice).toLocaleString("fr-FR")} € HT</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLine(line.id)}
                                                style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer' }}
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* General recap matching screenshot */}
                            <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--muted-foreground)' }}>
                                    <span>Remise générale</span>
                                    <span>0 €</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '8px', color: 'var(--foreground)' }}>Total</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                        <span>Total HT</span>
                                        <span>{subtotalHt.toLocaleString("fr-FR")} €</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                                        <span>Remise générale</span>
                                        <span>0,00 €</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, marginTop: '8px', color: 'var(--foreground)' }}>
                                        <span>Total HT final</span>
                                        <span>{subtotalHt.toLocaleString("fr-FR")} €</span>
                                    </div>
                                </div>
                            </div>

                            {/* Continuer & Draft buttons footer */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '16px', paddingBottom: '32px' }}>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: '#556B2F',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Continuer
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: 'var(--card)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--foreground)',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Enregistrer en brouillon
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Date, TVA and Description picker */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--foreground)' }}>Quand facturer ?</h2>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', marginLeft: '8px' }}>Article test</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Date picker row */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Date du devis</label>
                                    <input
                                        type="date"
                                        value={quoteDate}
                                        onChange={(e) => setQuoteDate(e.target.value)}
                                        style={{ border: 'none', width: '100%', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)', padding: 0, outline: 'none', backgroundColor: 'transparent' }}
                                    />
                                </div>

                                {/* Due date / TVA Rate row */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Taux TVA*</label>
                                    <select
                                        value={tvaRate}
                                        onChange={(e) => setTvaRate(parseFloat(e.target.value))}
                                        style={{ border: 'none', width: '100%', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)', padding: 0, outline: 'none', backgroundColor: 'transparent' }}
                                    >
                                        <option value={0}>0% (Exonéré)</option>
                                        <option value={5.5}>5.5% (Prestations réduites)</option>
                                        <option value={10}>10% (Taux intermédiaire)</option>
                                        <option value={20}>20% (Taux normal)</option>
                                    </select>
                                </div>

                                {/* Intervention input block */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Type d'intervention*</label>
                                    <input
                                        type="text"
                                        value={interventionInput}
                                        onChange={(e) => setInterventionInput(e.target.value)}
                                        placeholder="Ex: Entretien annuel"
                                        style={{ border: 'none', width: '100%', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)', padding: 0, outline: 'none', backgroundColor: 'transparent' }}
                                    />
                                </div>

                                {/* Description of works */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Description des travaux</label>
                                    <textarea
                                        rows="3"
                                        value={workDetails}
                                        onChange={(e) => setWorkDetails(e.target.value)}
                                        placeholder="Détails de la prestation..."
                                        style={{ border: 'none', width: '100%', fontSize: '0.85rem', color: 'var(--foreground)', padding: 0, outline: 'none', resize: 'none', backgroundColor: 'transparent' }}
                                    />
                                </div>
                            </div>

                            {/* Footer continue button */}
                            <div style={{ marginTop: 'auto', paddingTop: '16px', paddingBottom: '32px' }}>
                                <button
                                    type="button"
                                    onClick={() => setStep(4)}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: '#556B2F',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Continuer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Final recap sheet matching screenshot style */}
                    {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--foreground)' }}>Récapitulatif</h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Client summary card */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 700 }}>Client</span>
                                    <h4 style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '4px', color: 'var(--foreground)' }}>{selectedClient.name}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>{selectedClient.email}</p>
                                    <button type="button" onClick={() => setStep(1)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: '#556B2F', cursor: 'pointer' }}>
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                {/* Date / Intervention summary card */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 700 }}>Date & Intervention</span>
                                    <div style={{ marginTop: '6px', color: 'var(--foreground)' }}>
                                        <span style={{ fontSize: '0.85rem', display: 'block' }}>Date d'émission : <strong>{new Date(quoteDate).toLocaleDateString("fr-FR")}</strong></span>
                                        <span style={{ fontSize: '0.85rem', display: 'block', marginTop: '2px' }}>Type : <strong>{interventionInput}</strong></span>
                                        <span style={{ fontSize: '0.85rem', display: 'block', marginTop: '2px' }}>TVA: <strong>{tvaRate}%</strong></span>
                                    </div>
                                    <button type="button" onClick={() => setStep(3)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: '#556B2F', cursor: 'pointer' }}>
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                {/* Items summary card */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 700 }}>Articles</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', color: 'var(--foreground)' }}>
                                        {lines.filter(l => l.description.trim() !== "").map(line => (
                                            <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                <span style={{ flex: 1 }}>{line.description} (x{line.qty})</span>
                                                <span style={{ fontWeight: 700 }}>{(line.qty * line.unitPrice).toLocaleString("fr-FR")} € HT</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => setStep(2)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: '#556B2F', cursor: 'pointer' }}>
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                {/* Recap sums card */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                        <span>Sous-total HT :</span>
                                        <span>{subtotalHt.toLocaleString("fr-FR")} €</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                                        <span>TVA ({tvaRate}%) :</span>
                                        <span>{tvaAmount.toLocaleString("fr-FR")} €</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, marginTop: '8px', color: 'var(--foreground)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                                        <span>TOTAL TTC :</span>
                                        <span>{totalTtc.toLocaleString("fr-FR")} €</span>
                                    </div>
                                </div>
                            </div>

                            {/* Final validation button */}
                            <div style={{ marginTop: 'auto', paddingTop: '16px', paddingBottom: '32px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleSubmit()}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: '#556B2F',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Créer le devis
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Mobile Preview Portal */}
                {showMobilePreview && (
                    <div className="mobile-preview-full-overlay">
                        <div className="mobile-preview-header">
                            <h3>Aperçu Devis</h3>
                            <button className="top-btn close-x" onClick={() => setShowMobilePreview(false)}><X size={20} /></button>
                        </div>
                        <div className="mobile-preview-body">
                            {renderQuoteLivePreviewSheet()}
                        </div>
                        <div className="mobile-preview-actions">
                            <button className="cancel-btn" onClick={() => setShowMobilePreview(false)}>Fermer</button>
                        </div>
                    </div>
                )}

                {/* Sub-form modal to add new client directly on mobile */}
                {showNewClientFormMobile && createPortal(
                    <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) setShowNewClientFormMobile(false); }}>
                        <div className="client-search-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ padding: '6px', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', borderRadius: '6px', display: 'inline-flex' }}>
                                    <Plus size={16} />
                                </div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Ajouter un nouveau client</h3>
                            </div>

                            <div className="form-field">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Nom / Entreprise*</label>
                                <input
                                    type="text"
                                    className="profile-input"
                                    placeholder="Ex: Sophie Bernard"
                                    value={newClientNameMobile}
                                    onChange={(e) => setNewClientNameMobile(e.target.value)}
                                    style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>E-mail du client*</label>
                                <input
                                    type="email"
                                    className="profile-input"
                                    placeholder="Ex: sophie.b@email.com"
                                    value={newClientEmailMobile}
                                    onChange={(e) => setNewClientEmailMobile(e.target.value)}
                                    style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    className="client-search-confirm-btn"
                                    style={{ flex: 2, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => {
                                        if (!newClientNameMobile.trim()) {
                                            alert("Veuillez saisir un nom.");
                                            return;
                                        }
                                        const nClient = {
                                            name: newClientNameMobile,
                                            type: "Particulier",
                                            email: newClientEmailMobile || `${newClientNameMobile.toLowerCase().replace(" ", ".")}@email.com`,
                                            address: "Adresse par défaut"
                                        };
                                        setSelectedClient(nClient);
                                        setShowNewClientFormMobile(false);
                                        setNewClientNameMobile("");
                                        setNewClientEmailMobile("");
                                        setStep(2);
                                    }}
                                >
                                    Créer et sélectionner
                                </button>
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    style={{ flex: 1, height: '42px', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
                                    onClick={() => setShowNewClientFormMobile(false)}
                                >
                                    Retour
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Full Screen Catalog search portal matching planning style */}
                {showCatalogSearch && createPortal(
                    <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) setShowCatalogSearch(false); }}>
                        <div className="client-search-panel">
                            <div className="client-search-header">
                                <button type="button" className="client-search-back-btn" onClick={() => setShowCatalogSearch(false)}><X size={22} /></button>
                                <h3>Sélectionner un article / service</h3>
                                <div style={{ width: 34 }}></div>
                            </div>

                            {showNewCatalogItemForm ? (
                                <div className="new-catalog-item-form-wrapper" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, backgroundColor: 'var(--card)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <div style={{ padding: '6px', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', borderRadius: '6px', display: 'inline-flex' }}>
                                            <Plus size={16} />
                                        </div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Créer un nouvel article</h3>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nom de l'article / service*</label>
                                        <input
                                            type="text"
                                            className="profile-input"
                                            placeholder="Ex: Main d'œuvre diagnostic"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                            required
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prix unitaire HT (€)*</label>
                                        <input
                                            type="number"
                                            className="profile-input"
                                            placeholder="Ex: 85"
                                            value={newItemPrice}
                                            onChange={(e) => setNewItemPrice(e.target.value)}
                                            style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                                        <button
                                            type="button"
                                            className="client-search-confirm-btn"
                                            style={{ flex: 2, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => {
                                                if (!newItemName.trim()) {
                                                    alert("Veuillez saisir un nom.");
                                                    return;
                                                }
                                                const price = parseFloat(newItemPrice) || 0;
                                                // Append to lines
                                                setLines([...lines.filter(l => l.description.trim() !== ""), { id: Date.now(), description: newItemName, qty: 1, unitPrice: price }]);
                                                setShowCatalogSearch(false);
                                                setCatalogSearchQuery("");
                                                setNewItemName("");
                                                setNewItemPrice("");
                                                setShowNewCatalogItemForm(false);
                                            }}
                                        >
                                            Confirmer et ajouter
                                        </button>
                                        <button
                                            type="button"
                                            className="cancel-btn"
                                            style={{ flex: 1, height: '42px', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
                                            onClick={() => setShowNewCatalogItemForm(false)}
                                        >
                                            Retour
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="client-search-bar-container">
                                        <div className="client-search-input-wrapper">
                                            <Search size={18} className="client-search-icon" />
                                            <input
                                                type="text"
                                                placeholder="Nom de la fourniture ou prestation..."
                                                value={catalogSearchQuery}
                                                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                                                className="client-search-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="client-search-list-container">
                                        {Object.entries(
                                            getGroupedCatalog(
                                                mockCatalog.filter(item =>
                                                    item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase())
                                                )
                                            )
                                        ).map(([letter, list]) => (
                                            <div key={letter} className="client-search-group">
                                                <span className="client-search-group-letter">{letter}</span>
                                                <div className="client-search-group-items">
                                                    {list.map(item => {
                                                        const isSelected = pendingCatalogItem && pendingCatalogItem.id === item.id;
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className={`client-search-item ${isSelected ? 'selected' : ''}`}
                                                                onClick={() => setPendingCatalogItem(item)}
                                                            >
                                                                <span className="client-item-name">{item.description}</span>
                                                                <span className="client-item-badge organisation" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                                                    {item.unitPrice} € HT
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                        {mockCatalog.filter(item =>
                                            item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase())
                                        ).length === 0 && (
                                                <div className="client-search-empty">
                                                    <span>Aucun article ne correspond à votre recherche</span>
                                                </div>
                                            )}
                                    </div>

                                    <div className="client-search-footer" style={{ gap: '8px' }}>
                                        {pendingCatalogItem ? (
                                            <button
                                                type="button"
                                                className="client-search-confirm-btn"
                                                onClick={() => {
                                                    // Append item directly to active lines state list
                                                    setLines([...lines.filter(l => l.description.trim() !== ""), { id: Date.now(), description: pendingCatalogItem.description, qty: 1, unitPrice: pendingCatalogItem.unitPrice }]);
                                                    setShowCatalogSearch(false);
                                                    setCatalogSearchQuery("");
                                                    setPendingCatalogItem(null);
                                                }}
                                            >
                                                Sélectionner — {pendingCatalogItem.description}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="client-search-confirm-btn"
                                                onClick={() => {
                                                    const customDesc = catalogSearchQuery.trim();
                                                    if (customDesc) {
                                                        setLines([...lines.filter(l => l.description.trim() !== ""), { id: Date.now(), description: customDesc, qty: 1, unitPrice: 0 }]);
                                                        setShowCatalogSearch(false);
                                                        setCatalogSearchQuery("");
                                                    }
                                                }}
                                                disabled={!catalogSearchQuery.trim()}
                                                style={{ opacity: catalogSearchQuery.trim() ? 1 : 0.6 }}
                                            >
                                                Sélectionner le texte saisi
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="client-search-add-btn secondary"
                                            onClick={() => {
                                                setNewItemName(catalogSearchQuery);
                                                setNewItemPrice("");
                                                setShowNewCatalogItemForm(true);
                                            }}
                                        >
                                            + Créer un article
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>,
                    document.body
                )}

            </div>
        );
    }

    // ── DESKTOP SPLIT VIEW INTERFACE ──────────────────────────────────
    return (
        <div className="invoice-modal-overlay">
            <div className="invoice-modal-container wide-invoice-modal-container">

                {/* Left Side: form inputs */}
                <div className="invoice-modal-form-side">
                    <div className="invoice-modal-header">
                        <h2>Nouveau devis</h2>
                        <button className="close-btn" onClick={onClose}><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="invoice-modal-form">
                        <div className="form-scrollable-area">
                            {/* Client select */}
                            <div className="form-field form-field-bordered">
                                <label className="form-label" style={{ letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>CLIENT*</label>
                                <div
                                    className="modal-select-trigger"
                                    onClick={() => {
                                        setPendingClient(selectedClient);
                                        setShowClientSearch(true);
                                    }}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        padding: '12px',

                                        background: 'none'
                                    }}
                                >
                                    <span className="trigger-val" style={{ fontSize: '1.2rem', fontWeight: '500', color: 'var(--foreground)' }}>
                                        {selectedClient ? selectedClient.name : "Sélectionner un client..."}
                                    </span>
                                    <ChevronDown size={18} style={{ color: 'var(--muted-foreground)' }} />
                                </div>
                            </div>

                            {/* Intervention */}
                            <div className="form-field form-field-bordered combobox-field">
                                <label className="form-label" style={{ letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>TYPE D'INTERVENTION*</label>
                                <input
                                    type="text"
                                    className="profile-input borderless-large-input"
                                    placeholder="Type d'intervention..."
                                    value={interventionInput}
                                    onChange={(e) => {
                                        setInterventionInput(e.target.value);
                                        setShowInterventionDropdown(true);
                                    }}
                                    onFocus={() => setShowInterventionDropdown(true)}
                                    style={{
                                        border: 'none',
                                        borderRadius: 0,
                                        padding: '8px 0',
                                        fontSize: '1.2rem',
                                        fontWeight: '500',
                                        height: 'auto',
                                        background: 'transparent'
                                    }}
                                />
                                {showInterventionDropdown && (
                                    <div className="combobox-dropdown">
                                        {savedInterventions.filter(i => i.toLowerCase().includes(interventionInput.toLowerCase())).map(i => (
                                            <div
                                                key={i}
                                                className="combobox-item"
                                                onClick={() => {
                                                    setInterventionInput(i);
                                                    setShowInterventionDropdown(false);
                                                }}
                                            >
                                                {i}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Date */}
                            <div className="form-field form-field-bordered">
                                <label className="form-label" style={{ letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>DATE DE DEVIS*</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="date"
                                        className="profile-input borderless-large-input"
                                        value={quoteDate}
                                        onChange={(e) => setQuoteDate(e.target.value)}
                                        required
                                        style={{
                                            border: 'none',
                                            borderRadius: 0,
                                            padding: '8px 0',
                                            fontSize: '1.2rem',
                                            fontWeight: '500',
                                            height: 'auto',
                                            background: 'transparent',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* TVA */}
                            <div className="form-field" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label" style={{ letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '8px' }}>TAUX TVA</label>
                                <div className="tva-radio-group">
                                    {[0, 5.5, 10, 20].map((rate) => (
                                        <label key={rate} className={`tva-radio-label ${tvaRate === rate ? "selected" : ""}`}>
                                            <input
                                                type="radio"
                                                name="tva_rate"
                                                value={rate}
                                                checked={tvaRate === rate}
                                                onChange={() => setTvaRate(rate)}
                                            />
                                            <span>{rate}%</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Works description */}
                            <div className="form-field" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label" style={{ letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '8px' }}>DESCRIPTION DES TRAVAUX PRÉVUS</label>
                                <textarea
                                    className="profile-input textarea-field"
                                    rows="3"
                                    value={workDetails}
                                    onChange={(e) => setWorkDetails(e.target.value)}
                                    placeholder="Indiquez les détails de la prestation..."
                                />
                            </div>

                            {/* Supplies grid spreadsheet */}
                            <div className="supplies-section">
                                <div className="section-title-row">
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>Fournitures & prestations</h3>
                                    <button type="button" className="add-line-btn" onClick={handleAddLine}>
                                        <Plus size={14} /> Ajouter
                                    </button>
                                </div>

                                <div className="supplies-table-wrapper">
                                    <table className="supplies-table">
                                        <thead>
                                            <tr>
                                                <th>Description</th>
                                                <th style={{ width: '80px' }}>Qté</th>
                                                <th style={{ width: '120px' }}>Prix unit. HT</th>
                                                <th style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line) => (
                                                <tr key={line.id}>
                                                    <td>
                                                        {/* Description Selector like /planning */}
                                                        <div
                                                            className="line-select-trigger"
                                                            onClick={() => {
                                                                setActiveLineId(line.id);
                                                                setCatalogSearchQuery(line.description);
                                                                setPendingCatalogItem(null);
                                                                setShowNewCatalogItemForm(false);
                                                                setShowCatalogSearch(true);
                                                            }}
                                                            style={{
                                                                cursor: 'pointer',
                                                                padding: '10px 8px',
                                                                fontSize: '0.85rem',
                                                                minHeight: '38px',
                                                                backgroundColor: 'transparent',
                                                                color: line.description ? 'var(--foreground)' : 'var(--muted-foreground)'
                                                            }}
                                                        >
                                                            {line.description || "Rechercher..."}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="line-input text-center"
                                                            value={line.qty}
                                                            min="1"
                                                            onChange={(e) => handleLineChange(line.id, "qty", e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="line-input text-right"
                                                            value={line.unitPrice}
                                                            onChange={(e) => handleLineChange(line.id, "unitPrice", e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="text-center">
                                                        {lines.length > 1 && (
                                                            <button type="button" className="delete-line-btn" onClick={() => handleRemoveLine(line.id)}>
                                                                <Trash size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Recap */}
                                <div className="invoice-dynamic-recap">
                                    <div className="recap-row">
                                        <span>Sous-total HT :</span>
                                        <span>{subtotalHt.toLocaleString("fr-FR")} €</span>
                                    </div>
                                    <div className="recap-row">
                                        <span>TVA ({tvaRate}%) :</span>
                                        <span>{tvaAmount.toLocaleString("fr-FR")} €</span>
                                    </div>
                                    <div className="recap-row total">
                                        <span>Total TTC :</span>
                                        <span>{totalTtc.toLocaleString("fr-FR")} €</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="form-field" style={{ marginTop: '1.5rem' }}>
                                <label className="form-label">Notes internes <small style={{ color: "var(--muted-foreground)" }}>(Non visibles sur le PDF)</small></label>
                                <textarea
                                    className="profile-input textarea-field"
                                    rows="2"
                                    value={internalNotes}
                                    onChange={(e) => setInternalNotes(e.target.value)}
                                    placeholder="Notes de suivi interne..."
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="invoice-modal-actions">
                            <button type="button" className="cancel-btn" onClick={onClose}>Annuler</button>
                            <button type="submit" className="submit-invoice-btn">Créer le devis</button>
                        </div>
                    </form>
                </div>

                {/* Right Side: A4 Live Preview */}
                <div className="invoice-modal-preview-side">
                    <div className="preview-side-header">
                        <FileText size={16} />
                        <span>Aperçu du devis</span>
                    </div>
                    <div className="preview-side-scrollable">
                        {renderQuoteLivePreviewSheet()}
                    </div>
                </div>

            </div>

            {/* Client Search Portal */}
            {showClientSearch && createPortal(
                <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) setShowClientSearch(false); }}>
                    <div className="client-search-panel">
                        <div className="client-search-header">
                            <button type="button" className="client-search-back-btn" onClick={() => setShowClientSearch(false)}><X size={22} /></button>
                            <h3>Sélectionner un client</h3>
                            <div style={{ width: 34 }}></div>
                        </div>

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
                                            const isSelected = pendingClient && pendingClient.name === c.name;
                                            return (
                                                <div
                                                    key={c.name}
                                                    className={`client-search-item ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => setPendingClient(c)}
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
                        </div>

                        <div className="client-search-footer">
                            {pendingClient ? (
                                <button
                                    type="button"
                                    className="client-search-confirm-btn"
                                    onClick={() => {
                                        setSelectedClient(pendingClient);
                                        setShowClientSearch(false);
                                        setClientSearchQuery("");
                                        setPendingClient(null);
                                    }}
                                >
                                    Confirmer — {pendingClient.name}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="client-search-add-btn secondary"
                                    onClick={() => {
                                        const newName = clientSearchQuery.trim();
                                        if (newName) {
                                            setSelectedClient({ name: newName, type: "Particulier", email: `${newName.toLowerCase().replace(" ", ".")}@email.com`, address: "Adresse personnalisée" });
                                            setShowClientSearch(false);
                                            setClientSearchQuery("");
                                        }
                                    }}
                                >
                                    + Ajouter un client
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Catalog Supplies Selector Modal with direct new item addition form */}
            {showCatalogSearch && createPortal(
                <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) setShowCatalogSearch(false); }}>
                    <div className="client-search-panel">
                        <div className="client-search-header">
                            <button type="button" className="client-search-back-btn" onClick={() => setShowCatalogSearch(false)}><X size={22} /></button>
                            <h3>Sélectionner un article / service</h3>
                            <div style={{ width: 34 }}></div>
                        </div>

                        {showNewCatalogItemForm ? (
                            <div className="new-catalog-item-form-wrapper" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, backgroundColor: 'var(--card)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ padding: '6px', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', borderRadius: '6px', display: 'inline-flex' }}>
                                        <Plus size={16} />
                                    </div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Créer un nouvel article</h3>
                                </div>

                                <div className="form-field">
                                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nom de l'article / service*</label>
                                    <input
                                        type="text"
                                        className="profile-input"
                                        placeholder="Ex: Main d'œuvre diagnostic"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prix unitaire HT (€)*</label>
                                    <input
                                        type="number"
                                        className="profile-input"
                                        placeholder="Ex: 85"
                                        value={newItemPrice}
                                        onChange={(e) => setNewItemPrice(e.target.value)}
                                        style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                                    <button
                                        type="button"
                                        className="client-search-confirm-btn"
                                        style={{ flex: 2, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => {
                                            if (!newItemName.trim()) {
                                                alert("Veuillez saisir un nom.");
                                                return;
                                            }
                                            const price = parseFloat(newItemPrice) || 0;
                                            setLines(lines.map(line => line.id === activeLineId ? { ...line, description: newItemName, unitPrice: price } : line));
                                            setShowCatalogSearch(false);
                                            setCatalogSearchQuery("");
                                            setNewItemName("");
                                            setNewItemPrice("");
                                            setShowNewCatalogItemForm(false);
                                        }}
                                    >
                                        Confirmer et ajouter
                                    </button>
                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        style={{ flex: 1, height: '42px', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
                                        onClick={() => setShowNewCatalogItemForm(false)}
                                    >
                                        Retour
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="client-search-bar-container">
                                    <div className="client-search-input-wrapper">
                                        <Search size={18} className="client-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Nom de la fourniture ou prestation..."
                                            value={catalogSearchQuery}
                                            onChange={(e) => setCatalogSearchQuery(e.target.value)}
                                            className="client-search-input"
                                        />
                                    </div>
                                </div>

                                <div className="client-search-list-container">
                                    {Object.entries(
                                        getGroupedCatalog(
                                            mockCatalog.filter(item =>
                                                item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase())
                                            )
                                        )
                                    ).map(([letter, list]) => (
                                        <div key={letter} className="client-search-group">
                                            <span className="client-search-group-letter">{letter}</span>
                                            <div className="client-search-group-items">
                                                {list.map(item => {
                                                    const isSelected = pendingCatalogItem && pendingCatalogItem.id === item.id;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`client-search-item ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => setPendingCatalogItem(item)}
                                                        >
                                                            <span className="client-item-name">{item.description}</span>
                                                            <span className="client-item-badge organisation" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                                                {item.unitPrice} € HT
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    {mockCatalog.filter(item =>
                                        item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase())
                                    ).length === 0 && (
                                            <div className="client-search-empty">
                                                <span>Aucun article ne correspond à votre recherche</span>
                                            </div>
                                        )}
                                </div>

                                <div className="client-search-footer" style={{ gap: '8px' }}>
                                    {pendingCatalogItem ? (
                                        <button
                                            type="button"
                                            className="client-search-confirm-btn"
                                            onClick={() => {
                                                setLines(lines.map(line => line.id === activeLineId ? { ...line, description: pendingCatalogItem.description, unitPrice: pendingCatalogItem.unitPrice } : line));
                                                setShowCatalogSearch(false);
                                                setCatalogSearchQuery("");
                                                setPendingCatalogItem(null);
                                            }}
                                        >
                                            Sélectionner — {pendingCatalogItem.description}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="client-search-confirm-btn"
                                            onClick={() => {
                                                const customDesc = catalogSearchQuery.trim();
                                                if (customDesc) {
                                                    setLines(lines.map(line => line.id === activeLineId ? { ...line, description: customDesc, unitPrice: 0 } : line));
                                                    setShowCatalogSearch(false);
                                                    setCatalogSearchQuery("");
                                                }
                                            }}
                                            disabled={!catalogSearchQuery.trim()}
                                            style={{ opacity: catalogSearchQuery.trim() ? 1 : 0.6 }}
                                        >
                                            Sélectionner le texte saisi
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="client-search-add-btn secondary"
                                        onClick={() => {
                                            setNewItemName(catalogSearchQuery);
                                            setNewItemPrice("");
                                            setShowNewCatalogItemForm(true);
                                        }}
                                    >
                                        + Ajouter un nouvel article (nom, prix...)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}

export default NewQuoteModal;
