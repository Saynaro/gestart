import { motion } from "framer-motion";
import "./Homepage.css";
import Header from "../components/Header";
import SideBar from "../components/SideBar";

function HomePage() {
    const stats = [
        { title: "Clients totaux", value: "8", change: "+12% ce mois", icon: "👥", color: "rgba(95, 75, 219, 0.08)" },
        { title: "Interventions aujourd'hui", value: "4", change: "2 en cours", icon: "📅", color: "rgba(59, 130, 246, 0.08)" },
        { title: "Messages non lus", value: "2", change: "Réponse attendue", icon: "💬", color: "rgba(16, 185, 129, 0.08)" },
        { title: "Chiffre d'affaires (Mois)", value: "3 420 €", change: "+8% vs juin", icon: "💳", color: "rgba(245, 158, 11, 0.08)" }
    ];

    const todayInterventions = [
        { title: "Entretien climatisation", client: "Jean Dupont", time: "09:00", status: "Confirmé" },
        { title: "Installation pompe à chaleur", client: "Sophie Martin", time: "11:00", status: "Confirmé" },
        { title: "Dépannage d'urgence - Fuite", client: "Pierre Leroy", time: "14:00", status: "En cours" }
    ];

    return (
        <div className="home-page">
            <SideBar />
            <div className="main-content">
                <Header />
                <motion.div 
                    className="page-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="content-header">
                        <h1 className="content-title">Tableau de bord</h1>
                        <p className="content-subtitle">Bienvenue sur votre espace d'administration ClimPro.</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="dashboard-stats-grid">
                        {stats.map((stat, i) => (
                            <div key={i} className="stat-card">
                                <div className="stat-card-header">
                                    <span className="stat-icon-bg" style={{ backgroundColor: stat.color }}>{stat.icon}</span>
                                    <span className="stat-change">{stat.change}</span>
                                </div>
                                <div className="stat-card-body">
                                    <span className="stat-value">{stat.value}</span>
                                    <h3 className="stat-title">{stat.title}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Layout panels */}
                    <div className="dashboard-panels">
                        {/* Panel 1 */}
                        <div className="dashboard-panel">
                            <div className="panel-header">
                                <h2>Aujourd'hui</h2>
                            </div>
                            <div className="panel-body">
                                <div className="mini-interventions-list">
                                    {todayInterventions.map((item, index) => (
                                        <div key={index} className="mini-intervention-item">
                                            <span className="mini-time">{item.time}</span>
                                            <div className="mini-details">
                                                <h4>{item.title}</h4>
                                                <p>{item.client}</p>
                                            </div>
                                            <span className={`mini-status ${item.status === "En cours" ? "active" : ""}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Panel 2 */}
                        <div className="dashboard-panel">
                            <div className="panel-header">
                                <h2>Raccourcis rapides</h2>
                            </div>
                            <div className="panel-body quick-actions-panel">
                                <button className="quick-action-btn">
                                    <span className="qa-icon">➕</span>
                                    <span>Planifier une intervention</span>
                                </button>
                                <button className="quick-action-btn">
                                    <span className="qa-icon">📄</span>
                                    <span>Créer un devis</span>
                                </button>
                                <button className="quick-action-btn">
                                    <span className="qa-icon">👤</span>
                                    <span>Ajouter un client</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default HomePage;