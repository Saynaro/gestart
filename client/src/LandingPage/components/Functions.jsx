import { BentoCard, BentoGrid } from "@/components/ui/bento-grid.jsx";
import { AnimatedList } from "@/components/ui/animated-list";
import { AuroraText } from "@/components/ui/aurora-text";
import "./Functions.css";
import {
    MessageCircle,
    CalendarDays,
    ReceiptText,
    PenLine,
    Smartphone,
    Bell,
    Check,
    CreditCard,
    User,
    ChevronRight,
    MapPin,
    FileText,
    Clock,
    DollarSign
} from "lucide-react";

export default function Functions() {
    return (
        <section className="functions-section">
            <div className="functions-header">
                <span className="functions-badge">
                    <AuroraText>Fonctionnalités Clés</AuroraText>
                </span>
                <h2 className="functions-title">Tout ce dont vous avez besoin pour piloter votre activité</h2>
                <p className="functions-subtitle">
                    Gagnez des heures de gestion administrative et offrez une expérience moderne à vos clients.
                </p>
            </div>

            <BentoGrid className="functions-grid">
                {/* 1. SMS Automatiques (col-span-2) */}
                <BentoCard
                    name="Rappels SMS automatiques"
                    description="Vos clients sont relancés automatiquement 30 jours avant leur entretien annuel. Aucune action de votre part."
                    Icon={MessageCircle}
                    href="#"
                    cta="En savoir plus"
                    className="lg:col-span-2 lg:row-span-1"
                    background={
                        <div className="bento-bg bento-sms-bg">
                            <div className="sms-mock-phone">
                                <div className="sms-phone-header">
                                    <div className="sms-avatar">G</div>
                                    <span className="sms-contact-name">GestArt</span>
                                </div>
                                <div className="sms-chat-body">
                                    <div className="sms-bubble received">
                                        <p>Rappel : Votre entretien de chaudière est prévu le 15/08. Répondez OUI pour confirmer.</p>
                                        <span className="sms-time">10:02</span>
                                    </div>
                                    <div className="sms-bubble sent">
                                        <p>OUI</p>
                                        <span className="sms-time">10:03</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                />

                {/* 2. Factures (col-span-1) */}
                <BentoCard
                    name="Factures en 1 clic"
                    description="Générez vos factures PDF professionnelles instantanément et envoyez-les directement par email."
                    Icon={ReceiptText}
                    href="#"
                    cta="En savoir plus"
                    className="lg:col-span-1 lg:row-span-1"
                    background={
                        <div className="bento-bg bento-invoice-bg">
                            <div className="invoice-mock-card">
                                <div className="invoice-header">
                                    <FileText size={18} className="invoice-icon" />
                                    <span>Facture #FA-2026-03</span>
                                </div>
                                <div className="invoice-body">
                                    <div className="invoice-line">
                                        <span>Entretien Chaudière</span>
                                        <span className="bold">120.00 €</span>
                                    </div>
                                    <div className="invoice-line">
                                        <span>TVA (10%)</span>
                                        <span>12.00 €</span>
                                    </div>
                                    <div className="invoice-divider"></div>
                                    <div className="invoice-line total">
                                        <span>Total</span>
                                        <span className="total-price">132.00 €</span>
                                    </div>
                                </div>
                                <div className="invoice-status-stamp">RÉGLÉ</div>
                            </div>
                        </div>
                    }
                />

                {/* 3. Planning (col-span-1, row-span-2) - Tall Card */}
                <BentoCard
                    name="Planning techniciens"
                    description="Planifiez les interventions de vos techniciens en toute simplicité. Synchronisation immédiate."
                    Icon={CalendarDays}
                    href="#"
                    cta="Gérer le planning"
                    className="lg:col-span-1 lg:row-span-2 tall-bento-card"
                    background={
                        <div className="bento-bg bento-planning-bg">
                            {/* Calendar Section */}
                            <div className="planning-calendar">
                                <div className="calendar-month">Juillet 2026</div>
                                <div className="calendar-weekdays">
                                    <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span>
                                </div>
                                <div className="calendar-days-grid">
                                    <span>12</span><span>13</span><span className="active-day">14</span><span>15</span><span>16</span>
                                    <span>19</span><span>20</span><span>21</span><span>22</span><span>23</span>
                                </div>
                            </div>

                            {/* Timeline/Tasks Section */}
                            <div className="planning-tasks">
                                <div className="task-item blue-task">
                                    <Clock size={12} className="task-icon" />
                                    <div className="task-info">
                                        <span className="task-time">09:00 - Entretien</span>
                                        <span className="task-name">K. Sainaro</span>
                                    </div>
                                </div>
                                <div className="task-item purple-task">
                                    <Clock size={12} className="task-icon" />
                                    <div className="task-info">
                                        <span className="task-time">11:30 - Dépannage</span>
                                        <span className="task-name">M. Sainaro</span>
                                    </div>
                                </div>
                                <div className="task-item green-task">
                                    <Clock size={12} className="task-icon" />
                                    <div className="task-info">
                                        <span className="task-time">14:30 - Installation</span>
                                        <span className="task-name">A. Sainaro</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                />

                {/* 4. Notifications (col-span-1) */}
                <BentoCard
                    name="Notifications en temps réel"
                    description="Soyez alerté instantanément quand un client valide son rendez-vous par SMS ou règle une facture en ligne."
                    Icon={Bell}
                    href="#"
                    cta="Configurer les alertes"
                    className="lg:col-span-1 lg:row-span-1"
                    background={
                        <div className="bento-bg bento-notifications-bg">
                            <AnimatedList className="notif-stack" delay={2000} >
                                <div className="notif-bubble" key="notif-1">
                                    <div className="notif-icon-circle bg-notif-purple">
                                        <User size={12} className="text-white" />
                                    </div>
                                    <div className="notif-content">
                                        <div className="notif-header">
                                            <span className="notif-title">Technicien assigné</span>
                                            <span className="notif-time">Il y a 10m</span>
                                        </div>
                                        <p className="notif-desc">Khalid Sainaro assigné à A. Sainaro.</p>
                                    </div>
                                </div>
                                <div className="notif-bubble" key="notif-2">
                                    <div className="notif-icon-circle bg-notif-blue">
                                        <MessageCircle size={12} className="text-white" />
                                    </div>
                                    <div className="notif-content">
                                        <div className="notif-header">
                                            <span className="notif-title">Rendez-vous validé par SMS</span>
                                            <span className="notif-time">À l'instant</span>
                                        </div>
                                        <p className="notif-desc">K. Sainaro a répondu "Oui" pour le 15/08.</p>
                                    </div>
                                </div>
                                <div className="notif-bubble" key="notif-3">
                                    <div className="notif-icon-circle bg-notif-green">
                                        <CreditCard size={12} className="text-white" />
                                    </div>
                                    <div className="notif-content">
                                        <div className="notif-header">
                                            <span className="notif-title">Paiement en ligne reçu</span>
                                            <span className="notif-time">Il y a 5m</span>
                                        </div>
                                        <p className="notif-desc">Facture #FA-2026-03 (132.00 €) réglée.</p>
                                    </div>
                                </div>
                            </AnimatedList>
                        </div>
                    }
                />

                {/* 5. Application mobile (col-span-1) */}
                <BentoCard
                    name="Application mobile"
                    description="Vos techniciens accèdent à leur planning et remplissent leurs fiches d'intervention sur la route."
                    Icon={Smartphone}
                    href="#"
                    cta="Télécharger l'app"
                    className="lg:col-span-1 lg:row-span-1"
                    background={
                        <div className="bento-bg bento-mobile-bg">
                            <div className="mobile-app-mock">
                                <div className="mobile-app-header">
                                    <span>GestArt Mobile</span>
                                </div>
                                <div className="mobile-app-body">
                                    <div className="mobile-intervention-card">
                                        <div className="mic-header">
                                            <span className="mic-time">14:00</span>
                                            <span className="mic-badge">En cours</span>
                                        </div>
                                        <span className="mic-client">Dépannage - Antoine</span>
                                        <div className="mic-address">
                                            <MapPin size={10} />
                                            <span>12 Avenue Jean Medecin</span>
                                        </div>
                                    </div>
                                    <div className="mobile-app-action-btn">Valider l'intervention</div>
                                </div>
                            </div>
                        </div>
                    }
                />

                {/* 6. Devis & Signature (col-span-1) */}
                <BentoCard
                    name="Devis & Signature"
                    description="Faites signer vos devis directement en ligne par vos clients pour accélérer le démarrage des travaux."
                    Icon={PenLine}
                    href="#"
                    cta="En savoir plus"
                    className="lg:col-span-1 lg:row-span-1"
                    background={
                        <div className="bento-bg bento-devis-bg">
                            <div className="devis-mock-card">
                                <div className="devis-title">Devis d'Intervention</div>
                                <div className="devis-price">Montant : 180.00 €</div>
                                <div className="devis-signature-area">
                                    <span className="signature-label">Signature client</span>
                                    <div className="signature-line">
                                        <svg className="signature-svg" viewBox="0 0 100 30">
                                            <path d="M 10 20 Q 20 5 30 20 T 50 15 T 70 20 T 90 10" fill="none" stroke="#005371" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="devis-badge">SIGNÉ EN LIGNE</div>
                            </div>
                        </div>
                    }
                />
            </BentoGrid>
        </section>
    );
}