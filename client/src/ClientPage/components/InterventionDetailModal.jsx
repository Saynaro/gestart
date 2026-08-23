import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Calendar,
    Clock,
    User,
    MapPin,
    Wrench,
    FileText,
    Camera,
    PenTool,
    Key,
    CheckCircle2,
    AlertCircle,
    Info,
    ZoomIn,
    AlertTriangle
} from "lucide-react";
import { apiFetch } from "../../utils/api";

export const getInterventionStatusInfo = (item) => {
    if (!item) return { label: "Prévue", color: "#556B2F", bg: "rgba(85, 107, 47, 0.12)", icon: <Calendar size={13} /> };
    const raw = item.raw || item;
    const rawStatus = raw.status || item.statusKey || "PENDING";

    if (rawStatus === "COMPLETED") {
        return { label: "Terminée", color: "#16a34a", bg: "rgba(22, 163, 74, 0.12)", icon: <CheckCircle2 size={13} /> };
    }
    if (rawStatus === "CANCELLED") {
        return { label: "Annulée", color: "#dc2626", bg: "rgba(220, 38, 38, 0.12)", icon: <AlertCircle size={13} /> };
    }
    if (rawStatus === "IN_PROGRESS") {
        return { label: "En cours", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)", icon: <Clock size={13} /> };
    }

    const scheduledAt = raw.scheduledAt || item.scheduledAt;
    if (scheduledAt) {
        const schedTime = new Date(scheduledAt).getTime();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        if (schedTime < todayStart) {
            return { label: "En retard", color: "#ea580c", bg: "rgba(234, 88, 12, 0.12)", icon: <AlertTriangle size={13} /> };
        }
    }

    return { label: "Prévue", color: "#556B2F", bg: "rgba(85, 107, 47, 0.12)", icon: <Calendar size={13} /> };
};

function InterventionDetailModal({ isOpen, onClose, intervention, client }) {
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const [liveData, setLiveData] = useState(null);

    // Fetch fresh details from server if modal opens
    useEffect(() => {
        let isMounted = true;
        if (isOpen && intervention?.id) {
            setLiveData(null);
            apiFetch(`/v1/interventions/${intervention.id}`)
                .then(res => {
                    if (isMounted && res?.data?.intervention) {
                        setLiveData(res.data.intervention);
                    }
                })
                .catch(err => console.warn("[FETCH_INTERVENTION_DETAIL_WARN]", err.message));
        }
        return () => { isMounted = false; };
    }, [isOpen, intervention?.id]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                if (previewPhoto) {
                    setPreviewPhoto(null);
                } else if (isOpen) {
                    onClose();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, previewPhoto, onClose]);

    if (!isOpen || !intervention) return null;

    const raw = liveData || intervention.raw || intervention;
    const title = intervention.title || raw.title || raw.type || "Intervention";
    const serviceType = raw.type || raw.serviceType || intervention.type || "Intervention";
    const techName = intervention.tech || (raw.technician ? `${raw.technician.firstName || ''} ${raw.technician.lastName || ''}`.trim() || raw.technician.email : "Non assigné");
    const address = intervention.address || raw.address || client?.address || "Non renseignée";
    const city = intervention.city || raw.city || client?.city || "";
    const accessCode = intervention.accessCode || raw.accessCode || client?.notes || "";
    const description = (raw.description || intervention.description || "").trim();
    const techNotes = (raw.techNotes || intervention.techNotes || "").trim();
    const materialsUsed = (raw.materialsUsed || intervention.materialsUsed || "").trim();
    const signature = raw.clientSignature || intervention.clientSignature;
    const signedAt = raw.clientSignedAt ? new Date(raw.clientSignedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (intervention.clientSignedAt || null);

    const photos = raw.photos || intervention.photos || [];
    const beforePhotos = photos.filter(p => (p.photoType === "BEFORE" || p.type === "before" || p.category === "before"));
    const afterPhotos = photos.filter(p => (p.photoType === "AFTER" || p.type === "after" || p.category === "after"));
    const otherPhotos = photos.filter(p => !beforePhotos.includes(p) && !afterPhotos.includes(p));

    const statusInfo = getInterventionStatusInfo(raw);

    const displayDate = intervention.fullDate || (raw.scheduledAt ? new Date(raw.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : intervention.date || "Date non définie");
    const displayTime = raw.scheduledAt ? new Date(raw.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;

    return (
        <AnimatePresence>
            <div className="intervention-detail-modal-overlay" onClick={onClose}>
                <motion.div
                    className="intervention-detail-modal-card"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Header */}
                    <div className="idm-header">
                        <div className="idm-header-left">
                            <div className="idm-header-icon-box">
                                <Wrench size={20} />
                            </div>
                            <div>
                                <div className="idm-header-title-row">
                                    <h2 className="idm-title">{title}</h2>
                                    <span
                                        className="idm-status-pill"
                                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                                    >
                                        {statusInfo.icon}
                                        <span>{statusInfo.label}</span>
                                    </span>
                                </div>
                                <p className="idm-subtitle">
                                    {serviceType} · Client : {client?.name || (client?.firstName ? `${client?.firstName || ''} ${client?.lastName || ''}`.trim() : "Client")}
                                </p>
                            </div>
                        </div>

                        <button className="idm-close-btn" onClick={onClose} aria-label="Fermer">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="idm-body">
                        {/* Essential Info Grid */}
                        <div className="idm-grid-2col">
                            {/* Date & Time */}
                            <div className="idm-info-tile">
                                <div className="idm-tile-icon-circle">
                                    <Calendar size={17} />
                                </div>
                                <div className="idm-tile-text">
                                    <span className="idm-tile-label">Date & Horaire</span>
                                    <span className="idm-tile-val">
                                        {displayDate} {displayTime ? `à ${displayTime}` : ""}
                                    </span>
                                    {raw.estimatedDuration && (
                                        <span className="idm-tile-sub">Durée estimée : {raw.estimatedDuration} min</span>
                                    )}
                                </div>
                            </div>

                            {/* Location & Address */}
                            <div className="idm-info-tile">
                                <div className="idm-tile-icon-circle">
                                    <MapPin size={17} />
                                </div>
                                <div className="idm-tile-text">
                                    <span className="idm-tile-label">Adresse d'intervention</span>
                                    <span className="idm-tile-val">
                                        {address} {city ? `(${city})` : ""}
                                    </span>
                                    {accessCode && (
                                        <span className="idm-tile-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Key size={12} /> Digicode : <strong>{accessCode}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Technician */}
                            <div className="idm-info-tile">
                                <div className="idm-tile-icon-circle">
                                    <User size={17} />
                                </div>
                                <div className="idm-tile-text">
                                    <span className="idm-tile-label">Technicien assigné</span>
                                    <span className="idm-tile-val">{techName}</span>
                                </div>
                            </div>

                            {/* Execution times if completed/started */}
                            <div className="idm-info-tile">
                                <div className="idm-tile-icon-circle">
                                    <Clock size={17} />
                                </div>
                                <div className="idm-tile-text">
                                    <span className="idm-tile-label">Horodatage réel</span>
                                    <span className="idm-tile-val">
                                        {raw.startedAt ? `Début : ${new Date(raw.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : "Non démarrée"}
                                        {raw.completedAt ? ` · Fin : ${new Date(raw.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ""}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Description / Consignes */}
                        <div className="idm-section-card">
                            <div className="idm-section-header">
                                <FileText size={16} />
                                <span>Consignes & Description</span>
                            </div>
                            <div className="idm-section-content">
                                {description ? (
                                    <p>{description}</p>
                                ) : (
                                    <p className="idm-text-muted-italic">
                                        Aucune consigne particulière renseignée pour cette intervention.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Compte-rendu Technicien (si disponible) */}
                        {(techNotes || materialsUsed) && (
                            <div className="idm-section-card">
                                <div className="idm-section-header">
                                    <Wrench size={16} />
                                    <span>Compte-rendu du technicien</span>
                                </div>
                                <div className="idm-section-content">
                                    {techNotes && (
                                        <div style={{ marginBottom: materialsUsed ? '12px' : '0' }}>
                                            <strong style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Notes & Remarques :
                                            </strong>
                                            <p>{techNotes}</p>
                                        </div>
                                    )}
                                    {materialsUsed && (
                                        <div>
                                            <strong style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Matériel & Pièces utilisées :
                                            </strong>
                                            <p>{materialsUsed}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Photos Avant / Après */}
                        <div className="idm-section-card">
                            <div className="idm-section-header">
                                <Camera size={16} />
                                <span>Photos de l'intervention</span>
                                {photos.length > 0 && (
                                    <span className="idm-photo-count-badge">{photos.length} photo{photos.length > 1 ? "s" : ""}</span>
                                )}
                            </div>
                            <div className="idm-section-content">
                                {photos.length === 0 ? (
                                    <div className="idm-empty-state-box">
                                        <Camera size={26} className="idm-empty-icon" />
                                        <span className="idm-empty-title">Aucune photo jointe</span>
                                        <p className="idm-empty-desc">Aucune photo avant ou après n'a été enregistrée pour cette intervention.</p>
                                    </div>
                                ) : (
                                    <div className="idm-photos-wrapper">
                                        {/* Photos Avant */}
                                        {beforePhotos.length > 0 && (
                                            <div className="idm-photo-group">
                                                <h4 className="idm-photo-group-title">
                                                    <span className="idm-group-dot before" />
                                                    Photos Avant ({beforePhotos.length})
                                                </h4>
                                                <div className="idm-photo-grid">
                                                    {beforePhotos.map((photo, idx) => {
                                                        const src = photo.url || photo.photoUrl;
                                                        return (
                                                            <div
                                                                key={photo.id || idx}
                                                                className="idm-photo-thumb"
                                                                onClick={() => setPreviewPhoto(src)}
                                                                title="Agrandir la photo"
                                                            >
                                                                <img src={src} alt="Photo avant" />
                                                                <div className="idm-photo-overlay">
                                                                    <ZoomIn size={18} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Photos Après */}
                                        {afterPhotos.length > 0 && (
                                            <div className="idm-photo-group">
                                                <h4 className="idm-photo-group-title">
                                                    <span className="idm-group-dot after" />
                                                    Photos Après ({afterPhotos.length})
                                                </h4>
                                                <div className="idm-photo-grid">
                                                    {afterPhotos.map((photo, idx) => {
                                                        const src = photo.url || photo.photoUrl;
                                                        return (
                                                            <div
                                                                key={photo.id || idx}
                                                                className="idm-photo-thumb"
                                                                onClick={() => setPreviewPhoto(src)}
                                                                title="Agrandir la photo"
                                                            >
                                                                <img src={src} alt="Photo après" />
                                                                <div className="idm-photo-overlay">
                                                                    <ZoomIn size={18} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Other Photos */}
                                        {otherPhotos.length > 0 && (
                                            <div className="idm-photo-group">
                                                <h4 className="idm-photo-group-title">
                                                    <span className="idm-group-dot" />
                                                    Autres photos ({otherPhotos.length})
                                                </h4>
                                                <div className="idm-photo-grid">
                                                    {otherPhotos.map((photo, idx) => {
                                                        const src = photo.url || photo.photoUrl;
                                                        return (
                                                            <div
                                                                key={photo.id || idx}
                                                                className="idm-photo-thumb"
                                                                onClick={() => setPreviewPhoto(src)}
                                                                title="Agrandir la photo"
                                                            >
                                                                <img src={src} alt="Photo" />
                                                                <div className="idm-photo-overlay">
                                                                    <ZoomIn size={18} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Signature Client */}
                        <div className="idm-section-card">
                            <div className="idm-section-header">
                                <PenTool size={16} />
                                <span>Signature du client</span>
                            </div>
                            <div className="idm-section-content">
                                {signature ? (
                                    <div className="idm-signature-box">
                                        <div className="idm-sig-img-wrapper">
                                            <img src={signature} alt="Signature client" className="idm-sig-img" />
                                        </div>
                                        <div className="idm-sig-meta">
                                            <CheckCircle2 size={15} color="#16a34a" />
                                            <span>
                                                Signé par le client {signedAt ? `le ${signedAt}` : "à la fin de l'intervention"}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="idm-empty-state-box">
                                        <PenTool size={26} className="idm-empty-icon" />
                                        <span className="idm-empty-title">Signature non recueillie</span>
                                        <p className="idm-empty-desc">Le client n'a pas encore signé le bon de cette intervention.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="idm-footer">
                        <button
                            type="button"
                            className="idm-footer-close-btn"
                            onClick={onClose}
                        >
                            Fermer
                        </button>
                    </div>
                </motion.div>

                {/* Fullscreen Photo Lightbox */}
                {previewPhoto && (
                    <div
                        className="idm-photo-lightbox-overlay"
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPhoto(null);
                        }}
                    >
                        <button
                            className="idm-lightbox-close-btn"
                            onClick={() => setPreviewPhoto(null)}
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={previewPhoto}
                            alt="Aperçu photo"
                            className="idm-lightbox-image"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>
        </AnimatePresence>
    );
}

export default InterventionDetailModal;
