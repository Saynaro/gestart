import "./FAQ.css";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { AuroraText } from "@/components/ui/aurora-text";

const faqs = [
    {
        id: "faq-1",
        question: "Comment fonctionnent les rappels SMS automatiques d'entretien annuel ?",
        answer: "Dès que vous enregistrez un client et son équipement (chaudière, pompe à chaleur, climatisation…), GestArt calcule automatiquement l'échéance du prochain entretien. Vos clients reçoivent un SMS de rappel personnalisé (30 jours avant l'échéance annuelle ainsi qu'avant le rendez-vous) et vous êtes alerté en temps réel dès qu'ils confirment."
    },
    {
        id: "faq-2",
        question: "Mes devis et factures sont-ils conformes à la réglementation française ?",
        answer: "Oui, à 100 %. Toutes les mentions légales obligatoires sont intégrées automatiquement (SIRET, RCS, assurance décennale, autoliquidation ou taux de TVA à 5,5 %, 10 %, 20 % et franchise en base, pénalités de retard). Vos documents respectent la numérotation continue, sont prêts pour la facturation électronique (Chorus Pro / E-Facture) et s'exportent en 1 clic pour votre expert-comptable."
    },
    {
        id: "faq-3",
        question: "Comment mes clients signent-ils leurs devis et règlent-ils leurs factures en ligne ?",
        answer: "Vous envoyez le devis ou la facture par Email ou SMS en un clic. Votre client ouvre un lien sécurisé sur son téléphone, signe le devis directement au doigt avec valeur juridique, puis peut régler sa facture en ligne par carte bancaire (via Stripe) ou virement. Avec la synchronisation bancaire DSP2, vos encaissements sont rapprochés automatiquement."
    },
    {
        id: "faq-4",
        question: "Comment mes techniciens utilisent-ils l'application sur le terrain ?",
        answer: "Chaque technicien dispose d'un accès mobile dédié sur son smartphone : il consulte sa feuille de route du jour, lance l'itinéraire GPS en 1 clic, accède à l'historique de l'équipement client et met à jour le statut de l'intervention en direct (« En cours », « Terminé »). Tout est synchronisé instantanément avec votre tableau de bord au bureau."
    },
    {
        id: "faq-5",
        question: "Je ne suis pas très à l'aise avec l'informatique, est-ce compliqué à configurer ?",
        answer: "Pas du tout. GestArt a été pensé spécifiquement pour les artisans et professionnels de la maintenance qui veulent aller à l'essentiel. L'interface est aussi simple que WhatsApp : votre compte, votre logo et votre catalogue de prestations se configurent en moins de 10 minutes, et notre support client français est disponible 7j/7 pour vous accompagner."
    },
    {
        id: "faq-6",
        question: "Mes données clients et comptables sont-elles sécurisées ?",
        answer: "Oui. Toutes vos données sont chiffrées de bout en bout, sauvegardées quotidiennement et hébergées exclusivement en Europe (serveurs sécurisés Hetzner en Allemagne) dans le strict respect du RGPD. Votre compte peut également être protégé par la double authentification (2FA)."
    },
    {
        id: "faq-7",
        question: "Comment fonctionne l'essai gratuit de 14 jours et puis-je annuler à tout moment ?",
        answer: "Vous testez GestArt gratuitement pendant 14 jours, sans carte bancaire et sans aucun engagement. À la fin de l'essai, vous êtes libre de choisir le forfait adapté à votre activité (Starter, Pro ou Unlimited) ou de ne pas poursuivre. Tous nos abonnements mensuels sont résiliables ou modifiables en 1 clic à tout moment, sans frais ni préavis."
    }
];

function FAQ() {
    return (
        <section className="faq-section" id="faq">
            <div className="faq-container">

                {/* Header */}
                <div className="faq-header">
                    <span className="faq-badge">
                        <AuroraText>FAQ</AuroraText>
                    </span>
                    <h2 className="faq-title">
                        Questions fréquentes
                    </h2>
                    <p className="faq-subtitle">
                        Tout ce qu'il faut savoir sur l'utilisation, la sécurité et la facturation chez GestArt.
                    </p>
                </div>

                {/* Accordion */}
                <Accordion type="single" collapsible="true" className="faq-accordion-list">
                    {faqs.map((faq) => (
                        <AccordionItem
                            key={faq.id}
                            value={faq.id}
                            className="faq-accordion-item"
                        >
                            <AccordionTrigger className="faq-accordion-trigger">
                                <span className="faq-question-text">{faq.question}</span>
                            </AccordionTrigger>
                            <AccordionContent className="faq-accordion-content">
                                <p className="faq-answer-text">{faq.answer}</p>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>

            </div>
        </section>
    );
}

export default FAQ;