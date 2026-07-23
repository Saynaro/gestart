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

function CataloguePage() {
    // Articles state (persisted in localStorage)
    const [articles, setArticles] = useState(() => {
        try {
            const saved = localStorage.getItem("catalogue_articles_v1");
            return saved ? JSON.parse(saved) : INITIAL_MOCK_ARTICLES;
        } catch (e) {
            return INITIAL_MOCK_ARTICLES;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem("catalogue_articles_v1", JSON.stringify(articles));
        } catch (e) {
            // Ignore storage errors
        }
    }, [articles]);

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
    const handleSaveArticle = (articleData) => {
        if (editingArticle) {
            setArticles((prev) =>
                prev.map((item) => (item.id === articleData.id ? articleData : item))
            );
        } else {
            setArticles((prev) => [articleData, ...prev]);
        }
    };

    // Delete Article Handler
    const handleConfirmDelete = () => {
        if (deletingArticleId) {
            setArticles((prev) => prev.filter((item) => item.id !== deletingArticleId));
            setDeletingArticleId(null);
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
                        onOpenNewModal={() => handleOpenNewModal()}
                    />

                    {/* Article List / Empty State */}
                    <ArticleList
                        articles={filteredArticles}
                        searchQuery={searchQuery}
                        onEdit={(article) => handleOpenNewModal(article)}
                        onDelete={(id) => handleOpenDeleteModal(id)}
                        onOpenNewModal={() => handleOpenNewModal()}
                    />
                </motion.div>
            </div>

            {/* Mobile Floating FAB Action Button (collapses into circle on scroll down) */}
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
