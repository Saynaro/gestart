import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDragControls } from "framer-motion";
import "../HomePage/Homepage.css";
import "./ClientPage.css";

// Import layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";

// Import modular page components
import ClientSearchFilter from "./components/ClientSearchFilter";
import ClientTable from "./components/ClientTable";
import ClientMobileList from "./components/ClientMobileList";
import ClientDetailView from "./components/ClientDetailView";
import ClientMobileDetailView from "./components/ClientMobileDetailView";
import DesktopEditModal from "./components/DesktopEditModal";
import MobileEditBottomSheet from "./components/MobileEditBottomSheet";

// Contacts data matching the user's requirements and screenshots
const initialContacts = [
    {
        id: 100,
        firstName: "Jane",
        lastName: "Doe",
        badge: "Test",
        email: "jane-doe@yopmail.com",
        phone: "01 23 45 67 89",
        address: "23 Rue Paganini",
        zip: "06000",
        city: "NICE",
        type: "particulier",
        equipment: { model: "Daikin 3.5kW Inverter", installDate: "15/03/2024", serialNumber: "DK-2024-1234" },
        maintenance: { status: "OK", nextMaintenance: "15/03/2027" }
    },
    {
        id: 101,
        firstName: "John",
        lastName: "Doe",
        badge: "Test",
        email: "john-doe@yopmail.com",
        phone: "06 98 76 54 32",
        address: "45 Avenue Jean Médecin",
        zip: "06000",
        city: "NICE",
        type: "particulier",
        equipment: { model: "Daikin 3.5kW Inverter", installDate: "15/03/2024", serialNumber: "DK-2024-1234" },
        maintenance: { status: "OK", nextMaintenance: "15/03/2027" }
    },
    {
        id: 102,
        firstName: "Khalid",
        lastName: "Sainaro",
        badge: null,
        email: "khalidsainaro@gmail.com",
        phone: "07 12 34 56 78",
        address: "12 Blvd Victor Hugo",
        zip: "06200",
        city: "NICE",
        type: "particulier",
        equipment: { model: "Daikin 3.5kW Inverter", installDate: "15/03/2024", serialNumber: "DK-2024-1234" },
        maintenance: { status: "OK", nextMaintenance: "15/03/2027" }
    },
    {
        id: 1,
        firstName: "Martin",
        lastName: "Dupont",
        badge: null,
        email: "martin.dupont@email.com",
        phone: "06 12 34 56 78",
        address: "12 Rue de la Paix",
        zip: "75002",
        city: "Paris",
        type: "particulier",
        equipment: { model: "Daikin 3.5kW", installDate: "15/03/2024", serialNumber: "DK-2024-1234" },
        maintenance: { status: "OK", nextMaintenance: "15/03/2027" },
        interventions: [
            { title: "Maintenance annuelle", date: "15/03/2026", tech: "Marc D.", status: "Terminé", desc: "RAS, système fonctionne parfaitement" },
            { title: "Installation", date: "15/03/2024", tech: "Marc D.", status: "Terminé", desc: "Installation complète, client formé à l'utilisation" }
        ]
    },
    {
        id: 2,
        firstName: "Sophie",
        lastName: "Bernard",
        badge: null,
        email: "sophie.bernard@email.com",
        phone: "06 98 76 54 32",
        address: "45 Avenue Victor Hugo",
        zip: "69000",
        city: "Lyon",
        type: "particulier",
        equipment: { model: "Mitsubishi 2.5kW", installDate: "12/11/2024", serialNumber: "MB-2024-5678" },
        maintenance: { status: "Urgent", nextMaintenance: "12/11/2025" },
        interventions: [
            { title: "Dépannage", date: "12/11/2025", tech: "Pierre L.", status: "Terminé", desc: "Remplacement filtre, nettoyage unité" }
        ]
    },
    {
        id: 3,
        firstName: "Jean",
        lastName: "Moreau",
        badge: null,
        email: "jean.moreau@email.com",
        phone: "07 12 34 56 78",
        address: "8 Boulevard Haussmann",
        zip: "75009",
        city: "Paris",
        type: "particulier",
        equipment: { model: "Samsung 4kW", installDate: "28/02/2025", serialNumber: "SM-2025-9012" },
        maintenance: { status: "Bientôt", nextMaintenance: "28/02/2026" },
        interventions: [
            { title: "Maintenance annuelle", date: "28/02/2026", tech: "Marc D.", status: "Terminé", desc: "RAS, système fonctionne parfaitement" }
        ]
    },
    {
        id: 4,
        firstName: "Marie",
        lastName: "Petit",
        badge: null,
        email: "marie.petit@email.com",
        phone: "06 55 44 33 22",
        address: "23 Rue Lafayette",
        zip: "13000",
        city: "Marseille",
        type: "particulier",
        equipment: { model: "LG 3kW", installDate: "10/04/2025", serialNumber: "LG-2025-3456" },
        maintenance: { status: "OK", nextMaintenance: "10/04/2027" },
        interventions: [
            { title: "Dépannage", date: "10/04/2026", tech: "Marc D.", status: "Terminé", desc: "RAS" }
        ]
    },
    {
        id: 5,
        firstName: "Claire",
        lastName: "Laurent",
        badge: null,
        email: "claire.laurent@email.com",
        phone: "06 11 22 33 44",
        address: "56 Cours Gambetta",
        zip: "69000",
        city: "Lyon",
        type: "particulier",
        equipment: { model: "Panasonic 3.5kW", installDate: "05/01/2025", serialNumber: "PA-2025-7890" },
        maintenance: { status: "Bientôt", nextMaintenance: "05/01/2026" },
        interventions: [
            { title: "Maintenance annuelle", date: "05/01/2026", tech: "Marc D.", status: "Terminé", desc: "RAS" }
        ]
    }
];

// Organization list data
const initialOrganisations = [
    {
        id: 10,
        name: "LexCorp",
        contact: "Jane Doe",
        email: "info@lexcorp.com",
        phone: "01 02 03 04 05",
        address: "15 Rue de Paris",
        zip: "75001",
        city: "PARIS",
        type: "organisation",
        equipment: { model: "Daikin VRV System", installDate: "10/05/2023", serialNumber: "VRV-2023-9999" },
        maintenance: { status: "OK", nextMaintenance: "10/05/2026" },
        interventions: [
            { title: "Contrôle d'étanchéité", date: "10/05/2025", tech: "Pierre L.", status: "Terminé", desc: "Contrôle réglementaire OK" }
        ]
    },
    {
        id: 11,
        name: "AluTech SAS",
        contact: "Jean Dupont",
        email: "contact@alutech.fr",
        phone: "04 92 11 22 33",
        address: "150 Route de Grenoble",
        zip: "06200",
        city: "NICE",
        type: "organisation",
        equipment: { model: "Daikin VRV System", installDate: "10/05/2023", serialNumber: "VRV-2023-9999" },
        maintenance: { status: "OK", nextMaintenance: "10/05/2026" },
        interventions: [
            { title: "Contrôle d'étanchéité", date: "10/05/2025", tech: "Pierre L.", status: "Terminé", desc: "Contrôle réglementaire OK" }
        ]
    },
    {
        id: 12,
        name: "BatiConstruct",
        contact: "Sophie Martin",
        email: "s.martin@baticonstruct.fr",
        phone: "04 93 12 34 56",
        address: "8 Rue de la Préfecture",
        zip: "06300",
        city: "NICE",
        type: "organisation",
        equipment: { model: "Daikin VRV System", installDate: "10/05/2023", serialNumber: "VRV-2023-9999" },
        maintenance: { status: "OK", nextMaintenance: "10/05/2026" },
        interventions: [
            { title: "Contrôle d'étanchéité", date: "10/05/2025", tech: "Pierre L.", status: "Terminé", desc: "Contrôle réglementaire OK" }
        ]
    }
];

// Helper to fill mock details if not present
const getClientDetails = (client) => {
    if (!client) return null;
    const defaultEquipment = {
        model: "Daikin 3.5kW",
        installDate: "15/03/2024",
        serialNumber: "DK-2024-1234"
    };
    const defaultMaintenance = {
        status: "OK",
        nextMaintenance: "15/03/2027"
    };
    const defaultInterventions = [
        { title: "Maintenance annuelle", date: "15/03/2026", tech: "Marc D.", status: "Terminé", desc: "RAS, système fonctionne parfaitement" }
    ];
    const defaultMessages = [
        { date: "16/03/2026", sender: "Client", text: "Bonjour, merci pour l'intervention d'hier. Tout fonctionne parfaitement." },
        { date: "14/03/2026", sender: "Technicien", text: "Bonjour, je passerai demain vers 10h pour la maintenance annuelle." }
    ];
    const defaultFactures = [
        { id: "FACT-2026-004", date: "15/03/2026", amount: "120,00 €", status: "Payé" }
    ];
    const defaultDevis = [
        { id: "DEV-2026-012", date: "10/03/2026", amount: "120,00 €", status: "Accepté" }
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

function ClientPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [contacts, setContacts] = useState(initialContacts);
    const [organisations, setOrganisations] = useState(initialOrganisations);
    const [activeTabType, setActiveTabType] = useState("particulier"); // "particulier" or "organisation"
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Tous");
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);
    const [selectedClient, setSelectedClient] = useState(null);
    const [detailTab, setDetailTab] = useState("interventions");

    // Sync selected client with URL search query parameter (e.g. ?id=123)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const clientId = params.get("id");
        if (clientId) {
            const parsedId = parseInt(clientId, 10);
            const foundClient = contacts.find(c => c.id === parsedId) || organisations.find(o => o.id === parsedId);
            if (foundClient) {
                const isOrg = organisations.some(o => o.id === parsedId);
                setSelectedClient({ ...foundClient, isOrg });
            } else {
                setSelectedClient(null);
            }
        } else {
            setSelectedClient(null);
        }
    }, [location.search, contacts, organisations]);

    // Framer motion drag controls to isolate drag on the handle-bar/header
    const dragControlsMain = useDragControls();
    const dragControlsSub = useDragControls();

    // Bottom Sheets / Edit Modal states
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

    // Sync selected client state if details update
    useEffect(() => {
        if (selectedClient) {
            const list = selectedClient.isOrg ? organisations : contacts;
            const current = list.find(c => c.id === selectedClient.id);
            if (current) {
                setSelectedClient(current);
            }
        }
    }, [contacts, organisations, selectedClient?.id, selectedClient?.isOrg]);

    // Filter contacts based on search and status pills
    const filteredContacts = contacts.filter(contact => {
        const displayName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
        const matchesSearch =
            displayName.includes(searchTerm.toLowerCase()) ||
            (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (contact.city && contact.city.toLowerCase().includes(searchTerm.toLowerCase()));

        const details = getClientDetails(contact);
        const statusVal = details.maintenance?.status || "OK";
        const matchesStatus = statusFilter === "Tous" || statusVal.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
    });

    const filteredOrganisations = organisations.map(org => ({ ...org, isOrg: true })).filter(org => {
        const matchesSearch =
            org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (org.email && org.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (org.contact && org.contact.toLowerCase().includes(searchTerm.toLowerCase()));

        const details = getClientDetails(org);
        const statusVal = details.maintenance?.status || "OK";
        const matchesStatus = statusFilter === "Tous" || statusVal.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
    });

    // Group alphabetically for mobile view
    const groupedItems = {};
    const itemsToGroup = activeTabType === "particulier" ? filteredContacts : filteredOrganisations;

    itemsToGroup.forEach(item => {
        const nameForSorting = activeTabType === "particulier" ? item.lastName : item.name;
        const firstLetter = nameForSorting ? nameForSorting.charAt(0).toUpperCase() : "#";
        if (!groupedItems[firstLetter]) {
            groupedItems[firstLetter] = [];
        }
        groupedItems[firstLetter].push(item);
    });
    const sortedLetters = Object.keys(groupedItems).sort();

    // Trigger editing Modal / Bottom Sheet
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

        setContacts(prev => prev.map(c => c.id === editingClient.id ? updatedClient : c));

        if (selectedClient && selectedClient.id === editingClient.id) {
            setSelectedClient(updatedClient);
        }

        setEditingClient(null);
    };

    const handleArchiveClient = (client) => {
        if (window.confirm(`Voulez-vous vraiment archiver le client ${client.firstName} ${client.lastName} ?`)) {
            setContacts(prev => prev.filter(c => c.id !== client.id));
            if (selectedClient && selectedClient.id === client.id) {
                setSelectedClient(null);
            }
        }
    };

    const handlePlanClient = (client) => {
        alert(`Planification lancée pour ${client.firstName} ${client.lastName} !`);
    };

    return (
        <>
            {isMobile ? (
                // Mobile View Layout
                selectedClient ? (
                    <ClientMobileDetailView
                        selectedClient={selectedClient}
                        setSelectedClient={() => navigate("/client")}
                        getClientDetails={getClientDetails}
                        detailTab={detailTab}
                        setDetailTab={setDetailTab}
                        onEdit={handleOpenEdit}
                    />
                ) : (
                    <div className="mobile-contacts-view">
                        <Header />
                        <div className="mobile-contacts-scrollable-content" style={{ paddingBottom: '90px' }}>
                            {/* Segmented Switcher Control */}
                            <div className="segmented-control-wrapper">
                                <div className="segmented-control">
                                    <button
                                        className={`segmented-btn ${activeTabType === "particulier" ? "active" : ""}`}
                                        onClick={() => {
                                            setActiveTabType("particulier");
                                            setSelectedClient(null);
                                        }}
                                    >
                                        Particulier
                                    </button>
                                    <button
                                        className={`segmented-btn ${activeTabType === "organisation" ? "active" : ""}`}
                                        onClick={() => {
                                            setActiveTabType("organisation");
                                            setSelectedClient(null);
                                        }}
                                    >
                                        Organisation
                                    </button>
                                </div>
                            </div>

                            {/* Search and Filters card */}
                            <ClientSearchFilter
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                statusFilter={statusFilter}
                                setStatusFilter={setStatusFilter}
                                placeholder="Rechercher un contact..."
                            />

                            {/* Grouped Client List */}
                            <ClientMobileList
                                sortedLetters={sortedLetters}
                                groupedItems={groupedItems}
                                onSelect={(client) => navigate("/client?id=" + client.id)}
                                activeTabType={activeTabType}
                            />
                        </div>

                        {/* Mobile Bottom Tab Bar */}
                        <SideBar />
                    </div>
                )
            ) : (
                // Desktop View Layout
                <div className="home-page">
                    <SideBar />
                    <div className="main-content">
                        <Header />
                        <div className="page-content">
                            {selectedClient ? (
                                <ClientDetailView
                                    selectedClient={selectedClient}
                                    setSelectedClient={() => navigate("/client")}
                                    getClientDetails={getClientDetails}
                                    detailTab={detailTab}
                                    setDetailTab={setDetailTab}
                                    onEdit={handleOpenEdit}
                                />
                            ) : (
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

                                    {/* Segmented Switcher Control */}
                                    <div className="segmented-control-wrapper">
                                        <div className="segmented-control">
                                            <button
                                                className={`segmented-btn ${activeTabType === "particulier" ? "active" : ""}`}
                                                onClick={() => {
                                                    setActiveTabType("particulier");
                                                    setSelectedClient(null);
                                                }}
                                            >
                                                Particulier
                                            </button>
                                            <button
                                                className={`segmented-btn ${activeTabType === "organisation" ? "active" : ""}`}
                                                onClick={() => {
                                                    setActiveTabType("organisation");
                                                    setSelectedClient(null);
                                                }}
                                            >
                                                Organisation
                                            </button>
                                        </div>
                                    </div>

                                    {/* Desktop Search Card */}
                                    <ClientSearchFilter
                                        searchTerm={searchTerm}
                                        setSearchTerm={setSearchTerm}
                                        statusFilter={statusFilter}
                                        setStatusFilter={setStatusFilter}
                                        placeholder="Rechercher un contact..."
                                    />

                                    {/* Desktop Data Table */}
                                    <ClientTable
                                        clients={activeTabType === "particulier" ? filteredContacts : filteredOrganisations}
                                        getClientDetails={getClientDetails}
                                        onSelect={(client) => navigate("/client?id=" + client.id)}
                                        onEdit={handleOpenEdit}
                                        onPlan={handlePlanClient}
                                        onArchive={handleArchiveClient}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Edit Client Modal Layer */}
            {!isMobile && (
                <DesktopEditModal
                    editingClient={editingClient}
                    setEditingClient={setEditingClient}
                    editFirstName={editFirstName}
                    setEditFirstName={setEditFirstName}
                    editLastName={editLastName}
                    setEditLastName={setEditLastName}
                    editPhone={editPhone}
                    setEditPhone={setEditPhone}
                    editEmail={editEmail}
                    setEditEmail={setEditEmail}
                    editAddress={editAddress}
                    setEditAddress={setEditAddress}
                    editZip={editZip}
                    setEditZip={setEditZip}
                    editCity={editCity}
                    setEditCity={setEditCity}
                    handleSaveClient={handleSaveClient}
                />
            )}

            {/* Mobile Edit Bottom Sheet Layer (rendered globally so it works on lists & details) */}
            {isMobile && (
                <MobileEditBottomSheet
                    editingClient={editingClient}
                    setEditingClient={setEditingClient}
                    editFirstName={editFirstName}
                    setEditFirstName={setEditFirstName}
                    editLastName={editLastName}
                    setEditLastName={setEditLastName}
                    editPhone={editPhone}
                    setEditPhone={setEditPhone}
                    editEmail={editEmail}
                    setEditEmail={setEditEmail}
                    editAddress={editAddress}
                    setEditAddress={setEditAddress}
                    editComplAddress={editComplAddress}
                    setEditComplAddress={setEditComplAddress}
                    editZip={editZip}
                    setEditZip={setEditZip}
                    editCity={editCity}
                    setEditCity={setEditCity}
                    editDiffDelivery={editDiffDelivery}
                    setEditDiffDelivery={setEditDiffDelivery}
                    activeSubSheet={activeSubSheet}
                    setActiveSubSheet={setActiveSubSheet}
                    dragControlsMain={dragControlsMain}
                    dragControlsSub={dragControlsSub}
                    handleSaveClient={handleSaveClient}
                />
            )}
        </>
    );
}

export default ClientPage;
