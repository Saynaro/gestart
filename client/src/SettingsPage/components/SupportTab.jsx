import React, { useState } from "react";
import { HelpCircle, Mail, MessageSquare, BookOpen, Activity, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

export default function SupportTab({ isMobileView, triggerToast }) {
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);

    const supportEmail = "support.gestart@gmail.com";

    const faqs = [
        {
            q: "Comment activer le calcul automatique de la TVA sur mes factures ?",
            a: "Rendez-vous dans la rubrique Comptabilité > TVA, puis désactivez la Franchise en base de TVA si vous êtes assujetti. Le taux de 20% ou 10% s'appliquera automatiquement."
        },
        {
            q: "Les rappels SMS pour entretiens de pompes à chaleur sont-ils envoyés le dimanche ?",
            a: "Non, conformément à la réglementation ARCEP sur le démarchage et les rappels B2C, les SMS automatiques sont suspendus les dimanches et jours fériés et reportés au jour ouvrable suivant à 9h."
        },
        {
            q: "Puis-je exporter mes factures directement vers Pennylane ?",
            a: "Oui, dans l'onglet Config > Premium, saisissez votre clé API Pennylane pour activer la télétransmission automatique des factures validées."
        },
        {
            q: "Comment ajouter un technicien supplémentaire ?",
            a: "Dans Mon compte > Utilisateurs, cliquez sur 'Inviter un membre'. Saisissez son email et attribuez-lui le rôle TECHNICIAN."
        }
    ];

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(supportEmail);
        setCopiedEmail(true);
        triggerToast("Email du support copié dans le presse-papier !");
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Service Status Banner */}
            <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={20} style={{ color: '#22c55e' }} />
                    <div>
                        <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#15803d' }}>Statut des services GestArt : 99,99% Uptime</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground)' }}>Tous les systèmes (Base de données, Twilio SMS, Stripe) sont 100% opérationnels.</p>
                    </div>
                </div>
                <span style={{ backgroundColor: '#22c55e', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '50px' }}>OPÉRATIONNEL</span>
            </div>

            {/* Support Options Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', backgroundColor: 'var(--card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <Mail size={22} style={{ color: 'var(--sidebar-primary)' }} />
                        <h4 style={{ margin: '10px 0 4px 0', fontSize: '15px', fontWeight: 700 }}>Assistance par Email</h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)' }}>Réponse garantie en moins de 2 heures ouvrées.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyEmail}
                        style={{ marginTop: '16px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        {copiedEmail ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
                        {copiedEmail ? "Email Copié !" : supportEmail}
                    </button>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', backgroundColor: 'var(--card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <MessageSquare size={22} style={{ color: 'var(--sidebar-primary)' }} />
                        <h4 style={{ margin: '10px 0 4px 0', fontSize: '15px', fontWeight: 700 }}>Chat en direct (Crisp / Intercom)</h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)' }}>Échangez avec nos experts CRM bâtiment du lundi au samedi.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => triggerToast("Ouverture du chat en direct avec le support GestArt...")}
                        style={{ marginTop: '16px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer' }}
                    >
                        Démarrer une discussion
                    </button>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', backgroundColor: 'var(--card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <BookOpen size={22} style={{ color: 'var(--sidebar-primary)' }} />
                        <h4 style={{ margin: '10px 0 4px 0', fontSize: '15px', fontWeight: 700 }}>Guide & Documentation</h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)' }}>Tutoriels vidéo et fiches pratiques pour les chauffagistes et frigoristes.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => triggerToast("Redirection vers la documentation officielle GestArt...")}
                        style={{ marginTop: '16px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer' }}
                    >
                        Consulter la doc
                    </button>
                </div>
            </div>

            {/* FAQ Accordion */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HelpCircle size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Foire Aux Questions (FAQ)
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {faqs.map((faq, idx) => {
                        const isOpen = openFaq === idx;
                        return (
                            <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                                    style={{ width: '100%', padding: '12px 14px', backgroundColor: 'var(--background)', border: 'none', textAlign: 'left', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span>{faq.q}</span>
                                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {isOpen && (
                                    <div style={{ padding: '12px 14px', backgroundColor: 'var(--card)', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: '1.5' }}>
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
