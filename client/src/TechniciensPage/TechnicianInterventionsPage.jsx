import React, { useState, useEffect, useRef } from "react";
import {
    Bell,
    MapPin,
    Clock,
    Key,
    Play,
    CheckCircle2,
    Camera,
    Trash2,
    Copy,
    Check,
    ArrowLeft,
    AlertCircle,
    FileText,
    User,
    Calendar,
    ChevronRight,
    Star,
    Shield
} from "lucide-react";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { apiFetch } from "../utils/api";
import { API_URL } from "../utils/config";
import "./TechnicianInterventionsPage.css";

export default function TechnicianInterventionsPage() {
    const [user, setUser] = useState(null);
    const [interventions, setInterventions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Selected intervention for Section 14.2 Detail view
    const [selectedIntervention, setSelectedIntervention] = useState(null);

    // Form / Execution State inside 14.2
    const [techNotes, setTechNotes] = useState("");
    const [beforePhotos, setBeforePhotos] = useState([]);
    const [afterPhotos, setAfterPhotos] = useState([]);
    const [uploadingBefore, setUploadingBefore] = useState(false);
    const [uploadingAfter, setUploadingAfter] = useState(false);

    // Signature Canvas State
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    // UI Confirmation Modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);

    // Toast Notification
    const [toast, setToast] = useState({ show: false, message: "", isError: false });
    const triggerToast = (message, isError = false) => {
        setToast({ show: true, message, isError });
        setTimeout(() => setToast({ show: false, message: "", isError: false }), 4000);
    };

    // Load current user profile & today's interventions
    const loadData = async () => {
        setLoading(true);
        try {
            const meRes = await apiFetch("/v1/users/me");
            const userData = meRes.data?.user || meRes.user;
            setUser(userData);

            const todayRes = await apiFetch("/v1/interventions/today");
            const list = todayRes.data?.interventions || todayRes.interventions || [];
            setInterventions(list);
        } catch (err) {
            console.warn("Erreur chargement interventions du jour:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Load full details when opening 14.2
    const handleOpenDetail = async (item) => {
        try {
            const res = await apiFetch(`/v1/interventions/${item.id}`);
            const fullItem = res.data?.intervention || res.intervention || item;
            setSelectedIntervention(fullItem);
            setTechNotes(fullItem.techNotes || "");

            const photos = fullItem.photos || [];
            setBeforePhotos(photos.filter(p => p.type === "before"));
            setAfterPhotos(photos.filter(p => p.type === "after"));
        } catch (err) {
            setSelectedIntervention(item);
        }
    };

    // Start Intervention (PATCH /v1/interventions/:id/start)
    const handleStartIntervention = async () => {
        if (!selectedIntervention) return;
        try {
            const res = await apiFetch(`/v1/interventions/${selectedIntervention.id}/start`, {
                method: "PATCH"
            });
            const updated = res.data?.intervention || res.intervention;
            setSelectedIntervention(prev => ({ ...prev, status: "IN_PROGRESS", startedAt: new Date() }));
            triggerToast("Intervention démarrée avec succès ! 🚀");
            loadData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors du démarrage", true);
        }
    };

    // Photo Upload (Cloudinary via POST /v1/interventions/:id/photos)
    const handleUploadPhoto = async (e, type) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !selectedIntervention) return;

        const isBefore = type === "before";
        if (isBefore) setUploadingBefore(true);
        else setUploadingAfter(true);

        try {
            const token = localStorage.getItem("accessToken");
            const formData = new FormData();
            formData.append("type", type);
            for (let i = 0; i < files.length; i++) {
                formData.append("photos", files[i]);
            }

            const response = await fetch(`${API_URL}/v1/interventions/${selectedIntervention.id}/photos`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erreur upload photo");

            const newPhotos = data.data?.photos || data.photos || [];
            if (isBefore) {
                setBeforePhotos(prev => [...prev, ...newPhotos.filter(p => p.type === "before")]);
            } else {
                setAfterPhotos(prev => [...prev, ...newPhotos.filter(p => p.type === "after")]);
            }
            triggerToast("Photo enregistrée ! 📷");
        } catch (err) {
            triggerToast(err.message || "Erreur lors du téléchargement de la photo", true);
        } finally {
            if (isBefore) setUploadingBefore(false);
            else setUploadingAfter(false);
        }
    };

    // Canvas Signature Handlers
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasSignature(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

        ctx.lineTo(x, y);
        ctx.strokeStyle = "#1E1B4B";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const handleClearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    // Complete Intervention (PATCH /v1/interventions/:id/complete)
    const handleConfirmComplete = async () => {
        if (!selectedIntervention) return;
        setIsCompleting(true);

        try {
            let signatureDataUrl = null;
            if (canvasRef.current && hasSignature) {
                signatureDataUrl = canvasRef.current.toDataURL("image/png");
            }

            const res = await apiFetch(`/v1/interventions/${selectedIntervention.id}/complete`, {
                method: "PATCH",
                body: JSON.stringify({
                    techNotes,
                    clientSignature: signatureDataUrl
                })
            });

            triggerToast("Intervention terminée avec succès ! Notification envoyée au gérant. 🎉");
            setShowConfirmModal(false);
            setSelectedIntervention(null);
            loadData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la clôture", true);
        } finally {
            setIsCompleting(false);
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCodeCopied(true);
        triggerToast("Code d'accès copié !");
        setTimeout(() => setCodeCopied(false), 3000);
    };

    const todayDateFormatted = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    const formattedFirstName = user?.firstName || "Technicien";

    return (
        <div className="tech-interventions-container">
            <SideBar activePath="/planning" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Header />
                <main className="tech-interventions-main">

                    {/* Toast Alert */}
                    {toast.show && (
                        <div style={{
                            position: 'fixed', top: '20px', right: '20px', zIndex: 999999,
                            backgroundColor: toast.isError ? '#ef4444' : '#22c55e', color: '#fff',
                            padding: '12px 20px', borderRadius: '12px', fontWeight: 600,
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                        }}>
                            {toast.message}
                        </div>
                    )}

                    {/* 14.1 HEADER */}
                    <div className="tech-header-card">
                        <div>
                            <h1 className="tech-header-greeting">Bonjour {formattedFirstName} 👋</h1>
                            <p className="tech-header-date">{todayDateFormatted}</p>
                        </div>
                        <div className="tech-notif-bell" title="Notifications">
                            <Bell size={22} />
                            <span className="tech-notif-badge" />
                        </div>
                    </div>

                    {/* 14.1 LISTE INTERVENTIONS DU JOUR */}
                    <div className="tech-list-title">
                        <Calendar size={20} style={{ color: '#6366F1' }} />
                        Mes Interventions du jour ({interventions.length})
                    </div>

                    {loading ? (
                        <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '30px' }}>Chargement de vos interventions...</p>
                    ) : interventions.length === 0 ? (
                        <div style={{
                            background: 'var(--card)', border: '1px solid var(--border)',
                            borderRadius: '16px', padding: '32px', textAlign: 'center', color: 'var(--muted-foreground)'
                        }}>
                            <CheckCircle2 size={40} style={{ color: '#22c55e', marginBottom: '12px' }} />
                            <h3 style={{ margin: '0 0 6px 0', color: 'var(--foreground)' }}>Aucune intervention prévue aujourd'hui</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Bonne journée ! Vous pouvez consulter votre planning général si besoin.</p>
                        </div>
                    ) : (
                        <div className="tech-cards-list">
                            {interventions.map((item) => {
                                const timeStr = item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }) : "09:00";
                                const clientName = item.client ? `${item.client.firstName} ${item.client.lastName}` : item.title;
                                const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(item.address || item.client?.address || '')}`;

                                return (
                                    <div
                                        key={item.id}
                                        className="tech-item-card"
                                        onClick={() => handleOpenDetail(item)}
                                    >
                                        <div className="tech-time-big">{timeStr}</div>
                                        <div className="tech-item-info">
                                            <div className="tech-item-client">{clientName}</div>
                                            <a
                                                href={mapsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="tech-item-address"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MapPin size={14} />
                                                {item.address || item.client?.address || "Adresse non renseignée"}
                                            </a>
                                        </div>
                                        <span className={`tech-status-badge ${item.status}`}>
                                            {item.status === 'IN_PROGRESS' ? 'En cours' : item.status === 'COMPLETED' ? 'Terminée' : 'Prévue'}
                                        </span>
                                        <ChevronRight size={20} style={{ color: 'var(--muted-foreground)' }} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </main>
            </div>

            {/* 14.2 DÉTAIL INTERVENTION (MOBILE FULL SCREEN / DESKTOP OVERLAY) */}
            {selectedIntervention && (
                <div className="tech-detail-overlay">
                    <div className="tech-detail-header">
                        <button className="tech-back-btn" onClick={() => setSelectedIntervention(null)}>
                            <ArrowLeft size={20} />
                            Retour
                        </button>
                        <span className={`tech-status-badge ${selectedIntervention.status}`}>
                            {selectedIntervention.status === 'IN_PROGRESS' ? 'En cours' : selectedIntervention.status === 'COMPLETED' ? 'Terminée' : 'Prévue'}
                        </span>
                    </div>

                    <div className="tech-detail-body">

                        {/* Info Client & Horaire */}
                        <div className="tech-card-box">
                            <h3 className="tech-card-box-title">
                                <User size={18} style={{ color: '#6366F1' }} />
                                {selectedIntervention.client ? `${selectedIntervention.client.firstName} ${selectedIntervention.client.lastName}` : selectedIntervention.title}
                            </h3>

                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(selectedIntervention.address || selectedIntervention.client?.address || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tech-item-address"
                                style={{ fontSize: '0.95rem', marginBottom: '12px', display: 'inline-flex' }}
                            >
                                <MapPin size={16} />
                                {selectedIntervention.address || selectedIntervention.client?.address || "Adresse non spécifiée"}
                            </a>

                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.88rem', color: 'var(--muted-foreground)', marginTop: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={16} />
                                    {selectedIntervention.scheduledAt ? new Date(selectedIntervention.scheduledAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }) : "09:00"}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Durée estimée : {selectedIntervention.estimatedDuration || 60} min
                                </div>
                            </div>
                        </div>

                        {/* Code d'accès (Digicode) */}
                        {selectedIntervention.accessCode && (
                            <div className="tech-card-box">
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B45309', marginBottom: '6px' }}>
                                    CODE D'ACCÈS / DIGICODE
                                </div>
                                <div className="code-box-framed">
                                    <span className="code-box-val">{selectedIntervention.accessCode}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyCode(selectedIntervention.accessCode)}
                                        style={{ background: 'transparent', border: 'none', color: '#B45309', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                                    >
                                        {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                                        {codeCopied ? "Copié !" : "Copier"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Instructions Manager */}
                        {selectedIntervention.description && (
                            <div className="tech-card-box">
                                <div className="tech-card-box-title">Instructions du Manager</div>
                                <div className="manager-instructions-box">
                                    {selectedIntervention.description}
                                </div>
                            </div>
                        )}

                        {/* BOUTON DÉMARRER (Si statut PENDING / SCHEDULED) */}
                        {selectedIntervention.status !== "IN_PROGRESS" && selectedIntervention.status !== "COMPLETED" && (
                            <button
                                className="btn-start-intervention"
                                onClick={handleStartIntervention}
                            >
                                <Play size={22} />
                                Démarrer l'intervention
                            </button>
                        )}

                        {/* SECTION EXECUTION (Pendant IN_PROGRESS ou COMPLETED) */}
                        {(selectedIntervention.status === "IN_PROGRESS" || selectedIntervention.status === "COMPLETED") && (
                            <>
                                {/* PHOTOS AVANT */}
                                <div className="tech-card-box">
                                    <div className="tech-card-box-title">
                                        <Camera size={18} style={{ color: '#3B82F6' }} />
                                        Photos Avant ({beforePhotos.length})
                                    </div>
                                    <div className="photos-grid-2x2">
                                        {beforePhotos.map((p, idx) => (
                                            <div key={idx} className="photo-thumb-wrapper">
                                                <img src={p.url} alt="Avant" className="photo-thumb-img" />
                                            </div>
                                        ))}
                                    </div>
                                    {selectedIntervention.status === "IN_PROGRESS" && (
                                        <label className="btn-take-photo">
                                            <Camera size={18} />
                                            {uploadingBefore ? "Enregistrement..." : "📷 Prendre une photo (Avant)"}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                style={{ display: 'none' }}
                                                onChange={(e) => handleUploadPhoto(e, "before")}
                                            />
                                        </label>
                                    )}
                                </div>

                                {/* NOTES & COMPTE-RENDU */}
                                <div className="tech-card-box">
                                    <div className="tech-card-box-title">
                                        <FileText size={18} style={{ color: '#8B5CF6' }} />
                                        Notes & Compte-rendu
                                    </div>
                                    <textarea
                                        rows={4}
                                        placeholder="Compte-rendu de l'intervention, observations..."
                                        value={techNotes}
                                        onChange={(e) => setTechNotes(e.target.value)}
                                        readOnly={selectedIntervention.status === "COMPLETED"}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '12px',
                                            border: '1px solid var(--border)', background: 'var(--card)',
                                            color: 'var(--foreground)', fontSize: '0.9rem', boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* PHOTOS APRÈS */}
                                <div className="tech-card-box">
                                    <div className="tech-card-box-title">
                                        <Camera size={18} style={{ color: '#10B981' }} />
                                        Photos Après ({afterPhotos.length})
                                    </div>
                                    <div className="photos-grid-2x2">
                                        {afterPhotos.map((p, idx) => (
                                            <div key={idx} className="photo-thumb-wrapper">
                                                <img src={p.url} alt="Après" className="photo-thumb-img" />
                                            </div>
                                        ))}
                                    </div>
                                    {selectedIntervention.status === "IN_PROGRESS" && (
                                        <label className="btn-take-photo">
                                            <Camera size={18} />
                                            {uploadingAfter ? "Enregistrement..." : "📷 Prendre une photo (Après)"}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                style={{ display: 'none' }}
                                                onChange={(e) => handleUploadPhoto(e, "after")}
                                            />
                                        </label>
                                    )}
                                </div>

                                {/* SIGNATURE CLIENT */}
                                <div className="tech-card-box">
                                    <div className="tech-card-box-title">Signature du client</div>
                                    {selectedIntervention.clientSignature ? (
                                        <div style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                            <img src={selectedIntervention.clientSignature} alt="Signature Client" style={{ maxHeight: '120px' }} />
                                            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '6px' }}>Signature enregistrée</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="signature-canvas-wrapper">
                                                <span className="signature-canvas-mention">Signez ici</span>
                                                <button
                                                    type="button"
                                                    className="btn-clear-sig"
                                                    onClick={handleClearSignature}
                                                >
                                                    <Trash2 size={13} />
                                                    Effacer
                                                </button>
                                                <canvas
                                                    ref={canvasRef}
                                                    width={600}
                                                    height={160}
                                                    style={{ width: '100%', height: '160px', borderRadius: '14px', cursor: 'crosshair' }}
                                                    onMouseDown={startDrawing}
                                                    onMouseMove={draw}
                                                    onMouseUp={stopDrawing}
                                                    onMouseLeave={stopDrawing}
                                                    onTouchStart={startDrawing}
                                                    onTouchMove={draw}
                                                    onTouchEnd={stopDrawing}
                                                />
                                            </div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted-foreground)', marginTop: '8px' }}>
                                                Client : {selectedIntervention.client ? `${selectedIntervention.client.firstName} ${selectedIntervention.client.lastName}` : ""}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* BOUTON TERMINER (Si statut IN_PROGRESS) */}
                                {selectedIntervention.status === "IN_PROGRESS" && (
                                    <button
                                        className="btn-complete-intervention"
                                        onClick={() => setShowConfirmModal(true)}
                                    >
                                        <CheckCircle2 size={22} />
                                        Terminer l'intervention
                                    </button>
                                )}
                            </>
                        )}

                    </div>
                </div>
            )}

            {/* CONFIRMATION MODAL */}
            {showConfirmModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)', zIndex: 999999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--card)', border: '1px solid var(--border)',
                        borderRadius: '24px', padding: '28px', maxWidth: '420px', width: '100%', textCenter: 'center'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 800 }}>Terminer maintenant ?</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '24px', lineHeight: 1.5 }}>
                            L'intervention sera marquée comme terminée. La date de maintenance de l'équipement sera mise à jour et une notification sera transmise au gérant.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmComplete}
                                disabled={isCompleting}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#6366F1', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                            >
                                {isCompleting ? "Clôture..." : "Oui, terminer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
