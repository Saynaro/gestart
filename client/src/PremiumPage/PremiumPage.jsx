import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ToastNotification from "../components/ToastNotification";
import {
    Star,
    MessageSquare,
    Save,
    Smartphone,
    Settings,
    Play,
    Pause,
    CheckCircle2,
    Clock,
    AlertCircle,
    Plus,
    Edit3,
    Trash2,
    Calendar,
    Send,
    ChevronRight,
    ChevronLeft,
    Wrench,
    Sparkles,
    RefreshCw,
    Sliders,
    History,
    FileSpreadsheet,
    X,
    Check,
    Users,
    User,
    Zap,
    Mail,
    MessageCircle,
    Lightbulb,
    Search,
    Filter,
    Building2,
    Phone,
    Link
} from "lucide-react";
import "./PremiumPage.css";

// Layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import PullToRefresh from "../components/PullToRefresh";
import FeatureLockBanner from "../components/FeatureLockBanner";
import AccountingIntegration from "../ComptabilityPage/components/AccountingIntegration";

import { apiFetch } from "../utils/api";
import { useSubscription } from "../utils/useSubscription";
import { useUser } from "../utils/useUser";

const renderChannelBadge = (channel) => {
    switch (channel) {
        case "WHATSAPP":
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <MessageCircle size={14} color="#22c55e" /> WhatsApp
                </span>
            );
        case "SMS":
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Smartphone size={14} color="#3b82f6" /> SMS
                </span>
            );
        case "EMAIL":
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Mail size={14} color="#8b5cf6" /> Email
                </span>
            );
        case "LAST_USED":
        default:
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Zap size={14} color="#eab308" /> Automatique
                </span>
            );
    }
};

const renderRecommendationBadge = (level) => {
    switch (level) {
        case "RECOMMENDED":
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#eab308", fontWeight: 600 }}>
                    <Star size={13} fill="#eab308" color="#eab308" /> Recommandé
                </span>
            );
        case "OPTIONAL":
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#3b82f6", fontWeight: 500 }}>
                    <Lightbulb size={13} color="#3b82f6" /> Optionnel
                </span>
            );
        case "CUSTOMIZABLE":
        default:
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--muted-foreground)", fontWeight: 500 }}>
                    <Sliders size={13} /> Personnalisable
                </span>
            );
    }
};

function PremiumPage() {
    const navigate = useNavigate();
    const { isStarter } = useSubscription();
    const { company, user } = useUser();
    const companyName = company?.name || user?.companyName || "Mon Entreprise";
    const companyInitials = companyName.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "EP";

    // Tab state
    const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "automations" | "templates" | "services" | "history" | "accounting"
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    // Mobile viewport detection for Bottom Sheet
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Toast state
    const [toast, setToast] = useState(null);
    const triggerToast = (message, type = "success") => {
        setToast({ message, type, id: Date.now() });
    };

    // Confirm Modal state
    const [confirmModal, setConfirmModal] = useState(null);

    // Data states
    const [dashboardData, setDashboardData] = useState({
        stats: { activeRules: 0, scheduled: 0, sent: 0, responded: 0, overdueCount: 0, todayCount: 0, futureCount: 0 },
        groups: { overdue: [], today: [], thisWeek: [], thisMonth: [], future: [] }
    });
    const [timelineFilter, setTimelineFilter] = useState("ALL"); // "ALL" | "TODAY" | "MONTH" | "FUTURE"
    const [automations, setAutomations] = useState([]);
    const [executions, setExecutions] = useState([]);
    const [services, setServices] = useState([]);
    const [tradePresets, setTradePresets] = useState({});
    const [selectedTrade, setSelectedTrade] = useState("climatisation-pac");
    const [clientsList, setClientsList] = useState([]);

    // Filter & Pagination states
    const ITEMS_PER_PAGE = 10;
    const [automationsPage, setAutomationsPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const [futurePage, setFuturePage] = useState(1);

    const [automationFilterClient, setAutomationFilterClient] = useState("");
    const [automationSearchText, setAutomationSearchText] = useState("");

    // Reset page to 1 when filters change
    useEffect(() => {
        setAutomationsPage(1);
    }, [automationFilterClient, automationSearchText]);

    const filteredAutomations = automations.filter((auto) => {
        if (automationFilterClient && auto.clientId !== automationFilterClient) return false;
        if (automationSearchText) {
            const q = automationSearchText.toLowerCase();
            const clientName = `${auto.client?.firstName || ""} ${auto.client?.lastName || ""}`.toLowerCase();
            const ruleName = (auto.name || "").toLowerCase();
            const phone = (auto.client?.phone || "");
            return clientName.includes(q) || ruleName.includes(q) || phone.includes(q);
        }
        return true;
    });

    const totalAutomationsPages = Math.max(1, Math.ceil(filteredAutomations.length / ITEMS_PER_PAGE));
    const paginatedAutomations = filteredAutomations.slice(
        (automationsPage - 1) * ITEMS_PER_PAGE,
        automationsPage * ITEMS_PER_PAGE
    );

    const totalHistoryPages = Math.max(1, Math.ceil(executions.length / ITEMS_PER_PAGE));
    const paginatedExecutions = executions.slice(
        (historyPage - 1) * ITEMS_PER_PAGE,
        historyPage * ITEMS_PER_PAGE
    );

    const futureList = dashboardData.groups?.future || [];
    const totalFuturePages = Math.max(1, Math.ceil(futureList.length / ITEMS_PER_PAGE));
    const paginatedFuture = futureList.slice(
        (futurePage - 1) * ITEMS_PER_PAGE,
        futurePage * ITEMS_PER_PAGE
    );

    // Template & Simulator State
    const [previewChannel, setPreviewChannel] = useState("WHATSAPP"); // "WHATSAPP" | "SMS" | "EMAIL"
    const [simulatedService, setSimulatedService] = useState("entretien"); // "entretien" | "nettoyage" | "etancheite" | "depannage" | "ramonage"
    const [templateText, setTemplateText] = useState(
        "Bonjour {{client_first_name}}, cela fait bientôt {{frequence}} depuis votre dernière intervention de {{intervention_type}} (le {{date_derniere_visite}}). Il est recommandé de prévoir votre contrôle préventif. Souhaitez-vous convenir d'un rendez-vous ?"
    );
    const [smsSignature, setSmsSignature] = useState(`— ${companyName}`);

    useEffect(() => {
        if (company?.name || user?.companyName) {
            setSmsSignature(`— ${company?.name || user?.companyName}`);
        }
    }, [company?.name, user?.companyName]);

    const [renderedLivePreview, setRenderedLivePreview] = useState("");

    // Modals & Select state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAutomation, setEditingAutomation] = useState(null);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const createModalDragControls = useDragControls();
    const serviceModalDragControls = useDragControls();
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState("");

    // Form states for modal
    const [modalForm, setModalForm] = useState({
        clientId: "",
        name: "Rappel Entretien Annuel",
        serviceTypeId: "",
        frequencyValue: 12,
        frequencyUnit: "MONTHS",
        advanceNoticeValue: 30,
        advanceNoticeUnit: "DAYS",
        channel: "LAST_USED",
        fallbackChannel: "SMS",
        customMessageTemplate: "",
        stopOnReply: true,
        stopOnAppointment: true,
        maxFollowUps: 2,
        followUpIntervalDays: 7
    });

    const [serviceForm, setServiceForm] = useState({
        name: "",
        tradeSlug: "climatisation-pac",
        category: "maintenance",
        defaultFrequencyValue: 12,
        defaultFrequencyUnit: "MONTHS",
        defaultAdvanceNoticeValue: 30,
        defaultAdvanceNoticeUnit: "DAYS",
        defaultChannel: "LAST_USED",
        recommendationLevel: "RECOMMENDED",
        description: "",
        defaultTemplate: ""
    });

    // ── Fetch Initial Data ───────────────────────────────────────
    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [dashRes, autoRes, execRes, servRes, presetRes, clientsRes] = await Promise.all([
                apiFetch("/v1/reminders/dashboard").catch(() => ({ data: { stats: {}, groups: {} } })),
                apiFetch("/v1/reminders/automations").catch(() => ({ data: { automations: [] } })),
                apiFetch("/v1/reminders/executions?limit=50").catch(() => ({ data: { executions: [] } })),
                apiFetch("/v1/reminders/services").catch(() => ({ data: { services: [] } })),
                apiFetch("/v1/reminders/presets").catch(() => ({ data: { presets: {} } })),
                apiFetch("/v1/clients?limit=100").catch(() => ({ data: { clients: [] } }))
            ]);

            if (dashRes?.data) setDashboardData(dashRes.data);
            if (autoRes?.data?.automations) setAutomations(autoRes.data.automations);
            if (execRes?.data?.executions) setExecutions(execRes.data.executions);
            if (servRes?.data?.services) setServices(servRes.data.services);
            if (presetRes?.data?.presets) setTradePresets(presetRes.data.presets);
            if (clientsRes?.data?.clients) setClientsList(clientsRes.data.clients);
        } catch (err) {
            console.error("Error loading Auto Rappel data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const servicePresetsMock = {
        entretien: {
            name: "Entretien Annuel Climatisation",
            frequency: "1 an",
            lastDate: "15 mai 2026",
            nextDate: "15 mai 2027"
        },
        nettoyage: {
            name: "Nettoyage filtres & désinfection",
            frequency: "6 mois",
            lastDate: "20 novembre 2026",
            nextDate: "20 mai 2027"
        },
        etancheite: {
            name: "Contrôle d'étanchéité frigorifique",
            frequency: "2 ans",
            lastDate: "10 juin 2025",
            nextDate: "10 juin 2027"
        },
        ramonage: {
            name: "Ramonage des conduits",
            frequency: "1 an",
            lastDate: "05 octobre 2026",
            nextDate: "05 octobre 2027"
        },
        depannage: {
            name: "Suivi après dépannage",
            frequency: "1 jour",
            lastDate: "hier",
            nextDate: "aujourd'hui"
        }
    };

    // ── Live Template Rendering ──────────────────────────────────
    useEffect(() => {
        const mock = servicePresetsMock[simulatedService] || servicePresetsMock.entretien;
        let text = templateText || "";
        text = text.replace(/\{\{\s*client_first_name\s*\}\}/gi, "Jean");
        text = text.replace(/\{\{\s*client_last_name\s*\}\}/gi, "Dupont");
        text = text.replace(/\{\{\s*company_name\s*\}\}/gi, companyName);
        text = text.replace(/\{\{\s*intervention_type\s*\}\}/gi, mock.name);
        text = text.replace(/\{\{\s*(?:frequence|frequency|delai)\s*\}\}/gi, mock.frequency);
        text = text.replace(/\{\{\s*(?:date_derniere_visite|last_intervention_date)\s*\}\}/gi, mock.lastDate);
        text = text.replace(/\{\{\s*installation_date\s*\}\}/gi, "15/09/2024");
        text = text.replace(/\{\{\s*(?:prochaine_echeance|next_reminder_date)\s*\}\}/gi, mock.nextDate);
        text = text.replace(/\{\{\s*appointment_link\s*\}\}/gi, `climpro.fr/rdv/${companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || "rdv"}`);
        text = text.replace(/\{\{\s*company_phone\s*\}\}/gi, company?.phone || user?.phone || "04 93 00 00 00");

        if (previewChannel === "SMS" && smsSignature) {
            text = `${text}\n\n${smsSignature}`;
        }

        setRenderedLivePreview(text);
    }, [templateText, smsSignature, previewChannel, simulatedService, companyName, company?.phone, user?.phone]);

    // ── Insert Variable Tag Helper ───────────────────────────────
    const insertVariableTag = (tag) => {
        setTemplateText((prev) => `${prev} ${tag}`);
    };

    // ── Actions ──────────────────────────────────────────────────
    const handleExecuteNow = (automationId, clientName) => {
        if (!automationId) return;
        setConfirmModal({
            title: "Envoyer le rappel d'entretien",
            message: clientName
                ? `Êtes-vous sûr de vouloir envoyer ce rappel d'entretien à ${clientName} maintenant ? Le message personnalisé lui sera expédié directement.`
                : "Êtes-vous sûr de vouloir déclencher et envoyer ce rappel immédiatement au client ?",
            confirmText: "Envoyer maintenant",
            isDestructive: false,
            onConfirm: async () => {
                try {
                    setActionLoading(automationId);
                    const res = await apiFetch(`/v1/reminders/automations/${automationId}/execute-now`, {
                        method: "POST"
                    });
                    triggerToast(res.message || "Rappel exécuté et envoyé avec succès !", "success");
                    await loadDashboardData();
                } catch (err) {
                    triggerToast(err.message || "Erreur lors de l'exécution du rappel", "error");
                } finally {
                    setActionLoading(null);
                    setConfirmModal(null);
                }
            }
        });
    };

    const handleToggleAutomation = async (automationId) => {
        try {
            setActionLoading(automationId);
            const res = await apiFetch(`/v1/reminders/automations/${automationId}/toggle`, {
                method: "PATCH"
            });
            triggerToast(res.message || "Statut du rappel mis à jour !", "success");
            await loadDashboardData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors du changement de statut", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteAutomation = (automationId) => {
        setConfirmModal({
            title: "Supprimer la règle de rappel",
            message: "Êtes-vous sûr de vouloir supprimer cette règle de rappel ? Les futures relances associées seront annulées.",
            confirmText: "Supprimer",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    setActionLoading(automationId);
                    await apiFetch(`/v1/reminders/automations/${automationId}`, {
                        method: "DELETE"
                    });
                    triggerToast("Règle de rappel supprimée avec succès !", "success");
                    await loadDashboardData();
                } catch (err) {
                    triggerToast(err.message || "Erreur lors de la suppression", "error");
                } finally {
                    setActionLoading(null);
                    setConfirmModal(null);
                }
            }
        });
    };

    const handleServiceChange = (serviceId) => {
        const found = services.find(s => s.id === serviceId);
        if (found) {
            const isFollowup = found.category === "followup" || (found.defaultFrequencyUnit === "DAYS" && found.defaultFrequencyValue <= 7);
            setModalForm(prev => ({
                ...prev,
                serviceTypeId: serviceId,
                name: `Rappel ${found.name}`,
                frequencyValue: found.defaultFrequencyValue || 12,
                frequencyUnit: found.defaultFrequencyUnit || "MONTHS",
                advanceNoticeValue: found.defaultAdvanceNoticeValue !== undefined ? found.defaultAdvanceNoticeValue : (isFollowup ? 0 : 30),
                advanceNoticeUnit: found.defaultAdvanceNoticeUnit || "DAYS",
                channel: found.defaultChannel || prev.channel,
                customMessageTemplate: found.defaultTemplate || prev.customMessageTemplate
            }));
        } else {
            setModalForm(prev => ({
                ...prev,
                serviceTypeId: serviceId,
                name: "Rappel Entretien Automatique"
            }));
        }
    };

    const handleFrequencyChange = (value, unit) => {
        const freq = parseInt(value, 10) || 1;
        setModalForm(prev => {
            let adv = prev.advanceNoticeValue;
            if (unit === "DAYS" && adv >= freq) {
                adv = 0;
            }
            return {
                ...prev,
                frequencyValue: freq,
                frequencyUnit: unit,
                advanceNoticeValue: adv
            };
        });
    };

    const handleSaveAutomationForm = async (e) => {
        if (e) e.preventDefault();

        if (!modalForm.clientId) {
            triggerToast("Veuillez sélectionner un client concerné (ou Tous les clients)", "error");
            return;
        }

        // Si création d'une nouvelle règle, vérifier si une règle existe déjà pour ce client et cette prestation
        if (!editingAutomation) {
            const existingMatch = automations.find(a =>
                a.clientId === modalForm.clientId &&
                (
                    (modalForm.serviceTypeId && a.trackedServices?.some(ts => ts.serviceTypeId === modalForm.serviceTypeId)) ||
                    (a.name && a.name.toLowerCase() === modalForm.name.toLowerCase())
                )
            );

            if (existingMatch) {
                const clientName = existingMatch.client ? `${existingMatch.client.firstName} ${existingMatch.client.lastName}` : "ce client";
                setConfirmModal({
                    title: "Règle existante détectée",
                    message: `Une règle de rappel existe déjà pour ${clientName} concernant "${existingMatch.name}". Êtes-vous sûr ? L'ancienne règle sera mise à jour avec ces nouveaux paramètres et le cycle recalculé.`,
                    confirmText: "Mettre à jour la règle",
                    isDestructive: false,
                    onConfirm: async () => {
                        await executeSaveAutomation(existingMatch.id);
                    }
                });
                return;
            }
        }

        await executeSaveAutomation(editingAutomation?.id || null);
    };

    const executeSaveAutomation = async (overrideId = null) => {
        try {
            if (overrideId) {
                await apiFetch(`/v1/reminders/automations/${overrideId}`, {
                    method: "PUT",
                    body: JSON.stringify(modalForm)
                });
                triggerToast("Règle de rappel mise à jour avec succès !", "success");
            } else {
                await apiFetch("/v1/reminders/automations", {
                    method: "POST",
                    body: JSON.stringify(modalForm)
                });
                triggerToast("Règle de rappel créée avec succès !", "success");
            }
            setShowCreateModal(false);
            setEditingAutomation(null);
            setConfirmModal(null);
            await loadDashboardData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de l'enregistrement du rappel", "error");
        }
    };

    const handleSaveServiceForm = async (e) => {
        e.preventDefault();
        try {
            await apiFetch("/v1/reminders/services", {
                method: "POST",
                body: JSON.stringify(serviceForm)
            });
            triggerToast("Prestation créée avec succès !", "success");
            setShowServiceModal(false);
            setServiceForm({
                name: "",
                tradeSlug: "climatisation-pac",
                category: "maintenance",
                defaultFrequencyValue: 12,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "RECOMMENDED",
                description: "",
                defaultTemplate: ""
            });
            await loadDashboardData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la création de la prestation", "error");
        }
    };

    const openEditModal = (auto) => {
        const primaryServiceId = auto.trackedServices?.[0]?.serviceTypeId || auto.trackedServices?.[0]?.serviceType?.id || "";
        setEditingAutomation(auto);
        setModalForm({
            clientId: auto.clientId,
            name: auto.name,
            serviceTypeId: primaryServiceId,
            frequencyValue: auto.frequencyValue || 12,
            frequencyUnit: auto.frequencyUnit || "MONTHS",
            advanceNoticeValue: auto.advanceNoticeValue || 30,
            advanceNoticeUnit: auto.advanceNoticeUnit || "DAYS",
            channel: auto.channel || "LAST_USED",
            fallbackChannel: auto.fallbackChannel || "SMS",
            customMessageTemplate: auto.customMessageTemplate || "",
            stopOnReply: auto.stopOnReply !== false,
            stopOnAppointment: auto.stopOnAppointment !== false,
            maxFollowUps: auto.maxFollowUps || 2,
            followUpIntervalDays: auto.followUpIntervalDays || 7
        });
        setShowCreateModal(true);
    };

    const openNewModal = () => {
        setEditingAutomation(null);
        setModalForm({
            clientId: "",
            name: "Rappel Entretien Annuel",
            serviceTypeId: services[0]?.id || "",
            frequencyValue: 12,
            frequencyUnit: "MONTHS",
            advanceNoticeValue: 30,
            advanceNoticeUnit: "DAYS",
            channel: "LAST_USED",
            fallbackChannel: "SMS",
            customMessageTemplate: "",
            stopOnReply: true,
            stopOnAppointment: true,
            maxFollowUps: 2,
            followUpIntervalDays: 7
        });
        setShowCreateModal(true);
    };

    return (
        <div className="home-page premium-page-wrapper">
            {/* Custom Floating Animated Toast */}
            <ToastNotification toast={toast} onClose={() => setToast(null)} />

            <SideBar />
            <div className="main-content">
                <Header />
                <PullToRefresh onRefresh={loadDashboardData}>
                    <motion.div
                        className="page-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Header */}
                    <div className="content-header premium-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", marginBottom: "2rem", flexWrap: "wrap" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                <h1 className="content-title" style={{ margin: 0, fontSize: "1.65rem", fontWeight: 700 }}>Auto Rappel Premium</h1>
                                <span className="big-badge">PRO</span>
                            </div>
                            <p className="content-subtitle" style={{ margin: 0, color: "var(--muted-foreground)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                                Transformez vos interventions terminées en futurs rendez-vous automatiques.
                            </p>
                        </div>
                        <div className="premium-header-actions" style={{ display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
                            <button className="action-btn-pill" onClick={loadDashboardData} title="Rafraîchir les données" style={{ padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                                <RefreshCw size={15} /> Actualiser
                            </button>
                            <button className="action-btn-pill primary" onClick={openNewModal} style={{ padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                                <Plus size={16} /> Nouveau rappel
                            </button>
                        </div>
                    </div>

                    {/* Pro Upgrade Banner for Starter */}
                    {isStarter && (
                        <FeatureLockBanner
                            title="Auto Rappel & Relances Clients Automatiques (Offre Pro)"
                            description="Ne perdez plus aucun client. L'automatisation intelligente des rappels périodiques par SMS, WhatsApp et Email nécessite l'offre Pro ou Unlimited."
                            features={[
                                "Rappels automatiques basés sur la date réelle des interventions",
                                "Cycles indépendants pour chaque prestation (Entretien vs Nettoyage vs Ramonage)",
                                "Relances omnicanales (WhatsApp Business, SMS, Email)",
                                "Arrêt intelligent de la séquence dès réponse du client ou prise de rendez-vous",
                                "Simulateur de message en direct & modèles métiers prédéfinis"
                            ]}
                            targetPlan="PRO"
                        />
                    )}

                    {/* Hero Workflow Card */}
                    <div className="auto-rappel-hero-card">
                        <h3 className="hero-main-title">
                            <Sparkles size={20} color="#556B2F" />
                            Ne laissez plus vos clients vous oublier.
                        </h3>
                        <p className="hero-subtitle">
                            ClimPro rappelle automatiquement à vos clients quand il est temps de prévoir leur prochaine intervention.
                            Chaque prestation suit son propre cycle indépendant sans risque de confusion.
                        </p>

                        <div className="workflow-steps-flow">
                            <span className="workflow-step-pill">1. Intervention terminée</span>
                            <span className="workflow-step-arrow">→</span>
                            <span className="workflow-step-pill active">2. Rappel calculé</span>
                            <span className="workflow-step-arrow">→</span>
                            <span className="workflow-step-pill">3. WhatsApp / SMS / Email</span>
                            <span className="workflow-step-arrow">→</span>
                            <span className="workflow-step-pill">4. Réponse client</span>
                            <span className="workflow-step-arrow">→</span>
                            <span className="workflow-step-pill">5. Nouveau rendez-vous</span>
                            <span className="workflow-step-arrow">→</span>
                            <span className="workflow-step-pill">6. Prochain cycle</span>
                        </div>
                    </div>

                    {/* Navigation Tabs Bar */}
                    <div className="premium-tabs-bar">
                        <button
                            className={`premium-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
                            onClick={() => setActiveTab("dashboard")}
                        >
                            <Calendar size={16} /> Tableau de bord
                            {dashboardData?.stats?.todayCount > 0 && (
                                <span className="tab-badge-count">{dashboardData.stats.todayCount}</span>
                            )}
                        </button>
                        <button
                            className={`premium-tab-btn ${activeTab === "automations" ? "active" : ""}`}
                            onClick={() => setActiveTab("automations")}
                        >
                            <Sliders size={16} /> Règles actives ({automations.length})
                        </button>
                        <button
                            className={`premium-tab-btn ${activeTab === "templates" ? "active" : ""}`}
                            onClick={() => setActiveTab("templates")}
                        >
                            <MessageSquare size={16} /> Modèles & Simulateur
                        </button>
                        <button
                            className={`premium-tab-btn ${activeTab === "services" ? "active" : ""}`}
                            onClick={() => setActiveTab("services")}
                        >
                            <Wrench size={16} /> Métiers & Services ({services.length})
                        </button>
                        <button
                            className={`premium-tab-btn ${activeTab === "history" ? "active" : ""}`}
                            onClick={() => setActiveTab("history")}
                        >
                            <History size={16} /> Historique des relances
                        </button>
                        <button
                            className={`premium-tab-btn ${activeTab === "accounting" ? "active" : ""}`}
                            onClick={() => setActiveTab("accounting")}
                        >
                            <FileSpreadsheet size={16} /> Intégration comptable
                        </button>
                    </div>

                    {/* ── TAB 1: TABLEAU DE BORD ─────────────────────────────── */}
                    {activeTab === "dashboard" && (
                        <div className="tab-pane animate-fade-in">
                            {/* Summary Stats */}
                            <div className="auto-rappel-stats-grid">
                                <div className="rappel-stat-card">
                                    <div className="rappel-stat-icon-wrapper">
                                        <Sliders size={20} />
                                    </div>
                                    <div className="rappel-stat-info">
                                        <h4>{dashboardData.stats.activeRules || automations.length}</h4>
                                        <p>Règles actives</p>
                                    </div>
                                </div>
                                <div className="rappel-stat-card">
                                    <div className="rappel-stat-icon-wrapper gold">
                                        <Clock size={20} />
                                    </div>
                                    <div className="rappel-stat-info">
                                        <h4>{dashboardData.stats.scheduled || 0}</h4>
                                        <p>Rappels prévus</p>
                                    </div>
                                </div>
                                <div className="rappel-stat-card">
                                    <div className="rappel-stat-icon-wrapper blue">
                                        <Send size={20} />
                                    </div>
                                    <div className="rappel-stat-info">
                                        <h4>{dashboardData.stats.sent || 0}</h4>
                                        <p>Messages envoyés</p>
                                    </div>
                                </div>
                                <div className="rappel-stat-card">
                                    <div className="rappel-stat-icon-wrapper green">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div className="rappel-stat-info">
                                        <h4>{dashboardData.stats.responded || 0}</h4>
                                        <p>Réponses reçues</p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Timeframe Filter Bar */}
                            <div className="premium-timeline-filters" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "18px", flexWrap: "wrap" }}>
                                <button
                                    type="button"
                                    className={`action-btn-pill ${timelineFilter === "ALL" ? "primary" : ""}`}
                                    onClick={() => setTimelineFilter("ALL")}
                                    style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                                >
                                    Tous les rappels ({(dashboardData.groups?.overdue?.length || 0) + (dashboardData.groups?.today?.length || 0) + (dashboardData.groups?.thisWeek?.length || 0) + (dashboardData.groups?.thisMonth?.length || 0) + (dashboardData.groups?.future?.length || 0)})
                                </button>
                                <button
                                    type="button"
                                    className={`action-btn-pill ${timelineFilter === "TODAY" ? "primary" : ""}`}
                                    onClick={() => setTimelineFilter("TODAY")}
                                    style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                                >
                                    Aujourd'hui ({dashboardData.groups?.today?.length || 0})
                                </button>
                                <button
                                    type="button"
                                    className={`action-btn-pill ${timelineFilter === "MONTH" ? "primary" : ""}`}
                                    onClick={() => setTimelineFilter("MONTH")}
                                    style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                                >
                                    Ce mois ({dashboardData.groups?.thisMonth?.length || 0})
                                </button>
                                <button
                                    type="button"
                                    className={`action-btn-pill ${timelineFilter === "FUTURE" ? "primary" : ""}`}
                                    onClick={() => setTimelineFilter("FUTURE")}
                                    style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                                >
                                    À venir / Échéances futures ({dashboardData.groups?.future?.length || 0})
                                </button>
                            </div>

                            {/* Grouped Timelines */}
                            <div className="dashboard-timeline-section">
                                {/* EN RETARD */}
                                {(dashboardData.groups?.overdue?.length || 0) > 0 && (
                                    <div className="timeline-group-card">
                                        <div className="timeline-group-header">
                                            <div className="timeline-group-title">
                                                <AlertCircle size={18} color="#ef4444" />
                                                <span>En retard</span>
                                            </div>
                                            <span className="timeline-group-badge overdue">
                                                {dashboardData.groups.overdue.length} rappel(s)
                                            </span>
                                        </div>
                                        <div className="reminder-items-list">
                                            {(dashboardData.groups?.overdue || []).map((exec) => (
                                                <ReminderRowItem
                                                    key={exec.id}
                                                    exec={exec}
                                                    onExecuteNow={handleExecuteNow}
                                                    onOpenEdit={openEditModal}
                                                    actionLoading={actionLoading}
                                                    navigate={navigate}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AUJOURD'HUI (Affiché si non-vide en mode ALL, ou si l'onglet Aujourd'hui est sélectionné) */}
                                {(timelineFilter === "TODAY" || (timelineFilter === "ALL" && (dashboardData.groups?.today?.length || 0) > 0)) && (
                                    <div className="timeline-group-card">
                                        <div className="timeline-group-header">
                                            <div className="timeline-group-title">
                                                <Calendar size={18} color="#556B2F" />
                                                <span>Aujourd'hui</span>
                                            </div>
                                            <span className="timeline-group-badge today">
                                                {dashboardData.groups?.today?.length || 0} rappel(s)
                                            </span>
                                        </div>
                                        <div className="reminder-items-list">
                                            {!dashboardData.groups?.today?.length ? (
                                                <p style={{ padding: "24px", color: "var(--muted-foreground)", textAlign: "center", fontSize: "0.85rem" }}>
                                                    Aucun rappel d'entretien planifié pour aujourd'hui.
                                                </p>
                                            ) : (
                                                (dashboardData.groups.today || []).map((exec) => (
                                                    <ReminderRowItem
                                                        key={exec.id}
                                                        exec={exec}
                                                        onExecuteNow={handleExecuteNow}
                                                        onOpenEdit={openEditModal}
                                                        actionLoading={actionLoading}
                                                        navigate={navigate}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* CETTE SEMAINE (Affiché si non-vide en mode ALL, ou si l'onglet Ce mois est sélectionné) */}
                                {(timelineFilter === "MONTH" || (timelineFilter === "ALL" && (dashboardData.groups?.thisWeek?.length || 0) > 0)) && (
                                    <div className="timeline-group-card">
                                        <div className="timeline-group-header">
                                            <div className="timeline-group-title">
                                                <Clock size={18} color="#3b82f6" />
                                                <span>Cette semaine</span>
                                            </div>
                                            <span className="timeline-group-badge future">
                                                {dashboardData.groups?.thisWeek?.length || 0} rappel(s)
                                            </span>
                                        </div>
                                        <div className="reminder-items-list">
                                            {!dashboardData.groups?.thisWeek?.length ? (
                                                <p style={{ padding: "20px", color: "var(--muted-foreground)", textAlign: "center", fontSize: "0.85rem" }}>
                                                    Aucun rappel supplémentaire cette semaine.
                                                </p>
                                            ) : (
                                                (dashboardData.groups.thisWeek || []).map((exec) => (
                                                    <ReminderRowItem
                                                        key={exec.id}
                                                        exec={exec}
                                                        onExecuteNow={handleExecuteNow}
                                                        onOpenEdit={openEditModal}
                                                        actionLoading={actionLoading}
                                                        navigate={navigate}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* CE MOIS (Affiché si non-vide en mode ALL, ou si l'onglet Ce mois est sélectionné) */}
                                {(timelineFilter === "MONTH" || (timelineFilter === "ALL" && (dashboardData.groups?.thisMonth?.length || 0) > 0)) && (
                                    <div className="timeline-group-card">
                                        <div className="timeline-group-header">
                                            <div className="timeline-group-title">
                                                <Calendar size={18} color="var(--foreground)" />
                                                <span>Ce mois</span>
                                            </div>
                                            <span className="timeline-group-badge future">
                                                {dashboardData.groups?.thisMonth?.length || 0} rappel(s)
                                            </span>
                                        </div>
                                        <div className="reminder-items-list">
                                            {!dashboardData.groups?.thisMonth?.length ? (
                                                <p style={{ padding: "20px", color: "var(--muted-foreground)", textAlign: "center", fontSize: "0.85rem" }}>
                                                    Aucun autre rappel prévu d'ici la fin du mois.
                                                </p>
                                            ) : (
                                                (dashboardData.groups.thisMonth || []).map((exec) => (
                                                    <ReminderRowItem
                                                        key={exec.id}
                                                        exec={exec}
                                                        onExecuteNow={handleExecuteNow}
                                                        onOpenEdit={openEditModal}
                                                        actionLoading={actionLoading}
                                                        navigate={navigate}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* À VENIR (ÉCHÉANCES FUTURES & PROCHAINES ANNÉES) */}
                                {(timelineFilter === "ALL" || timelineFilter === "FUTURE") && (
                                    <div className="timeline-group-card">
                                        <div className="timeline-group-header">
                                            <div className="timeline-group-title">
                                                <Calendar size={18} color="#8b5cf6" />
                                                <span>À venir (Échéances futures & prochaines années)</span>
                                            </div>
                                            <span className="timeline-group-badge future" style={{ backgroundColor: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6" }}>
                                                {dashboardData.groups?.future?.length || 0} rappel(s)
                                            </span>
                                        </div>
                                        <div className="reminder-items-list">
                                            {!dashboardData.groups?.future?.length ? (
                                                <p style={{ padding: "20px", color: "var(--muted-foreground)", textAlign: "center", fontSize: "0.85rem" }}>
                                                    Aucun rappel futur au-delà de ce mois.
                                                </p>
                                            ) : (
                                                paginatedFuture.map((exec) => (
                                                    <ReminderRowItem
                                                        key={exec.id}
                                                        exec={exec}
                                                        onExecuteNow={handleExecuteNow}
                                                        onOpenEdit={openEditModal}
                                                        actionLoading={actionLoading}
                                                        navigate={navigate}
                                                    />
                                                ))
                                            )}
                                        </div>

                                        {/* Pagination Bar for Future Reminders */}
                                        {(dashboardData.groups?.future?.length || 0) > 0 && (
                                            <div className="timeline-pagination-bar" style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "14px 20px",
                                                borderTop: "1px solid var(--border)",
                                                flexWrap: "wrap",
                                                gap: "12px",
                                                backgroundColor: "rgba(255, 255, 255, 0.01)"
                                            }}>
                                                <div style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                                                    Affichage de {((futurePage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(futurePage * ITEMS_PER_PAGE, dashboardData.groups.future.length)} sur {dashboardData.groups.future.length} rappel{dashboardData.groups.future.length > 1 ? "s" : ""}
                                                </div>
                                                {totalFuturePages > 1 && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                        <button
                                                            type="button"
                                                            className="action-btn-pill"
                                                            disabled={futurePage <= 1}
                                                            onClick={() => setFuturePage(p => Math.max(1, p - 1))}
                                                            style={{ padding: "6px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        >
                                                            <ChevronLeft size={14} /> Précédent
                                                        </button>

                                                        {Array.from({ length: totalFuturePages }, (_, i) => i + 1).map((pNum) => (
                                                            <button
                                                                key={pNum}
                                                                type="button"
                                                                className={`action-btn-pill ${futurePage === pNum ? "primary" : ""}`}
                                                                onClick={() => setFuturePage(pNum)}
                                                                style={{ minWidth: "32px", padding: "6px 10px", fontSize: "0.78rem", fontWeight: futurePage === pNum ? 700 : 500 }}
                                                            >
                                                                {pNum}
                                                            </button>
                                                        ))}

                                                        <button
                                                            type="button"
                                                            className="action-btn-pill"
                                                            disabled={futurePage >= totalFuturePages}
                                                            onClick={() => setFuturePage(p => Math.min(totalFuturePages, p + 1))}
                                                            style={{ padding: "6px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        >
                                                            Suivant <ChevronRight size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── TAB 2: AUTOMATISATIONS ACTIVES ────────────────────── */}
                    {activeTab === "automations" && (
                        <div className="tab-pane animate-fade-in">
                            <div className="comptability-card" style={{ padding: "20px" }}>
                                <div style={{ marginBottom: "20px" }}>
                                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Règles d'automatisation des relances</h3>
                                    <p className="subtitle" style={{ margin: "4px 0 0 0", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                                        Chaque client et prestation dispose de sa propre périodicité indépendante.
                                    </p>
                                </div>

                                {/* Filter & Search Toolbar */}
                                <div className="automation-filter-toolbar" style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", backgroundColor: "rgba(0, 0, 0, 0.02)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                                    <div className="automation-filter-field" style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 240px", minWidth: "200px" }}>
                                        <Search size={16} color="var(--muted-foreground)" />
                                        <input
                                            type="text"
                                            className="profile-input"
                                            placeholder="Rechercher par mot-clé, règle..."
                                            value={automationSearchText}
                                            onChange={(e) => setAutomationSearchText(e.target.value)}
                                            style={{ width: "100%", padding: "7px 12px", fontSize: "0.84rem" }}
                                        />
                                    </div>

                                    <div className="automation-filter-field" style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 260px", minWidth: "220px" }}>
                                        <User size={16} color="var(--muted-foreground)" />
                                        <select
                                            className="profile-input option-select"
                                            value={automationFilterClient}
                                            onChange={(e) => setAutomationFilterClient(e.target.value)}
                                            style={{ width: "100%", padding: "7px 12px", fontSize: "0.84rem" }}
                                        >
                                            <option value="">Tous les clients ({automations.length})</option>
                                            {clientsList.map((c) => {
                                                const count = automations.filter(a => a.clientId === c.id).length;
                                                return (
                                                    <option key={c.id} value={c.id}>
                                                        {c.firstName} {c.lastName} {count > 0 ? `(${count} règle${count > 1 ? "s" : ""})` : ""}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {(automationFilterClient || automationSearchText) && (
                                        <button
                                            type="button"
                                            className="action-btn-pill"
                                            onClick={() => {
                                                setAutomationFilterClient("");
                                                setAutomationSearchText("");
                                            }}
                                            style={{ padding: "7px 12px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                        >
                                            <X size={14} /> Réinitialiser ({filteredAutomations.length})
                                        </button>
                                    )}
                                </div>

                                {filteredAutomations.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "40px", color: "var(--muted-foreground)" }}>
                                        <Sliders size={32} style={{ marginBottom: "10px", opacity: 0.4 }} />
                                        <p>
                                            {automations.length === 0
                                                ? "Aucune règle de rappel automatique active pour le moment."
                                                : "Aucune règle ne correspond à ce filtre client ou recherche."}
                                        </p>
                                        {automations.length === 0 ? (
                                            <button className="action-btn-pill primary" onClick={openNewModal} style={{ marginTop: "10px" }}>
                                                Configurer une première règle
                                            </button>
                                        ) : (
                                            <button
                                                className="action-btn-pill"
                                                onClick={() => {
                                                    setAutomationFilterClient("");
                                                    setAutomationSearchText("");
                                                }}
                                                style={{ marginTop: "10px" }}
                                            >
                                                Effacer les filtres
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                    <div className="desktop-table-container" style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                            <thead>
                                                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--muted-foreground)" }}>
                                                    <th style={{ padding: "12px 14px" }}>Client</th>
                                                    <th style={{ padding: "12px 14px" }}>Règle & Prestation</th>
                                                    <th style={{ padding: "12px 14px" }}>Fréquence</th>
                                                    <th style={{ padding: "12px 14px" }}>Préavis</th>
                                                    <th style={{ padding: "12px 14px" }}>Canal</th>
                                                    <th style={{ padding: "12px 14px" }}>Prochaine échéance</th>
                                                    <th style={{ padding: "12px 14px" }}>Statut</th>
                                                    <th style={{ padding: "12px 14px", textAlign: "right" }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedAutomations.map((auto) => (
                                                    <tr key={auto.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                                        <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                                                            {auto.client?.firstName} {auto.client?.lastName}
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            <div style={{ fontWeight: 600 }}>{auto.name}</div>
                                                            <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                                                                {auto.trackedServices?.map(ts => ts.serviceType?.name).join(", ") || "Équipement général"}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            {auto.frequencyValue} {auto.frequencyUnit === "MONTHS" ? "mois" : auto.frequencyUnit === "DAYS" ? "jours" : "ans"}
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            {auto.advanceNoticeValue} {auto.advanceNoticeUnit === "DAYS" ? "jours avant" : auto.advanceNoticeUnit}
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            {renderChannelBadge(auto.channel)}
                                                        </td>
                                                        <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                                                            {auto.nextReminderAt ? new Date(auto.nextReminderAt).toLocaleDateString("fr-FR") : "—"}
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            <span style={{
                                                                padding: "3px 8px",
                                                                borderRadius: "12px",
                                                                fontSize: "0.72rem",
                                                                fontWeight: 700,
                                                                backgroundColor: auto.enabled ? "rgba(34, 197, 94, 0.12)" : "rgba(107, 114, 128, 0.12)",
                                                                color: auto.enabled ? "#16a34a" : "var(--muted-foreground)"
                                                            }}>
                                                                {auto.enabled ? "Actif" : "En pause"}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                                                            <div style={{ display: "inline-flex", gap: "6px" }}>
                                                                <button
                                                                    className="action-btn-pill"
                                                                    onClick={() => handleToggleAutomation(auto.id)}
                                                                    title={auto.enabled ? "Mettre en pause" : "Activer"}
                                                                >
                                                                    {auto.enabled ? <Pause size={13} /> : <Play size={13} />}
                                                                </button>
                                                                <button
                                                                    className="action-btn-pill"
                                                                    onClick={() => openEditModal(auto)}
                                                                    title="Modifier"
                                                                >
                                                                    <Edit3 size={13} />
                                                                </button>
                                                                <button
                                                                    className="action-btn-pill"
                                                                    onClick={() => handleDeleteAutomation(auto.id)}
                                                                    style={{ color: "#ef4444" }}
                                                                    title="Supprimer"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards View (No horizontal scroll on phone) */}
                                    <div className="mobile-records-container">
                                        {paginatedAutomations.map((auto) => (
                                            <div key={auto.id} className="mobile-record-card">
                                                <div className="mobile-record-header">
                                                    <div className="mobile-record-client">
                                                        <div className="reminder-client-avatar">
                                                            {(auto.client?.firstName?.[0] || "") + (auto.client?.lastName?.[0] || "") || "CL"}
                                                        </div>
                                                        <div>
                                                            <h5 className="mobile-record-title">{auto.client?.firstName} {auto.client?.lastName}</h5>
                                                            <span className="mobile-record-subtitle">{auto.name}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`status-badge-pill ${auto.enabled ? "active" : "paused"}`}>
                                                        {auto.enabled ? "Actif" : "En pause"}
                                                    </span>
                                                </div>

                                                <div className="mobile-record-details">
                                                    <div className="mobile-record-detail-row">
                                                        <span className="service-chip" title={auto.trackedServices?.map(ts => ts.serviceType?.name).join(", ") || "Équipement général"}>
                                                            <Wrench size={13} style={{ flexShrink: 0 }} />
                                                            <span className="service-chip-text">{auto.trackedServices?.map(ts => ts.serviceType?.name).join(", ") || "Équipement général"}</span>
                                                        </span>
                                                        <span className="channel-chip">
                                                            {renderChannelBadge(auto.channel)}
                                                        </span>
                                                    </div>

                                                    <div className="mobile-record-meta-row">
                                                        <span>
                                                            <Clock size={12} color="#556B2F" /> Tous les {auto.frequencyValue} {auto.frequencyUnit === "MONTHS" ? "mois" : auto.frequencyUnit === "DAYS" ? "jours" : "ans"} (préavis {auto.advanceNoticeValue}j)
                                                        </span>
                                                        <span>
                                                            <Calendar size={12} color="#556B2F" /> Prochaine échéance : <strong>{auto.nextReminderAt ? new Date(auto.nextReminderAt).toLocaleDateString("fr-FR") : "—"}</strong>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mobile-record-actions">
                                                    <button
                                                        type="button"
                                                        className="action-btn-pill"
                                                        onClick={() => handleToggleAutomation(auto.id)}
                                                        title={auto.enabled ? "Mettre en pause" : "Activer"}
                                                    >
                                                        {auto.enabled ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Activer</>}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="action-btn-pill"
                                                        onClick={() => openEditModal(auto)}
                                                        title="Modifier"
                                                    >
                                                        <Edit3 size={13} /> Modifier
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="action-btn-pill icon-only-btn"
                                                        onClick={() => handleDeleteAutomation(auto.id)}
                                                        style={{ color: "#ef4444" }}
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                        {/* Pagination Bar for Automations */}
                                        {filteredAutomations.length > 0 && (
                                            <div className="timeline-pagination-bar" style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "16px 20px",
                                                borderTop: "1px solid var(--border)",
                                                flexWrap: "wrap",
                                                gap: "12px",
                                                backgroundColor: "rgba(255, 255, 255, 0.01)"
                                            }}>
                                                <div style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                                                    Affichage de {((automationsPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(automationsPage * ITEMS_PER_PAGE, filteredAutomations.length)} sur {filteredAutomations.length} règle{filteredAutomations.length > 1 ? "s" : ""}
                                                </div>
                                                {totalAutomationsPages > 1 && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                        <button
                                                            type="button"
                                                            className="action-btn-pill"
                                                            disabled={automationsPage <= 1}
                                                            onClick={() => setAutomationsPage(p => Math.max(1, p - 1))}
                                                            style={{ padding: "6px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        >
                                                            <ChevronLeft size={14} /> Précédent
                                                        </button>

                                                        {Array.from({ length: totalAutomationsPages }, (_, i) => i + 1).map((pNum) => (
                                                            <button
                                                                key={pNum}
                                                                type="button"
                                                                className={`action-btn-pill ${automationsPage === pNum ? "primary" : ""}`}
                                                                onClick={() => setAutomationsPage(pNum)}
                                                                style={{ minWidth: "32px", padding: "6px 10px", fontSize: "0.78rem", fontWeight: automationsPage === pNum ? 700 : 500 }}
                                                            >
                                                                {pNum}
                                                            </button>
                                                        ))}

                                                        <button
                                                            type="button"
                                                            className="action-btn-pill"
                                                            disabled={automationsPage >= totalAutomationsPages}
                                                            onClick={() => setAutomationsPage(p => Math.min(totalAutomationsPages, p + 1))}
                                                            style={{ padding: "6px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        >
                                                            Suivant <ChevronRight size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── TAB 3: MODÈLES & SIMULATEUR SMARTPHONE ─────────────── */}
                    {activeTab === "templates" && (
                        <div className="premium-grid-layout animate-fade-in">
                            {/* Left column: Template settings */}
                            <div className="premium-left-column">
                                <div className="comptability-card" style={{ padding: "24px" }}>
                                    <div className="widget-header" style={{ marginBottom: "16px" }}>
                                        <div className="title-area">
                                            <div className="header-icon-container">
                                                <MessageSquare size={18} />
                                            </div>
                                            <div>
                                                <h3>Modèle de message personnalisé</h3>
                                                <p className="subtitle">Personnalisez le contenu de vos relances avec les balises dynamiques</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Channel Selector for Preview */}
                                    <div style={{ marginBottom: "16px" }}>
                                        <label className="form-label" style={{ marginBottom: "8px", display: "block" }}>
                                            Canal de communication
                                        </label>
                                        <div className="preview-channel-selector-bar">
                                            <button
                                                type="button"
                                                className={`preview-channel-btn ${previewChannel === "WHATSAPP" ? "active" : ""}`}
                                                onClick={() => setPreviewChannel("WHATSAPP")}
                                            >
                                                <span className="channel-icon-circle whatsapp">
                                                    <MessageCircle size={14} />
                                                </span>
                                                <span className="channel-btn-text">WhatsApp</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`preview-channel-btn ${previewChannel === "SMS" ? "active" : ""}`}
                                                onClick={() => setPreviewChannel("SMS")}
                                            >
                                                <span className="channel-icon-circle sms">
                                                    <Smartphone size={14} />
                                                </span>
                                                <span className="channel-btn-text">SMS</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`preview-channel-btn ${previewChannel === "EMAIL" ? "active" : ""}`}
                                                onClick={() => setPreviewChannel("EMAIL")}
                                            >
                                                <span className="channel-icon-circle email">
                                                    <Mail size={14} />
                                                </span>
                                                <span className="channel-btn-text">Email</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Test Simulated Prestation switcher */}
                                    <div style={{ marginBottom: "16px" }}>
                                        <label className="form-label" style={{ marginBottom: "8px", display: "block" }}>
                                            Tester l'adaptation automatique avec une prestation :
                                        </label>
                                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                            {[
                                                { id: "entretien", label: "Entretien (1 an)", color: "#556B2F" },
                                                { id: "nettoyage", label: "Nettoyage filtres (6 mois)", color: "#0ea5e9" },
                                                { id: "etancheite", label: "Étanchéité (2 ans)", color: "#8b5cf6" },
                                                { id: "ramonage", label: "Ramonage (1 an)", color: "#f59e0b" },
                                                { id: "depannage", label: "Suivi dépannage (1 jour)", color: "#ef4444" }
                                            ].map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className={`action-btn-pill ${simulatedService === p.id ? "primary" : ""}`}
                                                    onClick={() => setSimulatedService(p.id)}
                                                    style={{ fontSize: "0.78rem", padding: "6px 12px" }}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Template Textarea with Crisp Borders */}
                                    <div className="form-field" style={{ marginBottom: "12px" }}>
                                        <label className="form-label">Contenu du message</label>
                                        <textarea
                                            className="profile-input textarea-field"
                                            rows="6"
                                            value={templateText}
                                            onChange={(e) => setTemplateText(e.target.value)}
                                            placeholder="Bonjour {{client_first_name}}..."
                                        />

                                        {/* Variable Pills to click and insert */}
                                        <label className="form-label" style={{ marginTop: "12px", display: "block", fontSize: "0.78rem" }}>
                                            Cliquez pour insérer une variable dynamique :
                                        </label>
                                        <div className="variable-pills-bar">
                                            <button type="button" className="var-pill-btn" onClick={() => insertVariableTag("{{frequence}}")}>
                                                <Clock size={12} color="#556B2F" /> Fréquence / Délai (1 an, 2 ans...)
                                            </button>
                                            <button type="button" className="var-pill-btn" onClick={() => insertVariableTag("{{intervention_type}}")}>
                                                <Wrench size={12} color="#556B2F" /> Prestation
                                            </button>
                                            <button type="button" className="var-pill-btn" onClick={() => insertVariableTag("{{date_derniere_visite}}")}>
                                                <Calendar size={12} color="#556B2F" /> Date dernière visite
                                            </button>
                                            <button type="button" className="var-pill-btn" onClick={() => insertVariableTag("{{prochaine_echeance}}")}>
                                                <Calendar size={12} color="#556B2F" /> Prochaine échéance
                                            </button>
                                            <button type="button" className="var-pill-btn" onClick={() => insertVariableTag("{{client_first_name}}")}>
                                                <User size={12} color="#556B2F" /> Prénom client
                                            </button>
                                            <button type="button" className="var-pill-btn" onClick={() => insertVariableTag("{{client_last_name}}")}>
                                                <User size={12} color="#556B2F" /> Nom client
                                            </button>
                                            <button type="button" className="var-pill-btn" onClick={() => insertVariableTag("{{company_name}}")}>
                                                <Building2 size={12} color="#556B2F" /> Nom entreprise
                                            </button>
                                            <button type="button" className="var-pill-btn" onClick={() => insertVariableTag("{{company_phone}}")}>
                                                <Phone size={12} color="#556B2F" /> Téléphone
                                            </button>
                                            <button type="button" className="var-pill-btn" onClick={() => insertVariableTag("{{appointment_link}}")}>
                                                <Link size={12} color="#556B2F" /> Lien de RDV
                                            </button>
                                        </div>
                                    </div>

                                    {/* Signature SMS */}
                                    {previewChannel === "SMS" && (
                                        <div className="form-field" style={{ marginTop: "16px" }}>
                                            <label className="form-label">Signature de fin de SMS</label>
                                            <input
                                                type="text"
                                                className="profile-input"
                                                value={smsSignature}
                                                onChange={(e) => setSmsSignature(e.target.value)}
                                                placeholder={`— ${companyName}`}
                                            />
                                        </div>
                                    )}

                                    <div style={{ marginTop: "20px" }}>
                                        <button
                                            type="button"
                                            className="save-sms-btn"
                                            onClick={() => triggerToast("Modèle de message enregistré pour les prochaines relances !", "success")}
                                        >
                                            <Save size={16} /> Enregistrer le modèle
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right column: Interactive Smartphone simulator */}
                            <div className="premium-right-column">
                                <div className="smartphone-simulator-container">
                                    <div className="smartphone-bezel">
                                        <div className="smartphone-camera-notch" />
                                        <div className="smartphone-screen">
                                            {/* WhatsApp Look */}
                                            {previewChannel === "WHATSAPP" && (
                                                <>
                                                    <div className="wa-chat-header">
                                                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#128c7e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.78rem" }}>
                                                            {companyInitials}
                                                        </div>
                                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                                            <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{companyName}</span>
                                                            <span style={{ fontSize: "0.62rem", opacity: 0.85 }}>Compte professionnel vérifié</span>
                                                        </div>
                                                    </div>
                                                    <div className="wa-chat-body">
                                                        <div className="wa-bubble-received">
                                                            <p className="wa-text">{renderedLivePreview}</p>
                                                            <span className="wa-time">10:42 ✓✓</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* SMS Look */}
                                            {previewChannel === "SMS" && (
                                                <>
                                                    <div className="sms-chat-header">
                                                        <div className="sms-header-nav">
                                                            <ChevronLeft size={16} color="#007aff" />

                                                        </div>
                                                        <div className="sms-header-contact">
                                                            <div className="sms-contact-avatar">
                                                                <User size={13} color="#8e8e93" />
                                                            </div>
                                                            <span className="sms-contact-name">{companyName}</span>
                                                            <span className="sms-contact-status">SMS professionnel</span>
                                                        </div>
                                                        <div style={{ width: "45px" }} />
                                                    </div>
                                                    <div className="sms-screen-body">
                                                        <div className="sms-date-pill">Aujourd'hui 10:42</div>
                                                        <div className="sms-bubble">
                                                            <p className="sms-text">{renderedLivePreview}</p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* Email Look */}
                                            {previewChannel === "EMAIL" && (
                                                <div style={{ flex: 1, backgroundColor: "#ffffff", padding: "14px", overflowY: "auto" }}>
                                                    <div style={{ borderBottom: "1px solid #e5e5ea", paddingBottom: "8px", marginBottom: "10px" }}>
                                                        <span style={{ fontSize: "0.72rem", color: "#8e8e93" }}>De : {company?.email || user?.email || `contact@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || "climpro"}.fr`}</span>
                                                        <h5 style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>Rappel d'entretien — {companyName}</h5>
                                                    </div>
                                                    <p style={{ fontSize: "0.78rem", color: "#1c1c1e", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                                                        {renderedLivePreview}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="simulator-label">Aperçu en direct ({previewChannel})</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB 4: MÉTIERS & CATALOGUE DE SERVICES ─────────────── */}
                    {activeTab === "services" && (
                        <div className="tab-pane animate-fade-in">
                            <div className="comptability-card services-tab-card" style={{ padding: "24px" }}>
                                <div className="services-catalog-header">
                                    <div className="services-catalog-info">
                                        <h3 className="services-catalog-title">Catalogue des prestations & Recommandations par métier</h3>
                                        <p className="services-catalog-subtitle">
                                            Chaque prestation réalisée lors d'une intervention déclenche son propre cycle de rappel.
                                        </p>
                                    </div>
                                    <button className="action-btn-pill primary add-service-btn" onClick={() => setShowServiceModal(true)}>
                                        <Plus size={16} /> Ajouter une prestation
                                    </button>
                                </div>

                                {/* Trade switcher */}
                                <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                                    {Object.entries(tradePresets).map(([slug, preset]) => (
                                        <button
                                            key={slug}
                                            type="button"
                                            className={`action-btn-pill ${selectedTrade === slug ? "primary" : ""}`}
                                            onClick={() => setSelectedTrade(slug)}
                                        >
                                            {preset.tradeName}
                                        </button>
                                    ))}
                                </div>

                                {/* Services Grid */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
                                    {services
                                        .filter(s => !selectedTrade || s.tradeSlug === selectedTrade || s.isDefault)
                                        .map((serv) => (
                                            <div
                                                key={serv.id}
                                                style={{
                                                    backgroundColor: "var(--card)",
                                                    border: "1px solid var(--border)",
                                                    borderRadius: "12px",
                                                    padding: "16px",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    justifyContent: "space-between"
                                                }}
                                            >
                                                <div>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>{serv.name}</h4>
                                                        {renderRecommendationBadge(serv.recommendationLevel)}
                                                    </div>
                                                    <p style={{ margin: "0 0 12px 0", fontSize: "0.78rem", color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                                                        {serv.description || "Prestation de service client."}
                                                    </p>
                                                </div>

                                                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                                                    <span>Fréquence : <strong>{serv.defaultFrequencyValue} {serv.defaultFrequencyUnit === "MONTHS" ? "mois" : "jours"}</strong></span>
                                                    <span>Préavis : <strong>{serv.defaultAdvanceNoticeValue}j</strong></span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB 5: HISTORIQUE DES RELANCES ────────────────────── */}
                    {activeTab === "history" && (
                        <div className="tab-pane animate-fade-in">
                            <div className="comptability-card" style={{ padding: "20px" }}>
                                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>Journal d'exécution des relances</h3>

                                {executions.length === 0 ? (
                                    <p style={{ textAlign: "center", padding: "30px", color: "var(--muted-foreground)" }}>
                                        Aucun historique de relance enregistré pour le moment.
                                    </p>
                                ) : (
                                    <>
                                    <div className="desktop-table-container" style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                            <thead>
                                                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--muted-foreground)" }}>
                                                    <th style={{ padding: "12px 14px" }}>Date</th>
                                                    <th style={{ padding: "12px 14px" }}>Client</th>
                                                    <th style={{ padding: "12px 14px" }}>Canal</th>
                                                    <th style={{ padding: "12px 14px" }}>Étape</th>
                                                    <th style={{ padding: "12px 14px" }}>Message envoyé</th>
                                                    <th style={{ padding: "12px 14px" }}>Statut</th>
                                                    <th style={{ padding: "12px 14px", textAlign: "right" }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedExecutions.map((exec) => (
                                                    <tr key={exec.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            {new Date(exec.scheduledAt).toLocaleDateString("fr-FR")}
                                                        </td>
                                                        <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                                                            {exec.client?.firstName} {exec.client?.lastName}
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            {renderChannelBadge(exec.channel)}
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            {exec.sequenceStep === 1 ? "1er Rappel" : `Relance #${exec.sequenceStep}`}
                                                        </td>
                                                        <td style={{ padding: "12px 14px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={exec.renderedContent}>
                                                            {exec.renderedContent || "—"}
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            <span style={{
                                                                padding: "3px 8px",
                                                                borderRadius: "12px",
                                                                fontSize: "0.72rem",
                                                                fontWeight: 700,
                                                                backgroundColor:
                                                                    exec.status === "RESPONDED" ? "rgba(34, 197, 94, 0.15)" :
                                                                        exec.status === "WAITING_FOR_RESPONSE" || exec.status === "SENT" ? "rgba(59, 130, 246, 0.15)" :
                                                                            exec.status === "SCHEDULED" ? "rgba(234, 179, 8, 0.15)" :
                                                                                "rgba(239, 68, 68, 0.15)",
                                                                color:
                                                                    exec.status === "RESPONDED" ? "#16a34a" :
                                                                        exec.status === "WAITING_FOR_RESPONSE" || exec.status === "SENT" ? "#2563eb" :
                                                                            exec.status === "SCHEDULED" ? "#ca8a04" :
                                                                                "#ef4444"
                                                            }}>
                                                                {exec.status === "RESPONDED" ? "✓ Client a répondu" :
                                                                    exec.status === "WAITING_FOR_RESPONSE" ? "En attente de réponse" :
                                                                        exec.status === "SENT" ? "Envoyé" :
                                                                            exec.status === "SCHEDULED" ? "Planifié" :
                                                                                exec.status === "FAILED" ? "Échec" : exec.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                                                            <div style={{ display: "inline-flex", gap: "6px" }}>
                                                                <button
                                                                    className="action-btn-pill"
                                                                    onClick={() => navigate("/planning", {
                                                                        state: {
                                                                            clientId: exec.client?.id,
                                                                            clientName: `${exec.client?.firstName || ""} ${exec.client?.lastName || ""}`.trim(),
                                                                            serviceType: exec.reminderAutomation?.trackedServices?.[0]?.serviceType?.name || exec.reminderAutomation?.name || "Entretien",
                                                                            returnUrl: "/premium"
                                                                        }
                                                                    })}
                                                                    title="Planifier un rendez-vous (RDV)"
                                                                    style={{ display: "inline-flex", alignItems: "center", gap: "5px", borderColor: "rgba(85, 107, 47, 0.4)", color: "var(--foreground)" }}
                                                                >
                                                                    <Calendar size={13} color="#556B2F" /> RDV
                                                                </button>
                                                                <button
                                                                    className="action-btn-pill"
                                                                    onClick={() => navigate("/messages", {
                                                                        state: {
                                                                            clientId: exec.client?.id,
                                                                            clientName: `${exec.client?.firstName || ""} ${exec.client?.lastName || ""}`.trim(),
                                                                            returnUrl: "/premium"
                                                                        }
                                                                    })}
                                                                    title="Voir la conversation"
                                                                >
                                                                    <MessageSquare size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards View (No horizontal scroll on phone) */}
                                    <div className="mobile-records-container">
                                        {paginatedExecutions.map((exec) => (
                                            <div key={exec.id} className="mobile-record-card">
                                                <div className="mobile-record-header">
                                                    <div>
                                                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--foreground)" }}>
                                                            {new Date(exec.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                                        </span>
                                                        <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginLeft: "8px" }}>
                                                            {exec.sequenceStep === 1 ? "1er Rappel" : `Relance #${exec.sequenceStep}`}
                                                        </span>
                                                    </div>
                                                    <span style={{
                                                        padding: "2px 8px",
                                                        borderRadius: "12px",
                                                        fontSize: "0.7rem",
                                                        fontWeight: 700,
                                                        backgroundColor:
                                                            exec.status === "RESPONDED" ? "rgba(34, 197, 94, 0.15)" :
                                                                exec.status === "WAITING_FOR_RESPONSE" || exec.status === "SENT" ? "rgba(59, 130, 246, 0.15)" :
                                                                    exec.status === "SCHEDULED" ? "rgba(234, 179, 8, 0.15)" :
                                                                        "rgba(239, 68, 68, 0.15)",
                                                        color:
                                                            exec.status === "RESPONDED" ? "#16a34a" :
                                                                exec.status === "WAITING_FOR_RESPONSE" || exec.status === "SENT" ? "#2563eb" :
                                                                    exec.status === "SCHEDULED" ? "#ca8a04" :
                                                                        "#ef4444"
                                                    }}>
                                                        {exec.status === "RESPONDED" ? "✓ Répondu" :
                                                            exec.status === "WAITING_FOR_RESPONSE" ? "En attente" :
                                                                exec.status === "SENT" ? "Envoyé" :
                                                                    exec.status === "SCHEDULED" ? "Planifié" :
                                                                        exec.status === "FAILED" ? "Échec" : exec.status}
                                                    </span>
                                                </div>

                                                <div className="mobile-record-details">
                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--foreground)" }}>
                                                            {exec.client?.firstName} {exec.client?.lastName}
                                                        </span>
                                                        <span style={{ fontSize: "0.78rem" }}>
                                                            {renderChannelBadge(exec.channel)}
                                                        </span>
                                                    </div>

                                                    {exec.renderedContent && (
                                                        <div className="mobile-record-msg-preview">
                                                            "{exec.renderedContent}"
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mobile-record-actions">
                                                    <button
                                                        type="button"
                                                        className="action-btn-pill"
                                                        onClick={() => navigate("/planning", {
                                                            state: {
                                                                clientId: exec.client?.id,
                                                                clientName: `${exec.client?.firstName || ""} ${exec.client?.lastName || ""}`.trim(),
                                                                serviceType: exec.reminderAutomation?.trackedServices?.[0]?.serviceType?.name || exec.reminderAutomation?.name || "Entretien",
                                                                returnUrl: "/premium"
                                                            }
                                                        })}
                                                        title="Planifier un rendez-vous (RDV)"
                                                        style={{ flex: 1, justifyContent: "center" }}
                                                    >
                                                        <Calendar size={13} color="#556B2F" /> Planifier RDV
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="action-btn-pill"
                                                        onClick={() => navigate("/messages", {
                                                            state: {
                                                                clientId: exec.client?.id,
                                                                clientName: `${exec.client?.firstName || ""} ${exec.client?.lastName || ""}`.trim(),
                                                                returnUrl: "/premium"
                                                            }
                                                        })}
                                                        title="Voir la conversation"
                                                        style={{ flex: 1, justifyContent: "center" }}
                                                    >
                                                        <MessageSquare size={13} /> Chat
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                        {/* Pagination Bar for History */}
                                        {executions.length > 0 && (
                                            <div className="timeline-pagination-bar" style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "16px 20px",
                                                marginTop: "12px",
                                                borderTop: "1px solid var(--border)",
                                                flexWrap: "wrap",
                                                gap: "12px",
                                                backgroundColor: "rgba(255, 255, 255, 0.01)"
                                            }}>
                                                <div style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                                                    Affichage de {((historyPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(historyPage * ITEMS_PER_PAGE, executions.length)} sur {executions.length} relance{executions.length > 1 ? "s" : ""}
                                                </div>
                                                {totalHistoryPages > 1 && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                        <button
                                                            type="button"
                                                            className="action-btn-pill"
                                                            disabled={historyPage <= 1}
                                                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                                            style={{ padding: "6px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        >
                                                            <ChevronLeft size={14} /> Précédent
                                                        </button>

                                                        {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map((pNum) => (
                                                            <button
                                                                key={pNum}
                                                                type="button"
                                                                className={`action-btn-pill ${historyPage === pNum ? "primary" : ""}`}
                                                                onClick={() => setHistoryPage(pNum)}
                                                                style={{ minWidth: "32px", padding: "6px 10px", fontSize: "0.78rem", fontWeight: historyPage === pNum ? 700 : 500 }}
                                                            >
                                                                {pNum}
                                                            </button>
                                                        ))}

                                                        <button
                                                            type="button"
                                                            className="action-btn-pill"
                                                            disabled={historyPage >= totalHistoryPages}
                                                            onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                                                            style={{ padding: "6px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        >
                                                            Suivant <ChevronRight size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── TAB 6: INTÉGRATION COMPTABLE (CONSERVÉE) ────────────── */}
                    {activeTab === "accounting" && (
                        <div className="tab-pane animate-fade-in">
                            <AccountingIntegration />
                        </div>
                    )}
                    </motion.div>
                </PullToRefresh>
            </div>

            {/* ── MODAL: CRÉER / MODIFIER UNE RÈGLE DE RAPPEL ────────────── */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        className="rappel-modal-backdrop"
                        onClick={() => setShowCreateModal(false)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <motion.div
                            className="rappel-modal-card"
                            onClick={(e) => e.stopPropagation()}
                            drag={isMobile ? "y" : false}
                            dragListener={false}
                            dragControls={createModalDragControls}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.6 }}
                            onDragEnd={(e, info) => {
                                if (info.offset.y > 70 || info.velocity.y > 350) {
                                    setShowCreateModal(false);
                                }
                            }}
                            initial={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
                            animate={isMobile ? { y: "0%" } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                        >
                            {isMobile && (
                                <div
                                    className="bottom-sheet-drag-handle-zone"
                                    onPointerDown={(e) => createModalDragControls.start(e)}
                                    onClick={() => setShowCreateModal(false)}
                                    title="Glisser vers le bas pour fermer"
                                >
                                    <div className="bottom-sheet-drag-handle" />
                                </div>
                            )}
                            <div className="rappel-modal-header">
                                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                                    {editingAutomation ? "Modifier la règle de rappel" : "Créer une règle de rappel automatique"}
                                </h3>
                                <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveAutomationForm}>
                                <div className="rappel-modal-body">
                                    {/* Custom Client selector with Search & Global "Tous les clients" */}
                                    <div className="form-field">
                                        <label className="form-label">Client concerné *</label>
                                        <div className="custom-client-select-wrapper">
                                            <button
                                                type="button"
                                                className={`custom-client-trigger ${clientDropdownOpen ? "active" : ""}`}
                                                onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                                            >
                                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    {modalForm.clientId === "ALL" ? (
                                                        <>
                                                            <Users size={16} color="#556B2F" />
                                                            <strong style={{ color: "#556B2F" }}>Tous les clients (Règle globale)</strong>
                                                        </>
                                                    ) : modalForm.clientId ? (
                                                        (() => {
                                                            const selected = clientsList.find(c => c.id === modalForm.clientId);
                                                            if (!selected) return <span style={{ color: "var(--muted-foreground)" }}>Sélectionner un client ou tous les clients *</span>;
                                                            return (
                                                                <>
                                                                    <User size={16} color="#556B2F" />
                                                                    <span>{selected.firstName} {selected.lastName} {selected.companyName ? `(${selected.companyName})` : ""}</span>
                                                                </>
                                                            );
                                                        })()
                                                    ) : (
                                                        <>
                                                            <User size={16} color="var(--muted-foreground)" />
                                                            <span style={{ color: "var(--muted-foreground)" }}>Sélectionner un client ou tous les clients *</span>
                                                        </>
                                                    )}
                                                </span>
                                                <ChevronRight size={16} style={{ transform: clientDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.2s ease" }} />
                                            </button>

                                            <AnimatePresence>
                                                {clientDropdownOpen && (
                                                    <motion.div
                                                        className="custom-client-dropdown-menu"
                                                        initial={{ opacity: 0, y: -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -8 }}
                                                        transition={{ duration: 0.15 }}
                                                    >
                                                        <div className="custom-client-search-bar">
                                                            <input
                                                                type="text"
                                                                className="custom-client-search-input"
                                                                placeholder="Rechercher un client..."
                                                                value={clientSearchQuery}
                                                                onChange={(e) => setClientSearchQuery(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="custom-client-options-list">
                                                            {/* Option Global ALL */}
                                                            {(!clientSearchQuery || "tous les clients globale".includes(clientSearchQuery.toLowerCase())) && (
                                                                <div
                                                                    className={`custom-client-option-item global-all ${modalForm.clientId === "ALL" ? "selected" : ""}`}
                                                                    onClick={() => {
                                                                        setModalForm(prev => ({ ...prev, clientId: "ALL" }));
                                                                        setClientDropdownOpen(false);
                                                                        setClientSearchQuery("");
                                                                    }}
                                                                >
                                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                                        <Users size={18} color={modalForm.clientId === "ALL" ? "#556B2F" : "var(--foreground)"} />
                                                                        <div>
                                                                            <div style={{ color: modalForm.clientId === "ALL" ? "#556B2F" : "var(--foreground)", fontWeight: 600 }}>Tous les clients (Règle globale)</div>
                                                                            <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>Appliquer cette règle à toute votre base client</span>
                                                                        </div>
                                                                    </div>
                                                                    {modalForm.clientId === "ALL" && <Check size={16} color="#556B2F" />}
                                                                </div>
                                                            )}

                                                            {/* Individual Clients */}
                                                            {clientsList
                                                                .filter(c => {
                                                                    if (!clientSearchQuery) return true;
                                                                    const q = clientSearchQuery.toLowerCase();
                                                                    return (
                                                                        (c.firstName && c.firstName.toLowerCase().includes(q)) ||
                                                                        (c.lastName && c.lastName.toLowerCase().includes(q)) ||
                                                                        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
                                                                        (c.phone && c.phone.includes(q))
                                                                    );
                                                                })
                                                                .map((c) => (
                                                                    <div
                                                                        key={c.id}
                                                                        className={`custom-client-option-item ${modalForm.clientId === c.id ? "selected" : ""}`}
                                                                        onClick={() => {
                                                                            setModalForm(prev => ({ ...prev, clientId: c.id }));
                                                                            setClientDropdownOpen(false);
                                                                            setClientSearchQuery("");
                                                                        }}
                                                                    >
                                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                                            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(85, 107, 47, 0.12)", color: "#556B2F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                                                                                {(c.firstName?.[0] || "") + (c.lastName?.[0] || "")}
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: "0.86rem", fontWeight: 600 }}>{c.firstName} {c.lastName} {c.companyName ? `(${c.companyName})` : ""}</div>
                                                                                <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>{c.phone || c.email || "Client particulier"}</span>
                                                                            </div>
                                                                        </div>
                                                                        {modalForm.clientId === c.id && <Check size={16} color="#556B2F" />}
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Prestation / Service */}
                                    <div className="form-field">
                                        <label className="form-label">Prestation / Service suivi *</label>
                                        <select
                                            className="profile-input option-select"
                                            value={modalForm.serviceTypeId}
                                            onChange={(e) => handleServiceChange(e.target.value)}
                                        >
                                            <option value="">Prestation générale</option>
                                            {services.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} {s.recommendationLevel === "RECOMMENDED" ? "(Recommandé)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Frequency & Advance Notice */}
                                    <div className="modal-grid-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                        <div className="form-field">
                                            <label className="form-label">Fréquence du rappel</label>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <input
                                                    type="number"
                                                    className="profile-input"
                                                    value={modalForm.frequencyValue}
                                                    onChange={(e) => handleFrequencyChange(e.target.value, modalForm.frequencyUnit)}
                                                    min="1"
                                                    style={{ width: "80px" }}
                                                />
                                                <select
                                                    className="profile-input option-select"
                                                    value={modalForm.frequencyUnit}
                                                    onChange={(e) => handleFrequencyChange(modalForm.frequencyValue, e.target.value)}
                                                >
                                                    <option value="DAYS">Jours</option>
                                                    <option value="WEEKS">Semaines</option>
                                                    <option value="MONTHS">Mois</option>
                                                    <option value="YEARS">Années</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Préavis d'envoi</label>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <input
                                                    type="number"
                                                    className="profile-input"
                                                    value={modalForm.advanceNoticeValue}
                                                    onChange={(e) => setModalForm({ ...modalForm, advanceNoticeValue: parseInt(e.target.value, 10) || 0 })}
                                                    min="0"
                                                    style={{ width: "80px" }}
                                                />
                                                <select
                                                    className="profile-input option-select"
                                                    value={modalForm.advanceNoticeUnit}
                                                    onChange={(e) => setModalForm({ ...modalForm, advanceNoticeUnit: e.target.value })}
                                                >
                                                    <option value="DAYS">Jours avant</option>
                                                    <option value="WEEKS">Semaines avant</option>
                                                    <option value="MONTHS">Mois avant</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Channel selection */}
                                    <div className="modal-grid-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                        <div className="form-field">
                                            <label className="form-label">Canal prioritaire</label>
                                            <select
                                                className="profile-input option-select"
                                                value={modalForm.channel}
                                                onChange={(e) => setModalForm({ ...modalForm, channel: e.target.value })}
                                            >
                                                <option value="LAST_USED">Automatique (Intelligent - selon le client)</option>
                                                <option value="WHATSAPP">WhatsApp Business</option>
                                                <option value="SMS">SMS</option>
                                                <option value="EMAIL">Email</option>
                                            </select>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Canal de secours</label>
                                            <select
                                                className="profile-input option-select"
                                                value={modalForm.fallbackChannel}
                                                onChange={(e) => setModalForm({ ...modalForm, fallbackChannel: e.target.value })}
                                            >
                                                <option value="SMS">SMS</option>
                                                <option value="EMAIL">Email</option>
                                                <option value="WHATSAPP">WhatsApp</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Stop conditions */}
                                    <div className="rappel-stop-conditions-box">
                                        <label className="rappel-checkbox-label">
                                            <input
                                                type="checkbox"
                                                className="rappel-checkbox-input"
                                                checked={modalForm.stopOnReply}
                                                onChange={(e) => setModalForm({ ...modalForm, stopOnReply: e.target.checked })}
                                            />
                                            <span>Arrêter automatiquement la séquence dès que le client répond</span>
                                        </label>
                                        <label className="rappel-checkbox-label">
                                            <input
                                                type="checkbox"
                                                className="rappel-checkbox-input"
                                                checked={modalForm.stopOnAppointment}
                                                onChange={(e) => setModalForm({ ...modalForm, stopOnAppointment: e.target.checked })}
                                            />
                                            <span>Arrêter automatiquement la séquence lors de la prise de rendez-vous</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="rappel-modal-footer">
                                    <button type="button" className="action-btn-pill" onClick={() => setShowCreateModal(false)}>
                                        Annuler
                                    </button>
                                    <button type="submit" className="action-btn-pill primary">
                                        <Save size={15} /> {editingAutomation ? "Enregistrer" : "Activer le rappel"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── MODAL: AJOUTER UN SERVICE PERSONNALISÉ ─────────────── */}
            <AnimatePresence>
                {showServiceModal && (
                    <motion.div
                        className="rappel-modal-backdrop"
                        onClick={() => setShowServiceModal(false)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <motion.div
                            className="rappel-modal-card"
                            onClick={(e) => e.stopPropagation()}
                            drag={isMobile ? "y" : false}
                            dragListener={false}
                            dragControls={serviceModalDragControls}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.6 }}
                            onDragEnd={(e, info) => {
                                if (info.offset.y > 70 || info.velocity.y > 350) {
                                    setShowServiceModal(false);
                                }
                            }}
                            initial={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
                            animate={isMobile ? { y: "0%" } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                        >
                            {isMobile && (
                                <div
                                    className="bottom-sheet-drag-handle-zone"
                                    onPointerDown={(e) => serviceModalDragControls.start(e)}
                                    onClick={() => setShowServiceModal(false)}
                                    title="Glisser vers le bas pour fermer"
                                >
                                    <div className="bottom-sheet-drag-handle" />
                                </div>
                            )}
                            <div className="rappel-modal-header">
                                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Ajouter une prestation personnalisée</h3>
                                <button className="modal-close-btn" onClick={() => setShowServiceModal(false)}>
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveServiceForm}>
                                <div className="rappel-modal-body">
                                    <div className="form-field">
                                        <label className="form-label">Nom de la prestation *</label>
                                        <input
                                            type="text"
                                            className="profile-input"
                                            value={serviceForm.name}
                                            onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                                            placeholder="Ex: Nettoyage gainable, Contrôle annuel PAC..."
                                            required
                                        />
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                        <div className="form-field">
                                            <label className="form-label">Métier / Domaine</label>
                                            <select
                                                className="profile-input option-select"
                                                value={serviceForm.tradeSlug}
                                                onChange={(e) => setServiceForm({ ...serviceForm, tradeSlug: e.target.value })}
                                            >
                                                <option value="climatisation-pac">Climatisation / PAC</option>
                                                <option value="electricien">Électricien</option>
                                                <option value="plombier">Plombier</option>
                                                <option value="chauffagiste">Chauffagiste</option>
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">Recommandation</label>
                                            <select
                                                className="profile-input option-select"
                                                value={serviceForm.recommendationLevel}
                                                onChange={(e) => setServiceForm({ ...serviceForm, recommendationLevel: e.target.value })}
                                            >
                                                <option value="RECOMMENDED">Recommandé</option>
                                                <option value="OPTIONAL">Optionnel</option>
                                                <option value="CUSTOMIZABLE">Personnalisable</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                        <div className="form-field">
                                            <label className="form-label">Fréquence par défaut</label>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <input
                                                    type="number"
                                                    className="profile-input"
                                                    value={serviceForm.defaultFrequencyValue}
                                                    onChange={(e) => setServiceForm({ ...serviceForm, defaultFrequencyValue: parseInt(e.target.value, 10) || 12 })}
                                                    style={{ width: "80px" }}
                                                />
                                                <select
                                                    className="profile-input option-select"
                                                    value={serviceForm.defaultFrequencyUnit}
                                                    onChange={(e) => setServiceForm({ ...serviceForm, defaultFrequencyUnit: e.target.value })}
                                                >
                                                    <option value="MONTHS">Mois</option>
                                                    <option value="DAYS">Jours</option>
                                                    <option value="YEARS">Ans</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">Préavis par défaut</label>
                                            <input
                                                type="number"
                                                className="profile-input"
                                                value={serviceForm.defaultAdvanceNoticeValue}
                                                onChange={(e) => setServiceForm({ ...serviceForm, defaultAdvanceNoticeValue: parseInt(e.target.value, 10) || 30 })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="rappel-modal-footer">
                                    <button type="button" className="action-btn-pill" onClick={() => setShowServiceModal(false)}>
                                        Annuler
                                    </button>
                                    <button type="submit" className="action-btn-pill primary">
                                        <Save size={15} /> Enregistrer la prestation
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── CUSTOM CONFIRMATION DIALOG (ALERT POPUP) ──────────── */}
            <AnimatePresence>
                {confirmModal && (
                    <div className="rappel-confirm-backdrop" onClick={() => setConfirmModal(null)}>
                        <motion.div
                            className="rappel-confirm-card"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="rappel-confirm-header">
                                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                                    {confirmModal.title || "Confirmation"}
                                </h3>
                                <button className="modal-close-btn" onClick={() => setConfirmModal(null)}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="rappel-confirm-body">
                                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                                    {confirmModal.message}
                                </p>
                            </div>
                            <div className="rappel-confirm-footer">
                                <button
                                    type="button"
                                    className="action-btn-pill"
                                    onClick={() => setConfirmModal(null)}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    className="action-btn-pill"
                                    style={{
                                        backgroundColor: confirmModal.isDestructive ? "#ef4444" : "#556B2F",
                                        color: "#ffffff",
                                        borderColor: confirmModal.isDestructive ? "#ef4444" : "#556B2F"
                                    }}
                                    onClick={confirmModal.onConfirm}
                                >
                                    {confirmModal.confirmText || "Confirmer"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── SUB-COMPONENT: ROW ITEM FOR TIMELINE ────────────────────────
function ReminderRowItem({ exec, onExecuteNow, onOpenEdit, actionLoading, navigate }) {
    const client = exec.client || {};
    const auto = exec.reminderAutomation || {};
    const serviceName = auto.trackedServices?.[0]?.serviceType?.name || auto.name || "Entretien";

    const formatFutureBadge = (scheduledAt) => {
        if (!scheduledAt) return null;
        const d = new Date(scheduledAt);
        const now = new Date();
        const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { label: `${Math.abs(diffDays)}j de retard`, color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" };
        if (diffDays === 0) return { label: "Aujourd'hui", color: "#16a34a", bg: "rgba(34, 197, 94, 0.15)" };
        if (diffDays === 1) return { label: "Demain", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" };
        if (diffDays < 30) return { label: `Dans ${diffDays}j`, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" };
        const months = Math.round(diffDays / 30.4);
        if (months < 12) return { label: `Dans ${months} mois`, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)" };
        const years = (diffDays / 365.25).toFixed(1).replace(".0", "");
        return { label: `Dans ${years} an${years > 1 ? "s" : ""}`, color: "#eab308", bg: "rgba(234, 179, 8, 0.15)" };
    };

    const badge = formatFutureBadge(exec.scheduledAt);

    return (
        <div className="reminder-row-item">
            <div className="reminder-client-cell">
                <div className="reminder-client-avatar">
                    {(client.firstName?.[0] || "") + (client.lastName?.[0] || "") || "CL"}
                </div>
                <div className="reminder-client-meta">
                    <h5>{client.firstName} {client.lastName}</h5>
                    <p>{client.phone || client.email || "Contact"}</p>
                </div>
            </div>

            <div className="reminder-service-cell">
                <span className="service-chip" title={serviceName}>
                    <Wrench size={13} style={{ flexShrink: 0 }} />
                    <span className="service-chip-text">{serviceName}</span>
                </span>
            </div>

            <div className="reminder-date-cell">
                <span className="reminder-date-text">
                    {exec.scheduledAt ? new Date(exec.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </span>
                {badge && (
                    <span className="reminder-future-badge" style={{
                        backgroundColor: badge.bg,
                        color: badge.color
                    }}>
                        {badge.label}
                    </span>
                )}
            </div>

            <div className="reminder-channel-cell">
                {renderChannelBadge(auto.channel)}
            </div>

            <div className="reminder-actions-cell">
                <button
                    className="action-btn-pill send-btn"
                    onClick={() => onExecuteNow(auto.id, `${client.firstName || ""} ${client.lastName || ""}`.trim())}
                    disabled={actionLoading === auto.id}
                    title="Exécuter et envoyer maintenant"
                >
                    <Play size={13} /> Envoyer
                </button>
                <button
                    className="action-btn-pill rdv-btn"
                    onClick={() => navigate("/planning", { state: { clientId: client.id, clientName: `${client.firstName || ""} ${client.lastName || ""}`.trim(), serviceType: serviceName, returnUrl: "/premium" } })}
                    title="Planifier un rendez-vous (RDV)"
                    style={{ display: "inline-flex", alignItems: "center", gap: "5px", borderColor: "rgba(85, 107, 47, 0.4)", color: "var(--foreground)" }}
                >
                    <Calendar size={13} color="#556B2F" /> RDV
                </button>
                <button
                    className="action-btn-pill icon-only-btn"
                    onClick={() => navigate("/messages", { state: { clientId: client.id, clientName: `${client.firstName} ${client.lastName}`, returnUrl: "/premium" } })}
                    title="Voir la conversation"
                >
                    <MessageSquare size={13} />
                </button>
                <button
                    className="action-btn-pill icon-only-btn"
                    onClick={() => onOpenEdit(auto)}
                    title="Modifier"
                >
                    <Edit3 size={13} />
                </button>
            </div>
        </div>
    );
}

export default PremiumPage;
