import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Mail,
    Phone,
    User,
    Shield,
    Calendar,
    CheckCircle2,
    Copy,
    Check,
    Trash2
} from "lucide-react";

export default function TechnicianDetailModal({
    technician,
    isOpen,
    onClose,
    onDelete,
    isMobileView,
    isExpired
}) {
    const [copiedField, setCopiedField] = useState(null);

    if (!isOpen || !technician) return null;

    const fullName = `${technician.firstName || ""} ${technician.lastName || ""}`.trim() || technician.email;
    const initials = `${(technician.firstName || "T")[0]}${(technician.lastName || "E")[0]}`.toUpperCase();
    const isOwner = technician.role === "OWNER";
    const roleLabel = isOwner ? "Propriétaire" : technician.role === "MANAGER" ? "Manager" : "Technicien";

    const handleCopy = (text, field) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const formattedDate = technician.createdAt
        ? new Date(technician.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric"
          })
        : "Non renseignée";

    const content = (
        <div className="tech-detail-body">
            {/* Header Profile Hero */}
            <div className="tech-detail-hero">
                <div className="tech-detail-avatar">
                    {technician.avatarUrl ? (
                        <img src={technician.avatarUrl} alt={fullName} />
                    ) : (
                        <span>{initials}</span>
                    )}
                </div>
                <div className="tech-detail-hero-info">
                    <h3 className="tech-detail-name">{fullName}</h3>
                    <div className="tech-detail-badges">
                        <span className={`tech-role-badge ${isOwner ? "owner" : ""}`}>
                            {roleLabel}
                        </span>
                        <span className={`tech-status-badge ${technician.isActive !== false ? "active" : "pending"}`}>
                            <CheckCircle2 size={12} />
                            {technician.isActive !== false ? "Actif" : "Inactif"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Information Grid */}
            <div className="tech-detail-grid">
                <div className="tech-detail-item">
                    <div className="tech-detail-item-label">
                        <User size={14} />
                        <span>Prénom</span>
                    </div>
                    <span className="tech-detail-item-value">{technician.firstName || "—"}</span>
                </div>

                <div className="tech-detail-item">
                    <div className="tech-detail-item-label">
                        <User size={14} />
                        <span>Nom</span>
                    </div>
                    <span className="tech-detail-item-value">{technician.lastName || "—"}</span>
                </div>

                <div className="tech-detail-item full-width">
                    <div className="tech-detail-item-label">
                        <Mail size={14} />
                        <span>Email</span>
                    </div>
                    <div className="tech-detail-row-val">
                        <a href={`mailto:${technician.email}`} className="tech-detail-link">
                            {technician.email}
                        </a>
                        <button
                            type="button"
                            className="tech-detail-copy-btn"
                            onClick={() => handleCopy(technician.email, "email")}
                            title="Copier l'adresse email"
                        >
                            {copiedField === "email" ? <Check size={14} className="copied" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                <div className="tech-detail-item full-width">
                    <div className="tech-detail-item-label">
                        <Phone size={14} />
                        <span>Téléphone</span>
                    </div>
                    <div className="tech-detail-row-val">
                        {technician.phone ? (
                            <>
                                <a href={`tel:${technician.phone}`} className="tech-detail-link">
                                    {technician.phone}
                                </a>
                                <button
                                    type="button"
                                    className="tech-detail-copy-btn"
                                    onClick={() => handleCopy(technician.phone, "phone")}
                                    title="Copier le numéro de téléphone"
                                >
                                    {copiedField === "phone" ? <Check size={14} className="copied" /> : <Copy size={14} />}
                                </button>
                            </>
                        ) : (
                            <span className="tech-detail-muted">Non renseigné</span>
                        )}
                    </div>
                </div>

                <div className="tech-detail-item">
                    <div className="tech-detail-item-label">
                        <Shield size={14} />
                        <span>Rôle</span>
                    </div>
                    <span className="tech-detail-item-value">{roleLabel}</span>
                </div>

                <div className="tech-detail-item">
                    <div className="tech-detail-item-label">
                        <Calendar size={14} />
                        <span>Membre depuis</span>
                    </div>
                    <span className="tech-detail-item-value">{formattedDate}</span>
                </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="tech-detail-actions">
                <div className="tech-detail-contact-row">
                    {technician.phone && (
                        <a href={`tel:${technician.phone}`} className="tech-detail-btn primary">
                            <Phone size={15} />
                            <span>Appeler</span>
                        </a>
                    )}
                    <a href={`mailto:${technician.email}`} className="tech-detail-btn secondary">
                        <Mail size={15} />
                        <span>Envoyer un email</span>
                    </a>
                </div>
                {!isOwner && onDelete && (
                    <button
                        type="button"
                        className="tech-detail-btn danger full-width"
                        onClick={() => {
                            if (isExpired) {
                                window.dispatchEvent(new CustomEvent('subscription_expired', {
                                    detail: { message: "Votre abonnement a expiré. Pour modifier l'équipe, veuillez renouveler votre abonnement." }
                                }));
                                return;
                            }
                            onClose();
                            onDelete(technician);
                        }}
                    >
                        <Trash2 size={15} />
                        <span>Supprimer</span>
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isMobileView ? (
                /* Mobile Bottom Sheet (Шторка) */
                <div className="tech-sheet-backdrop" onClick={onClose}>
                    <motion.div
                        className="tech-bottom-sheet"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 320 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.15}
                        onDragEnd={(e, { offset, velocity }) => {
                            if (offset.y > 90 || velocity.y > 400) {
                                onClose();
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle Bar */}
                        <div className="tech-sheet-handle-zone">
                            <div className="tech-sheet-drag-pill" />
                        </div>

                        <div className="tech-sheet-header">
                            <h2>Fiche du technicien</h2>
                            <button className="tech-modal-close-btn" onClick={onClose} aria-label="Fermer">
                                <X size={20} />
                            </button>
                        </div>

                        {content}
                    </motion.div>
                </div>
            ) : (
                /* Desktop Modal */
                <div className="tech-modal-overlay" onClick={onClose}>
                    <motion.div
                        className="tech-modal-card tech-detail-modal-card"
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="tech-modal-header">
                            <h2>Fiche du technicien</h2>
                            <button className="tech-modal-close-btn" onClick={onClose} aria-label="Fermer">
                                <X size={20} />
                            </button>
                        </div>

                        {content}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
