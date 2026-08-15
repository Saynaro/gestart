import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Tag, X, Check } from "lucide-react";

export default function CategoriesPersoTab({ isMobileView, triggerToast }) {
    const [categories, setCategories] = useState(() => {
        const saved = localStorage.getItem("custom_expense_categories");
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            { id: 1, name: "Matériel & Outillage", color: "#5B4DDB", icon: "🔧", type: "Dépense" },
            { id: 2, name: "Carburant & Déplacements", color: "#22C55E", icon: "🚗", type: "Dépense" },
            { id: 3, name: "Téléphonie & Abonnements", color: "#3B82F6", icon: "📱", type: "Dépense" },
            { id: 4, name: "Sous-traitance & Renfort", color: "#F59E0B", icon: "👷", type: "Dépense" },
            { id: 5, name: "Fournitures bureau & Logicielles", color: "#EC4899", icon: "💻", type: "Dépense" }
        ];
    });

    useEffect(() => {
        localStorage.setItem("custom_expense_categories", JSON.stringify(categories));
    }, [categories]);

    const [showModal, setShowModal] = useState(false);
    const [editingCatId, setEditingCatId] = useState(null);
    const [catName, setCatName] = useState("");
    const [catColor, setCatColor] = useState("#5B4DDB");
    const [catIcon, setCatIcon] = useState("🏷️");

    const availableIcons = ["🔧", "🚗", "📱", "👷", "💻", "🏷️", "⚡", "❄️", "🔥", "🚚", "📦", "🏢"];
    const availableColors = ["#5B4DDB", "#22C55E", "#3B82F6", "#F59E0B", "#EC4899", "#EF4444", "#8B5CF6", "#14B8A6"];

    const handleOpenCreate = () => {
        setEditingCatId(null);
        setCatName("");
        setCatColor("#5B4DDB");
        setCatIcon("🏷️");
        setShowModal(true);
    };

    const handleOpenEdit = (cat) => {
        setEditingCatId(cat.id);
        setCatName(cat.name);
        setCatColor(cat.color);
        setCatIcon(cat.icon);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) {
            setCategories(prev => prev.filter(c => c.id !== id));
            triggerToast("Catégorie supprimée !");
        }
    };

    const handleSaveSubmit = (e) => {
        e.preventDefault();
        if (!catName) {
            triggerToast("Veuillez saisir un nom de catégorie", true);
            return;
        }

        if (editingCatId) {
            setCategories(prev => prev.map(c => c.id === editingCatId ? { ...c, name: catName, color: catColor, icon: catIcon } : c));
            triggerToast("Catégorie mise à jour !");
        } else {
            const newCat = {
                id: Date.now(),
                name: catName,
                color: catColor,
                icon: catIcon,
                type: "Dépense"
            };
            setCategories(prev => [...prev, newCat]);
            triggerToast("Nouvelle catégorie créée !");
        }
        setShowModal(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Tag size={18} style={{ color: 'var(--sidebar-primary)' }} />
                            Catégories Personnalisées de Dépenses
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                            Affectez vos justificatifs d'achats à des catégories adaptées à votre activité climatique.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        style={{ padding: '9px 16px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={15} />
                        Ajouter une catégorie
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 14px',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                backgroundColor: 'var(--background)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '8px',
                                    backgroundColor: `${cat.color}15`,
                                    color: cat.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px'
                                }}>
                                    {cat.icon}
                                </div>
                                <div>
                                    <span style={{ fontSize: '13.5px', fontWeight: 700, display: 'block' }}>{cat.name}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{cat.type}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleOpenEdit(cat)}
                                    style={{ border: 'none', background: 'transparent', padding: '6px', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                                >
                                    <Edit3 size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(cat.id)}
                                    style={{ border: 'none', background: 'transparent', padding: '6px', cursor: 'pointer', color: '#ef4444' }}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Create/Edit */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ backgroundColor: 'var(--card)', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                                {editingCatId ? "Modifier la catégorie" : "Nouvelle catégorie de dépense"}
                            </h4>
                            <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label className="form-label">Nom de la catégorie</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={catName}
                                    onChange={(e) => setCatName(e.target.value)}
                                    placeholder="ex: Outillage Frigorifique"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label">Icône</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {availableIcons.map((ic) => (
                                        <button
                                            key={ic}
                                            type="button"
                                            onClick={() => setCatIcon(ic)}
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                border: catIcon === ic ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                                backgroundColor: catIcon === ic ? 'rgba(91, 77, 219, 0.1)' : 'var(--background)',
                                                fontSize: '18px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {ic}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Couleur</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {availableColors.map((col) => (
                                        <button
                                            key={col}
                                            type="button"
                                            onClick={() => setCatColor(col)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                backgroundColor: col,
                                                border: catColor === col ? '3px solid var(--foreground)' : 'none',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', fontWeight: 600, fontSize: '13px' }}>
                                    Annuler
                                </button>
                                <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--sidebar-primary)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                                    {editingCatId ? "Mettre à jour" : "Créer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
