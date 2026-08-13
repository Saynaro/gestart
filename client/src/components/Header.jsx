import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Bell, MessageSquare, Send, X } from "lucide-react";
import "./Header.css";
import { profilePages, DropdownIcons } from "./navigationConstants";
import { handleLogout } from "../utils/auth";
import { apiFetch } from "../utils/api";
import { setAuthToken } from "../utils/auth";

function Header() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);
    const [bellTab, setBellTab] = useState("notifications");
    const [replyText, setReplyText] = useState("");
    const [activeSmsReplyId, setActiveSmsReplyId] = useState(null);
    const [smsSuccessMsg, setSmsSuccessMsg] = useState("");

    const [smsList, setSmsList] = useState([]);
    const [notificationsList, setNotificationsList] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        const fetchPendingInvites = async () => {
            try {
                const res = await apiFetch("/v1/invitations/pending-user-invites");
                const list = res.data?.invites || res.invites || [];
                setPendingInvites(list);
            } catch (err) {
                // Ignore silent auth errors
            }
        };
        fetchPendingInvites();
    }, []);

    const handleRespondInvite = async (invitationId, action) => {
        try {
            const res = await apiFetch("/v1/invitations/respond-join", {
                method: "POST",
                body: JSON.stringify({ invitationId, action })
            });

            if (res.accessToken) {
                setAuthToken(res.accessToken);
            }

            setSmsSuccessMsg(res.message || (action === "ACCEPT" ? "Rejoint avec succès !" : "Invitation refusée"));
            setTimeout(() => setSmsSuccessMsg(""), 4000);

            setPendingInvites(prev => prev.filter(i => i.id !== invitationId));

            if (action === "ACCEPT") {
                window.location.reload();
            }
        } catch (err) {
            setSmsSuccessMsg(err.message || "Erreur lors de la réponse à l'invitation");
            setTimeout(() => setSmsSuccessMsg(""), 4000);
        }
    };

    const [activePath, setActivePath] = useState(window.location.pathname || "/dashboard");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const [touchStartX, setTouchStartX] = useState(null);
    const [touchCurrentX, setTouchCurrentX] = useState(null);

    const handleCloseNotifications = () => {
        setBellOpen(false);
        setActiveSmsReplyId(null);
    };

    useEffect(() => {
        if (!bellOpen) {
            document.body.style.overflow = "";
            return;
        }

        document.body.style.overflow = "hidden";

        // Push state so back button / iOS back swipe closes the notifications panel
        window.history.pushState({ notificationsOpen: true }, "");

        const handlePopState = (e) => {
            setBellOpen(false);
            setActiveSmsReplyId(null);
            document.body.style.overflow = "";
        };

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
            document.body.style.overflow = "";
        };
    }, [bellOpen]);

    const handleTouchStart = (e) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchMove = (e) => {
        if (touchStartX !== null) {
            setTouchCurrentX(e.touches[0].clientX);
        }
    };

    const handleTouchEnd = () => {
        if (touchStartX !== null && touchCurrentX !== null) {
            const deltaX = touchCurrentX - touchStartX;
            if (deltaX > 60) {
                handleCloseNotifications();
            }
        }
        setTouchStartX(null);
        setTouchCurrentX(null);
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Sync path state if browser URL changes
    useEffect(() => {
        const handleLocationChange = () => {
            setActivePath(window.location.pathname || "/dashboard");
        };
        window.addEventListener("popstate", handleLocationChange);
        return () => window.removeEventListener("popstate", handleLocationChange);
    }, []);

    const navigateTo = (e, path) => {
        e.preventDefault();
        setActivePath(path);
        window.history.pushState(null, "", path);
        window.dispatchEvent(new Event("popstate"));
    };

    const toggleMenu = (e) => {
        e.stopPropagation();
        setMenuOpen(!menuOpen);
    };

    const handleAvatarClick = (e) => {
        if (isMobile) {
            e.preventDefault();
            e.stopPropagation();
            window.history.pushState(null, "", "/settings");
            window.dispatchEvent(new Event("popstate"));
        } else {
            toggleMenu(e);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        if (!menuOpen) return;
        const closeMenu = () => setMenuOpen(false);
        window.addEventListener("click", closeMenu);
        return () => window.removeEventListener("click", closeMenu);
    }, [menuOpen]);

    const getPageTitle = (pathname) => {
        if (pathname.startsWith("/home") || pathname === "/dashboard") return "Home";
        if (pathname.startsWith("/client")) return "Clients";
        if (pathname.startsWith("/planning")) return "Planning";
        if (pathname.startsWith("/messages")) return "Messages";
        if (pathname.startsWith("/factures")) return "Factures";
        if (pathname.startsWith("/devis")) return "Devis";
        if (pathname.startsWith("/rapports")) return "Rapports";
        if (pathname.startsWith("/comptabilite")) return "Comptabilité";
        if (pathname.startsWith("/catalogue")) return "Catalogue";
        if (pathname.startsWith("/premium")) return "Premium";
        if (pathname.startsWith("/techniciens")) return "Techniciens";
        if (pathname.startsWith("/settings")) return "Paramètres";
        return "Home";
    };

    return (
        <div className="header">
            <div className="header-left">
                <span className="greeting">{isMobile ? getPageTitle(activePath) : "Bonjour Khalid 👋"}</span>
            </div>
            <div className="header-right">
                <div className="notification-wrapper" onClick={(e) => { e.stopPropagation(); setBellOpen(!bellOpen); setMenuOpen(false); }}>
                    <svg className="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <span className="notification-dot"></span>

                    {bellOpen && createPortal(
                        <div className="bell-overlay-wrapper" onClick={handleCloseNotifications}>
                            <div
                                className="bell-full-page-panel"
                                onClick={(e) => e.stopPropagation()}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                <div className="bell-panel-header">
                                    <div className="bell-panel-title-group">
                                        <span className="bell-panel-title">Notifications</span>
                                        <span className="bell-unread-badge">{notificationsList.length} nouvelles</span>
                                    </div>
                                    <button type="button" className="bell-panel-close-btn" onClick={handleCloseNotifications}>
                                        <X size={22} />
                                    </button>
                                </div>

                                <div className="bell-tabs-header">
                                    <button
                                        type="button"
                                        className={`bell-tab-btn ${bellTab === "notifications" ? "active" : ""}`}
                                        onClick={() => setBellTab("notifications")}
                                    >
                                        <Bell size={15} /> Notifications ({notificationsList.length})
                                    </button>
                                    <button
                                        type="button"
                                        className={`bell-tab-btn ${bellTab === "sms" ? "active" : ""}`}
                                        onClick={() => setBellTab("sms")}
                                    >
                                        <MessageSquare size={15} /> SMS reçus ({smsList.length})
                                    </button>
                                </div>

                                <div className="bell-tabs-content">
                                    {bellTab === "notifications" ? (
                                        <div className="notifications-list">
                                            {pendingInvites.map(inv => (
                                                <div key={inv.id} className="notification-item" style={{ borderLeft: '4px solid #16A34A', background: 'rgba(34, 197, 94, 0.05)', padding: '14px' }}>
                                                    <div className="meta">
                                                        <span className="title" style={{ color: '#16A34A', fontWeight: 800 }}>Rejoindre l'entreprise {inv.company.name}</span>
                                                        <span className="time">Invitation</span>
                                                    </div>
                                                    <p className="text" style={{ margin: '6px 0 10px 0' }}>
                                                        L'entreprise <strong>{inv.company.name}</strong> vous invite à rejoindre son équipe en tant que technicien.
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRespondInvite(inv.id, "ACCEPT")}
                                                            style={{ backgroundColor: '#16A34A', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                                                        >
                                                            Accepter
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRespondInvite(inv.id, "REFUSE")}
                                                            style={{ backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF4444', padding: '6px 14px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                                                        >
                                                            Refuser
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {notificationsList.length === 0 && pendingInvites.length === 0 ? (
                                                <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '30px 10px', fontSize: '0.875rem' }}>
                                                    Aucune notification pour le moment
                                                </p>
                                            ) : (
                                                notificationsList.map(n => (
                                                    <div key={n.id} className="notification-item">
                                                        <div className="meta">
                                                            <span className="title">{n.title}</span>
                                                            <span className="time">{n.time}</span>
                                                        </div>
                                                        <p className="text">{n.text}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    ) : (
                                        <div className="sms-notifications-list">
                                            {smsList.length === 0 ? (
                                                <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '30px 10px', fontSize: '0.875rem' }}>
                                                    Aucun SMS reçu
                                                </p>
                                            ) : (
                                                smsList.map(s => (
                                                    <div key={s.id} className="sms-notification-item">
                                                        <div className="meta">
                                                            <span className="sender">{s.sender}</span>
                                                            <span className="date">{s.date}</span>
                                                        </div>
                                                        <p className="msg">{s.msg}</p>

                                                        {activeSmsReplyId === s.id ? (
                                                            <div className="sms-reply-form">
                                                                <input
                                                                    type="text"
                                                                    className="reply-input"
                                                                    placeholder="Votre réponse..."
                                                                    value={replyText}
                                                                    onChange={(e) => setReplyText(e.target.value)}
                                                                />
                                                                <button
                                                                    className="reply-send-btn"
                                                                    onClick={() => {
                                                                        if (!replyText.trim()) return;
                                                                        const targetSender = s.sender;
                                                                        setReplyText("");
                                                                        setActiveSmsReplyId(null);
                                                                        setSmsSuccessMsg(`✓ SMS envoyé à ${targetSender}`);
                                                                        setTimeout(() => setSmsSuccessMsg(""), 3500);
                                                                    }}
                                                                >
                                                                    <Send size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="sms-reply-trigger"
                                                                onClick={() => {
                                                                    setActiveSmsReplyId(s.id);
                                                                    setReplyText("");
                                                                }}
                                                            >
                                                                Répondre par SMS
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>

                <div className="avatar-wrapper" onClick={handleAvatarClick}>
                    <div className="header-avatar">KS</div>

                    {menuOpen && (
                        <div className="mobile-dropdown" onClick={(e) => e.stopPropagation()}>
                            <div className="dropdown-header">
                                <span className="dropdown-user-name">Khalid Sainaro</span>
                                <span className="dropdown-user-plan">Plan Pro</span>
                            </div>
                            <div className="dropdown-divider"></div>
                            <ul className="dropdown-list">
                                {profilePages.map((page, index) => {
                                    const isActive = activePath === page.path;
                                    return (
                                        <li key={index} className={`dropdown-item ${isActive ? "active" : ""}`}>
                                            <a
                                                href={page.path}
                                                onClick={(e) => {
                                                    navigateTo(e, page.path);
                                                    setMenuOpen(false);
                                                }}
                                                className="dropdown-link"
                                            >
                                                {DropdownIcons[page.iconKey]}
                                                <span className="dropdown-title">{page.title}</span>
                                                {page.badge && <span className="dropdown-badge">{page.badge}</span>}
                                            </a>
                                        </li>
                                    );
                                })}
                                <div className="dropdown-divider"></div>
                                <li className="dropdown-item danger">
                                    <a
                                        href="/logout"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setMenuOpen(false);
                                            setShowLogoutModal(true);
                                        }}
                                        className="dropdown-link"
                                    >
                                        {DropdownIcons.logout}
                                        <span className="dropdown-title">Déconnexion</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)', zIndex: 999999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--card, #FFFFFF)', border: '1px solid var(--border, #E2E8F0)',
                        borderRadius: '24px', padding: '28px', maxWidth: '400px', width: '100%',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.25)', textAlign: 'center'
                    }}>
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px auto'
                        }}>
                            <X size={26} />
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground, #0F172A)' }}>
                            Déconnexion
                        </h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: 'var(--muted-foreground, #64748B)', lineHeight: 1.5 }}>
                            Êtes-vous sûr(e) de vouloir vous déconnecter de votre compte GestArt ?
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border, #CBD5E1)', backgroundColor: 'transparent', fontWeight: 700, cursor: 'pointer', color: 'var(--foreground, #0F172A)' }}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowLogoutModal(false); handleLogout(navigate); }}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#EF4444', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}
                            >
                                Oui, me déconnecter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Header;
