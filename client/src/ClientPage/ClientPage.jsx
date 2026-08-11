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
import InvoiceDetailDrawer from "../FacturesPage/components/InvoiceDetailDrawer";
import QuoteDetailDrawer from "../DevisPage/components/QuoteDetailDrawer";
import InvoicePdfView from "../FacturesPage/components/InvoicePdfView";
import QuotePdfView from "../DevisPage/components/QuotePdfView";

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

const initialContacts = [];
const initialOrganisations = [];

import { apiFetch } from "../utils/api";

function ClientPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [contacts, setContacts] = useState([]);
    const [organisations, setOrganisations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/v1/clients');
            const clientList = data.data?.clients || data.clients || (Array.isArray(data) ? data : []);
            const mappedParticuliers = [];
            const mappedOrgs = [];

            clientList.forEach(c => {
                const isOrg = c.type === 'COMPANY' || !!c.companyName;
                const clientObj = {
                    id: c.id,
                    firstName: c.firstName || '',
                    lastName: c.lastName || '',
                    name: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                    contact: c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                    badge: c.notes?.includes('Test') ? 'Test' : null,
                    email: c.email || '',
                    phone: c.phone || '',
                    address: c.address || '',
                    zip: c.postalCode || c.zip || '',
                    city: c.city || '',
                    type: isOrg ? 'organisation' : 'particulier',
                    equipment: c.equipment?.[0] ? {
                        model: c.equipment[0].brand ? `${c.equipment[0].brand} ${c.equipment[0].model || ''}` : 'Équipement Standard',
                        installDate: c.equipment[0].installDate ? new Date(c.equipment[0].installDate).toLocaleDateString('fr-FR') : 'Non renseigné',
                        serialNumber: c.equipment[0].serialNumber || 'N/A'
                    } : { model: "Daikin 3.5kW Inverter", installDate: "15/03/2024", serialNumber: "DK-2024-1234" },
                    maintenance: { status: "OK", nextMaintenance: "15/03/2027" }
                };

                if (isOrg) {
                    mappedOrgs.push(clientObj);
                } else {
                    mappedParticuliers.push(clientObj);
                }
            });

            setContacts(mappedParticuliers);
            setOrganisations(mappedOrgs);
        } catch (err) {
            console.warn("API clients non disponible:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

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
    const [activeInvoiceForDrawer, setActiveInvoiceForDrawer] = useState(null);
    const [activeQuoteForDrawer, setActiveQuoteForDrawer] = useState(null);
    const [pdfModalInvoice, setPdfModalInvoice] = useState(null);
    const [pdfModalQuote, setPdfModalQuote] = useState(null);

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

    // Equipment form states
    const [editEquipModel, setEditEquipModel] = useState("");
    const [editEquipInstallDate, setEditEquipInstallDate] = useState("");
    const [editEquipSerial, setEditEquipSerial] = useState("");

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

    // Intercept browser back button & iOS edge swipe gesture for selected client detail & editing bottom sheet
    useEffect(() => {
        if (selectedClient || editingClient) {
            window.history.pushState({ clientView: true }, "");

            const handlePopState = () => {
                if (activeSubSheet) {
                    setActiveSubSheet(null);
                    return;
                }
                if (editingClient) {
                    setEditingClient(null);
                    return;
                }
                if (selectedClient) {
                    setSelectedClient(null);
                    const params = new URLSearchParams(window.location.search);
                    params.delete("id");
                    navigate({ search: params.toString() }, { replace: true });
                    return;
                }
            };

            window.addEventListener("popstate", handlePopState);
            return () => {
                window.removeEventListener("popstate", handlePopState);
            };
        }
    }, [selectedClient?.id, editingClient?.id, editingClient?.isNew, activeSubSheet, navigate]);

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

    // Trigger creating new Client Modal / Bottom Sheet
    const handleOpenAddClient = () => {
        const isOrg = activeTabType === "organisation";
        setEditingClient({ id: null, isOrg, isNew: true });
        setEditFirstName("");
        setEditLastName("");
        setEditPhone("");
        setEditEmail("");
        setEditAddress("");
        setEditComplAddress("");
        setEditZip("");
        setEditCity("");
        setEditDiffDelivery(false);
        setEditEquipModel("");
        setEditEquipInstallDate("");
        setEditEquipSerial("");
    };

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
        setEditEquipModel(client.equipment?.model || "");
        setEditEquipInstallDate(client.equipment?.installDate || "");
        setEditEquipSerial(client.equipment?.serialNumber || "");
    };

    const handleSaveClient = async () => {
        if (!editingClient) return;

        const payload = {
            firstName: editFirstName || (editingClient.isOrg ? editFirstName : "Nouveau"),
            lastName: editLastName || (editingClient.isOrg ? "" : "Client"),
            companyName: editingClient.isOrg ? (editFirstName || "Nouvelle Organisation") : null,
            phone: editPhone || "0600000000",
            email: editEmail || "",
            address: editAddress || "1 Rue de Paris",
            city: editCity || "Nice",
            postalCode: editZip || "06000",
            type: editingClient.isOrg ? "COMPANY" : "INDIVIDUAL"
        };

        try {
            if (editingClient.isNew) {
                await apiFetch('/v1/clients', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            } else {
                await apiFetch(`/v1/clients/${editingClient.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            }
            await fetchClients();
        } catch (err) {
            console.error("Save client API error:", err);
            alert(err.message || "Erreur lors de la sauvegarde du client");
        } finally {
            setEditingClient(null);
        }
    };

    const handleArchiveClient = async (client) => {
        const clientName = client.name || `${client.firstName} ${client.lastName}`;
        if (window.confirm(`Voulez-vous vraiment archiver le client ${clientName} ?`)) {
            try {
                await apiFetch(`/v1/clients/${client.id}`, {
                    method: 'DELETE'
                });
                if (selectedClient && selectedClient.id === client.id) {
                    setSelectedClient(null);
                }
                await fetchClients();
            } catch (err) {
                console.error("Delete client error:", err);
                alert(err.message || "Erreur lors de la suppression");
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
                        onOpenInvoice={(inv) => setActiveInvoiceForDrawer(inv)}
                        onOpenQuote={(q) => setActiveQuoteForDrawer(q)}
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
                                onOpenAddClient={handleOpenAddClient}
                            />
                        </div>

                        {/* Mobile Bottom Tab Bar */}
                        <SideBar onFabClick={handleOpenAddClient} hideFab={!!selectedClient} />
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
                                    onOpenInvoice={(inv) => setActiveInvoiceForDrawer(inv)}
                                    onOpenQuote={(q) => setActiveQuoteForDrawer(q)}
                                />
                            ) : (
                                <>
                                    <div className="content-header-row">
                                        <div className="content-header">
                                            <h1 className="content-title">Clients</h1>
                                            <p className="content-subtitle">Gérez vos relations clients et leurs informations.</p>
                                        </div>
                                        <button className="new-client-btn" onClick={handleOpenAddClient}>
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
                    editEquipModel={editEquipModel}
                    setEditEquipModel={setEditEquipModel}
                    editEquipInstallDate={editEquipInstallDate}
                    setEditEquipInstallDate={setEditEquipInstallDate}
                    editEquipSerial={editEquipSerial}
                    setEditEquipSerial={setEditEquipSerial}
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
                    editEquipModel={editEquipModel}
                    setEditEquipModel={setEditEquipModel}
                    editEquipInstallDate={editEquipInstallDate}
                    setEditEquipInstallDate={setEditEquipInstallDate}
                    editEquipSerial={editEquipSerial}
                    setEditEquipSerial={setEditEquipSerial}
                    activeSubSheet={activeSubSheet}
                    setActiveSubSheet={setActiveSubSheet}
                    dragControlsMain={dragControlsMain}
                    dragControlsSub={dragControlsSub}
                    handleSaveClient={handleSaveClient}
                />
            )}

            {/* Invoice Detail Drawer */}
            {activeInvoiceForDrawer && (
                <InvoiceDetailDrawer
                    invoice={activeInvoiceForDrawer}
                    onClose={() => setActiveInvoiceForDrawer(null)}
                    overlayStyle={{ zIndex: 1200 }}
                    onPreview={() => setPdfModalInvoice(activeInvoiceForDrawer)}
                    onEdit={() => setActiveInvoiceForDrawer(null)}
                    onSend={() => setActiveInvoiceForDrawer(null)}
                    onFinalise={() => {}}
                    onMarkPaid={() => {}}
                    onMarkUnpaid={() => {}}
                />
            )}

            {/* Quote Detail Drawer */}
            {activeQuoteForDrawer && (
                <QuoteDetailDrawer
                    quote={activeQuoteForDrawer}
                    onClose={() => setActiveQuoteForDrawer(null)}
                    overlayStyle={{ zIndex: 1200 }}
                    onPreview={() => setPdfModalQuote(activeQuoteForDrawer)}
                    onSend={() => setActiveQuoteForDrawer(null)}
                    onConvertToInvoice={() => {}}
                    onChangeStatus={() => {}}
                    onEdit={() => setActiveQuoteForDrawer(null)}
                />
            )}

            {/* PDF View Modals */}
            {pdfModalInvoice && (
                <InvoicePdfView
                    invoice={pdfModalInvoice}
                    onClose={() => setPdfModalInvoice(null)}
                    onDownload={() => alert("Téléchargement de la facture...")}
                />
            )}

            {pdfModalQuote && (
                <QuotePdfView
                    quote={pdfModalQuote}
                    onClose={() => setPdfModalQuote(null)}
                    onDownload={() => alert("Téléchargement du devis...")}
                />
            )}
        </>
    );
}

export default ClientPage;
