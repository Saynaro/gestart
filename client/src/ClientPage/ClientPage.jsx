import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useDragControls } from "framer-motion";
import { AlertTriangle, Trash2, CheckCircle2, AlertCircle, Info, X } from "lucide-react";
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
    return {
        ...client,
        equipment: client.equipment || { model: "Non renseigné", installDate: "Non renseigné", serialNumber: "N/A" },
        maintenance: client.maintenance || { status: "OK", nextMaintenance: "Non défini" },
        interventions: client.interventions || [],
        messages: client.messages || [],
        factures: client.factures || [],
        devis: client.devis || []
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

                const rawEquip = (c.equipment && c.equipment.length > 0) ? c.equipment[0] : null;
                const equipObj = rawEquip ? {
                    model: rawEquip.model || (rawEquip.brand ? `${rawEquip.brand} ${rawEquip.model || ''}`.trim() : "Non renseigné"),
                    installDate: rawEquip.installDate ? new Date(rawEquip.installDate).toLocaleDateString('fr-FR') : 'Non renseigné',
                    serialNumber: rawEquip.serialNumber || 'N/A'
                } : { model: "Non renseigné", installDate: "Non renseigné", serialNumber: "N/A" };

                const mappedInterventions = (c.interventions || []).map(i => ({
                    id: i.id,
                    title: i.title || i.type || "Intervention",
                    date: i.scheduledAt ? new Date(i.scheduledAt).toLocaleDateString('fr-FR') : new Date(i.createdAt).toLocaleDateString('fr-FR'),
                    tech: i.technician ? `${i.technician.firstName || ''} ${i.technician.lastName || ''}`.trim() || i.technician.email : "Non assigné",
                    desc: i.description || (i.technician ? `Technicien: ${i.technician.firstName || ''} ${i.technician.lastName || ''}`.trim() : "Planifiée"),
                    status: i.status === "COMPLETED" ? "Terminé" : i.status === "CANCELLED" ? "Annulé" : "En attente",
                    raw: i
                }));

                const mappedFactures = (c.invoices || []).map(inv => {
                    const st = (inv.status || 'draft').toLowerCase();
                    const statusLabel = st === 'paid' ? 'Payée' : st === 'sent' ? 'Envoyée' : st === 'overdue' ? 'En retard' : st === 'cancelled' ? 'Annulée' : 'Brouillon';
                    return {
                        id: inv.number || `F-${inv.id.slice(0, 6)}`,
                        date: inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('fr-FR') : (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')),
                        amount: `${(inv.amountTTC || inv.amountHT || 0).toFixed(2).replace('.', ',')} €`,
                        status: statusLabel,
                        statusKey: st,
                        raw: inv
                    };
                });

                const mappedDevis = (c.quotes || []).map(q => {
                    const st = (q.status || 'DRAFT').toUpperCase();
                    const statusLabel = st === 'ACCEPTED' ? 'Signé' : st === 'SENT' ? 'Envoyé' : st === 'REFUSED' ? 'Refusé' : st === 'EXPIRED' ? 'Expiré' : 'Brouillon';
                    return {
                        id: q.number || `D-${q.id.slice(0, 6)}`,
                        date: q.issuedAt ? new Date(q.issuedAt).toLocaleDateString('fr-FR') : (q.createdAt ? new Date(q.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')),
                        amount: `${(q.amountTTC || q.amountHT || 0).toFixed(2).replace('.', ',')} €`,
                        status: statusLabel,
                        statusKey: st.toLowerCase(),
                        raw: q
                    };
                });

                const mappedMessages = (c.smsLogs || []).map(m => ({
                    author: m.direction === 'INBOUND' ? 'Client' : 'Technicien / Entreprise',
                    text: m.message,
                    date: new Date(m.createdAt).toLocaleDateString('fr-FR')
                }));

                // Calculate real next upcoming & last past interventions
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const validInterventions = (c.interventions || []).filter(i => i.status !== 'CANCELLED');

                const upcomingInterventions = validInterventions
                    .filter(i => {
                        if (!i.scheduledAt) return false;
                        const schedDate = new Date(i.scheduledAt);
                        return schedDate >= today && i.status !== 'COMPLETED';
                    })
                    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

                const pastInterventions = validInterventions
                    .filter(i => {
                        if (i.status === 'COMPLETED') return true;
                        if (!i.scheduledAt) return false;
                        return new Date(i.scheduledAt) < today;
                    })
                    .sort((a, b) => new Date(b.scheduledAt || b.createdAt) - new Date(a.scheduledAt || a.createdAt));

                const nextIntervention = upcomingInterventions.length > 0 ? upcomingInterventions[0] : null;
                const lastIntervention = pastInterventions.length > 0 ? pastInterventions[0] : null;
                
                let nextMaintenanceDate = null;
                if (nextIntervention) {
                    nextMaintenanceDate = new Date(nextIntervention.scheduledAt).toLocaleDateString('fr-FR');
                } else if (rawEquip?.nextServiceDate && new Date(rawEquip.nextServiceDate) >= today) {
                    nextMaintenanceDate = new Date(rawEquip.nextServiceDate).toLocaleDateString('fr-FR');
                }

                const hasNext = !!nextMaintenanceDate;

                // Smart hybrid summary for table view
                let interventionSummary = {
                    type: 'none',
                    date: 'Aucune',
                    label: null
                };

                if (nextIntervention) {
                    interventionSummary = {
                        type: 'upcoming',
                        date: new Date(nextIntervention.scheduledAt).toLocaleDateString('fr-FR'),
                        label: 'Prévu',
                        title: nextIntervention.title || nextIntervention.type || 'Intervention'
                    };
                } else if (lastIntervention) {
                    const d = lastIntervention.scheduledAt || lastIntervention.createdAt;
                    interventionSummary = {
                        type: 'past',
                        date: new Date(d).toLocaleDateString('fr-FR'),
                        label: 'Dernier',
                        title: lastIntervention.title || lastIntervention.type || 'Intervention'
                    };
                }

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
                    equipment: equipObj,
                    maintenance: {
                        status: hasNext ? "OK" : (rawEquip?.installDate && rawEquip.installDate !== "Non renseigné" ? "À planifier" : "Aucun"),
                        statusClass: hasNext ? "green" : (rawEquip?.installDate && rawEquip.installDate !== "Non renseigné" ? "warning" : "gray"),
                        nextMaintenance: nextMaintenanceDate || "Aucun entretien prévu",
                        hasNext: hasNext,
                        nextInterventionTitle: nextIntervention?.title || nextIntervention?.type || null
                    },
                    interventionSummary,
                    interventions: mappedInterventions,
                    factures: mappedFactures,
                    devis: mappedDevis,
                    messages: mappedMessages
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

    // Sync selected client with URL search query parameter (e.g. ?id=cmst...)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const clientId = params.get("id");
        if (clientId) {
            const foundClient = contacts.find(c => String(c.id) === String(clientId)) || organisations.find(o => String(o.id) === String(clientId));
            if (foundClient) {
                const isOrg = organisations.some(o => String(o.id) === String(clientId));
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
            equipmentModel: editEquipModel || "",
            equipmentInstallDate: editEquipInstallDate || "",
            equipmentSerial: editEquipSerial || ""
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
            showToast("Client enregistré avec succès !");
        } catch (err) {
            console.error("Save client API error:", err);
            showToast(err.message || "Erreur lors de la sauvegarde du client", "error");
        } finally {
            setEditingClient(null);
        }
    };

    const [clientToDelete, setClientToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg, type = "success") => {
        const cleanMsg = typeof msg === 'string' ? msg.replace(/^[✓✔\s]+/, '') : msg;
        setToastMessage({ msg: cleanMsg, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    const handleDeleteClient = (client) => {
        setClientToDelete(client);
    };

    const confirmDeleteClient = async () => {
        if (!clientToDelete) return;
        try {
            setDeleteLoading(true);
            await apiFetch(`/v1/clients/${clientToDelete.id}`, {
                method: 'DELETE'
            });
            if (selectedClient && selectedClient.id === clientToDelete.id) {
                setSelectedClient(null);
            }
            showToast("Client supprimé avec succès.");
            await fetchClients();
        } catch (err) {
            console.error("Delete client error:", err);
            showToast(err.message || "Erreur lors de la suppression du client", "error");
        } finally {
            setDeleteLoading(false);
            setClientToDelete(null);
        }
    };

    const handlePlanClient = (client) => {
        navigate('/planning', { state: { clientId: client.id, clientName: client.name || `${client.firstName} ${client.lastName}` } });
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
                                statusFilter={statusFilter}
                                searchTerm={searchTerm}
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
                        <motion.div 
                            className="page-content"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
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
                                        onAddClient={handleOpenAddClient}
                                        activeTabType={activeTabType}
                                        statusFilter={statusFilter}
                                        searchTerm={searchTerm}
                                        onPlan={handlePlanClient}
                                        onDelete={handleDeleteClient}
                                    />
                                </>
                            )}
                        </motion.div>
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
                    onDownload={() => window.print()}
                />
            )}

            {pdfModalQuote && (
                <QuotePdfView
                    quote={pdfModalQuote}
                    onClose={() => setPdfModalQuote(null)}
                    onDownload={() => window.print()}
                />
            )}

            {/* Custom Delete Confirmation Modal */}
            {clientToDelete && (
                <div className="client-delete-modal-overlay" onClick={() => !deleteLoading && setClientToDelete(null)}>
                    <div className="client-delete-modal-card" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="client-delete-close-btn"
                            onClick={() => !deleteLoading && setClientToDelete(null)}
                            disabled={deleteLoading}
                            aria-label="Fermer"
                        >
                            <X size={18} />
                        </button>
                        <div className="client-delete-icon-wrapper">
                            <AlertTriangle size={32} color="#ef4444" />
                        </div>
                        <h3 className="client-delete-title">Supprimer le client</h3>
                        <p className="client-delete-desc">
                            Êtes-vous sûr de vouloir supprimer définitivement <strong>{clientToDelete.name || `${clientToDelete.firstName} ${clientToDelete.lastName}`}</strong> ?
                            <br />
                            <span style={{ fontSize: '13px', color: 'var(--muted-foreground)', display: 'block', marginTop: '8px' }}>
                                Cette action est irréversible et supprimera les fiches et documents associés.
                            </span>
                        </p>
                        <div className="client-delete-actions">
                            <button 
                                type="button" 
                                className="client-delete-cancel-btn" 
                                onClick={() => setClientToDelete(null)}
                                disabled={deleteLoading}
                            >
                                Annuler
                            </button>
                            <button 
                                type="button" 
                                className="client-delete-confirm-btn" 
                                onClick={confirmDeleteClient}
                                disabled={deleteLoading}
                            >
                                <Trash2 size={16} />
                                <span>{deleteLoading ? "Suppression..." : "Confirmer"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    backgroundColor: toastMessage.type === 'error' ? '#ef4444' : '#0f172a',
                    color: '#ffffff',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    zIndex: 100000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    {toastMessage.type === 'error' ? <AlertCircle size={18} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0 }} />}
                    <span>{toastMessage.msg}</span>
                </div>
            )}
        </>
    );
}

export default ClientPage;
