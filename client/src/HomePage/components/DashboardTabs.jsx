import React from "react";

function DashboardTabs({ activeTab, setActiveTab }) {
    const tabs = [
        { id: "comptabilite", label: "Comptabilité" },
        { id: "statistiques", label: "Statistiques" },
        { id: "productivite", label: "Productivité" }
    ];

    return (
        <div className="dashboard-tabs-container">
            <div className="dashboard-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`dashboard-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default DashboardTabs;
