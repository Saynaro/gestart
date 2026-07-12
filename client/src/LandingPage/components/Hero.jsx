import { useRef } from "react";
import "./Hero.css";
import { CirclePlay, Calendar, MessageSquare, CreditCard } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";
import { AnimatedBeam } from "@/components/ui/animated-beam";

function Hero() {
    const containerRef = useRef(null);
    const leftRef = useRef(null);
    const middleRef = useRef(null);
    const rightRef = useRef(null);

    return (
        <>
            <div className="hero-container">
                <div className="hero-content">
                    <div className="hero-flow-container" ref={containerRef}>
                        <div className="flow-node">
                            <div className="flow-icon-wrapper left" ref={leftRef}>
                                <Calendar className="flow-icon" />
                            </div>
                            <span className="flow-label">Planning</span>
                        </div>
                        <div className="flow-node">
                            <div className="flow-icon-wrapper middle" ref={middleRef}>
                                <MessageSquare className="flow-icon" />
                            </div>
                            <span className="flow-label">Relance SMS</span>
                        </div>
                        <div className="flow-node">
                            <div className="flow-icon-wrapper right" ref={rightRef}>
                                <CreditCard className="flow-icon" />
                            </div>
                            <span className="flow-label">Payé</span>
                        </div>

                        <AnimatedBeam
                            containerRef={containerRef}
                            fromRef={leftRef}
                            toRef={middleRef}
                            curvature={-10}
                            duration={3.5}
                            gradientStartColor="rgb(0, 83, 113)"
                            gradientStopColor="rgb(1, 113, 153)"
                            pathColor="rgba(0, 83, 113, 0.6)"

                        />
                        <AnimatedBeam
                            containerRef={containerRef}
                            fromRef={middleRef}
                            toRef={rightRef}
                            curvature={-10}
                            duration={3.5}
                            gradientStartColor="rgb(1, 113, 153)"
                            gradientStopColor="#16a34a"
                            pathColor="rgba(0, 83, 113, 0.6)"
                        />
                    </div>

                    <h1 className="text-primary">Vos clients oublient leur entretien annuel. <br />
                        <span className="text-secondary">Vous perdez de l'argent.</span>
                    </h1>
                    <p>
                        GestArt rappelle automatiquement vos clients par SMS, planifie vos techniciens et génère vos factures.{" "}

                        <Highlighter action="highlight" color="#87CEFA">
                            En 5 minutes par jour.
                        </Highlighter>
                    </p>
                    <div className="hero-buttons">
                        <button className="primary-button">
                            <span className="desktop-text">Essayer gratuitement 14j</span>
                            <span className="mobile-text">Essai gratuit 14j</span>
                        </button>
                        <button className="secondary-button">
                            <span className="desktop-text">Voir le demo en 2 minutes</span>
                            <span className="mobile-text">Voir demo en 2 min.</span>
                            <CirclePlay />
                        </button>
                    </div>
                    <div className="hero-footer">
                        <span className="footer-item">✓ Sans engagement</span>
                        <span className="footer-item">✓ Sans carte bancaire</span>
                        <span className="footer-item">✓ Annulable à tout moment</span>
                    </div>
                </div>


            </div>
            <div className="hero-image">
                <img src="https://wp.sfdcdigital.com/en-us/wp-content/uploads/sites/4/2024/09/marquee-crm-examples_AdobeStock_653380739_COMPRESSED-2.jpg" alt="" />
            </div>
        </>
    )
}
export default Hero;