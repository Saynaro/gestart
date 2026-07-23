import React from "react";
import ArticleCard from "./ArticleCard";
import { PackageX, Plus } from "lucide-react";

function ArticleList({ articles, searchQuery, onEdit, onDelete, onOpenNewModal }) {
    if (articles.length === 0) {
        return (
            <div className="catalogue-empty-state">
                <div className="empty-icon-circle">
                    <PackageX size={32} />
                </div>
                <h3>Aucun article trouvé</h3>
                <p>
                    {searchQuery
                        ? `Aucun article ne correspond à la recherche "${searchQuery}".`
                        : "Votre catalogue est actuellement vide. Commencez par ajouter vos prestations et produits."}
                </p>
                <button
                    className="catalogue-primary-add-btn"
                    onClick={() => onOpenNewModal()}
                >
                    <Plus size={18} />
                    <span>Créer un article</span>
                </button>
            </div>
        );
    }

    return (
        <div className="catalogue-grid-container">
            {articles.map((article) => (
                <ArticleCard
                    key={article.id}
                    article={article}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

export default ArticleList;
