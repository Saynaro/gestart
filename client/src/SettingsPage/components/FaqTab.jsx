import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    HelpCircle, 
    Search, 
    ChevronDown, 
    ChevronUp, 
    BookOpen, 
    ExternalLink, 
    MessageSquare, 
    Zap, 
    Shield, 
    FileText, 
    CheckCircle2,
    CreditCard,
    Users,
    Smartphone,
    Calendar,
    Settings2,
    Lock,
    Send,
    FileCheck,
    Receipt,
    Calculator,
    Check
} from "lucide-react";

export default function FaqTab({ isMobileView, triggerToast, onOpenSupport }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [openFaq, setOpenFaq] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState("all");

    const categories = [
        { id: "all", label: "Toutes les questions" },
        { id: "devis_factures", label: "Devis, Factures & Signature" },
        { id: "clients_interventions", label: "Clients & Interventions" },
        { id: "sms_communication", label: "SMS & Messagerie" },
        { id: "equipe_techniciens", label: "Équipe & Techniciens" },
        { id: "compta_legal", label: "Comptabilité, TVA & E-Facture" },
        { id: "securite_compte", label: "Sécurité & Entreprise" }
    ];

    const faqs = [
        {
            id: 1,
            category: "devis_factures",
            tag: "Devis & Signature",
            q: "Comment créer et envoyer un devis avec signature électronique en ligne ?",
            a: "Rendez-vous dans la rubrique « Devis », puis cliquez sur « Nouveau Devis ». Ajoutez vos lignes de prestations, fournitures et taux de TVA. Une fois le devis enregistré, cliquez sur « Envoyer » pour transmettre le lien par Email ou SMS. Votre client accède à une page sécurisée où il peut apposer sa signature directement au doigt ou à la souris. Le devis passe automatiquement au statut « ACCEPTÉ » en temps réel dans votre tableau de bord."
        },
        {
            id: 2,
            category: "devis_factures",
            tag: "Facturation & PDF",
            q: "Comment transformer un devis en facture et exporter le document PDF ?",
            a: "Dans la liste de vos devis, ouvrez un devis accepté puis cliquez sur « Convertir en Facture ». Toutes les lignes, remises et coordonnées sont automatiquement dupliquées dans une nouvelle facture officielle. Vous pouvez générer et télécharger le fichier PDF conforme en un clic, ou envoyer au client son lien de facture avec paiement en ligne par carte bancaire."
        },
        {
            id: 3,
            category: "devis_factures",
            tag: "Paiements Stripe",
            q: "Comment activer le paiement par carte bancaire sur mes devis et factures ?",
            a: "Dans « Paramètres > Paiements », connectez votre compte bancaire via Stripe Connect. Une fois activé, vos clients peuvent régler leurs acomptes et factures en ligne par carte bancaire ou Apple Pay. Dès réception du paiement, la facture est automatiquement marquée comme « PAYÉE » et les fonds sont virés sur votre compte professionnel."
        },
        {
            id: 4,
            category: "clients_interventions",
            tag: "Gestion Clients",
            q: "Comment ajouter un client et enregistrer ses équipements techniques ?",
            a: "Dans l'onglet « Clients », cliquez sur « Nouveau Client ». Renseignez ses coordonnées complètes avec complétion automatique de l'adresse postale. Vous pouvez également enregistrer ses équipements (Pompe à chaleur, Climatisation, Chaudière, Chambre froide...) avec marque, modèle et date de mise en service pour programmer facilement les entretiens périodiques."
        },
        {
            id: 5,
            category: "clients_interventions",
            tag: "Planning & Rendez-vous",
            q: "Comment planifier une intervention et l'assigner à un technicien ?",
            a: "Dans « Planning », cliquez sur le jour ou créneau souhaité, ou utilisez le bouton « Nouvelle Intervention ». Sélectionnez le client, l'adresse du chantier, l'horaire et le technicien en charge. L'intervention s'affiche instantanément sur le planning du technicien avec guidage GPS (Waze / Google Maps) en 1 clic."
        },
        {
            id: 6,
            category: "clients_interventions",
            tag: "Rapports d'intervention",
            q: "Comment le technicien remplit-il son compte-rendu d'intervention sur le terrain ?",
            a: "Depuis son espace mobile, le technicien consulte ses rendez-vous du jour. Il met à jour le statut en direct (« En route », « En cours », « Terminé »), prend des photos avant/après les travaux et saisit ses observations. Le rapport d'intervention est automatiquement synchronisé et consultable par le gérant au bureau."
        },
        {
            id: 7,
            category: "sms_communication",
            tag: "Automatisations SMS",
            q: "Comment fonctionnent les rappels SMS automatiques et les confirmations ?",
            a: "Dans « Paramètres > SMS & Communication », configurez vos modèles automatiques : rappel de rendez-vous 24h avant, alerte d'entretien annuel 11 mois après l'installation, devis disponible. Les SMS utilisent des variables dynamiques ({client}, {date}, {heure}, {lien}) et sont envoyés selon la réglementation ARCEP (du lundi au samedi)."
        },
        {
            id: 8,
            category: "sms_communication",
            tag: "Messagerie d'équipe",
            q: "Comment fonctionne la messagerie interne en temps réel ?",
            a: "Dans la rubrique « Messages », vous échangez instantanément avec vos techniciens sans recharger la page. Vous pouvez dialoguer en message privé direct avec un collaborateur pour lui transmettre une consigne urgente ou poster une annonce générale visible par toute l'entreprise."
        },
        {
            id: 9,
            category: "equipe_techniciens",
            tag: "Invitation Collaborateur",
            q: "Comment inviter un technicien et que se passe-t-il s'il a déjà un compte ?",
            a: "Dans « Paramètres > Équipe », cliquez sur « Inviter un membre » et saisissez son email. S'il n'a pas de compte, il reçoit un email pour créer son mot de passe. S'il possède déjà un compte sur la plateforme GestArt, une invitation s'affiche dans son tableau de bord pour lui permettre d'accepter et de rejoindre votre entreprise en 1 clic."
        },
        {
            id: 10,
            category: "equipe_techniciens",
            tag: "Vue Technicien",
            q: "Quelles sont les fonctionnalités spécifiques à l'application technicien mobile ?",
            a: "L'interface technicien est pensée pour le terrain sur smartphone : consultation de la feuille de route du jour, ouverture de l'adresse sur GPS, consultation de l'historique des pannes client, signature client sur place et téléchargement de photos de chantier."
        },
        {
            id: 11,
            category: "compta_legal",
            tag: "Gestion TVA",
            q: "Comment configurer le calcul de TVA (20%, 10%, 5.5% ou Franchise en base) ?",
            a: "Dans « Comptabilité > TVA », activez ou désactivez la franchise en base de TVA selon votre statut juridique (Auto-entrepreneur ou Société assujettie). Sur chaque devis et facture, vous pouvez choisir le taux applicable ligne par ligne selon la nature des travaux (rénovation énergétique à 5.5%, amélioration à 10%, neuf à 20%)."
        },
        {
            id: 12,
            category: "compta_legal",
            tag: "E-Facture 2026/2027",
            q: "GestArt est-il conforme à la réforme de la facturation électronique (E-Facture) ?",
            a: "Oui. GestArt génère des factures structurées conformes aux exigences de la DGFIP (numérotation continue sans rupture, mentions fiscales obligatoires, SIRET émetteur et client, montants HT/TVA/TTC détaillés). Elles sont prêtes pour l'interconnexion avec le Portail Public de Facturation (PPF) et les plateformes agréées."
        },
        {
            id: 13,
            category: "compta_legal",
            tag: "Export Comptable",
            q: "Comment exporter les données de facturation pour mon expert-comptable ?",
            a: "Dans « Comptabilité > Chiffre d'affaires », visualisez votre journal des ventes et cliquez sur « Exporter CSV / Excel ». Le fichier regroupe toutes les factures de la période avec ventilation HT, TVA et encaissements, compatible avec Pennylane, Cegid, Sage, Indy et tous les logiciels comptables."
        },
        {
            id: 14,
            category: "securite_compte",
            tag: "Sécurité & 2FA",
            q: "Comment protéger mon compte avec l'authentification à deux facteurs (2FA) ?",
            a: "Dans « Paramètres > Sécurité », activez la double authentification. Lors de chaque connexion, un code de sécurité temporaire à usage unique (OTP) est demandé pour valider votre identité. Toutes les données clients et devis sont chiffrées selon les standards bancaires les plus stricts."
        },
        {
            id: 15,
            category: "securite_compte",
            tag: "Données Entreprise",
            q: "Comment configurer les mentions légales et le logo de mon entreprise ?",
            a: "Dans « Paramètres > Entreprise » et « Paramètres > Facturation », téléversez votre logo et renseignez vos informations juridiques (Raison sociale, SIRET, code NAF, RCS, Capital social, coordonnées bancaires IBAN et mentions d'assurance décennale). Elles apparaîtront automatiquement sur tous vos documents officiels."
        },
        {
            id: 16,
            category: "securite_compte",
            tag: "Support GestArt",
            q: "Comment contacter l'assistance en cas de question ou problème technique ?",
            a: "Vous pouvez ouvrir le chat en direct dans « Paramètres > Support » pour échanger avec notre équipe d'assistance dédiée. Vous bénéficiez d'une prise en charge rapide et d'un suivi personnalisé de vos demandes."
        }
    ];

    const filteredFaqs = useMemo(() => {
        return faqs.filter(faq => {
            const matchesCat = selectedCategory === "all" || faq.category === selectedCategory;
            const query = searchQuery.toLowerCase().trim();
            const matchesQuery = !query || 
                faq.q.toLowerCase().includes(query) || 
                faq.a.toLowerCase().includes(query) || 
                (faq.tag && faq.tag.toLowerCase().includes(query));
            return matchesCat && matchesQuery;
        });
    }, [faqs, selectedCategory, searchQuery]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Header intro & Search Bar */}
            <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--sidebar-primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <HelpCircle size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--foreground)' }}>
                            Centre d'aide & Foire Aux Questions
                        </h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            Trouvez rapidement des réponses claires sur le fonctionnement de votre CRM GestArt.
                        </p>
                    </div>
                </div>

                {/* Search Input */}
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--muted-foreground)' }} />
                    <input
                        type="text"
                        placeholder="Rechercher une fonction (devis, facture, SMS, signature, technicien, TVA, 2FA)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '11px 14px 11px 42px',
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            fontSize: '13.5px',
                            color: 'var(--foreground)',
                            outline: 'none',
                            transition: 'border-color 0.2s ease'
                        }}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--muted-foreground)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 700
                            }}
                        >
                            Effacer
                        </button>
                    )}
                </div>

                {/* Category Pills (Equal consistent height and padding, no jump) */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {categories.map(cat => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    lineHeight: '1.2',
                                    fontWeight: 500,
                                    backgroundColor: isSelected ? 'var(--sidebar-primary)' : 'var(--background)',
                                    color: isSelected ? '#ffffff' : 'var(--muted-foreground)',
                                    border: `1px solid ${isSelected ? 'var(--sidebar-primary)' : 'var(--border)'}`,
                                    cursor: 'pointer',
                                    transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                                    boxSizing: 'border-box',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}
                            >
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Questions List with Smooth Accordion Animation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredFaqs.length === 0 ? (
                    <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px'
                    }}>
                        <HelpCircle size={32} style={{ color: 'var(--muted-foreground)', margin: '0 auto 10px' }} />
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700 }}>Aucune question correspondante</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            Essayez d'autres mots-clés ou contactez un assistant via le support direct.
                        </p>
                    </div>
                ) : (
                    filteredFaqs.map((faq, idx) => {
                        const isOpen = openFaq === faq.id;
                        return (
                            <div
                                key={faq.id || idx}
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    backgroundColor: 'var(--card)',
                                    boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,0.04)' : 'none',
                                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                                    style={{
                                        width: '100%',
                                        padding: '16px 18px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        textAlign: 'left',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        color: 'var(--foreground)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                        <CheckCircle2 size={16} style={{ color: 'var(--sidebar-primary)', flexShrink: 0 }} />
                                        <span>{faq.q}</span>
                                    </span>
                                    {faq.tag && (
                                        <span style={{
                                            fontSize: '10.5px',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: 'rgba(85, 107, 47, 0.12)',
                                            color: 'var(--sidebar-primary)',
                                            flexShrink: 0
                                        }}>
                                            {faq.tag}
                                        </span>
                                    )}
                                    {isOpen ? (
                                        <ChevronUp size={18} style={{ color: 'var(--sidebar-primary)', flexShrink: 0 }} />
                                    ) : (
                                        <ChevronDown size={18} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                                    )}
                                </button>
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            key="content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.22, ease: "easeInOut" }}
                                            style={{ overflow: "hidden" }}
                                        >
                                            <div style={{
                                                padding: '0 18px 16px 44px',
                                                fontSize: '13.5px',
                                                color: 'var(--muted-foreground)',
                                                lineHeight: '1.6'
                                            }}>
                                                {faq.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Need More Help Banner */}
            <div style={{
                border: '1px dashed var(--border)',
                borderRadius: '14px',
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: 700 }}>
                        Vous avez une question spécifique ?
                    </h4>
                    <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                        Un de nos assistants GestArt vous répond en direct dans l'espace Support.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (onOpenSupport) {
                            onOpenSupport();
                        } else {
                            window.location.search = "?tab=support";
                        }
                    }}
                    style={{
                        padding: '10px 18px',
                        backgroundColor: 'var(--sidebar-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '9px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(85, 107, 47, 0.3)'
                    }}
                >
                    <MessageSquare size={16} />
                    Contacter l'Assistant GestArt
                </button>
            </div>
        </div>
    );
}
