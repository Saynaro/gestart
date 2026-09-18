import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Bell, MessageSquare, Send, X, ExternalLink, Trash2, Check, AlertTriangle, CheckCheck, ChevronDown, ChevronUp, FileText, Calendar, User, Wrench, ListChecks } from "lucide-react";
import "./Header.css";
import { profilePages, DropdownIcons } from "./navigationConstants";
import { handleLogout } from "../utils/auth";
import { apiFetch } from "../utils/api";
import { setAuthToken } from "../utils/auth";
import { useUser } from "../utils/useUser";
import { useSubscription } from "../utils/useSubscription";
import { getSocket } from "../utils/socket";
import { WhatsAppIcon, EmailIcon, SmsIcon } from "./ChannelIcons";

function Header({ title }) {
    const navigate = useNavigate();
    const { firstName, fullName, initials, avatarUrl, role } = useUser();
    const isTechnician = role === "TECHNICIAN";
    const { displayName } = useSubscription();
    const [menuOpen, setMenuOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);
    const [bellTab, setBellTab] = useState("notifications");
    const [replyText, setReplyText] = useState("");
    const [activeSmsReplyId, setActiveSmsReplyId] = useState(null);
    const [smsSuccessMsg, setSmsSuccessMsg] = useState("");

    const [smsList, setSmsList] = useState([]);
    const [unreadMsgCount, setUnreadMsgCount] = useState(0);
    const [notificationsList, setNotificationsList] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Multi-select & delete state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedNotificationId, setExpandedNotificationId] = useState(null);

    // Long-press detection to trigger iOS-style selection mode on touch/hold
    const longPressTimerRef = useRef(null);
    const isLongPressTriggeredRef = useRef(false);
    const touchStartCoordsRef = useRef({ x: 0, y: 0 });

    const handleItemTouchStart = (itemId) => (e) => {
        if (isSelectionMode) return;
        const touch = e.touches[0];
        touchStartCoordsRef.current = { x: touch.clientX, y: touch.clientY };
        isLongPressTriggeredRef.current = false;

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }

        longPressTimerRef.current = setTimeout(() => {
            isLongPressTriggeredRef.current = true;
            if (typeof navigator !== "undefined" && navigator.vibrate) {
                try {
                    navigator.vibrate(40);
                } catch (_) {}
            }
            setIsSelectionMode(true);
            setSelectedItemIds(new Set([itemId]));
            setExpandedNotificationId(null);
        }, 450);
    };

    const handleItemTouchMove = (e) => {
        if (!longPressTimerRef.current) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartCoordsRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartCoordsRef.current.y);
        // If movement is more than 8px, user is scrolling: cancel long press
        if (dx > 8 || dy > 8) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleItemTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleItemMouseDown = (itemId) => (e) => {
        if (e.button !== 0 || isSelectionMode) return;
        touchStartCoordsRef.current = { x: e.clientX, y: e.clientY };
        isLongPressTriggeredRef.current = false;

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }

        longPressTimerRef.current = setTimeout(() => {
            isLongPressTriggeredRef.current = true;
            setIsSelectionMode(true);
            setSelectedItemIds(new Set([itemId]));
            setExpandedNotificationId(null);
        }, 500);
    };

    const handleItemMouseMove = (e) => {
        if (!longPressTimerRef.current) return;
        const dx = Math.abs(e.clientX - touchStartCoordsRef.current.x);
        const dy = Math.abs(e.clientY - touchStartCoordsRef.current.y);
        if (dx > 8 || dy > 8) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleItemMouseUp = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    // Clean email quotes and extract a clean single-line snippet
    const cleanSnippet = (text) => {
        if (!text) return "Nouveau message";
        const splitRegex = /(\r?\n\s*(?:On\s+.+?wrote:|Le\s+.+?a écrit\s*:|[а-яa-z]{2,3},\s*\d{1,2}\s+[а-яa-z]{3,}\.?\s+\d{4}.+?:|-----Original Message-----|________________________________)\s*\n[\s\S]*$)|(\r?\n\s*>[\s\S]*$)/i;
        const match = text.match(splitRegex);
        let cleaned = match ? text.slice(0, match.index) : text;
        cleaned = cleaned.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
        cleaned = cleaned.replace(/^[>•\s-]+/, "").trim();
        return cleaned || "Nouveau message";
    };

    // Format relative time helper
    const formatMsgDate = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
            if (isToday) return `Aujourd'hui à ${timeStr}`;
            
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) return `Hier à ${timeStr}`;

            return `${date.toLocaleDateString([], { day: "2-digit", month: "2-digit" })} à ${timeStr}`;
        } catch {
            return "";
        }
    };

    // Fetch received messages and exact unread count
    const fetchReceivedMessages = useCallback(async () => {
        if (isTechnician) {
            setSmsList([]);
            setUnreadMsgCount(0);
            return;
        }
        try {
            const [inboxRes, countRes] = await Promise.allSettled([
                apiFetch("/v1/messages/inbox?incomingOnly=true"),
                apiFetch("/v1/messages/unread-count")
            ]);

            if (countRes.status === "fulfilled" && countRes.value?.success && typeof countRes.value.data?.total === "number") {
                setUnreadMsgCount(countRes.value.data.total);
            }

            if (inboxRes.status === "fulfilled" && inboxRes.value?.success) {
                const convs = inboxRes.value.data?.conversations || [];
                const mapped = convs.map(c => {
                    const clientName = c.client ? `${c.client.firstName || ''} ${c.client.lastName || c.client.companyName || ''}`.trim() : (c.clientName || c.sender || c.phone || "Client");
                    const channel = (c.channel || c.lastMessage?.channel || "SMS").toUpperCase();
                    const rawMsg = c.lastMessage?.text || c.lastMessage?.body || c.lastMessageText || c.text || "";
                    const cleanMsg = cleanSnippet(rawMsg);
                    const date = c.lastMessage?.createdAt || c.time || c.createdAt;
                    const isUnread = Boolean(c.unreadCount && c.unreadCount > 0);

                    return {
                        id: c.id || c.clientId || String(Math.random()),
                        clientId: c.clientId || c.client?.id || c.id,
                        sender: clientName,
                        channel,
                        msg: cleanMsg,
                        date: formatMsgDate(date),
                        isUnread,
                        unreadCount: c.unreadCount || 0,
                        phone: c.client?.phone || c.phone || ""
                    };
                });
                setSmsList(mapped);
            }
        } catch (err) {
            // Fallback sur /v1/sms/inbox
            try {
                const resFallback = await apiFetch("/v1/sms/inbox?incomingOnly=true");
                const list = resFallback.data?.conversations || [];
                const mappedFallback = list.map(c => ({
                    id: c.id || c.clientId || String(Math.random()),
                    clientId: c.clientId || c.client?.id || c.id,
                    sender: c.clientName || c.sender || c.phone || "Client",
                    channel: (c.channel || "SMS").toUpperCase(),
                    msg: cleanSnippet(c.lastMessageText || c.text || ""),
                    date: formatMsgDate(c.lastMessage?.createdAt || c.time),
                    isUnread: Boolean(c.unreadCount && c.unreadCount > 0),
                    unreadCount: c.unreadCount || 0,
                    phone: c.phone || ""
                }));
                setSmsList(mappedFallback);
                const unreads = mappedFallback.filter(m => m.isUnread).length;
                setUnreadMsgCount(unreads);
            } catch (e) {
                // Ignore silent error
            }
        }
    }, []);

    const cleanNotificationAmounts = (text) => {
        if (!text) return "";
        return text.replace(/(\d+\.\d+)\s*(€|EUR)/gi, (match, numStr) => {
            const num = parseFloat(numStr);
            if (isNaN(num)) return match;
            const rounded = parseFloat(num.toFixed(2));
            return `${rounded}€`;
        });
    };

    // Fetch notifications list from backend
    const fetchNotifications = useCallback(async () => {
        try {
            const res = await apiFetch("/v1/notifications");
            if (res?.success && res.data?.notifications) {
                setNotificationsList(res.data.notifications.map(n => ({
                    id: n.id,
                    title: n.title,
                    text: cleanNotificationAmounts(n.body),
                    time: formatMsgDate(n.createdAt),
                    isRead: n.isRead,
                    raw: n
                })));
            }
        } catch (e) {
            // Ignore silent error
        }
    }, []);

    useEffect(() => {
        fetchReceivedMessages();
        fetchNotifications();
    }, [fetchReceivedMessages, fetchNotifications]);

    // Socket real-time updates for notifications & incoming messages
    useEffect(() => {
        if (isTechnician) return;
        const socket = getSocket();
        if (!socket) return;

        const handleNewMessage = () => {
            fetchReceivedMessages();
        };
        const handleMessageRead = () => {
            fetchReceivedMessages();
        };
        const handleNewNotification = () => {
            fetchNotifications();
        };

        socket.on("message:new", handleNewMessage);
        socket.on("message:received", handleNewMessage);
        socket.on("message:read", handleMessageRead);
        socket.on("notification:new", handleNewNotification);
        socket.on("notification:read", handleNewNotification);

        window.addEventListener("messages-read", fetchReceivedMessages);

        return () => {
            socket.off("message:new", handleNewMessage);
            socket.off("message:received", handleNewMessage);
            socket.off("message:read", handleMessageRead);
            socket.off("notification:new", handleNewNotification);
            socket.off("notification:read", handleNewNotification);
            window.removeEventListener("messages-read", fetchReceivedMessages);
        };
    }, [fetchReceivedMessages, fetchNotifications]);

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

    const toggleSelectItem = (id) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const currentTabItems = (isTechnician || bellTab === "notifications") ? notificationsList : smsList;
    const isAllSelected = currentTabItems.length > 0 && selectedItemIds.size === currentTabItems.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedItemIds(new Set());
        } else {
            setSelectedItemIds(new Set(currentTabItems.map(item => item.id)));
        }
    };

    const handleExecuteDelete = async () => {
        if (selectedItemIds.size === 0) return;
        setIsDeleting(true);
        try {
            const idsArray = Array.from(selectedItemIds);
            if (isTechnician || bellTab === "notifications") {
                await apiFetch("/v1/notifications/batch", {
                    method: "DELETE",
                    body: JSON.stringify({ notificationIds: idsArray })
                });
                setNotificationsList(prev => prev.filter(n => !selectedItemIds.has(n.id)));
            } else {
                const selectedClients = smsList.filter(s => selectedItemIds.has(s.id));
                const clientIds = selectedClients.map(s => s.clientId || s.id);
                await apiFetch("/v1/messages/batch", {
                    method: "DELETE",
                    body: JSON.stringify({ clientIds, messageIds: idsArray })
                });
                setSmsList(prev => prev.filter(s => !selectedItemIds.has(s.id)));
                fetchReceivedMessages();
                window.dispatchEvent(new CustomEvent("messages-updated"));
            }
            setIsSelectionMode(false);
            setSelectedItemIds(new Set());
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error("Delete error:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleNotificationClick = async (n) => {
        if (isSelectionMode) {
            toggleSelectItem(n.id);
            return;
        }

        // Toggle accordion expansion
        setExpandedNotificationId(prev => prev === n.id ? null : n.id);

        // Mark as read if not already read
        if (!n.isRead) {
            try {
                await apiFetch(`/v1/notifications/${n.id}/read`, { method: "PATCH" });
                setNotificationsList(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
                window.dispatchEvent(new CustomEvent("notification-read"));
            } catch (err) {
                console.error("Error marking notification as read:", err);
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            if (isTechnician || bellTab === "notifications") {
                await apiFetch("/v1/notifications/read-all", { method: "PATCH" });
                setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
            } else {
                await Promise.allSettled(
                    smsList.filter(s => s.isUnread).map(s => 
                        apiFetch(`/v1/messages/read/${encodeURIComponent(s.clientId || s.id)}`, { method: "PATCH" })
                    )
                );
                setSmsList(prev => prev.map(s => ({ ...s, isUnread: false, unreadCount: 0 })));
                setUnreadMsgCount(0);
                window.dispatchEvent(new CustomEvent("messages-read"));
            }
            fetchNotifications();
            fetchReceivedMessages();
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    };

    const [activePath, setActivePath] = useState(window.location.pathname || "/dashboard");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const [touchStartX, setTouchStartX] = useState(null);
    const [touchCurrentX, setTouchCurrentX] = useState(null);

    const handleCloseNotifications = () => {
        setBellOpen(false);
        setActiveSmsReplyId(null);
        setIsSelectionMode(false);
        setSelectedItemIds(new Set());
        setShowDeleteConfirm(false);
        setExpandedNotificationId(null);
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
        if (title) return title;
        if (pathname.startsWith("/home") || pathname === "/dashboard") return "Home";
        if (pathname.startsWith("/client")) return "Clients";
        if (pathname.startsWith("/planning")) return "Planning";
        if (pathname.startsWith("/messages")) return "Messages";
        if (pathname.startsWith("/factures")) return "Factures";
        if (pathname.startsWith("/payments") || pathname.startsWith("/paiements")) return "Paiements";
        if (pathname.startsWith("/devis")) return "Devis";
        if (pathname.startsWith("/rapports")) return "Rapports";
        if (pathname.startsWith("/comptabilite")) return "Comptabilité";
        if (pathname.startsWith("/catalogue")) return "Catalogue";
        if (pathname.startsWith("/premium")) return "Premium";
        if (pathname.startsWith("/techniciens")) return "Techniciens";
        if (pathname.startsWith("/settings")) return "Paramètres";
        return "Home";
    };

    const unreadNotificationsCount = notificationsList.filter(n => !n.isRead).length;
    const unreadMessagesCount = isTechnician ? 0 : Math.max(unreadMsgCount, smsList.filter(s => s.isUnread).length);
    const totalUnread = unreadMessagesCount + unreadNotificationsCount + pendingInvites.length;
    const hasUnread = totalUnread > 0;

    return (
        <div className="header">
            <div className="header-left">
                <span className="greeting">{isMobile ? getPageTitle(activePath) : `Bonjour ${firstName} 👋`}</span>
            </div>
            <div className="header-right">
                <div className="notification-wrapper" onClick={(e) => { e.stopPropagation(); setBellOpen(!bellOpen); setMenuOpen(false); }}>
                    <svg className="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    {hasUnread && <span className="notification-dot"></span>}

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
                                                <span className="bell-unread-badge">
                                                    {totalUnread > 0 ? `${totalUnread} nouvelle${totalUnread > 1 ? 's' : ''}` : '0 nouvelle'}
                                                </span>
                                            </div>
                                            <div className="bell-header-right-actions">
                                                {totalUnread > 0 && !isSelectionMode && (
                                                    <button
                                                        type="button"
                                                        className="bell-mark-all-btn"
                                                        onClick={handleMarkAllAsRead}
                                                        title="Tout marquer comme lu"
                                                        aria-label="Tout marquer comme lu"
                                                    >
                                                        <CheckCheck size={18} />
                                                    </button>
                                                )}
                                                {((isTechnician ? notificationsList.length : (bellTab === "notifications" ? notificationsList.length : smsList.length)) > 0) && (
                                                    <button
                                                        type="button"
                                                        className={`bell-mode-toggle-btn ${isSelectionMode ? "active" : ""}`}
                                                        onClick={() => {
                                                            setIsSelectionMode(!isSelectionMode);
                                                            setSelectedItemIds(new Set());
                                                            setExpandedNotificationId(null);
                                                        }}
                                                        title={isSelectionMode ? "Quitter le mode sélection" : "Sélectionner / Modifier"}
                                                        aria-label={isSelectionMode ? "Terminé" : "Modifier"}
                                                    >
                                                        {isSelectionMode ? (
                                                            <span className="bell-mode-done-text">Terminé</span>
                                                        ) : (
                                                            <ListChecks size={18} />
                                                        )}
                                                    </button>
                                                )}
                                                <button type="button" className="bell-panel-close-btn" onClick={handleCloseNotifications} title="Fermer" aria-label="Fermer">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        {!isTechnician && (
                                            <div className="bell-tabs-header">
                                                <div className="bell-tabs-segmented">
                                                    <button
                                                        type="button"
                                                        className={`bell-tab-btn ${bellTab === "notifications" ? "active" : ""}`}
                                                        onClick={() => {
                                                            setBellTab("notifications");
                                                            setIsSelectionMode(false);
                                                            setSelectedItemIds(new Set());
                                                        }}
                                                    >
                                                        <Bell size={13} /> Notifications ({notificationsList.length})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`bell-tab-btn ${bellTab === "sms" ? "active" : ""}`}
                                                        onClick={() => {
                                                            setBellTab("sms");
                                                            setIsSelectionMode(false);
                                                            setSelectedItemIds(new Set());
                                                        }}
                                                    >
                                                        <MessageSquare size={13} /> Messages ({smsList.length})
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bell-tabs-content">
                                            {isTechnician || bellTab === "notifications" ? (
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
                                                        notificationsList.map(n => {
                                                            const isSelected = selectedItemIds.has(n.id);
                                                            const isExpanded = expandedNotificationId === n.id;
                                                            const isUnread = !n.isRead;
                                                            const clientId = n.raw?.data?.clientId || (n.raw?.entityType === "email" || n.raw?.entityType === "sms" || n.raw?.entityType === "whatsapp" ? n.raw?.entityId : null);

                                                            return (
                                                                <div 
                                                                    key={n.id} 
                                                                    className={`notification-item ${isUnread ? "unread" : "read"} ${isExpanded ? "expanded" : ""} ${isSelectionMode ? "selectable" : ""} ${isSelected ? "selected" : ""}`}
                                                                    onClick={() => {
                                                                        if (isLongPressTriggeredRef.current) {
                                                                            isLongPressTriggeredRef.current = false;
                                                                            return;
                                                                        }
                                                                        handleNotificationClick(n);
                                                                    }}
                                                                    onTouchStart={handleItemTouchStart(n.id)}
                                                                    onTouchMove={handleItemTouchMove}
                                                                    onTouchEnd={handleItemTouchEnd}
                                                                    onTouchCancel={handleItemTouchEnd}
                                                                    onMouseDown={handleItemMouseDown(n.id)}
                                                                    onMouseMove={handleItemMouseMove}
                                                                    onMouseUp={handleItemMouseUp}
                                                                    onMouseLeave={handleItemMouseUp}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <div className="item-row-layout">
                                                                        {isSelectionMode && (
                                                                            <div className={`bell-selection-circle ${isSelected ? "checked" : ""}`}>
                                                                                {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                                                                            </div>
                                                                        )}
                                                                        <div className="item-content-body">
                                                                            <div className="meta">
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                                                    {isUnread && (
                                                                                        <span className="bell-unread-dot" title="Non lu" />
                                                                                    )}
                                                                                    <span className="title" style={{ fontWeight: isUnread ? 800 : 600 }}>
                                                                                        {n.title}
                                                                                    </span>
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                                                    <span className="time">{n.time}</span>
                                                                                    {!isSelectionMode && (
                                                                                        <span className="notif-chevron-icon">
                                                                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <p className={`text ${isExpanded ? "expanded" : ""}`}>{n.text}</p>

                                                                            {isExpanded && !isSelectionMode && (
                                                                                <div className="notif-expanded-actions" onClick={e => e.stopPropagation()}>
                                                                                    {n.raw?.entityType === "invoice" || n.raw?.type?.includes("INVOICE") ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="notif-action-btn"
                                                                                            onClick={() => {
                                                                                                handleCloseNotifications();
                                                                                                const invoiceNumberMatch = (n.title + ' ' + (n.text || '')).match(/\b(F-\d{4}-\d+)\b/i);
                                                                                                const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1] : null;
                                                                                                const invoiceId = n.raw?.entityId || n.raw?.data?.invoiceId || n.raw?.data?.id || n.raw?.invoiceId || null;
                                                                                                const params = new URLSearchParams();
                                                                                                if (invoiceId) params.set("id", invoiceId);
                                                                                                if (invoiceNumber) params.set("number", invoiceNumber);
                                                                                                const queryParam = params.toString() ? `?${params.toString()}` : "";
                                                                                                navigate(`/factures${queryParam}`);
                                                                                            }}
                                                                                        >
                                                                                            <FileText size={13} />
                                                                                            <span>Voir la facture</span>
                                                                                        </button>
                                                                                    ) : n.raw?.entityType === "quote" || n.raw?.type?.includes("QUOTE") ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="notif-action-btn"
                                                                                            onClick={() => {
                                                                                                handleCloseNotifications();
                                                                                                const quoteNumberMatch = (n.title + ' ' + (n.text || '')).match(/\b(D-\d{4}-\d+)\b/i);
                                                                                                const quoteNumber = quoteNumberMatch ? quoteNumberMatch[1] : null;
                                                                                                const quoteId = n.raw?.entityId || n.raw?.data?.quoteId || n.raw?.data?.id || n.raw?.quoteId || null;
                                                                                                const params = new URLSearchParams();
                                                                                                if (quoteId) params.set("id", quoteId);
                                                                                                if (quoteNumber) params.set("number", quoteNumber);
                                                                                                const queryParam = params.toString() ? `?${params.toString()}` : "";
                                                                                                navigate(`/devis${queryParam}`);
                                                                                            }}
                                                                                        >
                                                                                            <FileText size={13} />
                                                                                            <span>Voir le devis</span>
                                                                                        </button>
                                                                                    ) : n.raw?.entityType === "intervention" || n.raw?.type?.includes("INTERVENTION") || n.raw?.type?.includes("TECHNICIAN") || n.title?.toLowerCase().includes("intervention") ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="notif-action-btn"
                                                                                            onClick={() => {
                                                                                                handleCloseNotifications();
                                                                                                const interId = n.raw?.entityId || n.raw?.data?.interventionId || n.raw?.data?.id || null;
                                                                                                navigate(interId ? `/planning?id=${encodeURIComponent(interId)}` : "/planning");
                                                                                            }}
                                                                                        >
                                                                                            <Calendar size={13} />
                                                                                            <span>Voir l'intervention</span>
                                                                                        </button>
                                                                                    ) : n.raw?.type?.includes("MAINTENANCE") || n.raw?.type?.includes("RAPPEL") ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="notif-action-btn"
                                                                                            onClick={() => {
                                                                                                handleCloseNotifications();
                                                                                                navigate("/premium");
                                                                                            }}
                                                                                        >
                                                                                            <Wrench size={13} />
                                                                                            <span>Voir les rappels</span>
                                                                                        </button>
                                                                                    ) : n.raw?.type?.includes("CLIENT") ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="notif-action-btn"
                                                                                            onClick={() => {
                                                                                                handleCloseNotifications();
                                                                                                const cId = n.raw?.entityId || n.raw?.data?.clientId || n.raw?.data?.id || null;
                                                                                                navigate(cId ? `/client?id=${encodeURIComponent(cId)}` : "/client");
                                                                                            }}
                                                                                        >
                                                                                            <User size={13} />
                                                                                            <span>Voir la fiche client</span>
                                                                                        </button>
                                                                                    ) : clientId ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="notif-action-btn"
                                                                                            onClick={() => {
                                                                                                handleCloseNotifications();
                                                                                                navigate(`/messages?chat=${encodeURIComponent(clientId)}`);
                                                                                            }}
                                                                                        >
                                                                                            <MessageSquare size={13} />
                                                                                            <span>Ouvrir la conversation</span>
                                                                                        </button>
                                                                                    ) : null}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="sms-notifications-list">
                                                    {smsList.length === 0 ? (
                                                        <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '30px 10px', fontSize: '0.875rem' }}>
                                                            Aucun message pour le moment
                                                        </p>
                                                    ) : (
                                                        smsList.map(s => {
                                                            const isSelected = selectedItemIds.has(s.id);
                                                            return (
                                                                <div 
                                                                    key={s.id} 
                                                                    className={`sms-notification-item ${isSelectionMode ? "selectable" : ""} ${isSelected ? "selected" : ""}`}
                                                                    onClick={() => {
                                                                        if (isLongPressTriggeredRef.current) {
                                                                            isLongPressTriggeredRef.current = false;
                                                                            return;
                                                                        }
                                                                        if (isSelectionMode) {
                                                                            toggleSelectItem(s.id);
                                                                        } else {
                                                                            // Immediately mark as read in local state
                                                                            setSmsList(prev => prev.map(item => (item.id === s.id || item.clientId === s.clientId) ? { ...item, isUnread: false, unreadCount: 0 } : item));
                                                                            setUnreadMsgCount(prev => Math.max(0, prev - (s.unreadCount || (s.isUnread ? 1 : 0))));

                                                                            // Mark as read on server & trigger global event
                                                                            const targetClientId = s.clientId || s.id;
                                                                            if (targetClientId) {
                                                                                apiFetch(`/v1/messages/read/${encodeURIComponent(targetClientId)}`, { method: "PATCH" }).catch(() => {});
                                                                                window.dispatchEvent(new Event("messages-read"));
                                                                            }

                                                                            handleCloseNotifications();
                                                                            navigate(`/messages?chat=${encodeURIComponent(targetClientId)}`);
                                                                        }
                                                                    }}
                                                                    onTouchStart={handleItemTouchStart(s.id)}
                                                                    onTouchMove={handleItemTouchMove}
                                                                    onTouchEnd={handleItemTouchEnd}
                                                                    onTouchCancel={handleItemTouchEnd}
                                                                    onMouseDown={handleItemMouseDown(s.id)}
                                                                    onMouseMove={handleItemMouseMove}
                                                                    onMouseUp={handleItemMouseUp}
                                                                    onMouseLeave={handleItemMouseUp}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        borderLeft: s.isUnread ? '4px solid #556B2F' : '1px solid var(--border)',
                                                                        backgroundColor: isSelected 
                                                                            ? 'rgba(85, 107, 47, 0.12)' 
                                                                            : (s.isUnread ? 'rgba(85, 107, 47, 0.05)' : 'var(--card)')
                                                                    }}
                                                                >
                                                                    <div className="item-row-layout">
                                                                        {isSelectionMode && (
                                                                            <div className={`bell-selection-circle ${isSelected ? "checked" : ""}`}>
                                                                                {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                                                                            </div>
                                                                        )}
                                                                        <div className="item-content-body">
                                                                            <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                                                                    {s.isUnread && (
                                                                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#556B2F', flexShrink: 0 }} />
                                                                                    )}
                                                                                    <span className="sender" style={{ fontWeight: s.isUnread ? 800 : 700, fontSize: '0.9rem', color: 'var(--foreground)' }}>
                                                                                        {s.sender}
                                                                                    </span>
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                                                    {s.channel === "WHATSAPP" ? (
                                                                                        <span style={{ backgroundColor: 'rgba(37, 211, 102, 0.12)', color: '#25D366', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                                            <WhatsAppIcon size={12} /> WhatsApp
                                                                                        </span>
                                                                                    ) : s.channel === "EMAIL" ? (
                                                                                        <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                                            <EmailIcon size={12} /> Email
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span style={{ backgroundColor: 'rgba(85, 107, 47, 0.12)', color: '#556B2F', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                                            <SmsIcon size={12} /> SMS
                                                                                        </span>
                                                                                    )}
                                                                                    <span className="date" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.date}</span>
                                                                                </div>
                                                                            </div>

                                                                            <p 
                                                                                className="msg" 
                                                                                style={{ 
                                                                                    margin: '4px 0 8px 0', 
                                                                                    fontSize: '0.85rem', 
                                                                                    color: s.isUnread ? 'var(--foreground)' : 'var(--muted-foreground)', 
                                                                                    fontWeight: s.isUnread ? 600 : 400,
                                                                                    whiteSpace: 'nowrap',
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    display: 'block',
                                                                                    maxWidth: '100%'
                                                                                }}
                                                                            >
                                                                                {s.msg}
                                                                            </p>

                                                                            {!isSelectionMode && (
                                                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                                    <span style={{ color: '#556B2F', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                                        Ouvrir le chat <ExternalLink size={12} />
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {isSelectionMode && (
                                            <div className="bell-selection-bottom-bar">
                                                <button
                                                    type="button"
                                                    className="bell-select-all-btn"
                                                    onClick={toggleSelectAll}
                                                >
                                                    {isAllSelected ? "Tout désélectionner" : "Tout sélectionner"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="bell-delete-selected-btn"
                                                    disabled={selectedItemIds.size === 0 || isDeleting}
                                                    onClick={() => setShowDeleteConfirm(true)}
                                                >
                                                    <Trash2 size={15} />
                                                    <span>Supprimer{selectedItemIds.size > 0 ? ` (${selectedItemIds.size})` : ""}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Delete Confirmation Modal */}
                                    {showDeleteConfirm && (
                                        <div 
                                            className="bell-confirm-backdrop" 
                                            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
                                        >
                                            <div 
                                                className="bell-confirm-card" 
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="bell-confirm-icon-wrap">
                                                    <AlertTriangle size={24} color="#DC2626" />
                                                </div>
                                                <h4 className="bell-confirm-title">
                                                    {bellTab === "notifications" ? "Supprimer les notifications" : "Supprimer les messages"}
                                                </h4>
                                                <p className="bell-confirm-desc">
                                                    Êtes-vous sûr de vouloir supprimer {selectedItemIds.size} élément{selectedItemIds.size > 1 ? 's' : ''} ? Cette action est irréversible.
                                                </p>
                                                <div className="bell-confirm-actions">
                                                    <button
                                                        type="button"
                                                        className="bell-confirm-cancel-btn"
                                                        onClick={() => setShowDeleteConfirm(false)}
                                                        disabled={isDeleting}
                                                    >
                                                        Annuler
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="bell-confirm-delete-btn"
                                                        onClick={handleExecuteDelete}
                                                        disabled={isDeleting}
                                                    >
                                                        {isDeleting ? "Suppression..." : "Supprimer"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>,
                        document.body
                    )}
                </div>

                <div className="avatar-wrapper" onClick={handleAvatarClick}>
                    <div className="header-avatar" style={{ overflow: 'hidden' }}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                            initials
                        )}
                    </div>

                    {menuOpen && (
                        <div className="mobile-dropdown" onClick={(e) => e.stopPropagation()}>
                            <div className="dropdown-header">
                                <span className="dropdown-user-name">{fullName}</span>
                                <span className="dropdown-user-plan">Offre {displayName}</span>
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
