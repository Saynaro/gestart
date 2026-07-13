import { DiaTextReveal } from "@/components/ui/dia-text-reveal";
import { MagicCard } from "@/components/ui/magic-card";
import "./Solution.css";

import { UserRound, MessageCircle, Smartphone, Check, Zap } from "lucide-react";
function Solution() {
    return (
        <section className="solution-section">
            <div className="solution-header">
                <span className="solution-badge"><h1 className="text-3xl font-bold">
                    <DiaTextReveal
                        repeat
                        repeatDelay={1.2}
                        text={["Simple & Efficace"]}
                    />
                </h1></span>
                <h1 className="solution-title">GestArt fait le travail à votre place</h1>
                <p className="solution-subtitle">
                    Automatisez votre activité de maintenance en 3 étapes simples et concentrez-vous sur vos interventions.
                </p>
            </div>
            <div className="solution-grid">
                {/* Card 1 */}
                <MagicCard
                    className="solution-card"
                    gradientColor="rgba(0, 83, 113, 0.05)"
                    gradientFrom="rgb(0, 83, 113)"
                    gradientTo="rgba(0, 83, 113, 0.3)"
                >
                    <div className="card-number-bg">01</div>
                    <div className="card-header-row">
                        <div className="icon-wrapper wrapper-blue">
                            <UserRound size={24} className="icon-blue" />
                        </div>
                        <span className="step-tag tag-blue">Étape 1</span>
                    </div>

                    <h3 className="card-title">Ajoutez vos clients en 2 minutes</h3>

                    <p className="card-text">
                        Saisissez les informations essentielles : <strong>Nom, téléphone, équipement installé</strong>.
                    </p>

                    <div className="card-highlight-box">
                        <div className="highlight-icon-container">
                            <Zap size={14} className="highlight-icon" />
                        </div>
                        <span>GestArt calcule automatiquement la date du prochain entretien.</span>
                    </div>
                    <div className="card-tags">
                        <span className="feature-pill"><Check size={12} /> Nom & Tél</span>
                        <span className="feature-pill"><Check size={12} /> Équipement</span>
                        <span className="feature-pill"><Check size={12} /> Auto-calcul</span>
                    </div>
                </MagicCard>

                {/* Card 2 */}
                <MagicCard
                    className="solution-card"
                    gradientColor="rgba(109, 40, 217, 0.05)"
                    gradientFrom="rgb(109, 40, 217)"
                    gradientTo="rgba(109, 40, 217, 0.3)"
                >
                    <div className="card-number-bg">02</div>
                    <div className="card-header-row">
                        <div className="icon-wrapper wrapper-purple">
                            <MessageCircle size={24} className="icon-purple" />
                        </div>
                        <span className="step-tag tag-purple">Étape 2</span>
                    </div>

                    <h3 className="card-title">GestArt envoie les rappels SMS</h3>

                    <p className="card-text">
                        Vos clients reçoivent un SMS automatique <strong>30 jours avant leur entretien</strong>.
                    </p>
                    <div className="card-highlight-box">
                        <div className="highlight-icon-container">
                            <Zap size={14} className="highlight-icon" />
                        </div>
                        <span>Ils répondent "Oui" → vous recevez instantanément une notification.</span>
                    </div>
                    <div className="card-tags">
                        <span className="feature-pill"><Check size={12} /> SMS Automatique</span>
                        <span className="feature-pill"><Check size={12} /> Relance 30j</span>
                        <span className="feature-pill"><Check size={12} /> Alertes "Oui"</span>
                    </div>
                </MagicCard>

                {/* Card 3 */}
                <MagicCard
                    className="solution-card"
                    gradientColor="rgba(21, 128, 61, 0.05)"
                    gradientFrom="rgb(21, 128, 61)"
                    gradientTo="rgba(21, 128, 61, 0.3)"
                >
                    <div className="card-number-bg">03</div>
                    <div className="card-header-row">
                        <div className="icon-wrapper wrapper-green">
                            <Smartphone size={24} className="icon-green" />
                        </div>
                        <span className="step-tag tag-green">Étape 3</span>
                    </div>

                    <h3 className="card-title">Vous planifiez en 1 clic</h3>

                    <p className="card-text">
                        Assignez un technicien à l'intervention, générez la facture de manière automatique et encaissez en ligne.
                    </p>
                    <div className="card-highlight-box">
                        <div className="highlight-icon-container">
                            <Zap size={14} className="highlight-icon" />
                        </div>
                        <span>Gérez l'ensemble de votre activité directement depuis votre téléphone portable.</span>
                    </div>
                    <div className="card-tags">
                        <span className="feature-pill"><Check size={12} /> 1-Clic Planning</span>
                        <span className="feature-pill"><Check size={12} /> Facture PDF</span>
                        <span className="feature-pill"><Check size={12} /> Paiement en ligne</span>
                    </div>
                </MagicCard>
            </div>
        </section>
    );
}
export default Solution;
