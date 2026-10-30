import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Download, 
    Trash2, 
    ShieldCheck, 
    Mail, 
    FileSpreadsheet, 
    AlertTriangle, 
    Loader2, 
    X
} from "lucide-react";
import * as XLSX from "xlsx";
import { apiFetch } from "../../utils/api";
import { useUser } from "../../utils/useUser";

export default function LegalRgpdTab({ isMobileView, triggerToast }) {
    const { user, company } = useUser();
    const [dpoEmail] = useState("support.gestart@gmail.com");
    
    // Export loading states
    const [isExportingJson, setIsExportingJson] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    // Delete Account states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteChecked, setDeleteChecked] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    const formatDate = (dateStr) => {
        if (!dateStr) return "Aujourd'hui";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "Aujourd'hui";
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return formatDate(new Date());
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return formatDate(new Date());
        const datePart = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
        const timePart = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return `${datePart} ${timePart}`;
    };

    const rawRegistration = user?.createdAt || company?.createdAt;
    const rawLastLogin = user?.lastLoginAt || user?.updatedAt || user?.createdAt;

    const registrationDate = formatDate(rawRegistration);
    const lastConnectionDate = formatDateTime(rawLastLogin);

    // Helper to fetch all business data
    const fetchAllData = async () => {
        const [clientsRes, invoicesRes, quotesRes] = await Promise.allSettled([
            apiFetch("/v1/clients?limit=500"),
            apiFetch("/v1/invoices?limit=500"),
            apiFetch("/v1/quotes?limit=500")
        ]);

        const clients = clientsRes.status === "fulfilled" && clientsRes.value?.data ? (clientsRes.value.data.clients || clientsRes.value.data || []) : (clientsRes.value?.clients || []);
        const invoices = invoicesRes.status === "fulfilled" && invoicesRes.value?.data ? (invoicesRes.value.data.invoices || invoicesRes.value.data || []) : (invoicesRes.value?.invoices || []);
        const quotes = quotesRes.status === "fulfilled" && quotesRes.value?.data ? (quotesRes.value.data.quotes || quotesRes.value.data || []) : (quotesRes.value?.quotes || []);

        return {
            clients: Array.isArray(clients) ? clients : [],
            invoices: Array.isArray(invoices) ? invoices : [],
            quotes: Array.isArray(quotes) ? quotes : []
        };
    };

    // 1. REAL JSON EXPORT
    const handleExportJson = async () => {
        try {
            setIsExportingJson(true);
            const { clients, invoices, quotes } = await fetchAllData();

            const exportPayload = {
                titre: "Exportation intégrale des données (Art. 20 RGPD — Portabilité)",
                dateExport: new Date().toISOString(),
                exportateur: {
                    nom: user?.lastName || "",
                    prenom: user?.firstName || "",
                    email: user?.email || "",
                    telephone: user?.phone || "",
                    role: user?.role || "OWNER",
                    dateInscription: registrationDate,
                    derniereConnexion: lastConnectionDate
                },
                entreprise: {
                    nom: company?.name || "Mon Entreprise",
                    siret: company?.siret || "",
                    siren: company?.siren || "",
                    formeJuridique: company?.legalForm || "",
                    adresse: company?.address || "",
                    codePostal: company?.postalCode || "",
                    ville: company?.city || "",
                    numeroTVA: company?.vatNumber || "",
                    emailContact: company?.email || user?.email || "",
                    telephoneContact: company?.phone || user?.phone || ""
                },
                statistiques: {
                    nombreClients: clients.length,
                    nombreFactures: invoices.length,
                    nombreDevis: quotes.length
                },
                clients: clients.map(c => ({
                    id: c.id,
                    nom: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                    email: c.email || "",
                    telephone: c.phone || "",
                    adresse: c.address || "",
                    ville: c.city || "",
                    codePostal: c.postalCode || "",
                    siret: c.siret || "",
                    dateCreation: formatDate(c.createdAt)
                })),
                factures: invoices.map(i => ({
                    numero: i.invoiceNumber || i.number || i.id,
                    client: i.client?.name || i.clientName || "Client",
                    dateEmission: formatDate(i.issueDate || i.date || i.createdAt),
                    dateEcheance: formatDate(i.dueDate),
                    totalHT: i.totalHT != null ? `${Number(i.totalHT).toFixed(2)} €` : "",
                    totalTTC: i.totalTTC != null ? `${Number(i.totalTTC).toFixed(2)} €` : "",
                    statut: i.status || "",
                    modePaiement: i.paymentMethod || ""
                })),
                devis: quotes.map(q => ({
                    numero: q.quoteNumber || q.number || q.id,
                    client: q.client?.name || q.clientName || "Client",
                    dateCreation: formatDate(q.date || q.createdAt),
                    totalHT: q.totalHT != null ? `${Number(q.totalHT).toFixed(2)} €` : "",
                    totalTTC: q.totalTTC != null ? `${Number(q.totalTTC).toFixed(2)} €` : "",
                    statut: q.status || ""
                }))
            };

            const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const fileName = `export-donnees-gestart-${new Date().toISOString().slice(0, 10)}.json`;
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (triggerToast) triggerToast("Export JSON téléchargé avec succès !");
        } catch (err) {
            console.error("Export JSON failed:", err);
            if (triggerToast) triggerToast("Erreur lors de l'export JSON");
        } finally {
            setIsExportingJson(false);
        }
    };

    // 2. REAL EXCEL (XLSX) EXPORT
    const handleExportExcel = async () => {
        try {
            setIsExportingExcel(true);
            const { clients, invoices, quotes } = await fetchAllData();

            const wb = XLSX.utils.book_new();

            // Sheet 1: Profil & Entreprise
            const profileData = [
                ["Information", "Valeur"],
                ["Nom de l'utilisateur", `${user?.firstName || ""} ${user?.lastName || ""}`.trim()],
                ["Email", user?.email || ""],
                ["Téléphone", user?.phone || ""],
                ["Rôle", user?.role || "OWNER"],
                ["Date d'inscription", registrationDate],
                ["Dernière connexion", lastConnectionDate],
                ["", ""],
                ["Entreprise", company?.name || "Mon Entreprise"],
                ["SIRET", company?.siret || ""],
                ["SIREN", company?.siren || ""],
                ["Forme juridique", company?.legalForm || ""],
                ["Adresse", company?.address || ""],
                ["Code Postal", company?.postalCode || ""],
                ["Ville", company?.city || ""],
                ["N° TVA Intracommunautaire", company?.vatNumber || ""],
                ["Date de l'export", new Date().toLocaleString("fr-FR")]
            ];
            const wsProfile = XLSX.utils.aoa_to_sheet(profileData);
            XLSX.utils.book_append_sheet(wb, wsProfile, "Profil & Entreprise");

            // Sheet 2: Clients
            const clientsData = [
                ["Nom / Raison Sociale", "Email", "Téléphone", "Adresse", "Ville", "Code Postal", "SIRET", "Date de création"],
                ...clients.map(c => [
                    c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Sans nom",
                    c.email || "",
                    c.phone || "",
                    c.address || "",
                    c.city || "",
                    c.postalCode || "",
                    c.siret || "",
                    formatDate(c.createdAt)
                ])
            ];
            const wsClients = XLSX.utils.aoa_to_sheet(clientsData);
            XLSX.utils.book_append_sheet(wb, wsClients, "Clients");

            // Sheet 3: Factures
            const invoicesData = [
                ["Numéro", "Client", "Date d'émission", "Échéance", "Montant HT (€)", "Montant TTC (€)", "Statut", "Règlement"],
                ...invoices.map(i => [
                    i.invoiceNumber || i.number || i.id,
                    i.client?.name || i.clientName || "Client",
                    formatDate(i.issueDate || i.date || i.createdAt),
                    formatDate(i.dueDate),
                    i.totalHT != null ? Number(i.totalHT) : "",
                    i.totalTTC != null ? Number(i.totalTTC) : "",
                    i.status || "",
                    i.paymentMethod || ""
                ])
            ];
            const wsInvoices = XLSX.utils.aoa_to_sheet(invoicesData);
            XLSX.utils.book_append_sheet(wb, wsInvoices, "Factures");

            // Sheet 4: Devis
            const quotesData = [
                ["Numéro", "Client", "Date", "Montant HT (€)", "Montant TTC (€)", "Statut"],
                ...quotes.map(q => [
                    q.quoteNumber || q.number || q.id,
                    q.client?.name || q.clientName || "Client",
                    formatDate(q.date || q.createdAt),
                    q.totalHT != null ? Number(q.totalHT) : "",
                    q.totalTTC != null ? Number(q.totalTTC) : "",
                    q.status || ""
                ])
            ];
            const wsQuotes = XLSX.utils.aoa_to_sheet(quotesData);
            XLSX.utils.book_append_sheet(wb, wsQuotes, "Devis");

            const fileName = `export-donnees-gestart-${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, fileName);

            if (triggerToast) triggerToast("Export Excel (XLSX) téléchargé avec succès !");
        } catch (err) {
            console.error("Export Excel failed:", err);
            if (triggerToast) triggerToast("Erreur lors de l'export Excel");
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deleteChecked || isDeleting) {
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const res = await apiFetch("/v1/company/delete-account", {
                method: "DELETE"
            });

            if (res && (res.success || res.status === 200 || !res.error)) {
                if (triggerToast) triggerToast("Votre compte et toutes vos données ont été définitivement supprimés.");
                localStorage.clear();
                sessionStorage.clear();
                setTimeout(() => {
                    window.location.href = "/login?deleted=true";
                }, 800);
            } else {
                setDeleteError(res?.message || "Erreur lors de la suppression du compte");
                setIsDeleting(false);
            }
        } catch (err) {
            setDeleteError(err?.message || "Erreur lors de la communication avec le serveur");
            setIsDeleting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px' }}>
            {/* 1. Banner Information RGPD */}
            <div style={{
                backgroundColor: 'var(--card, #FFFFFF)',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: '14px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(85, 107, 47, 0.1)',
                        color: 'var(--sidebar-primary, #556B2F)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <ShieldCheck size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>
                            Vos droits RGPD
                        </h3>
                        <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: '1.45' }}>
                            Conformité stricte aux normes européennes de protection des données (RGPD). Vos données d'entreprise restent privées et sous votre contrôle.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--background)',
                                border: '1px solid var(--border)',
                                fontSize: '11.5px',
                                color: 'var(--muted-foreground)'
                            }}>
                                Inscription : <strong style={{ color: 'var(--foreground)' }}>{registrationDate}</strong>
                            </div>
                            <div style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--background)',
                                border: '1px solid var(--border)',
                                fontSize: '11.5px',
                                color: 'var(--muted-foreground)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span>Session :</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#16a34a', fontWeight: 600 }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                                    En ligne (Active)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Exportation de données (JSON & Excel) */}
            <div style={{
                backgroundColor: 'var(--card, #FFFFFF)',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: '14px',
                padding: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Download size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: '0 0 3px 0', fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>
                            Exporter mes données
                        </h3>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                            Téléchargez l'intégralité de vos clients, factures, devis et profil.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={handleExportJson}
                        disabled={isExportingJson || isExportingExcel}
                        style={{
                            padding: '11px 16px',
                            backgroundColor: 'var(--sidebar-primary, #556B2F)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: (isExportingJson || isExportingExcel) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 8px rgba(85, 107, 47, 0.25)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {isExportingJson ? (
                            <>
                                <Loader2 size={16} className="spin-loader" />
                                <span>Génération JSON...</span>
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                <span>Format JSON</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={isExportingJson || isExportingExcel}
                        style={{
                            padding: '11px 16px',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: (isExportingJson || isExportingExcel) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {isExportingExcel ? (
                            <>
                                <Loader2 size={16} className="spin-loader" />
                                <span>Génération Excel...</span>
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet size={16} style={{ color: '#10b981' }} />
                                <span>Format Excel (.xlsx)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 3. Contact DPO */}
            <div style={{
                backgroundColor: 'var(--card, #FFFFFF)',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: '14px',
                padding: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Mail size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>
                            Délégué aux données (DPO)
                        </h3>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: isMobileView ? 'wrap' : 'nowrap' }}>
                    <div style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        fontSize: '13px',
                        color: 'var(--foreground)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {dpoEmail}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            window.location.href = `mailto:${dpoEmail}`;
                            if (triggerToast) triggerToast("Client email ouvert.");
                        }}
                        style={{
                            padding: '9px 14px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            color: 'var(--foreground)',
                            flexShrink: 0,
                            width: isMobileView ? '100%' : 'auto'
                        }}
                    >
                        Contacter le DPO
                    </button>
                </div>
            </div>

            {/* 4. Suppression du compte - Zone Danger propre et sobre */}
            <div style={{
                backgroundColor: 'var(--card, #FFFFFF)',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: '14px',
                padding: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Trash2 size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 3px 0', fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>
                            Supprimer mon compte
                        </h3>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
                            Suppression irréversible de votre compte entreprise, devis, factures et fichiers clients.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteChecked(false);
                        setDeleteError(null);
                        setIsDeleting(false);
                        setShowDeleteModal(true);
                    }}
                    style={{
                        padding: '10px 16px',
                        backgroundColor: '#ef4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '9px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: isMobileView ? '100%' : 'auto',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)'
                    }}
                >
                    <Trash2 size={16} />
                    <span>Supprimer définitivement mon compte</span>
                </button>
            </div>

            {/* Modal de confirmation de suppression */}
            {createPortal(
                <AnimatePresence>
                    {showDeleteModal && (
                        <motion.div
                            key="delete-account-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => !isDeleting && setShowDeleteModal(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.72)',
                                backdropFilter: 'blur(6px)',
                                WebkitBackdropFilter: 'blur(6px)',
                                zIndex: 9999999,
                                display: 'flex',
                                alignItems: isMobileView ? 'flex-end' : 'center',
                                justifyContent: 'center',
                                padding: isMobileView ? 0 : '16px',
                                boxSizing: 'border-box'
                            }}
                        >
                            <motion.div
                                key="delete-account-modal-card"
                                initial={isMobileView ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 15 }}
                                animate={isMobileView ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                                exit={isMobileView ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 15 }}
                                transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.25 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    backgroundColor: 'var(--card, #FFFFFF)',
                                    borderRadius: isMobileView ? '24px 24px 0 0' : '18px',
                                    padding: isMobileView ? '16px 20px 28px 20px' : '24px',
                                    maxWidth: isMobileView ? '100%' : '440px',
                                    width: '100%',
                                    maxHeight: isMobileView ? '85vh' : '90vh',
                                    overflowY: 'auto',
                                    border: isMobileView ? 'none' : '1px solid var(--border, #e2e8f0)',
                                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
                                    position: 'relative',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {isMobileView && (
                                    <div style={{
                                        width: '36px',
                                        height: '4px',
                                        borderRadius: '2px',
                                        backgroundColor: 'rgba(100, 116, 139, 0.3)',
                                        margin: '0 auto 16px auto'
                                    }} />
                                )}

                                <button
                                    type="button"
                                    onClick={() => !isDeleting && setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    aria-label="Fermer"
                                    style={{
                                        position: 'absolute',
                                        top: isMobileView ? '16px' : '16px',
                                        right: '16px',
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(100, 116, 139, 0.08)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--muted-foreground)'
                                    }}
                                >
                                    <X size={16} />
                                </button>

                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '14px'
                                }}>
                                    <AlertTriangle size={24} />
                                </div>

                                <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: 'var(--foreground)' }}>
                                    Supprimer définitivement le compte ?
                                </h4>

                                <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: '1.45' }}>
                                    Cette action est irréversible. Toutes vos fiches clients, factures, devis et plannings будут définitivement supprimés, et votre abonnement sera résilié.
                                </p>

                                {deleteError && (
                                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, marginBottom: '14px' }}>
                                        {deleteError}
                                    </div>
                                )}

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    margin: '14px 0 20px 0',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    backgroundColor: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    color: 'var(--foreground)',
                                    lineHeight: '1.4'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={deleteChecked}
                                        onChange={(e) => setDeleteChecked(e.target.checked)}
                                        disabled={isDeleting}
                                        style={{ marginTop: '2px', accentColor: '#ef4444', width: '17px', height: '17px', flexShrink: 0, cursor: 'pointer' }}
                                    />
                                    <span>Je comprends et j'accepte que mon compte et toutes mes données soient supprimés définitivement.</span>
                                </label>

                                <div style={{ display: 'flex', gap: '8px', flexDirection: isMobileView ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={isDeleting}
                                        style={{
                                            padding: '10px 16px',
                                            borderRadius: '9px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'transparent',
                                            color: 'var(--foreground)',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            height: '42px'
                                        }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteAccount}
                                        disabled={!deleteChecked || isDeleting}
                                        style={{
                                            padding: '10px 18px',
                                            borderRadius: '9px',
                                            backgroundColor: (!deleteChecked || isDeleting) ? 'rgba(100, 116, 139, 0.25)' : '#ef4444',
                                            color: (!deleteChecked || isDeleting) ? 'var(--muted-foreground)' : '#FFFFFF',
                                            border: 'none',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            cursor: (!deleteChecked || isDeleting) ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            height: '42px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 size={16} className="spin-loader" /> Suppression en cours...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={16} /> Supprimer définitivement
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
