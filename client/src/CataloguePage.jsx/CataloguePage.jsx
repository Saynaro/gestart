import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import CatalogueHeader from "./components/CatalogueHeader";
import ArticleList from "./components/ArticleList";
import NewArticleModal from "./components/NewArticleModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import { Plus } from "lucide-react";
import "./CataloguePage.css";

const INITIAL_MOCK_ARTICLES = [
    {
        id: 1,
        name: "Main d'œuvre diagnostic & recherche de panne",
        reference: "MO-DIAG-01",
        unitPrice: 85.00,
        tvaRate: 20,
        category: "Prestations de services (BIC / BNC)",
        description: "Déplacement, contrôle technique des unités intérieure/extérieure et diagnostic de panne."
    },
    {
        id: 2,
        name: "Entretien annuel Climatisation Inverter",
        reference: "ENT-CLIM-35",
        unitPrice: 120.00,
        tvaRate: 20,
        category: "Prestations de services (BIC / BNC)",
        description: "Nettoyage des filtres, désinfection des échangeurs, vérification des pressions et test d'étanchéité."
    },
    {
        id: 3,
        name: "Climatiseur Split Daikin Sensira 3.5kW",
        reference: "EQUIP-DAIKIN-35",
        unitPrice: 890.00,
        tvaRate: 20,
        category: "Matériel & Équipement",
        description: "Unité intérieure GTX35 + Unité extérieure. Gaz R32 très haute efficacité énergétique."
    },
    {
        id: 4,
        name: "Pompe à chaleur Air/Eau Mitsubishi Ecodan",
        reference: "EQUIP-MITS-8KW",
        unitPrice: 4250.00,
        tvaRate: 10,
        category: "Matériel & Équipement",
        description: "Système bi-bloc 8 kW pour chauffage et production d'eau chaude sanitaire."
    },
    {
        id: 5,
        name: "Reconstitution charge fluide frigorigène R32 (kg)",
        reference: "FLUIDE-R32",
        unitPrice: 65.00,
        tvaRate: 20,
        category: "Vente de marchandises (BIC)",
        description: "Appoint ou recharge complète en fluide frigorigène R32 certifié."
    },
    {
        id: 6,
        name: "Forfait déplacement zone 1 (0-30 km)",
        reference: "FORFAIT-DEP-Z1",
        unitPrice: 45.00,
        tvaRate: 20,
        category: "Autre prestation",
        description: "Frais de déplacement technicien pour rayon intervention de 30 km."
    }
];

import { apiFetch } from "../utils/api";
import { useUser } from "../utils/useUser";

function CataloguePage() {
    const { role } = useUser();
    const isTechnician = role === "TECHNICIAN";

    // Articles state
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCatalog = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/v1/catalog');
            const rawItems = data.data || data.items || (Array.isArray(data) ? data : []);
            const mappedArticles = rawItems.map(item => ({
                id: item.id,
                name: item.name || "Article",
                reference: item.reference || `REF-${item.id}`,
                unitPrice: Number(item.defaultPrice || item.unitPrice || 0),
                tvaRate: Number(item.tvaRate || 20),
                category: item.type === "PRODUCT" ? "Matériel & Équipement" : "Prestations de services (BIC / BNC)",
                unit: item.unit || "À l'unité",
                description: item.description || ""
            }));
            setArticles(mappedArticles);
        } catch (err) {
            console.warn("API catalogue non disponible:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCatalog();
    }, []);

    // Search and Category Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");

    // Modals States
    const [showArticleModal, setShowArticleModal] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [deletingArticleId, setDeletingArticleId] = useState(null);

    // Scroll state for collapsing mobile FAB button on scroll down
    const [isFabCollapsed, setIsFabCollapsed] = useState(false);

    useEffect(() => {
        let lastScrollY = 0;

        const handleScroll = (e) => {
            const target = e.target;
            const currentScrollY = (target === document || target === window)
                ? window.scrollY
                : (target && target.scrollTop !== undefined ? target.scrollTop : 0);

            if (currentScrollY > lastScrollY && currentScrollY > 15) {
                // Scrolling down -> collapse FAB
                setIsFabCollapsed(true);
            } else if (currentScrollY < lastScrollY) {
                // Scrolling up -> expand FAB
                setIsFabCollapsed(false);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
        return () => window.removeEventListener("scroll", handleScroll, { capture: true });
    }, []);

    // Modal History Stack Management for iOS Swipe Back and Browser Back Button
    useEffect(() => {
        const handlePopState = () => {
            // If type picker sub-sheet is open, close it first
            if (showTypePicker) {
                setShowTypePicker(false);
                return;
            }
            // If delete confirmation modal is open, close it
            if (deletingArticleId) {
                setDeletingArticleId(null);
                return;
            }
            // If main article creation/editing modal is open, close it
            if (showArticleModal) {
                setShowArticleModal(false);
                setEditingArticle(null);
                return;
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [showTypePicker, deletingArticleId, showArticleModal]);

    // Modal Actions
    const handleOpenNewModal = (articleToEdit = null) => {
        setEditingArticle(articleToEdit);
        setShowArticleModal(true);
        window.history.pushState({ modalType: "article" }, "", window.location.href);
    };

    const handleCloseArticleModal = () => {
        setShowArticleModal(false);
        setEditingArticle(null);
        setShowTypePicker(false);
    };

    const handleOpenTypePicker = () => {
        setShowTypePicker(true);
        window.history.pushState({ modalType: "typePicker" }, "", window.location.href);
    };

    const handleOpenDeleteModal = (id) => {
        setDeletingArticleId(id);
        window.history.pushState({ modalType: "delete" }, "", window.location.href);
    };

    const handleCloseDeleteModal = () => {
        setDeletingArticleId(null);
    };

    // Save Article Handler
    const handleSaveArticle = async (articleData) => {
        try {
            const payload = {
                name: articleData.name,
                reference: articleData.reference,
                description: articleData.description,
                unitPrice: articleData.unitPrice,
                tvaRate: articleData.tvaRate,
                category: articleData.category,
                unit: articleData.unit,
                type: articleData.category?.includes("Matériel") ? "PRODUCT" : "SERVICE"
            };

            if (editingArticle && editingArticle.id) {
                await apiFetch(`/v1/catalog/${editingArticle.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                await apiFetch('/v1/catalog', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }
            await fetchCatalog();
        } catch (err) {
            console.error("Save catalog item API error:", err);
            alert(err.message || "Erreur lors de la sauvegarde de l'article");
        } finally {
            handleCloseArticleModal();
        }
    };

    // Delete Article Handler
    const handleConfirmDelete = async () => {
        if (deletingArticleId) {
            try {
                await apiFetch(`/v1/catalog/${deletingArticleId}`, {
                    method: 'DELETE'
                });
                await fetchCatalog();
            } catch (err) {
                console.error("Delete catalog item API error:", err);
                alert(err.message || "Erreur lors de la suppression");
            } finally {
                setDeletingArticleId(null);
            }
        }
    };

    // Filtered Articles Memo
    const filteredArticles = useMemo(() => {
        return articles.filter((article) => {
            // Search Query Filter
            const matchesSearch =
                !searchQuery ||
                article.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (article.reference && article.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (article.description && article.description.toLowerCase().includes(searchQuery.toLowerCase()));

            // Category Tab Filter
            let matchesCategory = true;
            if (activeCategory === "prestations") {
                matchesCategory = article.category.toLowerCase().includes("prestation") || article.category.toLowerCase().includes("service");
            } else if (activeCategory === "marchandises") {
                matchesCategory = article.category.toLowerCase().includes("marchandise");
            } else if (activeCategory === "materiel") {
                matchesCategory = article.category.toLowerCase().includes("matériel") || article.category.toLowerCase().includes("équipement");
            }

            return matchesSearch && matchesCategory;
        });
    }, [articles, searchQuery, activeCategory]);

    const articleToDelete = useMemo(() => {
        return articles.find((item) => item.id === deletingArticleId);
    }, [articles, deletingArticleId]);

    return (
        <div className="home-page catalogue-page-wrapper">
            <SideBar />
            <div className="main-content">
                <Header />
                <motion.div
                    className="page-content catalogue-page-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Header Section */}
                    <CatalogueHeader
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        activeCategory={activeCategory}
                        setActiveCategory={setActiveCategory}
                        totalCount={filteredArticles.length}
                        onOpenNewModal={isTechnician ? () => {} : () => handleOpenNewModal()}
                        isReadOnly={isTechnician}
                    />

                    {/* Article List / Empty State */}
                    <ArticleList
                        articles={filteredArticles}
                        searchQuery={searchQuery}
                        onEdit={isTechnician ? null : (article) => handleOpenNewModal(article)}
                        onDelete={isTechnician ? null : (id) => handleOpenDeleteModal(id)}
                        onOpenNewModal={isTechnician ? () => {} : () => handleOpenNewModal()}
                        isReadOnly={isTechnician}
                    />
                </motion.div>
            </div>

            {/* Mobile Floating FAB Action Button (Owner/Manager only) */}
            {!isTechnician && (
                <button
                    className={`catalogue-mobile-fab-btn ${isFabCollapsed ? "collapsed" : ""}`}
                    onClick={() => handleOpenNewModal()}
                    title="Créer un article"
                >
                    <div className="fab-icon">
                        <Plus size={20} />
                    </div>
                    <span className="fab-text">Créer un article</span>
                </button>
            )}

            {/* Create / Edit Article Modal (Desktop Modal & Mobile Bottom Sheet) */}
            <NewArticleModal
                isOpen={showArticleModal}
                onClose={handleCloseArticleModal}
                onSave={handleSaveArticle}
                editingArticle={editingArticle}
                showTypePicker={showTypePicker}
                setShowTypePicker={setShowTypePicker}
                openTypePicker={handleOpenTypePicker}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={!!deletingArticleId}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
                articleName={articleToDelete ? articleToDelete.name : ""}
            />
        </div>
    );
}

export default CataloguePage;
