import { BentoCard, BentoGrid } from "@/components/ui/bento-grid.jsx";
import "./Functions.css";
import {
    MessageCircle,
    CalendarDays,
    UserRound,
    ReceiptText,
    PenLine,
    ChartBar,
    Smartphone,
    Bell
} from "lucide-react";

const features = [
    {
        name: "Rappels SMS automatiques",
        description:
            "Vos clients sont relancés sans que vous leviez le petit doigt",
        Icon: MessageCircle,
    },
    {
        name: "Planning techniciens",
        description:
            "Qui va où, à quelle heure. Vos équipes savent exactement quoi faire chaque matin",
        Icon: CalendarDays,
    },
    {
        name: "Fiches clients complètes",
        description:
            "Équipement, historique, notes d'accès. Tout au même endroit",
        Icon: UserRound,
    },
    {
        name: "Factures en 1 clic",
        description:
            "PDF professionnel envoyé par email. Paiement en ligne possible",
        Icon: ReceiptText,
    },
    {
        name: "Devis avec signature électronique",
        description:
            "Envoyez, le client signe sur son téléphone. Légalement valide",
        Icon: PenLine,
    },
    {
        name: "Rapports mensuels",
        description:
            "CA, interventions, techniciens. Sachez exactement où vous en êtes",
        Icon: ChartBar,
    },
    {
        name: "Application mobile",
        description:
            "Vos techniciens voient leurs interventions du jour sur leur téléphone",
        Icon: Smartphone,
    },
    {
        name: "Notifications en temps réel",
        description:
            "Un client répond ? Une facture payée ? Vous êtes alerté immédiatement",
        Icon: Bell,
    },
];

export default function Functions() {
    return (
        <section className="mx-auto max-w-6xl px-4">
            <BentoGrid>
                {features.map((feature) => (
                    <BentoCard
                        key={feature.name}
                        name={feature.name}
                        description={feature.description}
                        Icon={feature.Icon}
                        href="#"
                        cta="Découvrir"
                        background={
                            <div className="absolute inset-0 bg-gradient-to-br from-neutral-500/10 to-transparent" />
                        }
                    />
                ))}
            </BentoGrid>
        </section>
    );
};