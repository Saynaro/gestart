import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import "../HomePage/Homepage.css";
import "./ClientPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import {
    Search,
    Plus,
    X,
    ChevronRight,
    ChevronDown,
    ArrowLeft,
    Phone,
    Mail,
    MapPin,
    Calendar,
    MessageSquare,
    FileText,
    Edit3
} from "lucide-react";

// Contacts data
const initialContacts = [
    { id: 1, firstName: "Jane", lastName: "Doe", badge: "Test", email: "jane-doe@yopmail.com", phone: "01 23 45 67 89", address: "23 Rue Paganini", zip: "06000", city: "NICE", type: "particulier" },
    { id: 2, firstName: "John", lastName: "Doe", badge: "Test", email: "john-doe@yopmail.com", phone: "06 98 76 54 32", address: "45 Avenue Jean Médecin", zip: "06000", city: "NICE", type: "particulier" },
    { id: 3, firstName: "Khalid", lastName: "Sainaro", badge: null, email: "khalidsainaro@gmail.com", phone: "07 12 34 56 78", address: "12 Blvd Victor Hugo", zip: "06200", city: "NICE", type: "particulier" },
    { id: 4, firstName: "Sophie", lastName: "Martin", badge: null, email: "s.martin@baticonstruct.fr", phone: "04 93 12 34 56", address: "8 Rue de la Préfecture", zip: "06300", city: "NICE", type: "organisation", company: "BatiConstruct" },
    { id: 5, firstName: "Jean", lastName: "Dupont", badge: null, email: "jean.dupont@alutech.fr", phone: "04 92 11 22 33", address: "150 Route de Grenoble", zip: "06200", city: "NICE", type: "organisation", company: "AluTech SAS" },
    { id: 6, firstName: "Martin", lastName: "Dupont", badge: null, email: "martin.dupont@email.com", phone: "06 12 34 56 78", address: "12 Rue de la Paix", zip: "75002", city: "Paris", type: "particulier" }
];

// Helper to fill mock details if not present
const getClientDetails = (client) => {
    if (!client) return null;
    const defaultEquipment = {
        model: "Daikin 3.5kW Inverter",
        installDate: "15/03/2024",
        serialNumber: "DK-2024-1234"
    };
    const defaultMaintenance = {
        status: "OK",
        nextMaintenance: "15/03/2027"
    };
    const defaultInterventions = [
        { title: "Maintenance annuelle", date: "15/03/2026", tech: "Marc D.", status: "Terminé", desc: "RAS, système fonctionne parfaitement" },
        { title: "Dépannage", date: "20/07/2025", tech: "Pierre L.", status: "Terminé", desc: "Remplacement filtre, nettoyage unité" },
        { title: "Installation", date: "15/03/2024", tech: "Marc D.", status: "Terminé", desc: "Installation complète, client formé à l'utilisation" }
    ];
    const defaultMessages = [
        { date: "16/03/2026", sender: "Client", text: "Bonjour, merci pour l'intervention d'hier. Tout fonctionne parfaitement." },
        { date: "14/03/2026", sender: "Technicien", text: "Bonjour, je passerai demain vers 10h pour la maintenance annuelle." }
    ];
    const defaultFactures = [
        { id: "FACT-2026-004", date: "15/03/2026", amount: "120,00 €", status: "Payé" },
        { id: "FACT-2025-089", date: "20/07/2025", amount: "85,00 €", status: "Payé" }
    ];
    const defaultDevis = [
        { id: "DEV-2026-012", date: "10/03/2026", amount: "120,00 €", status: "Accepté" },
        { id: "DEV-2024-002", date: "01/03/2024", amount: "3 420,00 €", status: "Accepté" }
    ];

    return {
        ...client,
        equipment: client.equipment || defaultEquipment,
        maintenance: client.maintenance || defaultMaintenance,
        interventions: client.interventions || defaultInterventions,
        messages: client.messages || defaultMessages,
        factures: client.factures || defaultFactures,
        devis: client.devis || defaultDevis
    };
};

// Organization list derived from contacts plus others
const initialOrganisations = [
    { id: 10, name: "LexCorp", contact: "Jane Doe", email: "info@lexcorp.com", phone: "01 02 03 04 05", address: "15 Rue de Paris", zip: "75001", city: "PARIS" },
    { id: 11, name: "AluTech SAS", contact: "Jean Dupont", email: "contact@alutech.fr", phone: "04 92 11 22 33", address: "150 Route de Grenoble", zip: "06200", city: "NICE" },
    { id: 12, name: "BatiConstruct", contact: "Sophie Martin", email: "s.martin@baticonstruct.fr", phone: "04 93 12 34 56", address: "8 Rue de la Préfecture", zip: "06300", city: "NICE" },
    { id: 13, name: "BatiConstruct", contact: "Sophie Martin", email: "s.martin@baticonstruct.fr", phone: "04 93 12 34 56", address: "8 Rue de la Préfecture", zip: "06300", city: "NICE" },
    { id: 14, name: "BatiConstruct", contact: "Sophie Martin", email: "s.martin@baticonstruct.fr", phone: "04 93 12 34 56", address: "8 Rue de la Préfecture", zip: "06300", city: "NICE" },
];

function ClientPage() {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState(initialContacts);
    const [organisations, setOrganisations] = useState(initialOrganisations);
    const [searchTerm, setSearchTerm] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    const [activeTabType, setActiveTabType] = useState("particulier"); // "particulier" or "organisation"
    const [selectedClient, setSelectedClient] = useState(null);
    const [detailTab, setDetailTab] = useState("interventions");
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
        setPullDistance(0);
    }, [activeTabType]);

    // Framer motion drag controls to isolate drag on the handle-bar/header
    const dragControlsMain = useDragControls();
    const dragControlsSub = useDragControls();

    // Pull-to-refresh logic
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const touchStartRef = useRef(0);
    const isAtTopRef = useRef(true);

    const handleTouchStart = (e) => {
        const container = e.currentTarget;
        isAtTopRef.current = container.scrollTop === 0;
        if (isAtTopRef.current) {
            touchStartRef.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e) => {
        if (!isAtTopRef.current || isRefreshing) return;
        const currentY = e.touches[0].clientY;
        const pull = currentY - touchStartRef.current;
        if (pull > 0) {
            const dist = Math.min(80, pull * 0.4);
            setPullDistance(dist);
            // Prevent elastic browser window scroll only when pulling down inside scroll area
            if (pull > 5) {
                if (e.cancelable) e.preventDefault();
            }
        }
    };

    const handleTouchEnd = () => {
        if (pullDistance > 50) {
            setIsRefreshing(true);
            setPullDistance(50);
            setTimeout(() => {
                setIsRefreshing(false);
                setPullDistance(0);
            }, 1500);
        } else {
            setPullDistance(0);
        }
    };

    // Bottom Sheets state
    const [editingClient, setEditingClient] = useState(null);
    const [activeSubSheet, setActiveSubSheet] = useState(null); // null, "phone", "email", "address"

    // Form temporary states
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editAddress, setEditAddress] = useState("");
    const [editComplAddress, setEditComplAddress] = useState("");
    const [editZip, setEditZip] = useState("");
    const [editCity, setEditCity] = useState("");
    const [editDiffDelivery, setEditDiffDelivery] = useState(false);

    // Detect mobile viewport
    useEffect(() => {
        setIsMobile(window.innerWidth <= 768);
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Filter contacts based on search and type
    const filteredContacts = contacts.filter(contact => {
        const matchesSearch =
            `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const filteredOrganisations = organisations.filter(org => {
        return (
            org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    // Group contacts alphabetically for mobile Particulier view
    const groupedContacts = {};
    filteredContacts.forEach(contact => {
        const firstLetter = contact.lastName.charAt(0).toUpperCase() || "A";
        if (!groupedContacts[firstLetter]) {
            groupedContacts[firstLetter] = [];
        }
        groupedContacts[firstLetter].push(contact);
    });
    const sortedLetters = Object.keys(groupedContacts).sort();

    // Group organisations alphabetically for mobile Organisation view
    const groupedOrgs = {};
    filteredOrganisations.forEach(org => {
        const firstLetter = org.name.charAt(0).toUpperCase() || "A";
        if (!groupedOrgs[firstLetter]) {
            groupedOrgs[firstLetter] = [];
        }
        groupedOrgs[firstLetter].push(org);
    });
    const sortedOrgLetters = Object.keys(groupedOrgs).sort();

    // Trigger editing bottom sheet
    const handleOpenEdit = (client, isOrg = false) => {
        setEditingClient({ ...client, isOrg });
        if (isOrg) {
            setEditFirstName(client.name);
            setEditLastName("");
        } else {
            setEditFirstName(client.firstName);
            setEditLastName(client.lastName);
        }
        setEditPhone(client.phone || "");
        setEditEmail(client.email || "");
        setEditAddress(client.address || "");
        setEditComplAddress("");
        setEditZip(client.zip || "");
        setEditCity(client.city || "");
        setEditDiffDelivery(false);
    };

    const handleSaveClient = () => {
        const updatedClient = editingClient.isOrg ? {
            ...editingClient,
            name: editFirstName,
            phone: editPhone,
            email: editEmail,
            address: editAddress,
            zip: editZip,
            city: editCity
        } : {
            ...editingClient,
            firstName: editFirstName,
            lastName: editLastName,
            phone: editPhone,
            email: editEmail,
            address: editAddress,
            zip: editZip,
            city: editCity
        };

        if (editingClient.isOrg) {
            setOrganisations(prev => prev.map(o => o.id === editingClient.id ? updatedClient : o));
        } else {
            setContacts(prev => prev.map(c => c.id === editingClient.id ? updatedClient : c));
        }

        if (selectedClient && selectedClient.id === editingClient.id) {
            setSelectedClient(updatedClient);
        }

        setEditingClient(null);
    };

    const renderMobileDetailView = () => {
        const details = getClientDetails(selectedClient);

        return (
            <div className="mobile-contacts-view" style={{ backgroundColor: '#f8fafc' }}>
                {/* Header */}
                <div className="mobile-nav-header" style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', padding: '16px' }}>
                    <button className="mobile-back-circle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(95, 75, 219, 0.08)', border: 'none', color: '#5f4bdb', cursor: 'pointer' }} onClick={() => setSelectedClient(null)}>
                        <ArrowLeft size={16} />
                    </button>
                    <span className="mobile-nav-header-title visible" style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', textAlign: 'center', flex: 1 }}>
                        {selectedClient.isOrg ? selectedClient.name : `${selectedClient.firstName} ${selectedClient.lastName}`}
                    </span>
                    <div style={{ width: '36px' }} />
                </div>

                <div className="mobile-contacts-scrollable-content" style={{ paddingBottom: '100px' }}>
                    {/* Mobile Detail Layout */}
                    <div className="mobile-detail-container" style={{ padding: '16px' }}>
                        {/* Profile Card */}
                        <div className="mobile-detail-profile-card">
                            <div className="mobile-profile-avatar">
                                {selectedClient.isOrg ? selectedClient.name[0] : `${selectedClient.firstName[0]}${selectedClient.lastName[0]}`}
                            </div>

                            <h2 className="mobile-profile-name">
                                {selectedClient.isOrg ? selectedClient.name : `${selectedClient.firstName} ${selectedClient.lastName}`}
                            </h2>

                            <div className="mobile-profile-contact-info">
                                <div className="mobile-contact-row">
                                    <Phone size={16} className="contact-icon-icon" />
                                    <span>{selectedClient.phone || "Non renseigné"}</span>
                                </div>
                                <div className="mobile-contact-row">
                                    <Mail size={16} className="contact-icon-icon" />
                                    <span>{selectedClient.email || "Non renseigné"}</span>
                                </div>
                                <div className="mobile-contact-row">
                                    <MapPin size={16} className="contact-icon-icon" />
                                    <span>{selectedClient.address ? `${selectedClient.address}, ${selectedClient.zip} ${selectedClient.city}` : "Non renseigné"}</span>
                                </div>
                            </div>

                            <div className="panel-divider"></div>

                            <h3 className="mobile-section-title">ÉQUIPEMENT</h3>
                            <div className="mobile-equipment-box">
                                <div className="equipment-row">
                                    <span className="equipment-label">Marque / Modèle</span>
                                    <span className="equipment-value">{details.equipment.model}</span>
                                </div>
                                <div className="equipment-row">
                                    <span className="equipment-label">Date installation</span>
                                    <span className="equipment-value">{details.equipment.installDate}</span>
                                </div>
                                <div className="equipment-row">
                                    <span className="equipment-label">N° de série</span>
                                    <span className="equipment-value font-mono">{details.equipment.serialNumber}</span>
                                </div>
                            </div>

                            <div className="panel-divider"></div>

                            <h3 className="mobile-section-title">STATUT ENTRETIEN</h3>
                            <div className="mobile-maintenance-box">
                                <div className="maintenance-badge green">
                                    <span>{details.maintenance.status}</span>
                                </div>
                                <div className="maintenance-next">
                                    Prochain entretien: {details.maintenance.nextMaintenance}
                                </div>
                            </div>

                            <div className="mobile-action-grid">
                                <button className="mobile-action-btn modifier" onClick={() => handleOpenEdit(selectedClient, selectedClient.isOrg)}>
                                    <Edit3 size={16} />
                                    <span>Modifier</span>
                                </button>
                                <button className="mobile-action-btn planifier" onClick={() => alert("Planification ouverte !")}>
                                    <Calendar size={16} />
                                    <span>Planifier</span>
                                </button>
                                <button className="mobile-action-btn sms" onClick={() => alert("SMS envoyé !")}>
                                    <MessageSquare size={16} />
                                    <span>SMS</span>
                                </button>
                                <button className="mobile-action-btn facture" onClick={() => alert("Facture créée !")}>
                                    <FileText size={16} />
                                    <span>Facture</span>
                                </button>
                            </div>
                        </div>

                        {/* Tabs Panel */}
                        <div className="mobile-detail-tabs-card">
                            <div className="mobile-tabs-header">
                                {["interventions", "messages", "factures", "devis"].map((tab) => (
                                    <button
                                        key={tab}
                                        className={`mobile-tab-btn ${detailTab === tab ? "active" : ""}`}
                                        onClick={() => setDetailTab(tab)}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <div className="mobile-tab-body">
                                {detailTab === "interventions" && (
                                    <div className="mobile-tab-panel">
                                        {details.interventions.map((item, idx) => (
                                            <div key={idx} className="mobile-history-card">
                                                <div className="history-card-header">
                                                    <h4>{item.title}</h4>
                                                    <span className="history-card-date">{item.date}</span>
                                                </div>
                                                <p><strong>Tech:</strong> {item.tech} · <span className="status-finished">{item.status}</span></p>
                                                <p className="history-card-desc">"{item.desc}"</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {detailTab === "messages" && (
                                    <div className="mobile-tab-panel">
                                        {details.messages.map((item, idx) => (
                                            <div key={idx} className={`mobile-history-card msg-${item.sender.toLowerCase()}`}>
                                                <div className="history-card-header">
                                                    <h4>{item.sender}</h4>
                                                    <span className="history-card-date">{item.date}</span>
                                                </div>
                                                <p className="history-card-desc">"{item.text}"</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {detailTab === "factures" && (
                                    <div className="mobile-tab-panel">
                                        {details.factures.map((item, idx) => (
                                            <div key={idx} className="mobile-history-card bill">
                                                <div className="history-card-header">
                                                    <h4>{item.id}</h4>
                                                    <span className="history-card-date">{item.date}</span>
                                                </div>
                                                <p><strong>Montant:</strong> {item.amount} · <span className="status-paid">{item.status}</span></p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {detailTab === "devis" && (
                                    <div className="mobile-tab-panel">
                                        {details.devis.map((item, idx) => (
                                            <div key={idx} className="mobile-history-card quote">
                                                <div className="history-card-header">
                                                    <h4>{item.id}</h4>
                                                    <span className="history-card-date">{item.date}</span>
                                                </div>
                                                <p><strong>Montant:</strong> {item.amount} · <span className="status-accepted">{item.status}</span></p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Mobile Bottom Tab Bar */}
                <SideBar />
            </div>
        );
    };

    // Main layout render for Mobile (Image 1 style)
    const renderMobileLayout = () => {
        if (selectedClient) {
            return renderMobileDetailView();
        }
        const isParticulier = activeTabType === "particulier";
        const currentGrouped = isParticulier ? groupedContacts : groupedOrgs;
        const currentSortedLetters = isParticulier ? sortedLetters : sortedOrgLetters;

        return (
            <div className="mobile-contacts-view">
                {/* Top Navbar (Stays fixed, no bouncing) */}
                <div className="mobile-contacts-top-navbar">
                    <h1 className="mobile-navbar-title">Clients</h1>
                    <div className="mobile-navbar-avatar" onClick={() => navigate("/settings")}>
                        <span>KS</span>
                    </div>
                </div>

                {/* Scrollable container with pull-to-refresh overscroll */}
                <div
                    ref={scrollContainerRef}
                    className="mobile-contacts-scrollable-content"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Pull to Refresh Spinner under the navbar */}
                    <div
                        className="pull-to-refresh-indicator"
                        style={{
                            height: pullDistance > 0 ? `${pullDistance}px` : '0px',
                            opacity: pullDistance > 10 ? 1 : 0
                        }}
                    >
                        <div className="pull-to-refresh-spinner-circle">
                            <svg className={`spinner-icon ${isRefreshing ? 'spinning' : ''}`} viewBox="0 0 24 24">
                                <circle className="spinner-path" cx="12" cy="12" r="10" fill="none" strokeWidth="3"></circle>
                            </svg>
                        </div>
                    </div>

                    {/* Tab Pill Selector */}
                    <div className="mobile-contacts-tab-container">
                        <div className="mobile-contacts-tab-bar">
                            <button
                                className={`mobile-tab-btn ${isParticulier ? "active" : ""}`}
                                onClick={() => setActiveTabType("particulier")}
                            >
                                Particulier
                            </button>
                            <button
                                className={`mobile-tab-btn ${!isParticulier ? "active" : ""}`}
                                onClick={() => setActiveTabType("organisation")}
                            >
                                Organisation
                            </button>
                        </div>
                    </div>

                    {/* Search box */}
                    <div className="mobile-search-box">
                        <div className="mobile-search-input-wrapper">
                            <Search size={18} className="mobile-search-icon-left" />
                            <input
                                type="text"
                                placeholder="Rechercher un contact..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="mobile-search-input-field"
                            />
                        </div>
                    </div>

                    {/* Grouped Contacts List */}
                    <div className="mobile-grouped-list-container">
                        {currentSortedLetters.map(letter => (
                            <div key={letter} className="mobile-letter-group">
                                <span className="mobile-letter-header">{letter}</span>
                                <div className="mobile-letter-card">
                                    {currentGrouped[letter].map((client, idx) => (
                                        <div
                                            key={client.id}
                                            className="mobile-contact-list-row"
                                            onClick={() => setSelectedClient(client)}
                                        >
                                            <div className="mobile-contact-row-info">
                                                <div className="mobile-contact-name-row">
                                                    <span className="mobile-contact-name">
                                                        {isParticulier ? `${client.firstName} ${client.lastName}` : client.name}
                                                    </span>
                                                    {isParticulier && client.badge && (
                                                        <span className="mobile-contact-badge-green">{client.badge}</span>
                                                    )}
                                                </div>
                                                <span className="mobile-contact-email">{client.email}</span>
                                            </div>
                                            <ChevronRight size={18} className="mobile-row-chevron-right" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {currentSortedLetters.length === 0 && (
                            <div className="mobile-no-results">
                                Aucun contact trouvé
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Bottom Tab Bar */}
                <SideBar />
            </div>
        );
    };

    return (
        <>
            {isMobile ? (
                renderMobileLayout()
            ) : (
                // Desktop View
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
                            {selectedClient ? (
                                <>
                                    {/* Breadcrumbs */}
                                    <div className="client-breadcrumbs">
                                        <span className="breadcrumb-link" onClick={() => setSelectedClient(null)}>Clients</span>
                                        <span className="breadcrumb-arrow"> &gt; </span>
                                        <span className="breadcrumb-current">
                                            {selectedClient.isOrg ? selectedClient.name : `${selectedClient.firstName} ${selectedClient.lastName}`}
                                        </span>
                                    </div>

                                    {/* Detail Grid */}
                                    <div className="client-detail-layout">
                                        {/* Left Card: Profile & Stats */}
                                        <div className="client-profile-card">
                                            <div className="client-profile-avatar-circle">
                                                {selectedClient.isOrg ? selectedClient.name[0] : `${selectedClient.firstName[0]}${selectedClient.lastName[0]}`}
                                            </div>
                                            <h2 className="client-profile-name">
                                                {selectedClient.isOrg ? selectedClient.name : `${selectedClient.firstName} ${selectedClient.lastName}`}
                                            </h2>

                                            <div className="client-profile-contact-info">
                                                <div className="mobile-contact-row">
                                                    <Phone size={16} className="contact-icon-icon" />
                                                    <span>{selectedClient.phone || "Non renseigné"}</span>
                                                </div>
                                                <div className="mobile-contact-row">
                                                    <Mail size={16} className="contact-icon-icon" />
                                                    <span>{selectedClient.email || "Non renseigné"}</span>
                                                </div>
                                                <div className="mobile-contact-row">
                                                    <MapPin size={16} className="contact-icon-icon" />
                                                    <span>{selectedClient.address ? `${selectedClient.address}, ${selectedClient.zip} ${selectedClient.city}` : "Non renseigné"}</span>
                                                </div>
                                            </div>

                                            <div className="panel-divider"></div>

                                            <h3 className="mobile-section-title">ÉQUIPEMENT</h3>
                                            <div className="mobile-equipment-box">
                                                <div className="equipment-row">
                                                    <span className="equipment-label">Marque / Modèle</span>
                                                    <span className="equipment-value">{getClientDetails(selectedClient).equipment.model}</span>
                                                </div>
                                                <div className="equipment-row">
                                                    <span className="equipment-label">Date installation</span>
                                                    <span className="equipment-value">{getClientDetails(selectedClient).equipment.installDate}</span>
                                                </div>
                                                <div className="equipment-row">
                                                    <span className="equipment-label">N° de série</span>
                                                    <span className="equipment-value font-mono">{getClientDetails(selectedClient).equipment.serialNumber}</span>
                                                </div>
                                            </div>

                                            <div className="panel-divider"></div>

                                            <h3 className="mobile-section-title">STATUT ENTRETIEN</h3>
                                            <div className="mobile-maintenance-box">
                                                <div className="maintenance-badge green">
                                                    <span>{getClientDetails(selectedClient).maintenance.status}</span>
                                                </div>
                                                <div className="maintenance-next">
                                                    Prochain entretien: {getClientDetails(selectedClient).maintenance.nextMaintenance}
                                                </div>
                                            </div>

                                            <div className="mobile-action-grid">
                                                <button className="mobile-action-btn modifier" onClick={() => handleOpenEdit(selectedClient, selectedClient.isOrg)}>
                                                    <Edit3 size={16} />
                                                    <span>Modifier</span>
                                                </button>
                                                <button className="mobile-action-btn planifier" onClick={() => alert("Planification ouverte !")}>
                                                    <Calendar size={16} />
                                                    <span>Planifier</span>
                                                </button>
                                                <button className="mobile-action-btn sms" onClick={() => alert("SMS envoyé !")}>
                                                    <MessageSquare size={16} />
                                                    <span>SMS</span>
                                                </button>
                                                <button className="mobile-action-btn facture" onClick={() => alert("Facture créée !")}>
                                                    <FileText size={16} />
                                                    <span>Facture</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Right Card: Tabs View */}
                                        <div className="client-detail-tabs-card">
                                            <div className="mobile-tabs-header">
                                                {["interventions", "messages", "factures", "devis"].map((tab) => (
                                                    <button
                                                        key={tab}
                                                        className={`mobile-tab-btn ${detailTab === tab ? "active" : ""}`}
                                                        onClick={() => setDetailTab(tab)}
                                                    >
                                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="mobile-tab-body">
                                                {detailTab === "interventions" && (
                                                    <div className="mobile-tab-panel">
                                                        {getClientDetails(selectedClient).interventions.map((item, idx) => (
                                                            <div key={idx} className="mobile-history-card">
                                                                <div className="history-card-header">
                                                                    <h4>{item.title}</h4>
                                                                    <span className="history-card-date">{item.date}</span>
                                                                </div>
                                                                <p><strong>Tech:</strong> {item.tech} · <span className="status-finished">{item.status}</span></p>
                                                                <p className="history-card-desc">"{item.desc}"</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {detailTab === "messages" && (
                                                    <div className="mobile-tab-panel">
                                                        {getClientDetails(selectedClient).messages.map((item, idx) => (
                                                            <div key={idx} className={`mobile-history-card msg-${item.sender.toLowerCase()}`}>
                                                                <div className="history-card-header">
                                                                    <h4>{item.sender}</h4>
                                                                    <span className="history-card-date">{item.date}</span>
                                                                </div>
                                                                <p className="history-card-desc">"{item.text}"</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {detailTab === "factures" && (
                                                    <div className="mobile-tab-panel">
                                                        {getClientDetails(selectedClient).factures.map((item, idx) => (
                                                            <div key={idx} className="mobile-history-card bill">
                                                                <div className="history-card-header">
                                                                    <h4>{item.id}</h4>
                                                                    <span className="history-card-date">{item.date}</span>
                                                                </div>
                                                                <p><strong>Montant:</strong> {item.amount} · <span className="status-paid">{item.status}</span></p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {detailTab === "devis" && (
                                                    <div className="mobile-tab-panel">
                                                        {getClientDetails(selectedClient).devis.map((item, idx) => (
                                                            <div key={idx} className="mobile-history-card quote">
                                                                <div className="history-card-header">
                                                                    <h4>{item.id}</h4>
                                                                    <span className="history-card-date">{item.date}</span>
                                                                </div>
                                                                <p><strong>Montant:</strong> {item.amount} · <span className="status-accepted">{item.status}</span></p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // Render Client List
                                <>
                                    <div className="content-header-row">
                                        <div className="content-header">
                                            <h1 className="content-title">Clients</h1>
                                            <p className="content-subtitle">Gérez vos relations clients et leurs informations.</p>
                                        </div>
                                        <button className="new-client-btn" onClick={() => alert("Nouveau client")}>
                                            + Nouveau Client
                                        </button>
                                    </div>

                                    {/* Filters and search */}
                                    <div className="filters-bar">
                                        <div className="search-input-wrapper">
                                            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="11" cy="11" r="8"></circle>
                                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                            </svg>
                                            <input
                                                type="text"
                                                placeholder="Rechercher un client..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="search-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="clients-grid">
                                        {filteredContacts.map((client, index) => (
                                            <div key={index} className="client-card" onClick={() => setSelectedClient(client)} style={{ cursor: 'pointer' }}>
                                                <div className="client-avatar-badge">{client.firstName[0]}{client.lastName[0]}</div>
                                                <div className="client-info">
                                                    <h3>{client.firstName} {client.lastName}</h3>
                                                    <span className="client-company">{client.company || "Particulier"}</span>
                                                    <span className="client-email">{client.email}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredContacts.length === 0 && (
                                            <div className="no-results">
                                                Aucun client ne correspond à votre recherche.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>
            )}

            {/* Desktop Client Edit Modal */}
            <AnimatePresence>
                {editingClient && !isMobile && (
                    <div className="desktop-modal-wrapper">
                        {/* Backdrop overlay */}
                        <motion.div
                            className="desktop-modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingClient(null)}
                        />

                        {/* Modal Container */}
                        <motion.div
                            className="desktop-modal-container"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="desktop-modal-header">
                                <h2>Modifier le client</h2>
                                <button className="desktop-modal-close" onClick={() => setEditingClient(null)}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="desktop-modal-body">
                                {editingClient.isOrg ? (
                                    <div className="form-field">
                                        <label className="form-label">Nom de l'organisation*</label>
                                        <input
                                            type="text"
                                            value={editFirstName}
                                            onChange={(e) => setEditFirstName(e.target.value)}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div className="profile-form-grid">
                                        <div className="form-field">
                                            <label className="form-label">Prénom*</label>
                                            <input
                                                type="text"
                                                value={editFirstName}
                                                onChange={(e) => setEditFirstName(e.target.value)}
                                                className="form-input"
                                                required
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">Nom*</label>
                                            <input
                                                type="text"
                                                value={editLastName}
                                                onChange={(e) => setEditLastName(e.target.value)}
                                                className="form-input"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="profile-form-grid" style={{ marginTop: '12px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Téléphone</label>
                                        <input
                                            type="text"
                                            value={editPhone}
                                            onChange={(e) => setEditPhone(e.target.value)}
                                            className="form-input"
                                            placeholder="06 12 34 56 78"
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                            className="form-input"
                                            placeholder="client@email.com"
                                        />
                                    </div>
                                </div>

                                <div className="form-field" style={{ marginTop: '12px' }}>
                                    <label className="form-label">Adresse</label>
                                    <input
                                        type="text"
                                        value={editAddress}
                                        onChange={(e) => setEditAddress(e.target.value)}
                                        className="form-input"
                                        placeholder="12 Rue de la Paix"
                                    />
                                </div>

                                <div className="profile-form-grid" style={{ marginTop: '12px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Code postal</label>
                                        <input
                                            type="text"
                                            value={editZip}
                                            onChange={(e) => setEditZip(e.target.value)}
                                            className="form-input"
                                            placeholder="75002"
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Ville</label>
                                        <input
                                            type="text"
                                            value={editCity}
                                            onChange={(e) => setEditCity(e.target.value)}
                                            className="form-input"
                                            placeholder="Paris"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="desktop-modal-footer">
                                <button className="desktop-modal-cancel-btn" onClick={() => setEditingClient(null)}>
                                    Annuler
                                </button>
                                <button className="desktop-modal-save-btn" onClick={handleSaveClient}>
                                    Enregistrer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mobile bottom sheets */}
            {isMobile && (
                <>
                    {/* Main Client Edit Sheet (Modifier le client) */}
                    <AnimatePresence>
                        {editingClient && (
                            <>
                                {/* Backdrop overlay */}
                                <motion.div
                                    className="fixed inset-0 z-[2100] bg-black/40 backdrop-blur-[2px]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setEditingClient(null)}
                                />

                                {/* Bottom Sheet Container */}
                                <motion.div
                                    className="fixed bottom-0 left-0 right-0 z-[2150] mx-auto w-full max-w-md bg-[#f8fafc] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] overflow-y-auto outline-none"
                                    style={{ maxHeight: '92vh', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', willChange: "transform" }}
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.38 }}
                                    drag="y"
                                    dragControls={dragControlsMain}
                                    dragListener={false}
                                    dragConstraints={{ top: 0 }}
                                    dragElastic={{ top: 0, bottom: 0.8 }}
                                    onDragEnd={(event, info) => {
                                        if (info.offset.y > 100) {
                                            setEditingClient(null);
                                        }
                                    }}
                                >
                                    {/* Draggable Header Zone */}
                                    <div
                                        className="mobile-sheet-header-drag-zone"
                                        onPointerDown={(e) => dragControlsMain.start(e)}
                                        style={{ touchAction: "none" }}
                                    >
                                        <div className="mobile-drag-handle-bar" />
                                        <div className="mobile-sheet-header" style={{ borderBottom: 'none', backgroundColor: 'transparent' }}>
                                            <button className="mobile-sheet-close-btn" onClick={(e) => { e.stopPropagation(); setEditingClient(null); }}>
                                                <X size={18} />
                                            </button>
                                            <h2 className="mobile-sheet-title">Modifier le client</h2>
                                            <div style={{ width: '36px' }} />
                                        </div>
                                    </div>

                                    {/* Form Body */}
                                    <div className="mobile-sheet-body-stack">
                                        {editingClient.isOrg ? (
                                            <div className="mobile-form-card">
                                                <span className="mobile-form-card-label">Nom de l'organisation*</span>
                                                <input
                                                    type="text"
                                                    value={editFirstName}
                                                    onChange={(e) => setEditFirstName(e.target.value)}
                                                    className="mobile-form-card-input"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mobile-form-card">
                                                    <span className="mobile-form-card-label">Prénom*</span>
                                                    <input
                                                        type="text"
                                                        value={editFirstName}
                                                        onChange={(e) => setEditFirstName(e.target.value)}
                                                        className="mobile-form-card-input"
                                                    />
                                                </div>

                                                <div className="mobile-form-card">
                                                    <span className="mobile-form-card-label">Nom*</span>
                                                    <input
                                                        type="text"
                                                        value={editLastName}
                                                        onChange={(e) => setEditLastName(e.target.value)}
                                                        className="mobile-form-card-input"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Phone selector card */}
                                        <div className="mobile-form-card select" onClick={() => setActiveSubSheet("phone")}>
                                            <span className="mobile-form-card-label">Téléphone</span>
                                            <div className="mobile-form-card-row">
                                                <span className="mobile-flag">🇫🇷</span>
                                                <span className="mobile-form-card-val">{editPhone || "Saisir un numéro"}</span>
                                                <ChevronDown size={18} className="mobile-card-chevron" />
                                            </div>
                                        </div>

                                        {/* Email selector card */}
                                        <div className="mobile-form-card select" onClick={() => setActiveSubSheet("email")}>
                                            <span className="mobile-form-card-label">Emails</span>
                                            <div className="mobile-form-card-row">
                                                <span className="mobile-form-card-val">{editEmail || "Saisir un email"}</span>
                                                <ChevronDown size={18} className="mobile-card-chevron" />
                                            </div>
                                        </div>

                                        {/* Address selector card */}
                                        <div className="mobile-form-card select" onClick={() => setActiveSubSheet("address")}>
                                            <span className="mobile-form-card-label">Adresse de facturation</span>
                                            <div className="mobile-form-card-row">
                                                <span className="mobile-form-card-val">
                                                    {editAddress ? `${editAddress}, ${editZip} ${editCity}` : "Saisir une adresse"}
                                                </span>
                                                <ChevronDown size={18} className="mobile-card-chevron" />
                                            </div>
                                        </div>

                                        {/* Toggle Row */}
                                        <div className="mobile-toggle-card">
                                            <div className="mobile-toggle-row">
                                                <span className="mobile-toggle-label">Préciser une adresse de livraison différente</span>
                                                <label className="mobile-toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={editDiffDelivery}
                                                        onChange={(e) => setEditDiffDelivery(e.target.checked)}
                                                    />
                                                    <span className="toggle-slider" />
                                                </label>
                                            </div>
                                            <p className="mobile-toggle-desc">
                                                La modification de l'adresse de livraison depuis le client ne modifiera pas celle sur le document en cours d'édition.
                                            </p>
                                        </div>

                                        {/* Save and Archive Buttons */}
                                        <div className="mobile-sheet-actions">
                                            <button className="mobile-sheet-save-btn" onClick={handleSaveClient}>
                                                Enregistrer
                                            </button>
                                            <button className="mobile-sheet-archive-btn" onClick={() => { alert("Archivé !"); setEditingClient(null); }}>
                                                Archiver
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Nested Sub-Sheets (z-index 2200) */}
                    <AnimatePresence>
                        {activeSubSheet && (
                            <>
                                {/* Nested Backdrop overlay */}
                                <motion.div
                                    className="fixed inset-0 z-[2200] bg-black/45 backdrop-blur-[2px]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setActiveSubSheet(null)}
                                />

                                {/* Sub-Sheet Container */}
                                <motion.div
                                    className="fixed bottom-0 left-0 right-0 z-[2250] mx-auto w-full max-w-md bg-white rounded-t-[32px] shadow-[0_-12px_45px_rgba(0,0,0,0.18)] outline-none overflow-y-auto"
                                    style={{ maxHeight: '92vh', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', willChange: "transform" }}
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.38 }}
                                    drag="y"
                                    dragControls={dragControlsSub}
                                    dragListener={false}
                                    dragConstraints={{ top: 0 }}
                                    dragElastic={{ top: 0, bottom: 0.8 }}
                                    onDragEnd={(event, info) => {
                                        if (info.offset.y > 100) {
                                            setActiveSubSheet(null);
                                        }
                                    }}
                                >
                                    {/* Draggable Header Zone for Sub-Sheet */}
                                    <div
                                        className="mobile-sheet-header-drag-zone"
                                        onPointerDown={(e) => dragControlsSub.start(e)}
                                        style={{ touchAction: "none", backgroundColor: 'white' }}
                                    >
                                        <div className="mobile-drag-handle-bar" />
                                        <div className="mobile-sheet-header" style={{ borderBottom: 'none', backgroundColor: 'transparent' }}>
                                            <button className="mobile-sheet-close-btn" onClick={(e) => { e.stopPropagation(); setActiveSubSheet(null); }}>
                                                <X size={18} />
                                            </button>
                                            <h2 className="mobile-sheet-title">
                                                {activeSubSheet === "email" ? "Adresses e-mails" : activeSubSheet === "phone" ? "Numéro de téléphone" : "Adresse de facturation"}
                                            </h2>
                                            <div style={{ width: '36px' }} />
                                        </div>
                                    </div>

                                    {/* SUB-SHEET 1: EMAIL EDIT */}
                                    {activeSubSheet === "email" && (
                                        <div>
                                            <div className="mobile-sheet-body-stack" style={{ padding: '0 16px 20px 16px' }}>
                                                <div className="mobile-email-input-pill">
                                                    <span className="mobile-email-text">{editEmail || "Saisissez votre email"}</span>
                                                    {editEmail && (
                                                        <button className="mobile-email-clear-btn" onClick={() => setEditEmail("")}>
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="mobile-email-add-row">
                                                    <input
                                                        type="email"
                                                        placeholder="Saisissez votre email"
                                                        value={editEmail}
                                                        onChange={(e) => setEditEmail(e.target.value)}
                                                        className="mobile-email-add-input"
                                                    />
                                                    <button className="mobile-email-add-btn">
                                                        <Plus size={18} />
                                                    </button>
                                                </div>

                                                <p className="mobile-sub-sheet-desc">
                                                    Vous pouvez ajouter plusieurs adresses e-mails pour un même client
                                                </p>

                                                <button className="mobile-sub-sheet-confirm-btn" onClick={() => setActiveSubSheet(null)}>
                                                    Confirmer
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* SUB-SHEET 2: PHONE EDIT */}
                                    {activeSubSheet === "phone" && (
                                        <div>
                                            <div className="mobile-sheet-body-stack" style={{ padding: '0 16px' }}>
                                                <div className="mobile-phone-input-row">
                                                    <div className="mobile-phone-country">
                                                        <span className="mobile-flag" style={{ fontSize: '18px' }}>🇫🇷</span>
                                                        <span className="mobile-phone-code">+33</span>
                                                    </div>
                                                    <div className="mobile-phone-number-field">
                                                        <input
                                                            type="tel"
                                                            value={editPhone}
                                                            onChange={(e) => setEditPhone(e.target.value)}
                                                            placeholder="01 23 45 67 89"
                                                            className="mobile-phone-number-input"
                                                        />
                                                        {editPhone && (
                                                            <button className="mobile-phone-clear-btn" onClick={() => setEditPhone("")}>
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <button className="mobile-sub-sheet-confirm-btn" onClick={() => setActiveSubSheet(null)}>
                                                    Ajouter ce numéro
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* SUB-SHEET 3: ADDRESS EDIT */}
                                    {activeSubSheet === "address" && (
                                        <div>
                                            <div className="mobile-sheet-body-stack" style={{ padding: '0 16px 20px 16px' }}>
                                                <div className="mobile-address-search-card">
                                                    <Search size={18} className="mobile-search-icon-left" />
                                                    <input
                                                        type="text"
                                                        placeholder="Chercher une adresse"
                                                        className="mobile-address-search-input"
                                                    />
                                                </div>

                                                <div className="mobile-form-card select">
                                                    <span className="mobile-form-card-label">Pays</span>
                                                    <div className="mobile-form-card-row">
                                                        <span className="mobile-flag">🇫🇷</span>
                                                        <span className="mobile-form-card-val" style={{ fontWeight: 700 }}>France</span>
                                                        <ChevronDown size={18} className="mobile-card-chevron" />
                                                    </div>
                                                </div>

                                                <div className="mobile-form-card">
                                                    <span className="mobile-form-card-label">Adresse</span>
                                                    <input
                                                        type="text"
                                                        placeholder="Adresse"
                                                        value={editAddress}
                                                        onChange={(e) => setEditAddress(e.target.value)}
                                                        className="mobile-form-card-input"
                                                    />
                                                </div>

                                                <div className="mobile-form-card">
                                                    <span className="mobile-form-card-label">Complément d'adresse</span>
                                                    <input
                                                        type="text"
                                                        placeholder="Complément d'adresse"
                                                        value={editComplAddress}
                                                        onChange={(e) => setEditComplAddress(e.target.value)}
                                                        className="mobile-form-card-input"
                                                    />
                                                </div>

                                                <div className="mobile-form-card">
                                                    <span className="mobile-form-card-label">Code postal</span>
                                                    <input
                                                        type="text"
                                                        placeholder="Code postal"
                                                        value={editZip}
                                                        onChange={(e) => setEditZip(e.target.value)}
                                                        className="mobile-form-card-input"
                                                    />
                                                </div>

                                                <div className="mobile-form-card">
                                                    <span className="mobile-form-card-label">Ville</span>
                                                    <input
                                                        type="text"
                                                        placeholder="Ville"
                                                        value={editCity}
                                                        onChange={(e) => setEditCity(e.target.value)}
                                                        className="mobile-form-card-input"
                                                    />
                                                </div>

                                                <button className="mobile-sub-sheet-confirm-btn" onClick={() => setActiveSubSheet(null)}>
                                                    Mettre à jour l'adresse
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </>
            )}
        </>
    );
}

export default ClientPage;
