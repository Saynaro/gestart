import React from "react";
import { Search, X, Package, Plus } from "lucide-react";

const CATEGORIES = [
    { id: "all", label: "Tous les articles" },
    { id: "prestations", label: "Prestations de services" },
    { id: "marchandises", label: "Vente de marchandises" },
    { id: "materiel", label: "Matériel & Équipements" }
];

function CatalogueHeader({
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    totalCount,
    onOpenNewModal,
    isReadOnly = false
}) {
    return (
        <div className="catalogue-header-wrapper">
            <div className="catalogue-title-row">
                <div className="catalogue-title-box">
                    <div className="catalogue-title-icon">
                        <Package size={22} />
                    </div>
                    <div>
                        <h1 className="content-title">Catalogue des articles</h1>
                        <p className="content-subtitle">
                            {isReadOnly ? "Consultez les produits, prestations de services et tarifs de référence." : "Gérez vos produits, prestations de services, tarifs HT et taux de TVA."}
                        </p>
                    </div>
                </div>

                {!isReadOnly && (
                    <button
                        className="catalogue-primary-add-btn desktop-only-btn"
                        onClick={() => onOpenNewModal()}
                    >
                        <Plus size={18} />
                        <span>Nouveau produit / service</span>
                    </button>
                )}
            </div>

            {/* Search and Filters Bar */}
            <div className="catalogue-controls-bar">
                <div className="catalogue-search-input-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        className="catalogue-search-input"
                        placeholder="Rechercher par désignation, référence..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            className="search-clear-btn"
                            onClick={() => setSearchQuery("")}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Category Tabs */}
                <div className="catalogue-category-tabs">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            className={`category-tab-btn ${activeCategory === cat.id ? "active" : ""}`}
                            onClick={(e) => {
                                setActiveCategory(cat.id);
                                e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                            }}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default CatalogueHeader;
