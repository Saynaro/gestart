import "./Comments.css";
import { Star } from "lucide-react";
import { AuroraText } from "@/components/ui/aurora-text";
const testimonials = [
    {
        quote: "Avant GestArt je perdais facilement 3-4 entretiens par mois. Maintenant le système rappelle mes clients tout seul. J'ai récupéré plus de 400€/mois.",
        name: "Thomas M.",
        role: "Installateur climatisation",
        city: "Lyon",
        rating: 5,
        initials: "TM",
        gradient: "linear-gradient(135deg, #005371 0%, #1e293b 100%)"
    },
    {
        quote: "Mes techniciens n'appellent plus pour savoir où ils vont. Tout est sur leur téléphone. Ça m'économise 1h par jour.",
        name: "Marie L.",
        role: "Chauffagiste",
        city: "Bordeaux",
        rating: 5,
        initials: "ML",
        gradient: "linear-gradient(135deg, #10b981 0%, #047857 100%)"
    },
    {
        quote: "La facture est générée automatiquement après chaque intervention. Mon comptable est content, moi aussi.",
        name: "Pascal D.",
        role: "Plombier-chauffagiste",
        city: "Nantes",
        rating: 5,
        initials: "PD",
        gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
    }
];
function Comments() {
    return (
        <section className="comments-section" id="testimonials">
            <div className="comments-header">
                <span className="comments-badge">
                    <AuroraText>Témoignages</AuroraText>
                </span>
                <h2 className="comments-title">
                    Ils ont choisi <span className="highlight-text">GestArt</span>
                </h2>
                <p className="comments-subtitle">
                    Découvrez comment nos artisans économisent du temps et de l'argent au quotidien grâce à nos outils automatisés.
                </p>
            </div>
            <div className="comments-grid">
                {testimonials.map((t, idx) => (
                    <div key={idx} className="comment-card">
                        <div className="card-stars">
                            {Array.from({ length: t.rating }).map((_, i) => (
                                <Star key={i} size={18} fill="#f59e0b" stroke="#f59e0b" />
                            ))}
                        </div>

                        <blockquote className="card-quote">
                            “{t.quote}”
                        </blockquote>
                        <div className="card-divider"></div>
                        <div className="card-author">
                            <div className="author-avatar" style={{ background: t.gradient }}>
                                {t.initials}
                            </div>
                            <div className="author-info">
                                <span className="author-name">{t.name}</span>
                                <span className="author-meta">
                                    {t.role} <span className="meta-bullet">•</span> {t.city}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
export default Comments;