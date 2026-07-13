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
        question: "Est-ce que mes données sont sécurisées?",
        answer: "Oui. Vos données sont hébergées en France/Europe (serveurs Hetzner, Allemagne). Conformité RGPD totale."
    },
    {
        id: "faq-2",
        question: "Je ne suis pas très tech. C'est compliqué?",
        answer: "Non. Si vous savez utiliser WhatsApp, vous saurez utiliser GestArt. Setup en moins de 10 minutes."
    },
    {
        id: "faq-3",
        question: "Puis-je importer mes clients existants?",
        answer: "Oui. Import CSV depuis Excel en 1 clic."
    },
    {
        id: "faq-4",
        question: "Est-ce que les factures sont légalement valides?",
        answer: "Oui. Toutes les mentions obligatoires françaises sont incluses automatiquement (SIRET, TVA, pénalités de retard, etc.)"
    },
    {
        id: "faq-5",
        question: "Que se passe-t-il après les 14 jours?",
        answer: "Vous choisissez un plan ou arrêtez. Aucune carte requise pour l'essai. Vos données restent exportables."
    },
    {
        id: "faq-6",
        question: "Je peux annuler à tout moment?",
        answer: "Oui, sans justification et sans frais."
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