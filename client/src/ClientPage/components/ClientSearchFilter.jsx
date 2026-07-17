import React from "react";
import { Search } from "lucide-react";

function ClientSearchFilter({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, placeholder = "Rechercher un client..." }) {
    const filters = ["Tous", "Urgent", "Bientôt", "OK"];

    return (
        <div className="client-search-filter-card">
            <div className="search-input-wrapper">
                <Search size={18} className="search-icon-left" />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input-field"
                />
            </div>
            
            <div className="status-filter-pills">
                {filters.map((filter) => (
                    <button
                        key={filter}
                        className={`status-pill-btn ${statusFilter === filter ? "active" : ""}`}
                        onClick={() => setStatusFilter(filter)}
                    >
                        {filter}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default ClientSearchFilter;
