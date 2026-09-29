import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
    Users, 
    CreditCard, 
    TrendingUp, 
    AlertOctagon, 
    Ban, 
    CheckCircle2, 
    Eye, 
    Edit3, 
    Trash2, 
    Download, 
    FileText, 
    Briefcase, 
    Wrench, 
    Calendar, 
    DollarSign, 
    FileSpreadsheet, 
    ShieldCheck, 
    LogOut,
    ArrowLeft,
    Search,
    Filter,
    Plus,
    X,
    Loader2,
    RefreshCw,
    Phone,
    Mail,
    Building,
    MessageSquare,
    Send,
    Check,
    CheckCheck,
    Sparkles,
    Clock,
    Bell,
    Zap,
    Rocket,
    ChevronRight,
    Settings2
} from "lucide-react";
import "./AdminPage.css";
import { apiFetch } from "../utils/api";
import { handleLogout } from "../utils/auth";
import { getSocket } from "../utils/socket";
import { useNavigate, Link } from "react-router-dom";

export default function AdminPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("vue_globale");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [planFilter, setPlanFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    // Modal States
    const [editingCompany, setEditingCompany] = useState(null);
    const [deletingCompany, setDeletingCompany] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Live Database State
    const [companies, setCompanies] = useState([]);
    const [stats, setStats] = useState({
        totalCompanies: 0,
        totalUsers: 0,
        totalTechnicians: 0,
        totalClients: 0,
        totalDevis: 0,
        totalFactures: 0,
        totalUserTurnover: 0,
        activeSubscriptions: 0,
        trialSubscriptions: 0,
        mrrSaaS: 0,
        totalSaaSRevenue: 0,
        monthlyIncomeData: []
    });

    // Support & Messages Live States
    const [supportConversations, setSupportConversations] = useState([]);
    const [selectedSupportCompanyId, setSelectedSupportCompanyId] = useState(null);
    const [supportMessages, setSupportMessages] = useState([]);
    const [supportLoading, setSupportLoading] = useState(false);
    const [supportSending, setSupportSending] = useState(false);
    const [supportInput, setSupportInput] = useState("");
    const [supportSearchQuery, setSupportSearchQuery] = useState("");
    const [totalSupportUnread, setTotalSupportUnread] = useState(0);
    const adminChatEndRef = useRef(null);

    // Admin Live Activities Feed & Notification Center
    const [adminActivities, setAdminActivities] = useState([]);
    const [unreadActivityCount, setUnreadActivityCount] = useState(0);
    const [activityMenuOpen, setActivityMenuOpen] = useState(false);
    const [activityFilter, setActivityFilter] = useState("all");
    const [activitySearchQuery, setActivitySearchQuery] = useState("");

    // Group activities by date with filtering and search
    const groupedActivities = useMemo(() => {
        const filtered = adminActivities.filter(act => {
            if (act.type === "NEW_SUPPORT_MESSAGE") return false;
            if (activityFilter === "payments" && act.type !== "NEW_PAYMENT") return false;
            if (activityFilter === "companies" && act.type !== "NEW_COMPANY") return false;

            if (activitySearchQuery.trim()) {
                const q = activitySearchQuery.toLowerCase().trim();
                const matchTitle = act.title?.toLowerCase().includes(q);
                const matchDetails = act.details?.toLowerCase().includes(q);
                const matchContent = act.content?.toLowerCase().includes(q);
                const matchCompany = act.companyName?.toLowerCase().includes(q);
                const matchOwner = act.ownerName?.toLowerCase().includes(q) || act.ownerEmail?.toLowerCase().includes(q);
                return matchTitle || matchDetails || matchContent || matchCompany || matchOwner;
            }
            return true;
        });

        const groups = {};
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        filtered.forEach(item => {
            const d = new Date(item.timestamp);
            let groupTitle = "";
            if (d.toDateString() === today.toDateString()) {
                groupTitle = "Aujourd'hui";
            } else if (d.toDateString() === yesterday.toDateString()) {
                groupTitle = "Hier";
            } else {
                let formatted = d.toLocaleDateString("fr-FR", { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
                });
                groupTitle = formatted.charAt(0).toUpperCase() + formatted.slice(1);
            }

            if (!groups[groupTitle]) {
                groups[groupTitle] = [];
            }
            groups[groupTitle].push(item);
        });

        return Object.entries(groups).map(([title, items]) => ({ title, items }));
    }, [adminActivities, activityFilter, activitySearchQuery]);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3500);
    };

    const scrollAdminChatToBottom = (behavior = "smooth") => {
        if (adminChatEndRef.current) {
            adminChatEndRef.current.scrollIntoView({ behavior, block: "nearest" });
        }
    };

    const activeTabRef = useRef(activeTab);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    const selectedSupportCompanyIdRef = useRef(selectedSupportCompanyId);
    useEffect(() => {
        selectedSupportCompanyIdRef.current = selectedSupportCompanyId;
    }, [selectedSupportCompanyId]);

    // Fetch support conversations
    const fetchSupportConversations = async () => {
        try {
            const res = await apiFetch("/v1/support/conversations");
            if (res.success && Array.isArray(res.data)) {
                setSupportConversations(res.data);
                const totalUnread = res.data.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
                setTotalSupportUnread(totalUnread);

                // Auto select first company on wide desktop screens only (never auto-open on mobile)
                if (!selectedSupportCompanyIdRef.current && res.data.length > 0 && typeof window !== "undefined" && window.innerWidth > 992) {
                    const firstCompanyId = res.data[0].companyId;
                    setSelectedSupportCompanyId(firstCompanyId);
                    if (activeTabRef.current === "messages") {
                        fetchSupportMessages(firstCompanyId, true);
                    }
                }
            }
        } catch (err) {
            console.error("Support conversations load error:", err);
        }
    };

    // Fetch conversation messages
    const fetchSupportMessages = async (companyId, shouldMarkRead = true) => {
        if (!companyId) return;
        setSupportLoading(true);
        try {
            const res = await apiFetch(`/v1/support/messages?companyId=${companyId}`);
            if (res.success && res.data?.messages) {
                setSupportMessages(res.data.messages);
                
                if (shouldMarkRead) {
                    // Mark conversation as read in backend
                    await apiFetch("/v1/support/read", {
                        method: "POST",
                        body: JSON.stringify({ companyId })
                    }).catch(() => {});

                    // Update unread count locally and recalculate totalSupportUnread
                    setSupportConversations(prev => {
                        const next = prev.map(c => 
                            c.companyId === companyId ? { ...c, unreadCount: 0 } : c
                        );
                        const newTotal = next.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
                        setTotalSupportUnread(newTotal);
                        return next;
                    });
                }

                setTimeout(() => scrollAdminChatToBottom("auto"), 50);
            }
        } catch (err) {
            console.error("Support messages load error:", err);
        } finally {
            setSupportLoading(false);
        }
    };

    // Send support reply
    const handleSendSupportReply = async (customText = null) => {
        const text = (customText || supportInput).trim();
        if (!text || !selectedSupportCompanyId || supportSending) return;

        const optimisticId = `temp_adm_${Date.now()}`;
        const optimisticMsg = {
            id: optimisticId,
            companyId: selectedSupportCompanyId,
            content: text,
            senderRole: "SUPERADMIN",
            senderName: "Vous (Super Admin)",
            createdAt: new Date().toISOString(),
            readByOwner: false,
            isOptimistic: true
        };

        setSupportMessages(prev => [...prev, optimisticMsg]);
        setSupportInput("");
        setTimeout(() => scrollAdminChatToBottom("smooth"), 30);

        setSupportSending(true);
        try {
            const res = await apiFetch("/v1/support/messages", {
                method: "POST",
                body: JSON.stringify({
                    companyId: selectedSupportCompanyId,
                    content: text
                })
            });

            if (res.success && res.data) {
                setSupportMessages(prev =>
                    prev.map(m => (m.id === optimisticId ? res.data : m))
                );
                setTimeout(() => scrollAdminChatToBottom("smooth"), 60);

                // Update conversation snippet
                setSupportConversations(prev => prev.map(c => {
                    if (c.companyId === selectedSupportCompanyId) {
                        return {
                            ...c,
                            lastMessage: {
                                id: res.data.id,
                                content: res.data.content,
                                senderRole: "SUPERADMIN",
                                senderName: res.data.senderName,
                                createdAt: res.data.createdAt
                            }
                        };
                    }
                    return c;
                }));
            }
        } catch (err) {
            console.error("Support reply error:", err);
            setSupportMessages(prev => prev.filter(m => m.id !== optimisticId));
            setSupportInput(text);
            showToast("Erreur lors de l'envoi du message.");
        } finally {
            setSupportSending(false);
        }
    };


    // Fetch live activities feed
    const fetchAdminActivities = async () => {
        try {
            const res = await apiFetch("/v1/admin/activities");
            if (res.success && Array.isArray(res.data)) {
                // Keep notifications exclusively for business/system events
                setAdminActivities(res.data.filter(a => a.type !== "NEW_SUPPORT_MESSAGE"));
            }
        } catch (err) {
            console.error("Admin activities load error:", err);
        }
    };

    // Fetch real backend data
    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const [statsRes, companiesRes] = await Promise.all([
                apiFetch('/v1/admin/stats').catch(e => {
                    console.warn("Admin stats fetch error:", e.message);
                    return null;
                }),
                apiFetch('/v1/admin/companies').catch(e => {
                    console.warn("Admin companies fetch error:", e.message);
                    return null;
                })
            ]);

            if (statsRes?.data) {
                setStats(statsRes.data);
            }

            if (companiesRes?.data?.companies) {
                setCompanies(companiesRes.data.companies);
            }
        } catch (err) {
            console.error("Admin data loading error:", err);
            showToast("Erreur lors du chargement des données.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
        fetchSupportConversations();
        fetchAdminActivities();

        // Setup real-time WebSockets
        const socket = getSocket();
        if (socket) {
            const handleNewSupportMessage = (msg) => {
                const isCurrentViewing = msg.companyId === selectedSupportCompanyIdRef.current && activeTabRef.current === "messages";

                // If it belongs to currently open conversation, append immediately
                if (msg.companyId === selectedSupportCompanyIdRef.current) {
                    setSupportMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    setTimeout(() => scrollAdminChatToBottom("smooth"), 100);

                    // Mark as read immediately ONLY if currently looking at the chat
                    if (isCurrentViewing && msg.senderRole === "OWNER") {
                        apiFetch("/v1/support/read", {
                            method: "POST",
                            body: JSON.stringify({ companyId: msg.companyId })
                        }).catch(() => {});
                    }
                }

                if (!isCurrentViewing && msg.senderRole === "OWNER") {
                    showToast(`💬 Nouveau message Support de ${msg.senderName}`);
                }

                // Update conversation snippet in left list and unread counts
                setSupportConversations(prev => {
                    const updatedList = prev.map(c => {
                        if (c.companyId === msg.companyId) {
                            const currentUnread = c.unreadCount || 0;
                            return {
                                ...c,
                                lastMessage: {
                                    id: msg.id,
                                    content: msg.content,
                                    senderRole: msg.senderRole,
                                    senderName: msg.senderName,
                                    createdAt: msg.createdAt
                                },
                                unreadCount: isCurrentViewing ? 0 : (msg.senderRole === "OWNER" ? currentUnread + 1 : currentUnread)
                            };
                        }
                        return c;
                    });

                    // Recalculate global unread count
                    const newTotal = updatedList.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
                    setTotalSupportUnread(newTotal);

                    // Sort so active conversation moves to top
                    return updatedList.sort((a, b) => {
                        const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                        const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                        return timeB - timeA;
                    });
                });
            };

            const handleMessagesRead = (data) => {
                if (data?.role === "OWNER") {
                    setSupportMessages(prev => prev.map(m => m.senderRole === "SUPERADMIN" ? { ...m, readByOwner: true } : m));
                }
                if (data?.companyId) {
                    setSupportConversations(prev => {
                        const next = prev.map(c => c.companyId === data.companyId ? { ...c, unreadCount: 0 } : c);
                        const newTotal = next.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
                        setTotalSupportUnread(newTotal);
                        return next;
                    });
                }
            };

            const handleAdminActivity = (act) => {
                if (act.type === "NEW_SUPPORT_MESSAGE") return; // Chat is strictly handled in Messages & Support
                setAdminActivities(prev => [act, ...prev]);
                setUnreadActivityCount(prev => prev + 1);
                showToast(`🔔 ${act.title}: ${act.details || ''}`);
                fetchAdminData();
            };

            socket.on("support:new_message", handleNewSupportMessage);
            socket.on("support:messages_read", handleMessagesRead);
            socket.on("admin:activity", handleAdminActivity);

            return () => {
                socket.off("support:new_message", handleNewSupportMessage);
                socket.off("support:messages_read", handleMessagesRead);
                socket.off("admin:activity", handleAdminActivity);
            };
        }
    }, []);

    // Filter Companies
    const filteredCompanies = useMemo(() => {
        return companies.filter(comp => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = 
                (comp.name || "").toLowerCase().includes(q) || 
                (comp.email || "").toLowerCase().includes(q) ||
                (comp.ownerName || "").toLowerCase().includes(q) ||
                (comp.ownerEmail || "").toLowerCase().includes(q) ||
                (comp.siret || "").includes(q);

            const matchesStatus = statusFilter === "all" || (comp.status || "").toLowerCase() === statusFilter.toLowerCase();
            const matchesPlan = planFilter === "all" || (comp.plan || "").toLowerCase() === planFilter.toLowerCase();

            return matchesSearch && matchesStatus && matchesPlan;
        });
    }, [companies, searchQuery, statusFilter, planFilter]);

    // Computed / Dynamic numbers
    const totalUsers = stats.totalCompanies || companies.length;
    const totalTechnicians = stats.totalTechnicians || companies.reduce((acc, c) => acc + (c.techniciansCount || 0), 0);
    const totalClients = stats.totalClients || companies.reduce((acc, c) => acc + (c.clientsCount || 0), 0);
    const totalDevis = stats.totalDevis || companies.reduce((acc, c) => acc + (c.devisCount || 0), 0);
    const totalFactures = stats.totalFactures || companies.reduce((acc, c) => acc + (c.facturesCount || 0), 0);
    const totalUserTurnover = stats.totalUserTurnover || companies.reduce((acc, c) => acc + (c.userTurnover || 0), 0);
    
    // SaaS Financial Income (GestArt subscriptions)
    const totalSaaSRevenue = stats.totalSaaSRevenue || companies.reduce((acc, c) => acc + (c.paidToSaaS || 0), 0);
    const mrrSaaS = stats.mrrSaaS || companies.filter(c => c.status === "Active").reduce((acc, c) => acc + (c.monthlyPrice || 89), 0);
    const activeSubscriptions = stats.activeSubscriptions || companies.filter(c => c.status === "Active").length;
    const trialSubscriptions = stats.trialSubscriptions || companies.filter(c => c.status === "Trial").length;
    const monthlyIncomeData = stats.monthlyIncomeData || [];

    // Actions
    const handleToggleBlock = async (companyId) => {
        try {
            const res = await apiFetch(`/v1/admin/companies/${companyId}/toggle-status`, {
                method: "POST"
            });
            if (res.success) {
                setCompanies(prev => prev.map(c => {
                    if (c.id === companyId) {
                        return { ...c, status: res.status };
                    }
                    return c;
                }));
                showToast(res.message || "Statut de l'entreprise modifié avec succès");
            }
        } catch (err) {
            showToast("Erreur: " + err.message);
        }
    };

    const handleDeleteCompanyConfirm = async () => {
        if (!deletingCompany) return;
        setActionLoading(true);
        try {
            const res = await apiFetch(`/v1/admin/companies/${deletingCompany.id}`, {
                method: "DELETE"
            });
            if (res.success) {
                setCompanies(prev => prev.filter(c => c.id !== deletingCompany.id));
                setDeletingCompany(null);
                showToast("Entreprise supprimée définitivement");
                fetchAdminData();
            }
        } catch (err) {
            showToast("Erreur lors de la suppression: " + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveCompanyEdit = async (e) => {
        e.preventDefault();
        if (!editingCompany) return;

        setActionLoading(true);
        try {
            const res = await apiFetch(`/v1/admin/companies/${editingCompany.id}`, {
                method: "PUT",
                body: {
                    name: editingCompany.name,
                    phone: editingCompany.phone,
                    email: editingCompany.email,
                    siret: editingCompany.siret,
                    ownerName: editingCompany.ownerName,
                    ownerEmail: editingCompany.ownerEmail,
                    ownerPhone: editingCompany.ownerPhone,
                    plan: editingCompany.plan,
                    status: editingCompany.status
                }
            });

            if (res.success) {
                setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...editingCompany } : c));
                setEditingCompany(null);
                showToast("Modifications enregistrées avec succès");
                fetchAdminData();
            }
        } catch (err) {
            showToast("Erreur lors de l'enregistrement: " + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Export CSV / Excel for URSSAF & CRM database
    const handleExportCSV = () => {
        const headers = [
            "ID Entreprise",
            "Nom Entreprise",
            "SIRET",
            "Nom Propriétaire",
            "Email Propriétaire",
            "Téléphone",
            "Offre Plan",
            "Prix Mensuel (€)",
            "Statut",
            "Techniciens",
            "Clients CRM",
            "Devis",
            "Factures",
            "CA Invoiced Client (€)",
            "Total Encaissé GestArt (€)",
            "Date Inscription"
        ];

        const rows = companies.map(c => [
            `"${c.id}"`,
            `"${(c.name || '').replace(/"/g, '""')}"`,
            `"${c.siret || ''}"`,
            `"${(c.ownerName || '').replace(/"/g, '""')}"`,
            `"${c.ownerEmail || c.email || ''}"`,
            `"${c.ownerPhone || c.phone || ''}"`,
            `"${c.plan || 'PRO'}"`,
            c.monthlyPrice || 89,
            `"${c.status || 'Active'}"`,
            c.techniciansCount || 0,
            c.clientsCount || 0,
            c.devisCount || 0,
            c.facturesCount || 0,
            c.userTurnover || 0,
            c.paidToSaaS || 0,
            `"${c.date || ''}"`
        ]);

        // UTF-8 BOM for Excel
        const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `gestart_crm_entreprises_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Fichier Excel / CSV exporté avec succès !");
    };

    // Export PDF URSSAF Printable Report
    const handleExportPDF_URSSAF = () => {
        const printWindow = window.open("", "_blank");
        const dateStr = new Date().toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <title>Rapport Déclaration URSSAF - GestArt CRM</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #556B2F; padding-bottom: 15px; margin-bottom: 25px; }
                    .logo { font-size: 26px; font-weight: 900; color: #556B2F; letter-spacing: -0.5px; }
                    .title { font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
                    .stat-box { display: flex; flex-direction: column; }
                    .stat-label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                    .stat-val { font-size: 22px; font-weight: 800; color: #556B2F; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                    th { background-color: #f1f5f9; font-weight: 700; color: #334155; }
                    .total-row { font-weight: 800; font-size: 14px; background-color: #f8fafc; }
                    .footer-note { margin-top: 35px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="logo">GestArt</div>
                        <div style="font-size: 12px; color: #64748b;">Administrateur : Khalid Sainaro</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="title">Rapport URSSAF - Chiffre d'Affaires SaaS</div>
                        <div style="font-size: 12px; color: #64748b;">Généré le ${dateStr}</div>
                    </div>
                </div>

                <div class="summary-grid">
                    <div class="stat-box">
                        <span class="stat-label">Chiffre d'Affaires Brut Encaissé</span>
                        <span class="stat-val">${totalSaaSRevenue.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Entreprises Clientes Actives</span>
                        <span class="stat-val">${activeSubscriptions} abonnés</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Cotisations URSSAF est. (21.1%)</span>
                        <span class="stat-val">${Math.round(totalSaaSRevenue * 0.211).toLocaleString('fr-FR')} €</span>
                    </div>
                </div>

                <h3 style="font-size: 14px; text-transform: uppercase; margin-top: 20px; color: #334155;">Détail des entreprises et règlements SaaS</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Entreprise / Propriétaire</th>
                            <th>Email</th>
                            <th>Offre & Tarif</th>
                            <th>Date Inscription</th>
                            <th>Encaissé (€ HT)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${companies.map((c, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><strong>${c.name}</strong> (${c.ownerName})</td>
                                <td>${c.ownerEmail || c.email}</td>
                                <td>${c.plan} (${c.monthlyPrice}€/mois)</td>
                                <td>${c.date}</td>
                                <td><strong>${c.paidToSaaS} €</strong></td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="5" style="text-align: right;">TOTAL ENCAISSÉ SAAS :</td>
                            <td>${totalSaaSRevenue.toLocaleString('fr-FR')} € HT</td>
                        </tr>
                    </tbody>
                </table>

                <div class="footer-note">
                    Document officiel généré depuis le Super Admin Panel GestArt CRM pour déclaration URSSAF Micro-entreprise / BNC.
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        showToast("Génération du rapport PDF en cours...");
    };

    return (
        <div className="super-admin-page">
            {/* Top Notification Toast */}
            {toastMessage && (
                <div className="admin-toast-banner">
                    <CheckCircle2 size={16} />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Top Navigation Bar */}
            <div className="admin-topbar">
                <div className="left">
                    <Link to="/home" className="admin-back-btn" title="Retour à l'application CRM">
                        <ArrowLeft size={16} />
                        <span className="hide-on-mobile">CRM App</span>
                    </Link>
                    <div className="brand-badge-group">
                        <img src="/Logo-transparent.png" alt="GestArt" className="admin-logo-img" />
                        <span className="admin-logo">GestArt</span>
                        <span className="admin-tag">SUPER ADMIN</span>
                    </div>
                </div>

                <div className="right">
                    {/* Live Activities & Notifications Bell */}
                    <button 
                        className={`admin-refresh-btn ${activeTab === "activites" ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab("activites");
                            setUnreadActivityCount(0);
                        }}
                        title="Centre de notifications & activités"
                        style={{ position: 'relative' }}
                    >
                        <Bell size={16} />
                        {unreadActivityCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                backgroundColor: '#ef4444',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 800,
                                minWidth: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 3px',
                                boxShadow: '0 0 6px #ef4444'
                            }}>
                                {unreadActivityCount}
                            </span>
                        )}
                    </button>

                    <button className="admin-refresh-btn" onClick={fetchAdminData} title="Actualiser les données" disabled={loading}>
                        <RefreshCw size={15} className={loading ? "spin" : ""} />
                    </button>
                    <div className="admin-user-pill">
                        <div className="admin-avatar">KS</div>
                        <div className="admin-user-text hide-on-mobile">
                            <span className="admin-name">Khalid Sainaro</span>
                            <span className="admin-role">Super Admin</span>
                        </div>
                    </div>
                    <button className="admin-logout-btn" onClick={() => setShowLogoutConfirm(true)} title="Déconnexion">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {/* Sub-Header Navigation Tabs */}
            <div className="admin-tabs-bar">
                <div className="tabs-container">
                    <button 
                        className={`tab-btn ${activeTab === "vue_globale" ? "active" : ""}`}
                        onClick={() => setActiveTab("vue_globale")}
                    >
                        <TrendingUp size={15} /> <span>Vue Globale & Stats</span>
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "entreprises" ? "active" : ""}`}
                        onClick={() => setActiveTab("entreprises")}
                    >
                        <Briefcase size={15} /> <span>Entreprises ({companies.length})</span>
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "revenus" ? "active" : ""}`}
                        onClick={() => setActiveTab("revenus")}
                    >
                        <DollarSign size={15} /> <span>Revenus & URSSAF</span>
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "messages" ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab("messages");
                            if (typeof window !== "undefined" && window.innerWidth <= 992) {
                                setSelectedSupportCompanyId(null);
                            } else if (selectedSupportCompanyId) {
                                fetchSupportMessages(selectedSupportCompanyId, true);
                            }
                            fetchSupportConversations();
                        }}
                    >
                        <MessageSquare size={15} /> 
                        <span>Messages & Support</span>
                        {totalSupportUnread > 0 && (
                            <span className="tab-badge">{totalSupportUnread}</span>
                        )}
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "activites" ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab("activites");
                            setUnreadActivityCount(0);
                        }}
                    >
                        <Bell size={15} /> 
                        <span>Notifications & Activités</span>
                        {unreadActivityCount > 0 && (
                            <span className="tab-badge">{unreadActivityCount}</span>
                        )}
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "exports" ? "active" : ""}`}
                        onClick={() => setActiveTab("exports")}
                    >
                        <Download size={15} /> <span>Exports PDF / Excel</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="admin-content">
                {loading && companies.length === 0 ? (
                    <div className="admin-loading-box">
                        <Loader2 size={32} className="spin text-primary" />
                        <p>Chargement des données en temps réel...</p>
                    </div>
                ) : (
                    <>
                        {/* TAB 1: VUE GLOBALE & STATS */}
                        {activeTab === "vue_globale" && (
                            <div className="tab-section-stack">
                                {/* Global KPI Cards (Shown on Vue Globale tab only) */}
                                <div className="admin-kpi-grid">
                                    <div className="kpi-card">
                                        <div className="kpi-icon-badge blue"><Users size={20} /></div>
                                        <div className="kpi-info">
                                            <span className="kpi-title">Entreprises & Users</span>
                                            <span className="kpi-number">{totalUsers}</span>
                                            <span className="kpi-sub">{totalTechnicians} techniciens connectés</span>
                                        </div>
                                    </div>

                                    <div className="kpi-card">
                                        <div className="kpi-icon-badge green"><DollarSign size={20} /></div>
                                        <div className="kpi-info">
                                            <span className="kpi-title">MRR SaaS (Mensuel)</span>
                                            <span className="kpi-number">{mrrSaaS.toLocaleString('fr-FR')} €</span>
                                            <span className="kpi-sub">{activeSubscriptions} abonnements payants</span>
                                        </div>
                                    </div>

                                    <div className="kpi-card">
                                        <div className="kpi-icon-badge amber"><TrendingUp size={20} /></div>
                                        <div className="kpi-info">
                                            <span className="kpi-title">Essais Gratuits (Trials)</span>
                                            <span className="kpi-number">{trialSubscriptions}</span>
                                            <span className="kpi-sub">Entreprises en période d'essai</span>
                                        </div>
                                    </div>

                                    <div className="kpi-card">
                                        <div className="kpi-icon-badge purple"><FileText size={20} /></div>
                                        <div className="kpi-info">
                                            <span className="kpi-title">Volume Total CRM</span>
                                            <span className="kpi-number">{totalClients} clients</span>
                                            <span className="kpi-sub">{totalDevis} devis · {totalFactures} factures</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-split-layout">
                                    {/* Monthly SaaS Revenue Chart */}
                                    <div className="admin-card">
                                        <div className="card-header-row">
                                            <h3>Revenus SaaS Mensuels (€)</h3>
                                            <span className="card-badge">Total SaaS: {totalSaaSRevenue.toLocaleString('fr-FR')} €</span>
                                        </div>
                                        <div className="bar-chart-wrapper">
                                            {monthlyIncomeData.length > 0 ? (
                                                monthlyIncomeData.map((d, i) => {
                                                    const maxVal = Math.max(...monthlyIncomeData.map(m => m.total), 500);
                                                    const h = Math.max(16, Math.round((d.total / maxVal) * 130));
                                                    return (
                                                        <div key={i} className="bar-col">
                                                            <span className="bar-val">{d.total}€</span>
                                                            <div className="bar-fill" style={{ height: `${h}px` }} />
                                                            <span className="bar-label">{d.month.split(' ')[0].slice(0, 4)}</span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-chart-note">Aucun historique de paiement pour le moment</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Summary Metrics */}
                                    <div className="admin-card">
                                        <h3>Activité Générale sur la Plateforme</h3>
                                        <div className="activity-summary-list">
                                            <div className="summary-row">
                                                <span>Chiffre d'Affaires total des clients CRM</span>
                                                <strong>{totalUserTurnover.toLocaleString('fr-FR')} €</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>Nombre total de devis créés</span>
                                                <strong>{totalDevis} devis</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>Nombre total de factures émises</span>
                                                <strong>{totalFactures} factures</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>Techniciens actifs sur le terrain</span>
                                                <strong>{totalTechnicians} techniciens</strong>
                                            </div>
                                            <div className="summary-row">
                                                <span>Cotisations URSSAF estimées (21.1%)</span>
                                                <strong style={{ color: '#556B2F' }}>{Math.round(totalSaaSRevenue * 0.211).toLocaleString('fr-FR')} €</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: ENTREPRISES & UTILISATEURS */}
                        {activeTab === "entreprises" && (
                            <div className="tab-section-stack">
                                {/* Search and Filters Card */}
                                <div className="admin-card filter-card">
                                    <div className="filter-controls-row">
                                        <div className="search-input-wrapper">
                                            <Search size={16} className="search-icon" />
                                            <input 
                                                type="text" 
                                                placeholder="Rechercher entreprise, SIRET, nom ou email..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="search-input"
                                            />
                                        </div>

                                        <div className="filter-select-group">
                                            <select 
                                                value={statusFilter} 
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="all">Tous les statuts</option>
                                                <option value="active">Actif</option>
                                                <option value="trial">En essai (Trial)</option>
                                                <option value="expired">Expiré</option>
                                                <option value="blocked">Bloqué</option>
                                            </select>

                                            <select 
                                                value={planFilter} 
                                                onChange={(e) => setPlanFilter(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="all">Tous les plans</option>
                                                <option value="pro">PRO (89€)</option>
                                                <option value="starter">STARTER (39€)</option>
                                                <option value="unlimited">UNLIMITED (149€)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Companies Table (Desktop) & Cards (Mobile) */}
                                <div className="admin-card">
                                    <div className="card-header-row">
                                        <h3>Gestion des Entreprises ({filteredCompanies.length})</h3>
                                    </div>

                                    {filteredCompanies.length === 0 ? (
                                        <div className="empty-state-card">
                                            <Building size={36} />
                                            <p>Aucune entreprise ne correspond à votre recherche.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="table-responsive desktop-only">
                                                <table className="admin-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Entreprise / Proprio</th>
                                                            <th>Plan / Tarif</th>
                                                            <th>Techniciens</th>
                                                            <th>Clients / Devis</th>
                                                            <th>CA Client</th>
                                                            <th>Encaissé SaaS</th>
                                                            <th>Statut</th>
                                                            <th className="text-right">Actions Super Admin</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredCompanies.map((c) => (
                                                            <tr key={c.id}>
                                                                <td>
                                                                    <div className="user-cell">
                                                                        <span className="user-cell-name">{c.name}</span>
                                                                        <span className="user-cell-sub">{c.ownerName} · {c.ownerEmail || c.email}</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className={`plan-pill ${(c.plan || '').toLowerCase()}`}>
                                                                        {c.plan} ({c.monthlyPrice}€/m)
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span className="tech-badge"><Wrench size={12} /> {c.techniciansCount} tech.</span>
                                                                </td>
                                                                <td>
                                                                    <span className="data-counts">{c.clientsCount} clients · {c.facturesCount} fact.</span>
                                                                </td>
                                                                <td><strong>{c.userTurnover.toLocaleString('fr-FR')} €</strong></td>
                                                                <td><span className="saas-paid">{c.paidToSaaS} €</span></td>
                                                                <td>
                                                                    <span className={`status-pill ${(c.status || '').toLowerCase()}`}>
                                                                        {c.status === "Trial" 
                                                                            ? `Trial (${c.trialDaysLeft}j)` 
                                                                            : (c.status === "Expired" ? "Expiré" : (c.status === "Active" ? "Actif" : "Bloqué"))}
                                                                    </span>
                                                                </td>
                                                                <td className="text-right">
                                                                    <div className="actions-cell">
                                                                        <button 
                                                                            className="action-icon-btn edit" 
                                                                            title="Modifier entreprise / plan"
                                                                            onClick={() => setEditingCompany({ ...c })}
                                                                        >
                                                                            <Edit3 size={15} />
                                                                        </button>
                                                                        <button 
                                                                            className={`action-icon-btn ${c.status === "Blocked" ? "unblock" : "block"}`} 
                                                                            title={c.status === "Blocked" ? "Débloquer l'entreprise" : "Bloquer l'accès"}
                                                                            onClick={() => handleToggleBlock(c.id)}
                                                                        >
                                                                            <Ban size={15} />
                                                                        </button>
                                                                        <button 
                                                                            className="action-icon-btn delete" 
                                                                            title="Supprimer définitivement"
                                                                            onClick={() => setDeletingCompany(c)}
                                                                        >
                                                                            <Trash2 size={15} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile Card List View */}
                                            <div className="mobile-only-cards">
                                                {filteredCompanies.map((c) => (
                                                    <div key={c.id} className="mobile-admin-company-card">
                                                        <div className="m-card-header">
                                                            <div className="m-card-title-box">
                                                                <h4>{c.name}</h4>
                                                                <div className="m-sub">
                                                                    {c.ownerName && <span className="m-owner-name">{c.ownerName}</span>}
                                                                    {c.ownerName && (c.ownerEmail || c.email) && <span className="m-sub-sep"> · </span>}
                                                                    {(c.ownerEmail || c.email) && <span className="m-email">{c.ownerEmail || c.email}</span>}
                                                                </div>
                                                            </div>
                                                            <span className={`plan-pill ${(c.plan || '').toLowerCase()}`}>{c.plan}</span>
                                                        </div>

                                                        <div className="m-card-body">
                                                            <div className="m-stat-row">
                                                                <span>Statut:</span>
                                                                <span className={`status-pill ${(c.status || '').toLowerCase()}`}>
                                                                    {c.status === "Trial" 
                                                                        ? `Trial (${c.trialDaysLeft}j)` 
                                                                        : (c.status === "Expired" ? "Expiré" : (c.status === "Active" ? "Actif" : "Bloqué"))}
                                                                </span>
                                                            </div>
                                                            <div className="m-stat-row">
                                                                <span>Techniciens:</span>
                                                                <strong>{c.techniciansCount} tech</strong>
                                                            </div>
                                                            <div className="m-stat-row">
                                                                <span>Clients / Factures:</span>
                                                                <strong>{c.clientsCount} clients · {c.facturesCount} fact.</strong>
                                                            </div>
                                                            <div className="m-stat-row">
                                                                <span>Chiffre d'Affaires CRM:</span>
                                                                <strong>{c.userTurnover.toLocaleString('fr-FR')} €</strong>
                                                            </div>
                                                            <div className="m-stat-row">
                                                                <span>Payé à GestArt:</span>
                                                                <strong style={{ color: '#556B2F' }}>{c.paidToSaaS} €</strong>
                                                            </div>
                                                        </div>

                                                        <div className="m-card-footer">
                                                            <button className="m-action-btn edit" onClick={() => setEditingCompany({ ...c })}>
                                                                <Edit3 size={14} /> Modifier
                                                            </button>
                                                            <button className={`m-action-btn ${c.status === "Blocked" ? "unblock" : "block"}`} onClick={() => handleToggleBlock(c.id)}>
                                                                <Ban size={14} /> {c.status === "Blocked" ? "Débloquer" : "Bloquer"}
                                                            </button>
                                                            <button className="m-action-btn delete" onClick={() => setDeletingCompany(c)}>
                                                                <Trash2 size={14} /> Supprimer
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: REVENUS & URSSAF */}
                        {activeTab === "revenus" && (
                            <div className="tab-section-stack">
                                <div className="admin-split-layout">
                                    {/* Monthly SaaS Payments */}
                                    <div className="admin-card">
                                        <h3>Encaissements Mensuels SaaS</h3>
                                        <div className="table-responsive desktop-only">
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>Mois</th>
                                                        <th>Clients Payants</th>
                                                        <th>Encaissé Brut</th>
                                                        <th>Cotisation URSSAF Est.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {monthlyIncomeData.map((m, idx) => (
                                                        <tr key={idx}>
                                                            <td><strong>{m.month}</strong></td>
                                                            <td>{m.paidUsers} abonnés</td>
                                                            <td><strong style={{ color: '#556B2F' }}>{m.total.toLocaleString('fr-FR')} €</strong></td>
                                                            <td>{Math.round(m.total * 0.211).toLocaleString('fr-FR')} €</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Monthly Revenue Cards */}
                                        <div className="mobile-only-cards monthly-revenue-mobile-list">
                                            {monthlyIncomeData.map((m, idx) => (
                                                <div key={idx} className="monthly-revenue-card">
                                                    <div className="m-rev-header">
                                                        <span className="m-rev-month">{m.month}</span>
                                                        <span className="m-rev-badge">{m.paidUsers} {m.paidUsers > 1 ? 'abonnés' : 'abonné'}</span>
                                                    </div>
                                                    <div className="m-rev-body">
                                                        <div className="m-rev-row">
                                                            <span>Encaissé Brut :</span>
                                                            <strong style={{ color: '#556B2F' }}>{m.total.toLocaleString('fr-FR')} €</strong>
                                                        </div>
                                                        <div className="m-rev-row">
                                                            <span>Cotisation URSSAF (21.1%) :</span>
                                                            <span>{Math.round(m.total * 0.211).toLocaleString('fr-FR')} €</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* URSSAF Calculator Panel */}
                                    <div className="admin-card urssaf-box">
                                        <h3>Déclaration URSSAF (Micro-Entreprise BNC / Prestations)</h3>
                                        <p className="urssaf-desc">
                                            Calculateur automatique de votre Chiffre d'Affaires Brut encaissé pour vos déclarations mensuelles ou trimestrielles URSSAF.
                                        </p>
                                        
                                        <div className="urssaf-metrics-card">
                                            <div className="urssaf-metric">
                                                <span className="u-label">Chiffre d'Affaires Total (Brut)</span>
                                                <span className="u-val">{totalSaaSRevenue.toLocaleString('fr-FR')} € HT</span>
                                            </div>
                                            <div className="urssaf-metric highlight">
                                                <span className="u-label">Cotisations URSSAF à payer (21.1%)</span>
                                                <span className="u-val">{Math.round(totalSaaSRevenue * 0.211).toLocaleString('fr-FR')} €</span>
                                            </div>
                                            <div className="urssaf-metric">
                                                <span className="u-label">Revenu Net après URSSAF</span>
                                                <span className="u-val">{Math.round(totalSaaSRevenue * (1 - 0.211)).toLocaleString('fr-FR')} €</span>
                                            </div>
                                        </div>

                                        <div className="urssaf-actions-row">
                                            <button className="urssaf-btn pdf" onClick={handleExportPDF_URSSAF}>
                                                <FileText size={16} /> Générer Attestation PDF URSSAF
                                            </button>
                                            <button className="urssaf-btn excel" onClick={handleExportCSV}>
                                                <FileSpreadsheet size={16} /> Exporter Tableau Excel (.CSV)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: EXPORTS */}
                        {activeTab === "exports" && (
                            <div className="tab-section-stack">
                                <div className="admin-card">
                                    <h3>Centre d'Exportation des Données Super Admin</h3>
                                    <p className="card-desc">
                                        Téléchargez facilement l'historique complet de votre chiffre d'affaires, abonnements et cotisations fiscales.
                                    </p>

                                    <div className="export-cards-grid">
                                        <div className="export-action-card">
                                            <div className="export-icon-box pdf">
                                                <FileText size={32} />
                                            </div>
                                            <h4>Rapport Officiel URSSAF (PDF)</h4>
                                            <p>Attestation imprimable avec calcul des cotisations 21.1% et synthèse des abonnés.</p>
                                            <button className="export-btn" onClick={handleExportPDF_URSSAF}>
                                                <Download size={16} /> Télécharger PDF
                                            </button>
                                        </div>

                                        <div className="export-action-card">
                                            <div className="export-icon-box excel">
                                                <FileSpreadsheet size={32} />
                                            </div>
                                            <h4>Exportation Excel / CSV Complexe</h4>
                                            <p>Fichier CSV contenant la liste intégrale des entreprises, leurs plans, leurs techniciens et leurs paiements.</p>
                                            <button className="export-btn excel" onClick={handleExportCSV}>
                                                <Download size={16} /> Télécharger CSV / Excel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: MESSAGES & SUPPORT DIRECT */}
                        {activeTab === "messages" && (
                            <div className={`admin-messages-layout ${selectedSupportCompanyId ? "has-selected" : ""}`}>
                                {/* Left: Conversations List */}
                                <div className="admin-convos-panel">
                                    <div className="admin-convos-header">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                                                Discussions Entreprises
                                            </h4>
                                            <button 
                                                className="admin-refresh-btn" 
                                                style={{ width: '28px', height: '28px' }}
                                                onClick={fetchSupportConversations}
                                                title="Actualiser les messages"
                                            >
                                                <RefreshCw size={12} />
                                            </button>
                                        </div>
                                        <div className="admin-convos-search">
                                            <Search size={15} style={{ position: 'absolute', left: '10px', color: 'var(--muted-foreground)' }} />
                                            <input 
                                                type="text" 
                                                placeholder="Rechercher une entreprise..."
                                                value={supportSearchQuery}
                                                onChange={(e) => setSupportSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="admin-convos-list">
                                        {supportConversations.filter(c => {
                                            const q = supportSearchQuery.toLowerCase();
                                            return !q || c.companyName.toLowerCase().includes(q) || (c.owner?.name || "").toLowerCase().includes(q);
                                        }).length === 0 ? (
                                            <div style={{ padding: '30px 15px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                                                Aucune conversation trouvée.
                                            </div>
                                        ) : (
                                            supportConversations.filter(c => {
                                                const q = supportSearchQuery.toLowerCase();
                                                return !q || c.companyName.toLowerCase().includes(q) || (c.owner?.name || "").toLowerCase().includes(q);
                                            }).map((convo) => {
                                                const isSelected = convo.companyId === selectedSupportCompanyId;
                                                return (
                                                    <div 
                                                        key={convo.companyId}
                                                        className={`admin-convo-item ${isSelected ? "active" : ""}`}
                                                        onClick={() => {
                                                            setSelectedSupportCompanyId(convo.companyId);
                                                            fetchSupportMessages(convo.companyId);
                                                        }}
                                                    >
                                                        <div className="admin-convo-avatar">
                                                            {(convo.companyName || "E").slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="admin-convo-details">
                                                            <div className="admin-convo-top">
                                                                <span className="admin-convo-name">{convo.companyName}</span>
                                                                {convo.lastMessage && (
                                                                    <span className="admin-convo-time">
                                                                        {new Date(convo.lastMessage.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="admin-convo-owner">
                                                                👤 {convo.owner?.name || "Dirigeant"} • <span style={{ color: '#556B2F', fontWeight: 700 }}>{convo.plan}</span>
                                                            </div>
                                                            <div className="admin-convo-bottom">
                                                                <span className="admin-convo-lastmsg">
                                                                    {convo.lastMessage ? (
                                                                        convo.lastMessage.senderRole === "SUPERADMIN" ? `Vous: ${convo.lastMessage.content}` : convo.lastMessage.content
                                                                    ) : (
                                                                        "Pas encore d'échange"
                                                                    )}
                                                                </span>
                                                                {convo.unreadCount > 0 && (
                                                                    <span className="admin-unread-badge">{convo.unreadCount}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Right: Active Chat Pane */}
                                <div className="admin-chat-pane">
                                    {(() => {
                                        const activeConvo = supportConversations.find(c => c.companyId === selectedSupportCompanyId);
                                        if (!activeConvo) {
                                            return (
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', flexDirection: 'column', gap: '10px' }}>
                                                    <MessageSquare size={40} style={{ opacity: 0.3 }} />
                                                    <span>Sélectionnez une entreprise à gauche pour démarrer le chat.</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <>
                                                {/* Chat Header */}
                                                <div className="admin-chat-header">
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <button 
                                                                type="button"
                                                                className="admin-back-convo-btn show-on-mobile-flex"
                                                                onClick={() => setSelectedSupportCompanyId(null)}
                                                                title="Retour aux discussions"
                                                            >
                                                                <ArrowLeft size={16} />
                                                            </button>
                                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                                                                        {activeConvo.companyName}
                                                                    </h3>
                                                                    <span className="admin-tag">{activeConvo.plan}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--muted-foreground)', marginTop: '2px', flexWrap: 'wrap' }}>
                                                                    <span>👤 {activeConvo.owner?.name || "Dirigeant"}</span>
                                                                    {activeConvo.owner?.email && <span>· {activeConvo.owner?.email}</span>}
                                                                    {activeConvo.owner?.phone && <span>· 📞 {activeConvo.owner?.phone}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                        <button 
                                                            className="admin-refresh-btn" 
                                                            onClick={() => fetchSupportMessages(activeConvo.companyId)}
                                                            title="Actualiser la conversation"
                                                        >
                                                            <RefreshCw size={14} className={supportLoading ? "spin" : ""} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Messages Stream */}
                                                <div className="admin-chat-messages">
                                                    {supportLoading && supportMessages.length === 0 ? (
                                                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted-foreground)' }}>
                                                            <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                                                            Chargement de l'historique...
                                                        </div>
                                                    ) : supportMessages.length === 0 ? (
                                                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted-foreground)' }}>
                                                            <MessageSquare size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                                                            Aucun message échangé avec cette entreprise. Envoyez le premier message !
                                                        </div>
                                                    ) : (
                                                        supportMessages.map((msg, idx) => {
                                                            const isMe = msg.senderRole === "SUPERADMIN";
                                                            return (
                                                                <div 
                                                                    key={msg.id || idx}
                                                                    className={isMe ? "admin-bubble-outgoing" : "admin-bubble-incoming"}
                                                                    style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: isMe ? 'flex-end' : 'flex-start',
                                                                        maxWidth: '80%',
                                                                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                                        gap: '3px'
                                                                    }}
                                                                >
                                                                    <span style={{ fontSize: '0.72rem', color: isMe ? '#556B2F' : 'var(--muted-foreground)', fontWeight: 700 }}>
                                                                        {isMe ? "Vous (Super Admin)" : msg.senderName}
                                                                    </span>
                                                                    <div style={{
                                                                        padding: '10px 15px',
                                                                        borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                                                        backgroundColor: isMe ? '#556B2F' : 'var(--card)',
                                                                        color: isMe ? '#ffffff' : 'var(--foreground)',
                                                                        border: isMe ? 'none' : '1px solid var(--border)',
                                                                        fontSize: '0.88rem',
                                                                        lineHeight: '1.45',
                                                                        wordBreak: 'break-word',
                                                                        whiteSpace: 'pre-wrap'
                                                                    }}>
                                                                        {msg.content}
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                                                                        <span>{new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                        {isMe && (
                                                                            <span>
                                                                                {msg.readByOwner ? (
                                                                                    <CheckCheck size={13} style={{ color: '#22c55e' }} title="Lu par le dirigeant" />
                                                                                ) : (
                                                                                    <Check size={13} style={{ color: 'var(--muted-foreground)' }} title="Distribué" />
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                    <div ref={adminChatEndRef} />
                                                </div>

                                                {/* Quick Response Templates with Lucide Icons */}
                                                <div 
                                                    className="admin-chat-prompts"
                                                    onWheel={(e) => {
                                                        if (e.deltaY !== 0) {
                                                            e.currentTarget.scrollLeft += e.deltaY;
                                                        }
                                                    }}
                                                >
                                                    {[
                                                        { id: "bonjour", label: "Bonjour ! Comment puis-je vous aider ?", icon: MessageSquare, color: "var(--sidebar-primary, #556B2F)" },
                                                        { id: "prise_en_compte", label: "Votre demande a bien été prise en compte.", icon: CheckCircle2, color: "#22c55e" },
                                                        { id: "verif", label: "Je viens de vérifier la configuration de votre compte.", icon: Settings2, color: "#3b82f6" },
                                                        { id: "tel", label: "Je vous contacte directement par téléphone.", icon: Phone, color: "#eab308" },
                                                        { id: "update", label: "Tout est bien à jour et opérationnel.", icon: Sparkles, color: "#a855f7" }
                                                    ].map((preset) => {
                                                        const PresetIcon = preset.icon;
                                                        return (
                                                            <button 
                                                                key={preset.id} 
                                                                type="button" 
                                                                className="admin-prompt-chip"
                                                                onClick={() => handleSendSupportReply(preset.label)}
                                                                disabled={supportSending}
                                                            >
                                                                <PresetIcon size={13} style={{ color: preset.color, flexShrink: 0 }} />
                                                                <span>{preset.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Input Bar */}
                                                <div className="admin-chat-inputbar">
                                                    <textarea 
                                                        placeholder={`Répondre à ${activeConvo.owner?.name || activeConvo.companyName}... (Entrée pour envoyer)`}
                                                        value={supportInput}
                                                        onChange={(e) => setSupportInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleSendSupportReply();
                                                            }
                                                        }}
                                                        rows={1}
                                                    />
                                                    <button 
                                                        type="button" 
                                                        className="admin-send-btn"
                                                        onClick={() => handleSendSupportReply()}
                                                        disabled={!supportInput.trim() || supportSending}
                                                    >
                                                        <Send size={15} className={supportSending ? "spin" : ""} />
                                                        <span>Envoyer</span>
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* TAB 6: NOTIFICATIONS & ACTIVITÉS (FULL PAGE VIEW) */}
                        {activeTab === "activites" && (
                            <div className="admin-activities-fullpage-container">
                                {/* Header Card */}
                                <div className="admin-card" style={{ marginBottom: '16px' }}>
                                    <div className="activity-page-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div className="activity-header-badge">
                                                <Zap size={22} style={{ color: '#fff' }} />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                                                        Centre de Notifications & Activités
                                                    </h3>
                                                    {unreadActivityCount > 0 && (
                                                        <span className="tab-badge" style={{ margin: 0 }}>
                                                            {unreadActivityCount} nouveau{unreadActivityCount > 1 ? 'x' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--muted-foreground)' }}>
                                                    Flux chronologique en direct des messages support, paiements d'abonnements SaaS et inscriptions d'entreprises.
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                className="activity-action-btn"
                                                onClick={() => {
                                                    setUnreadActivityCount(0);
                                                    showToast("Toutes les activités ont été marquées comme vues.");
                                                }}
                                            >
                                                <CheckCheck size={14} />
                                                <span>Tout marquer comme vu</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="activity-action-btn"
                                                onClick={() => {
                                                    fetchAdminData();
                                                    showToast("Flux d'activités actualisé.");
                                                }}
                                                title="Actualiser les activités"
                                            >
                                                <RefreshCw size={14} className={loading ? "spin" : ""} />
                                                <span>Actualiser</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Toolbar & Filters */}
                                    <div className="activity-page-toolbar">
                                        <div className="activity-search-box">
                                            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--muted-foreground)' }} />
                                            <input 
                                                type="text"
                                                placeholder="Rechercher par entreprise, dirigeant, message, montant..."
                                                value={activitySearchQuery}
                                                onChange={(e) => setActivitySearchQuery(e.target.value)}
                                            />
                                            {activitySearchQuery && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setActivitySearchQuery("")}
                                                    style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                                                >
                                                    Effacer
                                                </button>
                                            )}
                                        </div>

                                        <div className="activity-filters-row">
                                            {[
                                                { id: "all", label: "Toutes les activités", icon: Zap, count: adminActivities.length },
                                                { id: "payments", label: "Paiements SaaS", icon: CreditCard, count: adminActivities.filter(a => a.type === "NEW_PAYMENT").length },
                                                { id: "companies", label: "Inscriptions Entreprises", icon: Rocket, count: adminActivities.filter(a => a.type === "NEW_COMPANY").length }
                                            ].map(f => {
                                                const FilterIcon = f.icon;
                                                return (
                                                    <button
                                                        key={f.id}
                                                        type="button"
                                                        className={`activity-filter-chip ${activityFilter === f.id ? "active" : ""}`}
                                                        onClick={() => setActivityFilter(f.id)}
                                                    >
                                                        <FilterIcon size={14} />
                                                        <span>{f.label}</span>
                                                        <span className="chip-count">{f.count}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Chronological Feed */}
                                <div className="activity-page-feed">
                                    {groupedActivities.length === 0 ? (
                                        <div className="admin-card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                            <Bell size={42} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--foreground)' }}>
                                                Aucune notification correspondante
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem' }}>
                                                {activitySearchQuery ? "Modifiez vos critères de recherche ou filtre." : "Les activités de la plateforme apparaîtront ici en temps réel."}
                                            </p>
                                        </div>
                                    ) : (
                                        groupedActivities.map(group => (
                                            <div key={group.title} className="activity-date-group">
                                                <div className="activity-date-header">
                                                    <Calendar size={14} style={{ color: 'var(--sidebar-primary, #556B2F)' }} />
                                                    <span>{group.title}</span>
                                                    <span className="date-group-badge">{group.items.length}</span>
                                                </div>

                                                <div className="activity-items-grid">
                                                    {group.items.map(act => {
                                                        const isSupport = act.type === "NEW_SUPPORT_MESSAGE";
                                                        const isPayment = act.type === "NEW_PAYMENT";
                                                        const isCompany = act.type === "NEW_COMPANY";

                                                        return (
                                                            <div key={act.id} className={`activity-card ${act.type.toLowerCase()}`}>
                                                                <div className="activity-card-left">
                                                                    <div className={`activity-card-icon ${isCompany ? 'company' : isPayment ? 'payment' : 'support'}`}>
                                                                        {isCompany ? <Rocket size={18} /> : isPayment ? <CreditCard size={18} /> : <MessageSquare size={18} />}
                                                                    </div>
                                                                </div>

                                                                <div className="activity-card-content">
                                                                    <div className="activity-card-top">
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                            <span className={`activity-type-pill ${isCompany ? 'company' : isPayment ? 'payment' : 'support'}`}>
                                                                                {isCompany ? 'INSCRIPTION' : isPayment ? 'PAIEMENT' : 'SUPPORT DIRECT'}
                                                                            </span>
                                                                            <h4 className="activity-card-title">{act.title}</h4>
                                                                        </div>
                                                                        <span className="activity-card-time">
                                                                            {new Date(act.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>

                                                                    <div className="activity-card-details">
                                                                        <strong>{act.companyName || act.details}</strong>
                                                                        {act.ownerName && <span style={{ color: 'var(--muted-foreground)' }}> • {act.ownerName}</span>}
                                                                        {act.plan && (
                                                                            <span className="activity-plan-badge">
                                                                                {act.plan}
                                                                            </span>
                                                                        )}
                                                                        {act.amount && (
                                                                            <span className="activity-amount-badge">
                                                                                +{act.amount} €
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {act.content && (
                                                                        <div className="activity-message-bubble">
                                                                            « {act.content} »
                                                                        </div>
                                                                    )}

                                                                    <div className="activity-card-actions">
                                                                        {isSupport && act.companyId && (
                                                                            <button 
                                                                                type="button" 
                                                                                className="activity-cta-btn support"
                                                                                onClick={() => {
                                                                                    setActiveTab("messages");
                                                                                    setSelectedSupportCompanyId(act.companyId);
                                                                                    fetchSupportMessages(act.companyId);
                                                                                }}
                                                                            >
                                                                                <MessageSquare size={13} />
                                                                                <span>Ouvrir la discussion en direct</span>
                                                                            </button>
                                                                        )}

                                                                        {isCompany && act.companyId && (
                                                                            <button 
                                                                                type="button" 
                                                                                className="activity-cta-btn company"
                                                                                onClick={() => {
                                                                                    setActiveTab("entreprises");
                                                                                    const comp = companies.find(c => c.id === act.companyId);
                                                                                    if (comp) setEditingCompany(comp);
                                                                                }}
                                                                            >
                                                                                <Briefcase size={13} />
                                                                                <span>Gérer l'entreprise</span>
                                                                            </button>
                                                                        )}

                                                                        {isPayment && (
                                                                            <button 
                                                                                type="button" 
                                                                                className="activity-cta-btn payment"
                                                                                onClick={() => {
                                                                                    setActiveTab("revenus");
                                                                                }}
                                                                            >
                                                                                <DollarSign size={13} />
                                                                                <span>Voir les revenus & comptabilité</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* EDIT COMPANY MODAL */}
            {editingCompany && (
                <div className="admin-modal-overlay" onClick={() => setEditingCompany(null)}>
                    <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Modifier l'Entreprise</h3>
                            <button className="modal-close" onClick={() => setEditingCompany(null)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveCompanyEdit}>
                            <div className="modal-body">
                                <div className="form-field">
                                    <label className="form-label">Nom de l'Entreprise</label>
                                    <input 
                                        type="text" 
                                        className="form-input"
                                        value={editingCompany.name || ""} 
                                        onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-field" style={{ marginTop: '12px' }}>
                                    <label className="form-label">SIRET</label>
                                    <input 
                                        type="text" 
                                        className="form-input"
                                        value={editingCompany.siret || ""} 
                                        onChange={(e) => setEditingCompany({ ...editingCompany, siret: e.target.value })}
                                        placeholder="14 chiffres"
                                    />
                                </div>

                                <div className="form-field" style={{ marginTop: '12px' }}>
                                    <label className="form-label">Nom du Propriétaire</label>
                                    <input 
                                        type="text" 
                                        className="form-input"
                                        value={editingCompany.ownerName || ""} 
                                        onChange={(e) => setEditingCompany({ ...editingCompany, ownerName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="profile-form-grid" style={{ marginTop: '12px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Email de Contact / Owner</label>
                                        <input 
                                            type="email" 
                                            className="form-input"
                                            value={editingCompany.ownerEmail || editingCompany.email || ""} 
                                            onChange={(e) => setEditingCompany({ ...editingCompany, ownerEmail: e.target.value, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Téléphone</label>
                                        <input 
                                            type="text" 
                                            className="form-input"
                                            value={editingCompany.ownerPhone || editingCompany.phone || ""} 
                                            onChange={(e) => setEditingCompany({ ...editingCompany, ownerPhone: e.target.value, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="profile-form-grid" style={{ marginTop: '12px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Plan Abonnement</label>
                                        <select 
                                            className="form-input"
                                            value={editingCompany.plan || "PRO"}
                                            onChange={(e) => {
                                                const p = e.target.value;
                                                const price = p === "UNLIMITED" ? 149 : (p === "STARTER" ? 39 : 89);
                                                setEditingCompany({ ...editingCompany, plan: p, monthlyPrice: price });
                                            }}
                                        >
                                            <option value="STARTER">STARTER (39€/mois)</option>
                                            <option value="PRO">PRO (89€/mois)</option>
                                            <option value="UNLIMITED">UNLIMITED (149€/mois)</option>
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Statut du Compte</label>
                                        <select 
                                            className="form-input"
                                            value={editingCompany.status || "Active"}
                                            onChange={(e) => setEditingCompany({ ...editingCompany, status: e.target.value })}
                                        >
                                            <option value="Active">Actif (Accès total)</option>
                                            <option value="Trial">En essai (Trial)</option>
                                            <option value="Expired">Expiré (Abonnement échu)</option>
                                            <option value="Blocked">Bloqué / Désactivé</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setEditingCompany(null)} disabled={actionLoading}>
                                    Annuler
                                </button>
                                <button type="submit" className="btn-primary" disabled={actionLoading}>
                                    {actionLoading ? "Enregistrement..." : "Enregistrer les modifications"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE COMPANY CONFIRMATION MODAL */}
            {deletingCompany && (
                <div className="admin-modal-overlay" onClick={() => setDeletingCompany(null)}>
                    <div className="admin-modal-card danger" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ color: '#ef4444' }}>Supprimer l'Entreprise ?</h3>
                            <button className="modal-close" onClick={() => setDeletingCompany(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                                Êtes-vous sûr de vouloir supprimer définitivement l'entreprise <strong>{deletingCompany.name}</strong> ({deletingCompany.ownerEmail || deletingCompany.email}) ? 
                                Cette action est irréversible et supprimera l'ensemble de ses utilisateurs, techniciens, clients, devis et factures de la base de données.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setDeletingCompany(null)} disabled={actionLoading}>
                                Annuler
                            </button>
                            <button className="btn-danger" onClick={handleDeleteCompanyConfirm} disabled={actionLoading}>
                                {actionLoading ? "Suppression..." : "Supprimer définitivement"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LOGOUT CONFIRMATION MODAL */}
            {showLogoutConfirm && (
                <div className="admin-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="admin-modal-card danger" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LogOut size={20} style={{ color: '#ef4444' }} />
                                <h3 style={{ color: '#ef4444', margin: 0 }}>Déconnexion</h3>
                            </div>
                            <button className="modal-close" onClick={() => setShowLogoutConfirm(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', margin: 0 }}>
                                Êtes-vous sûr de vouloir vous déconnecter de votre session Super Admin ?
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowLogoutConfirm(false)}>
                                Annuler
                            </button>
                            <button 
                                className="btn-danger" 
                                onClick={() => {
                                    setShowLogoutConfirm(false);
                                    handleLogout(navigate);
                                }}
                            >
                                <LogOut size={15} style={{ marginRight: '6px' }} />
                                Se déconnecter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
