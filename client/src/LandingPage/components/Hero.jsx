import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Hero.css";
import { CirclePlay, Calendar, MessageSquare, FileSignature, FileText, CreditCard, BarChart3 } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { isAuthenticated } from "../../utils/auth";
import DemoModal from "./DemoModal";

function Hero() {
    const navigate = useNavigate();
    const loggedIn = isAuthenticated();
    const [isDemoOpen, setIsDemoOpen] = useState(false);
    const containerRef = useRef(null);
    const node1Ref = useRef(null);
    const node2Ref = useRef(null);
    const node3Ref = useRef(null);
    const node4Ref = useRef(null);
    const node5Ref = useRef(null);
    const node6Ref = useRef(null);

    return (
        <>
            <div className="hero-container">
                <div className="hero-content">
                    <div className="hero-flow-container" ref={containerRef}>
                        <div className="flow-node">
                            <div className="flow-icon-wrapper node1" ref={node1Ref}>
                                <Calendar className="flow-icon" />
                            </div>
                            <span className="flow-label">Planning</span>
                        </div>
                        <div className="flow-node">
                            <div className="flow-icon-wrapper node2" ref={node2Ref}>
                                <MessageSquare className="flow-icon" />
                            </div>
                            <span className="flow-label">SMS auto</span>
                        </div>
                        <div className="flow-node">
                            <div className="flow-icon-wrapper node3" ref={node3Ref}>
                                <FileSignature className="flow-icon" />
                            </div>
                            <span className="flow-label">Devis</span>
                        </div>
                        <div className="flow-node">
                            <div className="flow-icon-wrapper node4" ref={node4Ref}>
                                <FileText className="flow-icon" />
                            </div>
                            <span className="flow-label">Factures</span>
                        </div>
                        <div className="flow-node">
                            <div className="flow-icon-wrapper node5" ref={node5Ref}>
                                <CreditCard className="flow-icon" />
                            </div>
                            <span className="flow-label">Paiement</span>
                        </div>
                        <div className="flow-node">
                            <div className="flow-icon-wrapper node6" ref={node6Ref}>
                                <BarChart3 className="flow-icon" />
                            </div>
                            <span className="flow-label">Rapports</span>
                        </div>

                        <AnimatedBeam
                            containerRef={containerRef}
                            fromRef={node1Ref}
                            toRef={node2Ref}
                            curvature={0}
                            duration={3}
                            gradientStartColor="rgb(0, 83, 113)"
                            gradientStopColor="rgb(1, 113, 153)"
                            pathColor="rgba(0, 83, 113, 0.15)"
                        />
                        <AnimatedBeam
                            containerRef={containerRef}
                            fromRef={node2Ref}
                            toRef={node3Ref}
                            curvature={0}
                            duration={3}
                            gradientStartColor="rgb(1, 113, 153)"
                            gradientStopColor="rgb(91, 77, 219)"
                            pathColor="rgba(0, 83, 113, 0.15)"
                        />
                        <AnimatedBeam
                            containerRef={containerRef}
                            fromRef={node3Ref}
                            toRef={node4Ref}
                            curvature={0}
                            duration={3}
                            gradientStartColor="rgb(91, 77, 219)"
                            gradientStopColor="rgb(168, 85, 247)"
                            pathColor="rgba(0, 83, 113, 0.15)"
                        />
                        <AnimatedBeam
                            containerRef={containerRef}
                            fromRef={node4Ref}
                            toRef={node5Ref}
                            curvature={0}
                            duration={3}
                            gradientStartColor="rgb(168, 85, 247)"
                            gradientStopColor="#16a34a"
                            pathColor="rgba(0, 83, 113, 0.15)"
                        />
                        <AnimatedBeam
                            containerRef={containerRef}
                            fromRef={node5Ref}
                            toRef={node6Ref}
                            curvature={0}
                            duration={3}
                            gradientStartColor="#16a34a"
                            gradientStopColor="rgb(234, 88, 12)"
                            pathColor="rgba(0, 83, 113, 0.15)"
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
                        <button className="primary-button" onClick={() => navigate(loggedIn ? '/home' : '/register')}>
                            <span className="desktop-text">{loggedIn ? 'Accéder à mon espace →' : 'Essayer gratuitement 14j'}</span>
                            <span className="mobile-text">{loggedIn ? 'Mon Espace' : 'Essai gratuit 14j'}</span>
                        </button>
                        <button 
                            className="secondary-button" 
                            onClick={() => {
                                if (loggedIn) {
                                    navigate('/home');
                                } else {
                                    setIsDemoOpen(true);
                                }
                            }}
                        >
                            <span className="desktop-text">{loggedIn ? 'Tableau de bord' : 'Voir le demo en 2 minutes'}</span>
                            <span className="mobile-text">{loggedIn ? 'Tableau de bord' : 'Voir demo en 2 min.'}</span>
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
            <div className="hero-image" onClick={() => setIsDemoOpen(true)} title="Cliquez pour agrandir la démo" style={{ cursor: "pointer" }}>
                <img 
                    src="/image.png" 
                    alt="Tableau de bord de gestion de maintenance GestArt" 
                    width={920} 
                    height={560} 
                    fetchPriority="high" 
                    loading="eager" 
                />
            </div>

            <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
        </>
    )
}
export default Hero;