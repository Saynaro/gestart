import * as React from "react";
import "./Comments.css";
import { Quote } from "lucide-react";
import { AuroraText } from "@/components/ui/aurora-text";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const originalTestimonials = [
    {
        quote: "Avant GestArt je perdais facilement 3-4 entretiens par mois. Maintenant le système rappelle mes clients tout seul. J'ai récupéré plus de 400€/mois.",
        name: "Thomas M.",
        role: "Installateur climatisation",
        city: "Lyon",
        initials: "TM",
        gradient: "linear-gradient(135deg, #005371 0%, #1e293b 100%)"
    },
    {
        quote: "Mes techniciens n'appellent plus pour savoir où ils vont. Tout est sur leur téléphone. Ça m'économise 1h par jour.",
        name: "Marie L.",
        role: "Chauffagiste",
        city: "Bordeaux",
        initials: "ML",
        gradient: "linear-gradient(135deg, #10b981 0%, #047857 100%)"
    },
    {
        quote: "La facture est générée automatiquement après chaque intervention. Mon comptable est content, moi aussi.",
        name: "Pascal D.",
        role: "Plombier-chauffagiste",
        city: "Nantes",
        initials: "PD",
        gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
    },
    {
        quote: "Le support client m'a aidé à tout configurer en moins de 10 minutes. C'est simple, rapide et efficace au quotidien.",
        name: "Julien R.",
        role: "Électricien",
        city: "Marseille",
        initials: "JR",
        gradient: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)"
    }
];

// Duplicate list to ensure smooth infinite loop in Embla carousel
const testimonials = [...originalTestimonials, ...originalTestimonials];

function Comments() {
    const plugin = React.useMemo(
        () =>
            Autoplay({
                delay: 2000,
                stopOnInteraction: false,
                stopOnMouseEnter: true,
                playOnInit: true,
            }),
        []
    );

    return (
        <section className="comments-section" id="testimonials">
            <div className="comments-container-wrapper">
                <div className="comments-two-col-grid">

                    {/* Left Column: Heading and description */}
                    <div className="comments-info-side">
                        {/* <span className="comments-badge">
                            <AuroraText>Témoignages</AuroraText>
                        </span> */}
                        <h2 className="comments-title">
                            Ils ont choisi <span className="highlight-text">GestArt</span>
                        </h2>
                        <p className="comments-subtitle">
                            Découvrez comment nos artisans économisent du temps et de l'argent au quotidien grâce à nos outils automatisés.
                        </p>
                    </div>

                    {/* Right Column: Vertical Autoplay Carousel */}
                    <div className="comments-carousel-side">
                        {/* Soft overlay gradients for fade-out effect at top & bottom */}
                        <div className="carousel-fade-top" />

                        <Carousel
                            orientation="vertical"
                            opts={{
                                loop: true,
                                align: "start",
                            }}
                            plugins={[plugin]}
                            onMouseEnter={plugin.stop}
                            onMouseLeave={() => plugin.reset()}
                            className="comments-vertical-carousel"
                        >
                            <CarouselContent className="carousel-content-vertical-track">
                                {testimonials.map((t, idx) => (
                                    <CarouselItem key={idx} className="carousel-vertical-item">
                                        <Card className="testimonial-watermelon-card">
                                            <CardContent className="testimonial-watermelon-content">
                                                <div className="testimonial-card-header">
                                                    <div className="testimonial-card-author-info">
                                                        <Avatar className="testimonial-avatar-circle">
                                                            <div className="testimonial-avatar-fallback" style={{ background: t.gradient }}>
                                                                {t.initials}
                                                            </div>
                                                        </Avatar>
                                                        <div className="author-text-details">
                                                            <span className="testimonial-author-name">{t.name}</span>
                                                            <span className="testimonial-author-meta">
                                                                {t.role} <span className="meta-bullet">•</span> {t.city}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="testimonial-card-top-right">
                                                        <Quote className="testimonial-quote-icon" />
                                                    </div>
                                                </div>
                                                <p className="testimonial-quote-text">
                                                    "{t.quote}"
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>

                        <div className="carousel-fade-bottom" />
                    </div>

                </div>
            </div>
        </section>
    );
}

export default Comments;