import React from "react";
import { Edit3, Trash2, Tag, Percent } from "lucide-react";

function ArticleCard({ article, onEdit, onDelete, isReadOnly = false }) {
    const isService = article.category.toLowerCase().includes("prestation") || article.category.toLowerCase().includes("service");

    return (
        <div
            className="article-card"
            onClick={() => { if (!isReadOnly && onEdit) onEdit(article); }}
            style={{ cursor: isReadOnly ? "default" : "pointer" }}
        >
            <div className="article-card-header">
                <div className="article-main-info">
                    <div className="article-name-row">
                        <h3 className="article-name">{article.name}</h3>
                        {article.reference && (
                            <span className="article-ref-badge">
                                {article.reference}
                            </span>
                        )}
                    </div>
                    {article.description && (
                        <p className="article-description">{article.description}</p>
                    )}
                </div>

                {!isReadOnly && (
                    <div className="article-actions">
                        <button
                            className="article-action-btn edit-btn"
                            title="Modifier l'article"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onEdit) onEdit(article);
                            }}
                        >
                            <Edit3 size={16} />
                        </button>
                        <button
                            className="article-action-btn delete-btn"
                            title="Supprimer l'article"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onDelete) onDelete(article.id);
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            <div className="article-card-footer">
                <div className="article-category-badge-box">
                    <span className={`article-cat-badge ${isService ? "service" : "goods"}`}>
                        <Tag size={12} />
                        {article.category}
                    </span>
                </div>

                <div className="article-price-box">
                    <div className="price-ht-value">
                        {Number(article.unitPrice).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € <span className="price-unit-label">HT</span>
                    </div>
                    <span className="tva-badge">
                        <Percent size={11} /> TVA {article.tvaRate}%
                    </span>
                </div>
            </div>
        </div>
    );
}

export default ArticleCard;
