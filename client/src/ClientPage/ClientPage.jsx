import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useDragControls } from "framer-motion";
import { AlertTriangle, Trash2, CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import ToastNotification from "../components/ToastNotification";
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
        reminderAutomations: client.reminderAutomations || client.raw?.reminderAutomations || [],
        messages: client.messages || [],
        factures: client.factures || [],
        devis: client.devis || []
    };
};

const initialContacts = [];
const initialOrganisations = [];

import { apiFetch } from "../utils/api";
import { getAuthToken } from "../utils/auth";
import { getApiUrl } from "../utils/config";
import { useUser } from "../utils/useUser";

function ClientPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { role } = useUser();
    const isTechnician = role === "TECHNICIAN";

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

                const mappedInterventions = (c.interventions || []).map(i => {
                    const rawPhotos = i.photos || [];
                    const beforePhotos = rawPhotos.filter(p => (p.photoType === 'BEFORE' || p.type === 'before' || p.category === 'before'));
                    const afterPhotos = rawPhotos.filter(p => (p.photoType === 'AFTER' || p.type === 'after' || p.category === 'after'));
                    const otherPhotos = rawPhotos.filter(p => !beforePhotos.includes(p) && !afterPhotos.includes(p));

                    return {
                        id: i.id,
                        title: i.title || i.type || "Intervention",
                        type: i.type || i.serviceType || "Installation",
                        date: i.scheduledAt ? new Date(i.scheduledAt).toLocaleDateString('fr-FR') : new Date(i.createdAt).toLocaleDateString('fr-FR'),
                        fullDate: i.scheduledAt ? new Date(i.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null,
                        scheduledAt: i.scheduledAt,
                        startedAt: i.startedAt ? new Date(i.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null,
                        completedAt: i.completedAt ? new Date(i.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null,
                        estimatedDuration: i.estimatedDuration || 90,
                        tech: i.technician ? `${i.technician.firstName || ''} ${i.technician.lastName || ''}`.trim() || i.technician.email : "Non assigné",
                        desc: i.description || (i.technician ? `Technicien: ${i.technician.firstName || ''} ${i.technician.lastName || ''}`.trim() : "Planifiée"),
                        description: i.description || "",
                        techNotes: i.techNotes || "",
                        materialsUsed: i.materialsUsed || "",
                        status: i.status === "COMPLETED" ? "Terminé" : i.status === "CANCELLED" ? "Annulé" : i.status === "IN_PROGRESS" ? "En cours" : "En attente",
                        statusKey: i.status || "PENDING",
                        address: i.address || c.address || "",
                        city: i.city || c.city || "",
                        accessCode: i.accessCode || c.notes || "",
                        clientSignature: i.clientSignature || null,
                        clientSignedAt: i.clientSignedAt ? new Date(i.clientSignedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
                        photos: rawPhotos,
                        beforePhotos,
                        afterPhotos,
                        otherPhotos,
                        raw: i
                    };
                });

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
                
                const activeReminder = (c.reminderAutomations || []).find(a => a.enabled && a.nextReminderAt);
                let nextMaintenanceDate = null;
                let maintenanceStatus = "Aucun";
                let maintenanceStatusClass = "gray";

                if (nextIntervention) {
                    nextMaintenanceDate = `RDV le ${new Date(nextIntervention.scheduledAt).toLocaleDateString('fr-FR')}`;
                    maintenanceStatus = "Prévu";
                    maintenanceStatusClass = "green";
                } else if (activeReminder?.nextReminderAt) {
                    nextMaintenanceDate = `Rappel le ${new Date(activeReminder.nextReminderAt).toLocaleDateString('fr-FR')}`;
                    maintenanceStatus = "Auto Rappel";
                    maintenanceStatusClass = "green";
                } else if (rawEquip?.nextServiceDate && new Date(rawEquip.nextServiceDate) >= today) {
                    nextMaintenanceDate = `Entretien le ${new Date(rawEquip.nextServiceDate).toLocaleDateString('fr-FR')}`;
                    maintenanceStatus = "À planifier";
                    maintenanceStatusClass = "green";
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
                        status: maintenanceStatus,
                        statusClass: maintenanceStatusClass,
                        nextMaintenance: nextMaintenanceDate || "Aucun entretien à venir",
                        hasNext: hasNext,
                        nextInterventionTitle: nextIntervention?.title || nextIntervention?.type || activeReminder?.name || null
                    },
                    interventionSummary,
                    interventions: mappedInterventions,
                    reminderAutomations: c.reminderAutomations || [],
                    factures: mappedFactures,
                    devis: mappedDevis,
                    messages: mappedMessages,
                    raw: c
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

    const handleOpenInvoiceDrawer = async (inv) => {
        if (!inv) return;
        // selectedClient (mapped) stores company name in 'name' not 'companyName'; firstName/lastName are direct
        const rawSelected = selectedClient || {};
        const invClient = inv.client || {};
        const resolvedClient = {
            ...invClient,
            companyName: invClient.companyName || rawSelected.companyName || (rawSelected.type === 'organisation' ? rawSelected.name : "") || "",
            firstName: invClient.firstName || rawSelected.firstName || "",
            lastName: invClient.lastName || rawSelected.lastName || (rawSelected.type !== 'organisation' ? rawSelected.name : "") || "",
            email: invClient.email || rawSelected.email || "",
            phone: invClient.phone || rawSelected.phone || "",
            address: invClient.address || rawSelected.address || "",
            postalCode: invClient.postalCode || rawSelected.zip || rawSelected.postalCode || "",
            city: invClient.city || rawSelected.city || ""
        };
        const initialInv = {
            ...inv,
            client: resolvedClient,
            linkedDevis: inv.linkedDevis || inv.linkedQuote || inv.sourceQuote || null
        };
        setActiveInvoiceForDrawer(initialInv);
        if (inv.id) {
            try {
                const res = await apiFetch(`/v1/invoices/${inv.id}`);
                if (res?.data?.invoice) {
                    const fetchedInv = res.data.invoice;
                    const fetchedClient = fetchedInv.client || {};
                    setActiveInvoiceForDrawer({
                        ...fetchedInv,
                        client: {
                            ...fetchedClient,
                            companyName: fetchedClient.companyName || rawSelected.companyName || (rawSelected.type === 'organisation' ? rawSelected.name : "") || "",
                            firstName: fetchedClient.firstName || rawSelected.firstName || "",
                            lastName: fetchedClient.lastName || rawSelected.lastName || (rawSelected.type !== 'organisation' ? rawSelected.name : "") || "",
                            email: fetchedClient.email || rawSelected.email || "",
                            phone: fetchedClient.phone || rawSelected.phone || "",
                            address: fetchedClient.address || rawSelected.address || "",
                            postalCode: fetchedClient.postalCode || rawSelected.zip || rawSelected.postalCode || "",
                            city: fetchedClient.city || rawSelected.city || ""
                        },
                        linkedDevis: fetchedInv.linkedDevis || fetchedInv.linkedQuote || fetchedInv.sourceQuote
                    });
                }
            } catch (e) {
                console.warn("[FETCH_INVOICE_DETAILS_WARN]", e.message);
            }
        }
    };

    const handleOpenQuoteDrawer = async (q) => {
        if (!q) return;
        const rawSelected = selectedClient || {};
        const qClient = q.client || {};
        const resolvedClient = {
            ...qClient,
            companyName: qClient.companyName || rawSelected.companyName || (rawSelected.type === 'organisation' ? rawSelected.name : "") || "",
            firstName: qClient.firstName || rawSelected.firstName || "",
            lastName: qClient.lastName || rawSelected.lastName || (rawSelected.type !== 'organisation' ? rawSelected.name : "") || "",
            email: qClient.email || rawSelected.email || "",
            phone: qClient.phone || rawSelected.phone || "",
            address: qClient.address || rawSelected.address || "",
            postalCode: qClient.postalCode || rawSelected.zip || rawSelected.postalCode || "",
            city: qClient.city || rawSelected.city || ""
        };
        const initialQuote = {
            ...q,
            client: resolvedClient,
            linkedFacture: q.linkedFacture || q.linkedInvoice || (q.invoices && q.invoices[0]) || null
        };
        setActiveQuoteForDrawer(initialQuote);
        if (q.id) {
            try {
                const res = await apiFetch(`/v1/quotes/${q.id}`);
                if (res?.data?.quote) {
                    const fetchedQ = res.data.quote;
                    const fetchedClient = fetchedQ.client || {};
                    setActiveQuoteForDrawer({
                        ...fetchedQ,
                        client: {
                            ...fetchedClient,
                            companyName: fetchedClient.companyName || rawSelected.companyName || (rawSelected.type === 'organisation' ? rawSelected.name : "") || "",
                            firstName: fetchedClient.firstName || rawSelected.firstName || "",
                            lastName: fetchedClient.lastName || rawSelected.lastName || (rawSelected.type !== 'organisation' ? rawSelected.name : "") || "",
                            email: fetchedClient.email || rawSelected.email || "",
                            phone: fetchedClient.phone || rawSelected.phone || "",
                            address: fetchedClient.address || rawSelected.address || "",
                            postalCode: fetchedClient.postalCode || rawSelected.zip || rawSelected.postalCode || "",
                            city: fetchedClient.city || rawSelected.city || ""
                        },
                        linkedFacture: fetchedQ.linkedFacture || fetchedQ.linkedInvoice || (fetchedQ.invoices && fetchedQ.invoices[0])
                    });
                }
            } catch (e) {
                console.warn("[FETCH_QUOTE_DETAILS_WARN]", e.message);
            }
        }
    };

    const handleDownloadInvoicePdf = async (inv, customOverride = null) => {
        try {
            const token = getAuthToken();
            const targetInv = inv || activeInvoiceForDrawer || pdfModalInvoice;
            if (!targetInv?.id) {
                window.print();
                return;
            }
            let endpointUrl = `/v1/invoices/${targetInv.id}/pdf`;
            if (customOverride) {
                const cleanCustom = { ...customOverride };
                if (cleanCustom.logoUrl && cleanCustom.logoUrl.startsWith('data:')) delete cleanCustom.logoUrl;
                if (cleanCustom.signatureUrl && cleanCustom.signatureUrl.startsWith('data:')) delete cleanCustom.signatureUrl;
                const customParam = encodeURIComponent(JSON.stringify(cleanCustom));
                endpointUrl += `?customization=${customParam}`;
            }
            const res = await fetch(getApiUrl(endpointUrl), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include'
            });
            if (!res.ok) throw new Error("Erreur téléchargement PDF");
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `Facture_${(targetInv.number || 'facture').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Erreur téléchargement PDF facture:", err);
            window.print();
        }
    };

    const handleDownloadQuotePdf = async (q, customOverride = null) => {
        try {
            const token = getAuthToken();
            const targetQ = q || activeQuoteForDrawer || pdfModalQuote;
            if (!targetQ?.id) {
                window.print();
                return;
            }
            let endpointUrl = `/v1/quotes/${targetQ.id}/pdf`;
            if (customOverride) {
                const cleanCustom = { ...customOverride };
                if (cleanCustom.logoUrl && cleanCustom.logoUrl.startsWith('data:')) delete cleanCustom.logoUrl;
                if (cleanCustom.signatureUrl && cleanCustom.signatureUrl.startsWith('data:')) delete cleanCustom.signatureUrl;
                const customParam = encodeURIComponent(JSON.stringify(cleanCustom));
                endpointUrl += `?customization=${customParam}`;
            }
            const res = await fetch(getApiUrl(endpointUrl), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include'
            });
            if (!res.ok) throw new Error("Erreur téléchargement PDF");
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `Devis_${(targetQ.number || 'devis').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Erreur téléchargement PDF devis:", err);
            window.print();
        }
    };

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
        setToastMessage({ msg: cleanMsg, type, id: Date.now() });
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
                        onEdit={isTechnician ? null : handleOpenEdit}
                        onOpenInvoice={isTechnician ? null : handleOpenInvoiceDrawer}
                        onOpenQuote={isTechnician ? null : handleOpenQuoteDrawer}
                        isReadOnly={isTechnician}
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
                                onOpenAddClient={isTechnician ? null : handleOpenAddClient}
                            />
                        </div>

                        {/* Mobile Bottom Tab Bar */}
                        <SideBar onFabClick={isTechnician ? null : handleOpenAddClient} hideFab={isTechnician || !!selectedClient} />
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
                                    onEdit={isTechnician ? null : handleOpenEdit}
                                    onOpenInvoice={isTechnician ? null : handleOpenInvoiceDrawer}
                                    onOpenQuote={isTechnician ? null : handleOpenQuoteDrawer}
                                    isReadOnly={isTechnician}
                                />
                            ) : (
                                <>
                                    <div className="content-header-row">
                                        <div className="content-header">
                                            <h1 className="content-title">Clients</h1>
                                            <p className="content-subtitle">{isTechnician ? "Consultez vos fiches clients et leurs informations." : "Gérez vos relations clients et leurs informations."}</p>
                                        </div>
                                        {!isTechnician && (
                                            <button className="new-client-btn" onClick={handleOpenAddClient}>
                                                + Nouveau Client
                                            </button>
                                        )}
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
                                        onEdit={isTechnician ? null : handleOpenEdit}
                                        onAddClient={isTechnician ? null : handleOpenAddClient}
                                        activeTabType={activeTabType}
                                        statusFilter={statusFilter}
                                        searchTerm={searchTerm}
                                        onPlan={handlePlanClient}
                                        onDelete={isTechnician ? null : handleDeleteClient}
                                        isReadOnly={isTechnician}
                                    />
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>
            )}

            {/* Desktop Edit Client Modal Layer */}
            {!isMobile && !isTechnician && (
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

            {/* Mobile Edit Bottom Sheet Layer (Owners/Managers only) */}
            {isMobile && !isTechnician && (
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
                    onOpenLinkedDevis={(devis) => {
                        setActiveInvoiceForDrawer(null);
                        handleOpenQuoteDrawer(devis);
                    }}
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
                    onOpenLinkedInvoice={(facture) => {
                        setActiveQuoteForDrawer(null);
                        handleOpenInvoiceDrawer(facture);
                    }}
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
                    onDownload={handleDownloadInvoicePdf}
                />
            )}

            {pdfModalQuote && (
                <QuotePdfView
                    quote={pdfModalQuote}
                    onClose={() => setPdfModalQuote(null)}
                    onDownload={handleDownloadQuotePdf}
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
            <ToastNotification toast={toastMessage} onClose={() => setToastMessage(null)} />
        </>
    );
}

export default ClientPage;
