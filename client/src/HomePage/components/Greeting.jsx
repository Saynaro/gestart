import React from "react";

function Greeting({ name = "Khalid" }) {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: "Bonjour", emoji: "👋" };
        if (hour < 18) return { text: "Bon après-midi", emoji: "🌤" };
        return { text: "Bonsoir", emoji: "🌙" };
    };

    const greeting = getGreeting();

    return (
        <div className="dashboard-greeting-container">
            <h1 className="dashboard-greeting">
                {greeting.text} {name} <span className="greeting-emoji">{greeting.emoji}</span>
            </h1>
            <p className="dashboard-greeting-subtitle">
                La journée avance bien, continuez sur cette lancée !
            </p>
        </div>
    );
}

export default Greeting;
