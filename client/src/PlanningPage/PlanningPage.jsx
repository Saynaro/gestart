import React, { useState } from "react";
import { motion } from "framer-motion";
import "../HomePage/Homepage.css";
import "./PlanningPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";

const mockInterventions = [
    { id: 1, title: "Entretien climatisation", client: "Jean Dupont", company: "AluTech SAS", time: "09:00 - 10:30", type: "Entretien", status: "Confirmé" },
    { id: 2, title: "Installation pompe à chaleur", client: "Sophie Martin", company: "BatiConstruct", time: "11:00 - 13:00", type: "Installation", status: "Confirmé" },
    { id: 3, title: "Dépannage d'urgence - Fuite", client: "Pierre Leroy", company: "Chauffage Pro", time: "14:00 - 15:30", type: "Dépannage", status: "En cours" },
    { id: 4, title: "Contrôle d'étanchéité", client: "Marie Dubois", company: "EcoEnergie", time: "16:00 - 17:00", type: "Contrôle", status: "Planifié" }
];

function PlanningPage() {
    const [selectedDate, setSelectedDate] = useState("Aujourd'hui");

    const days = [
        { label: "Lun 13", date: "Hier" },
        { label: "Mar 14", date: "Aujourd'hui" },
        { label: "Mer 15", date: "Demain" },
        { label: "Jeu 16", date: "Jeu 16 Juil" },
        { label: "Ven 17", date: "Ven 17 Juil" }
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
                    <div className="content-header-row">
                        <div className="content-header">
                            <h1 className="content-title">Planning</h1>
                            <p className="content-subtitle">Gérez les interventions de vos techniciens sur le terrain.</p>
                        </div>
                        <button className="new-intervention-btn">
                            + Nouvelle Intervention
                        </button>
                    </div>

                    {/* Day selector */}
                    <div className="day-selector">
                        {days.map((day, index) => (
                            <button 
                                key={index} 
                                className={`day-btn ${selectedDate === day.date ? "active" : ""}`}
                                onClick={() => setSelectedDate(day.date)}
                            >
                                <span className="day-label">{day.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Timeline of interventions */}
                    <div className="timeline-container">
                        <div className="timeline-header-meta">
                            Interventions de {selectedDate.toLowerCase()}
                        </div>
                        <div className="interventions-list">
                            {mockInterventions.map((item) => (
                                <div key={item.id} className="intervention-card">
                                    <div className="intervention-time-col">
                                        <span className="intervention-time">{item.time}</span>
                                        <span className={`type-tag type-${item.type.toLowerCase()}`}>{item.type}</span>
                                    </div>
                                    
                                    <div className="intervention-body">
                                        <h3 className="intervention-title">{item.title}</h3>
                                        <div className="intervention-client-info">
                                            <span className="client-name">{item.client}</span>
                                            <span className="client-separator">•</span>
                                            <span className="client-company">{item.company}</span>
                                        </div>
                                    </div>

                                    <div className="intervention-status">
                                        <span className={`status-dot-pill status-${item.status.toLowerCase().replace(" ", "-")}`}>
                                            <span className="dot"></span>
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default PlanningPage;
