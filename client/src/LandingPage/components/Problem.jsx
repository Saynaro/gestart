import "./Problem.css";
import { Notebook, Wallet, MessageCircle } from "lucide-react";

function Problem() {
    return (
        <section className="problem">
            <div className="problem-title">
                <h1 className="problem-title-h1">Vous reconnaissez-vous ?</h1>
                <p className="problem-text-center">La gestion d'une entreprise de maintenance ne devrait pas être un fardeau administratif.</p>
            </div>
            <div className="problem-grid">

                <div className="problem-card">
                    <Notebook size={40} className="text-red-400 mb-5" />
                    <h1>Chaos du carnet</h1>
                    <p>Planning sur papier, oublis de rendez-vous et ratures incessantes qui ralentissent votre journée.</p>
                </div>
                <div className="problem-card">
                    <MessageCircle size={40} className="text-blue-400 mb-5" />
                    <h1>Coordination WhatsApp</h1>
                    <p>Des dizaines de groupes pour vos techniciens, l'information se perd et les clients attendent.</p>
                </div>
                <div className="problem-card">
                    <Wallet size={40} className="text-red-400 mb-5" />
                    <h1>Revenus perdus</h1>
                    <p>50% des entretiens annuels sont oubliés car personne n'a le temps de relancer les clients.</p>
                </div>

            </div>
        </section>
    )
}

export default Problem;