import React from "react";
import ArticleCard from "./ArticleCard";
import { PackageX, Plus, Lock } from "lucide-react";

function ArticleList({ articles, searchQuery, loading = false, onEdit, onDelete, onOpenNewModal, isReadOnly = false, isExpired = false }) {
    if (loading && (!articles || articles.length === 0)) {
        return (
            <div className="catalogue-grid-container">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                        key={i}
                        className="article-card"
                        style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                <div className="skeleton-shimmer" style={{ width: `${120 + (i % 3) * 35}px`, height: '18px', borderRadius: '6px' }} />
                                <div className="skeleton-shimmer" style={{ width: `${180 + (i % 2) * 40}px`, height: '12px', borderRadius: '4px', opacity: 0.6 }} />
                            </div>
                            <div className="skeleton-shimmer" style={{ width: '50px', height: '24px', borderRadius: '6px', opacity: 0.8 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                            <div className="skeleton-shimmer" style={{ width: '75px', height: '22px', borderRadius: '9999px' }} />
                            <div className="skeleton-shimmer" style={{ width: '85px', height: '20px', borderRadius: '6px' }} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

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
                        : "Votre catalogue est actuellement vide."}
                </p>
                {!isReadOnly && (
                    <button
                        className="catalogue-primary-add-btn"
                        onClick={() => onOpenNewModal()}
                        style={isExpired ? { display: 'inline-flex', alignItems: 'center', gap: '8px' } : {}}
                    >
                        {isExpired ? <Lock size={16} /> : <Plus size={18} />}
                        <span>Créer un article</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="catalogue-grid-container">
            {articles.map((article) => (
                <ArticleCard
                    key={article.id}
                    article={article}
                    onEdit={isReadOnly ? null : onEdit}
                    onDelete={isReadOnly ? null : onDelete}
                    isReadOnly={isReadOnly}
                    isExpired={isExpired}
                />
            ))}
        </div>
    );
}

export default ArticleList;
