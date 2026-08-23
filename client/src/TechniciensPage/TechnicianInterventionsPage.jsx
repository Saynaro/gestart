import React, { useState, useEffect, useRef, useMemo } from "react";
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
    Search,
    Phone,
    Filter,
    Sparkles,
    CheckCircle,
    CalendarDays,
    Navigation,
    Wrench,
    CheckSquare,
    History,
    AlertTriangle,
    Image,
    X
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
    const [activeFilter, setActiveFilter] = useState("UPCOMING"); // UPCOMING (default), TODAY, TOMORROW, WEEK, PAST
    const [searchQuery, setSearchQuery] = useState("");

    // Selected intervention for Detail / Execution view
    const [selectedIntervention, setSelectedIntervention] = useState(null);

    // Form / Execution State
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

    // Load user & all assigned interventions (today + upcoming + history)
    const loadData = async () => {
        setLoading(true);
        try {
            const meRes = await apiFetch("/v1/auth/me");
            const userData = meRes.data?.user || meRes.user;
            setUser(userData);

            // Fetch today's interventions and all assigned interventions
            const [todayRes, allRes] = await Promise.allSettled([
                apiFetch("/v1/interventions/today"),
                apiFetch("/v1/interventions?limit=150")
            ]);

            const todayList = todayRes.status === "fulfilled" 
                ? (todayRes.value?.data?.interventions || todayRes.value?.interventions || [])
                : [];

            const allList = allRes.status === "fulfilled"
                ? (allRes.value?.data?.interventions || allRes.value?.interventions || (Array.isArray(allRes.value) ? allRes.value : []))
                : [];

            // Merge and deduplicate by ID
            const map = new Map();
            todayList.forEach(item => map.set(item.id, item));
            allList.forEach(item => map.set(item.id, item));

            const merged = Array.from(map.values()).sort((a, b) => {
                const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
                const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
                return dateA - dateB;
            });

            setInterventions(merged);
        } catch (err) {
            console.warn("Erreur chargement interventions:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Load full details when opening
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
            await apiFetch(`/v1/interventions/${selectedIntervention.id}/start`, {
                method: "PATCH"
            });
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
            triggerToast("Photo enregistrée dans Cloudinary & base de données ! 📷");
        } catch (err) {
            triggerToast(err.message || "Erreur lors de l'enregistrement de la photo", true);
        } finally {
            if (isBefore) setUploadingBefore(false);
            else setUploadingAfter(false);
        }
    };

    // Delete photo
    const handleDeletePhoto = async (photoId, type) => {
        try {
            await apiFetch(`/v1/interventions/photos/${photoId}`, { method: "DELETE" });
            if (type === "before") {
                setBeforePhotos(prev => prev.filter(p => p.id !== photoId));
            } else {
                setAfterPhotos(prev => prev.filter(p => p.id !== photoId));
            }
            triggerToast("Photo retirée");
        } catch (e) {
            // fallback local remove
            if (type === "before") {
                setBeforePhotos(prev => prev.filter(p => p.id !== photoId));
            } else {
                setAfterPhotos(prev => prev.filter(p => p.id !== photoId));
            }
        }
    };

    // Canvas Signature Handlers
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

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
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.lineTo(x, y);
        ctx.strokeStyle = "#556B2F";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
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

            await apiFetch(`/v1/interventions/${selectedIntervention.id}/complete`, {
                method: "PATCH",
                body: JSON.stringify({
                    techNotes,
                    clientSignature: signatureDataUrl
                })
            });

            triggerToast("Intervention terminée avec succès ! 🎉");
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

    // Precise Date Helpers
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + 86400000;
    const dayAfterTomorrow = tomorrowStart + 86400000;
    
    // End of current week (Sunday midnight)
    const currentDayOfWeek = now.getDay();
    const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
    const endOfWeek = todayStart + (daysUntilSunday + 1) * 86400000;

    // Checks if intervention is in the past or completed
    const isPastIntervention = (item) => {
        if (item.status === "COMPLETED") return true;
        if (!item.scheduledAt) return false;
        const d = new Date(item.scheduledAt).getTime();
        return d < todayStart;
    };

    const isTodayIntervention = (item) => {
        if (item.status === "COMPLETED") return false;
        if (!item.scheduledAt) return false;
        const d = new Date(item.scheduledAt).getTime();
        return d >= todayStart && d < tomorrowStart;
    };

    const isTomorrowIntervention = (item) => {
        if (item.status === "COMPLETED") return false;
        if (!item.scheduledAt) return false;
        const d = new Date(item.scheduledAt).getTime();
        return d >= tomorrowStart && d < dayAfterTomorrow;
    };

    const isThisWeekIntervention = (item) => {
        if (item.status === "COMPLETED") return false;
        if (!item.scheduledAt) return false;
        const d = new Date(item.scheduledAt).getTime();
        return d >= todayStart && d < endOfWeek;
    };

    const isUpcomingIntervention = (item) => {
        if (item.status === "COMPLETED") return false;
        if (!item.scheduledAt) return true;
        const d = new Date(item.scheduledAt).getTime();
        return d >= todayStart;
    };

    // Stats calculations
    const todayCount = interventions.filter(i => isTodayIntervention(i)).length;
    const tomorrowCount = interventions.filter(i => isTomorrowIntervention(i)).length;
    const weekCount = interventions.filter(i => isThisWeekIntervention(i)).length;
    const upcomingTotalCount = interventions.filter(i => isUpcomingIntervention(i)).length;
    const pastCount = interventions.filter(i => isPastIntervention(i)).length;

    // Filter interventions by active tab & search query
    const filteredInterventions = useMemo(() => {
        return interventions.filter(item => {
            // Strict tab isolation
            if (activeFilter === "UPCOMING" && !isUpcomingIntervention(item)) return false;
            if (activeFilter === "TODAY" && !isTodayIntervention(item)) return false;
            if (activeFilter === "TOMORROW" && !isTomorrowIntervention(item)) return false;
            if (activeFilter === "WEEK" && !isThisWeekIntervention(item)) return false;
            if (activeFilter === "PAST" && !isPastIntervention(item)) return false;

            // Search query filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const clientName = `${item.client?.firstName || ''} ${item.client?.lastName || ''} ${item.title || ''}`.toLowerCase();
                const address = (item.address || item.client?.address || item.client?.city || '').toLowerCase();
                const equip = `${item.equipment?.brand || ''} ${item.equipment?.model || ''}`.toLowerCase();
                if (!clientName.includes(query) && !address.includes(query) && !equip.includes(query)) {
                    return false;
                }
            }

            return true;
        });
    }, [interventions, activeFilter, searchQuery]);

    // Group interventions by day
    const groupedInterventions = useMemo(() => {
        const groups = {};
        filteredInterventions.forEach(item => {
            let key = "DATE_INCONNUE";
            let label = "Date à définir";
            let tag = "";

            if (item.scheduledAt) {
                const dateObj = new Date(item.scheduledAt);
                const dayKey = dateObj.toISOString().split("T")[0];
                key = dayKey;

                if (isTodayIntervention(item)) {
                    tag = "Aujourd'hui";
                    label = `Aujourd'hui — ${dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`;
                } else if (isTomorrowIntervention(item)) {
                    tag = "Demain";
                    label = `Demain — ${dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`;
                } else if (isPastIntervention(item)) {
                    label = dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                } else {
                    label = dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                }
            }

            if (!groups[key]) {
                groups[key] = {
                    key,
                    label,
                    tag,
                    items: []
                };
            }
            groups[key].items.push(item);
        });

        // For past tab, order descending (most recent past first)
        if (activeFilter === "PAST") {
            return Object.values(groups).reverse();
        }

        return Object.values(groups);
    }, [filteredInterventions, activeFilter]);

    const todayDateFormatted = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    const formattedFirstName = user?.firstName || "Technicien";

    return (
        <div className="home-page tech-interventions-container">
            <SideBar activePath="/interventions/today" />
            <div className="main-content">
                <Header />
                <main className="page-content tech-interventions-main">

                    {/* Toast Alert */}
                    {toast.show && (
                        <div style={{
                            position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 999999,
                            backgroundColor: toast.isError ? '#ef4444' : '#556B2F', color: '#fff',
                            padding: '14px 24px', borderRadius: '50px', fontWeight: 700, fontSize: '14px',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '10px',
                            maxWidth: '90vw', pointerEvents: 'none'
                        }}>
                            {toast.message}
                        </div>
                    )}

                    {/* 1. HERO HEADER */}
                    <div className="tech-header-card">
                        <div className="tech-header-text">
                            <h1 className="tech-header-greeting">Bonjour {formattedFirstName} 👋</h1>
                            <p className="tech-header-date">
                                <CalendarDays size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                                {todayDateFormatted}
                            </p>
                        </div>
                        <div className="tech-header-badge-box">
                            <span className="tech-hero-pill">
                                <Wrench size={14} /> Espace Terrain
                            </span>
                        </div>
                    </div>

                    {/* 2. STATS OVERVIEW CARDS */}
                    <div className="tech-metrics-grid">
                        <div 
                            className={`tech-metric-card ${activeFilter === "UPCOMING" ? "active" : ""}`}
                            onClick={() => setActiveFilter("UPCOMING")}
                        >
                            <div className="tech-metric-icon-wrap olive">
                                <CalendarDays size={20} />
                            </div>
                            <div className="tech-metric-info">
                                <span className="tech-metric-num">{upcomingTotalCount}</span>
                                <span className="tech-metric-title">À venir</span>
                            </div>
                        </div>

                        <div 
                            className={`tech-metric-card ${activeFilter === "TODAY" ? "active" : ""}`}
                            onClick={() => setActiveFilter("TODAY")}
                        >
                            <div className="tech-metric-icon-wrap amber">
                                <Clock size={20} />
                            </div>
                            <div className="tech-metric-info">
                                <span className="tech-metric-num">{todayCount}</span>
                                <span className="tech-metric-title">Aujourd'hui</span>
                            </div>
                        </div>

                        <div 
                            className={`tech-metric-card ${activeFilter === "WEEK" ? "active" : ""}`}
                            onClick={() => setActiveFilter("WEEK")}
                        >
                            <div className="tech-metric-icon-wrap olive">
                                <Calendar size={20} />
                            </div>
                            <div className="tech-metric-info">
                                <span className="tech-metric-num">{weekCount}</span>
                                <span className="tech-metric-title">Cette semaine</span>
                            </div>
                        </div>

                        <div 
                            className={`tech-metric-card ${activeFilter === "PAST" ? "active" : ""}`}
                            onClick={() => setActiveFilter("PAST")}
                        >
                            <div className="tech-metric-icon-wrap gray">
                                <History size={20} />
                            </div>
                            <div className="tech-metric-info">
                                <span className="tech-metric-num">{pastCount}</span>
                                <span className="tech-metric-title">Passées</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. SEARCH & FILTER TOOLBAR */}
                    <div className="tech-toolbar-row">
                        <div className="tech-search-wrap">
                            <Search size={17} className="tech-search-icon" />
                            <input
                                type="text"
                                className="tech-search-input"
                                placeholder="Rechercher par client, adresse, ville ou équipement..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="tech-search-clear" onClick={() => setSearchQuery("")}>
                                    ×
                                </button>
                            )}
                        </div>

                        <div className="tech-filter-pills-row">
                            <button
                                className={`tech-filter-pill ${activeFilter === "UPCOMING" ? "active" : ""}`}
                                onClick={() => setActiveFilter("UPCOMING")}
                            >
                                À venir ({upcomingTotalCount})
                            </button>
                            <button
                                className={`tech-filter-pill ${activeFilter === "TODAY" ? "active" : ""}`}
                                onClick={() => setActiveFilter("TODAY")}
                            >
                                Aujourd'hui ({todayCount})
                            </button>
                            <button
                                className={`tech-filter-pill ${activeFilter === "TOMORROW" ? "active" : ""}`}
                                onClick={() => setActiveFilter("TOMORROW")}
                            >
                                Demain ({tomorrowCount})
                            </button>
                            <button
                                className={`tech-filter-pill ${activeFilter === "WEEK" ? "active" : ""}`}
                                onClick={() => setActiveFilter("WEEK")}
                            >
                                Cette semaine ({weekCount})
                            </button>
                            <button
                                className={`tech-filter-pill past-tab ${activeFilter === "PAST" ? "active" : ""}`}
                                onClick={() => setActiveFilter("PAST")}
                            >
                                <History size={13} /> Passées ({pastCount})
                            </button>
                        </div>
                    </div>

                    {/* 4. CHRONOLOGICAL LIST GROUPED BY DATE */}
                    {loading ? (
                        <div className="tech-loading-box">
                            <div className="tech-spinner" />
                            <p>Chargement de vos interventions...</p>
                        </div>
                    ) : groupedInterventions.length === 0 ? (
                        <div className="tech-empty-state-card">
                            <div className="tech-empty-icon-box">
                                <CheckCircle2 size={44} />
                            </div>
                            <h3 className="tech-empty-title">
                                {activeFilter === "PAST" ? "Aucune intervention passée" : "Aucune intervention à venir"}
                            </h3>
                            <p className="tech-empty-desc">
                                {searchQuery 
                                    ? `Aucun résultat pour la recherche « ${searchQuery} ».` 
                                    : activeFilter === "PAST"
                                    ? "Vous n'avez pas d'historique d'interventions passées ou clôturées pour l'instant."
                                    : "Vous n'avez aucune intervention programmée pour ce filtre. Consultez votre planning ou l'onglet Passées !"}
                            </p>
                            {searchQuery && (
                                <button className="tech-btn-reset-filter" onClick={() => setSearchQuery("")}>
                                    Effacer la recherche
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="tech-groups-container">
                            {groupedInterventions.map((group) => (
                                <div key={group.key} className="tech-date-section">
                                    <div className="tech-date-header">
                                        <div className="tech-date-title-wrap">
                                            <Calendar size={18} className="tech-date-calendar-icon" />
                                            <h2 className="tech-date-heading">{group.label}</h2>
                                        </div>
                                        <div className="tech-date-badges-wrap">
                                            {group.tag && (
                                                <span className="tech-tag-highlight">{group.tag}</span>
                                            )}
                                            <span className="tech-count-badge">
                                                {group.items.length} intervention{group.items.length > 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="tech-cards-list">
                                        {group.items.map((item) => {
                                            const timeStr = item.scheduledAt 
                                                ? new Date(item.scheduledAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }) 
                                                : "09:00";
                                            const clientName = item.client 
                                                ? `${item.client.firstName || ''} ${item.client.lastName || ''}`.trim() || item.client.companyName 
                                                : item.title;
                                            const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(item.address || item.client?.address || item.client?.city || '')}`;
                                            const phoneNum = item.client?.phone;
                                            const isCompleted = item.status === "COMPLETED";
                                            const isPastLate = isPastIntervention(item) && !isCompleted;

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`tech-item-card status-${item.status || 'SCHEDULED'} ${isCompleted ? 'is-completed' : ''}`}
                                                    onClick={() => handleOpenDetail(item)}
                                                >
                                                    {/* Time & Duration badge */}
                                                    <div className="tech-card-left-time">
                                                        <span className="tech-time-val">{timeStr}</span>
                                                        <span className="tech-duration-val">
                                                            {item.estimatedDuration || 60} min
                                                        </span>
                                                    </div>

                                                    {/* Main Information */}
                                                    <div className="tech-item-info">
                                                        <div className="tech-item-top-row">
                                                            <span className="tech-item-client">{clientName}</span>
                                                            <span className={`tech-status-badge ${item.status || 'SCHEDULED'} ${isPastLate ? 'LATE' : ''}`}>
                                                                {isCompleted 
                                                                    ? 'Terminée ✓' 
                                                                    : item.status === 'IN_PROGRESS' 
                                                                    ? 'En cours ⚡' 
                                                                    : isPastLate 
                                                                    ? 'En retard ⚠️' 
                                                                    : 'Prévue'}
                                                            </span>
                                                        </div>

                                                        <div className="tech-item-sub-row">
                                                            <a
                                                                href={mapsUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="tech-item-address"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="Ouvrir dans Google Maps / Waze"
                                                            >
                                                                <MapPin size={14} />
                                                                <span>{item.address || item.client?.address || item.client?.city || "Adresse non renseignée"}</span>
                                                            </a>
                                                        </div>

                                                        {/* Extra details (equipment, digicode preview) */}
                                                        <div className="tech-item-tags-row">
                                                            {item.equipment && (
                                                                <span className="tech-tag-pill equip">
                                                                    <Wrench size={12} />
                                                                    {item.equipment.brand} {item.equipment.model}
                                                                </span>
                                                            )}
                                                            {item.accessCode && (
                                                                <span className="tech-tag-pill code">
                                                                    <Key size={12} />
                                                                    Code: {item.accessCode}
                                                                </span>
                                                            )}
                                                            {item.description && (
                                                                <span className="tech-tag-pill note">
                                                                    <FileText size={12} />
                                                                    Note gérant
                                                                </span>
                                                            )}
                                                            {isCompleted && (
                                                                <span className="tech-tag-pill completed">
                                                                    <CheckCircle2 size={12} />
                                                                    Rapport archivé
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Quick actions (Phone call / Arrow) */}
                                                    <div className="tech-card-right-actions">
                                                        {phoneNum && (
                                                            <a
                                                                href={`tel:${phoneNum}`}
                                                                className="tech-quick-call-btn"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title={`Appeler ${phoneNum}`}
                                                            >
                                                                <Phone size={16} />
                                                            </a>
                                                        )}
                                                        <span className="tech-card-arrow">
                                                            <ChevronRight size={22} />
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </main>
            </div>

            {/* 5. INTERVENTION DETAIL / EXECUTION OVERLAY (Mobile & Desktop) */}
            {selectedIntervention && (
                <div className="tech-detail-overlay">
                    <div className="tech-detail-header">
                        <button className="tech-back-btn" onClick={() => setSelectedIntervention(null)}>
                            <ArrowLeft size={19} />
                            Retour aux interventions
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {selectedIntervention.status === "COMPLETED" && (
                                <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                                    Mode Consultation (Lecture seule)
                                </span>
                            )}
                            <span className={`tech-status-badge ${selectedIntervention.status || 'SCHEDULED'}`}>
                                {selectedIntervention.status === 'IN_PROGRESS' ? 'En cours ⚡' : selectedIntervention.status === 'COMPLETED' ? 'Terminée ✓' : 'Prévue'}
                            </span>
                        </div>
                    </div>

                    <div className="tech-detail-body">

                        {/* Info Client, Date & Itinéraire GPS */}
                        <div className="tech-card-box hero-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <h2 className="tech-detail-client-name">
                                        {selectedIntervention.client ? `${selectedIntervention.client.firstName || ''} ${selectedIntervention.client.lastName || ''}`.trim() : selectedIntervention.title}
                                    </h2>
                                    <div className="tech-detail-time-line">
                                        <Clock size={16} />
                                        <span>
                                            {selectedIntervention.scheduledAt 
                                                ? new Date(selectedIntervention.scheduledAt).toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                                                : "Horaire à convenir"}
                                        </span>
                                        <span className="tech-duration-tag">
                                            Durée : {selectedIntervention.estimatedDuration || 60} min
                                        </span>
                                    </div>
                                </div>

                                {selectedIntervention.client?.phone && (
                                    <a
                                        href={`tel:${selectedIntervention.client.phone}`}
                                        className="tech-btn-call-large"
                                    >
                                        <Phone size={16} />
                                        Appeler ({selectedIntervention.client.phone})
                                    </a>
                                )}
                            </div>

                            <div className="tech-address-banner">
                                <MapPin size={18} className="tech-address-pin-icon" />
                                <span className="tech-address-full">
                                    {selectedIntervention.address || selectedIntervention.client?.address || selectedIntervention.client?.city || "Adresse non spécifiée"}
                                </span>
                                <a
                                    href={`https://maps.google.com/?q=${encodeURIComponent(selectedIntervention.address || selectedIntervention.client?.address || selectedIntervention.client?.city || '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tech-btn-gps-nav"
                                >
                                    <Navigation size={14} />
                                    Ouvrir GPS
                                </a>
                            </div>
                        </div>

                        {/* Digicode / Code d'accès */}
                        {selectedIntervention.accessCode && (
                            <div className="tech-card-box digicode-card">
                                <div className="code-box-header">
                                    <Key size={16} />
                                    <span>CODE D'ACCÈS / DIGICODE DE L'IMMEUBLE</span>
                                </div>
                                <div className="code-box-framed">
                                    <span className="code-box-val">{selectedIntervention.accessCode}</span>
                                    <button
                                        type="button"
                                        className="btn-copy-code"
                                        onClick={() => handleCopyCode(selectedIntervention.accessCode)}
                                    >
                                        {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                                        {codeCopied ? "Copié !" : "Copier le code"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Instructions Manager */}
                        {selectedIntervention.description && (
                            <div className="tech-card-box">
                                <div className="tech-card-box-title">
                                    <FileText size={18} style={{ color: '#556B2F' }} />
                                    Consignes et instructions du Gérant
                                </div>
                                <div className="manager-instructions-box">
                                    {selectedIntervention.description}
                                </div>
                            </div>
                        )}

                        {/* Equipement concerné */}
                        {selectedIntervention.equipment && (
                            <div className="tech-card-box">
                                <div className="tech-card-box-title">
                                    <Wrench size={18} style={{ color: '#556B2F' }} />
                                    Équipement client à inspecter
                                </div>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--muted, #F8FAFC)', padding: 14, borderRadius: 12 }}>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--foreground)' }}>
                                        {selectedIntervention.equipment.brand} — {selectedIntervention.equipment.model}
                                    </div>
                                    {selectedIntervention.equipment.serialNumber && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                            N° série : {selectedIntervention.equipment.serialNumber}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* BOUTON DÉMARRER (Si statut SCHEDULED ou PENDING) */}
                        {selectedIntervention.status !== "IN_PROGRESS" && selectedIntervention.status !== "COMPLETED" && (
                            <button
                                className="btn-start-intervention"
                                onClick={handleStartIntervention}
                            >
                                <Play size={22} />
                                Démarrer l'intervention sur place
                            </button>
                        )}

                        {/* SECTION EXECUTION (Pendant IN_PROGRESS ou COMPLETED) */}
                        {(selectedIntervention.status === "IN_PROGRESS" || selectedIntervention.status === "COMPLETED") && (
                            <>
                                {/* PHOTOS AVANT (Optionnel) */}
                                <div className="tech-card-box">
                                    <div className="tech-card-box-title">
                                        <Camera size={18} style={{ color: '#556B2F' }} />
                                        Photos Avant Intervention <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>(Optionnel)</span> ({beforePhotos.length})
                                    </div>
                                    {beforePhotos.length > 0 && (
                                        <div className="photos-grid-2x2">
                                            {beforePhotos.map((p, idx) => (
                                                <div key={idx} className="photo-thumb-wrapper">
                                                    <img src={p.url} alt="Avant" className="photo-thumb-img" />
                                                    {selectedIntervention.status === "IN_PROGRESS" && (
                                                        <button 
                                                            type="button" 
                                                            className="btn-delete-photo-thumb"
                                                            onClick={() => handleDeletePhoto(p.id, "before")}
                                                            title="Supprimer la photo"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {selectedIntervention.status === "IN_PROGRESS" && (
                                        <label className="btn-take-photo">
                                            <Camera size={18} />
                                            {uploadingBefore ? "Enregistrement dans Cloudinary..." : "📷 Prendre une photo (Avant)"}
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
                                        <FileText size={18} style={{ color: '#556B2F' }} />
                                        Compte-rendu & Observations techniques
                                    </div>
                                    <textarea
                                        rows={4}
                                        placeholder="Décrivez les opérations effectuées (ex: nettoyage filtres, vérification étanchéité circuit frigorifique, appoint fluide...)"
                                        value={techNotes}
                                        onChange={(e) => setTechNotes(e.target.value)}
                                        readOnly={selectedIntervention.status === "COMPLETED"}
                                        style={{
                                            width: '100%', padding: '14px', borderRadius: '14px',
                                            border: '1px solid var(--border)', background: 'var(--card)',
                                            color: 'var(--foreground)', fontSize: '0.92rem', boxSizing: 'border-box',
                                            lineHeight: 1.5
                                        }}
                                    />
                                </div>

                                {/* PHOTOS APRÈS (Optionnel) */}
                                <div className="tech-card-box">
                                    <div className="tech-card-box-title">
                                        <Camera size={18} style={{ color: '#556B2F' }} />
                                        Photos Après Intervention <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>(Optionnel)</span> ({afterPhotos.length})
                                    </div>
                                    {afterPhotos.length > 0 && (
                                        <div className="photos-grid-2x2">
                                            {afterPhotos.map((p, idx) => (
                                                <div key={idx} className="photo-thumb-wrapper">
                                                    <img src={p.url} alt="Après" className="photo-thumb-img" />
                                                    {selectedIntervention.status === "IN_PROGRESS" && (
                                                        <button 
                                                            type="button" 
                                                            className="btn-delete-photo-thumb"
                                                            onClick={() => handleDeletePhoto(p.id, "after")}
                                                            title="Supprimer la photo"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {selectedIntervention.status === "IN_PROGRESS" && (
                                        <label className="btn-take-photo">
                                            <Camera size={18} />
                                            {uploadingAfter ? "Enregistrement dans Cloudinary..." : "📷 Prendre une photo (Après)"}
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
                                    <div className="tech-card-box-title">
                                        <CheckCircle size={18} style={{ color: '#556B2F' }} />
                                        Signature du client sur écran
                                    </div>
                                    {selectedIntervention.clientSignature ? (
                                        <div style={{ textAlign: 'center', padding: '16px', border: '1px solid var(--border)', borderRadius: '14px', background: '#FFF' }}>
                                            <img src={selectedIntervention.clientSignature} alt="Signature Client" style={{ maxHeight: '130px', objectFit: 'contain' }} />
                                            <div style={{ fontSize: '0.82rem', color: '#556B2F', marginTop: '8px', fontWeight: 700 }}>
                                                ✓ Signature client enregistrée
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="signature-canvas-wrapper tech-signature-wrapper">
                                                <span className="signature-canvas-mention">Signez dans ce cadre</span>
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
                                                    width={800}
                                                    height={220}
                                                    className="tech-signature-canvas"
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
                                                Signataire : {selectedIntervention.client ? `${selectedIntervention.client.firstName || ''} ${selectedIntervention.client.lastName || ''}` : "Client"}
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
                                        Clôturer et valider l'intervention
                                    </button>
                                )}
                            </>
                        )}

                    </div>
                </div>
            )}

            {/* 6. CONFIRMATION CLOSING MODAL */}
            {showConfirmModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)', zIndex: 999999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--card, #FFFFFF)', border: '1px solid var(--border)',
                        borderRadius: '24px', padding: '28px', maxWidth: '440px', width: '100%', textAlign: 'center',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(85, 107, 47, 0.12)',
                            color: '#556B2F', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto'
                        }}>
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', fontWeight: 800, color: 'var(--foreground)' }}>
                            Clôturer l'intervention ?
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '24px', lineHeight: 1.5 }}>
                            L'intervention sera marquée comme terminée. Le compte-rendu, la signature et les photos (le cas échéant) seront sauvegardés dans Cloudinary et la base de données.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 700, cursor: 'pointer', color: 'var(--foreground)' }}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmComplete}
                                disabled={isCompleting}
                                style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: '#556B2F', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 18px rgba(85, 107, 47, 0.35)' }}
                            >
                                {isCompleting ? "Clôture..." : "Oui, valider"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
