import React, { useState, useEffect, useRef } from "react";
import { 
    Activity, 
    Send, 
    MessageSquare, 
    ShieldCheck, 
    Clock, 
    Check, 
    CheckCheck, 
    Sparkles, 
    ChevronDown, 
    ChevronUp, 
    RefreshCw, 
    HelpCircle,
    UserCheck,
    Lock,
    CreditCard,
    Smartphone,
    Receipt,
    Settings2,
    Headphones
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import { getSocket } from "../../utils/socket";
import { useUser } from "../../utils/useUser";

export default function SupportTab({ isMobileView, triggerToast }) {
    const { user, role } = useUser();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [inputText, setInputText] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const isOwner = role === "OWNER";

    // Handle iOS Safari virtual keyboard without shifting fixed header
    useEffect(() => {
        if (!isMobileView) return;

        const handleViewport = () => {
            if (window.visualViewport) {
                const isKb = window.innerHeight - window.visualViewport.height > 100;
                setIsKeyboardOpen(isKb);
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
                if (isKb) {
                    setTimeout(() => scrollToBottom("smooth"), 50);
                    setTimeout(() => scrollToBottom("smooth"), 200);
                }
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", handleViewport);
            window.visualViewport.addEventListener("scroll", handleViewport);
        }

        const handleFocus = () => {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            setTimeout(() => {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
                scrollToBottom("smooth");
            }, 60);
            setTimeout(() => {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
                scrollToBottom("smooth");
            }, 250);
        };

        const inputEl = inputRef.current;
        if (inputEl) {
            inputEl.addEventListener("focus", handleFocus);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener("resize", handleViewport);
                window.visualViewport.removeEventListener("scroll", handleViewport);
            }
            if (inputEl) {
                inputEl.removeEventListener("focus", handleFocus);
            }
        };
    }, [isMobileView]);

    // Quick suggestion chips with Lucide icons and instant smart auto-replies
    const quickPrompts = [
        {
            id: "abonnement",
            label: "Question sur mon abonnement",
            icon: CreditCard,
            autoReply: "Pour gérer votre offre (Starter, Pro, Unlimited) et télécharger vos factures, rendez-vous dans « Paramètres > Abonnement ».\n\n⚡ Un de nos assistants a également été notifié et vous répondra sous peu en cas de demande personnalisée."
        },
        {
            id: "sms",
            label: "Problème d'envoi SMS client",
            icon: Smartphone,
            autoReply: "Les SMS automatiques sont configurables dans « Config > Communication & SMS ». Vérifiez que votre solde mensuel est disponible et que le numéro client est valide.\n\n⚡ Un de nos assistants examine votre dossier et vous répondra sous peu."
        },
        {
            id: "facturation",
            label: "Assistance facturation & TVA",
            icon: Receipt,
            autoReply: "Vous pouvez régler vos mentions légales et taux de TVA dans « Comptabilité > TVA » et « Config > Facturation ».\n\n⚡ Un de nos assistants reste à votre disposition ici-même."
        },
        {
            id: "stripe",
            label: "Configuration Stripe Connect",
            icon: Settings2,
            autoReply: "Pour activer le paiement par carte bancaire sur vos devis et factures, connectez votre compte bancaire dans « Config > Paiements ».\n\n⚡ Un de nos assistants vous assiste en cas de besoin."
        }
    ];

    // Scroll to bottom helper
    const scrollToBottom = (behavior = "smooth") => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior, block: "nearest" });
        }
    };

    // Load conversation messages from API
    const loadMessages = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await apiFetch("/v1/support/messages");
            if (res.success && res.data?.messages) {
                setMessages(res.data.messages);
                // Mark as read immediately when viewing
                markAsRead();
            }
        } catch (error) {
            console.error("Error loading support messages:", error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    // Mark messages as read in backend
    const markAsRead = async () => {
        try {
            await apiFetch("/v1/support/read", { method: "POST", body: JSON.stringify({}) });
            setUnreadCount(0);
        } catch (e) {
            // Ignore silent error
        }
    };

    // Setup initial data & real-time WebSockets
    useEffect(() => {
        loadMessages(true);

        const socket = getSocket();
        if (socket) {
            // Real-time message receiver
            const handleNewMessage = (newMsg) => {
                setMessages((prev) => {
                    // Check if already in list to avoid duplicates
                    if (prev.some((m) => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });

                // Auto-mark as read if received from admin while on tab
                if (newMsg.senderRole === "SUPERADMIN") {
                    markAsRead();
                }

                setTimeout(() => scrollToBottom("smooth"), 100);
            };

            // Read receipts receiver
            const handleMessagesRead = () => {
                setMessages((prev) =>
                    prev.map((m) => (m.senderRole === "OWNER" ? { ...m, readByAdmin: true } : m))
                );
            };

            socket.on("support:new_message", handleNewMessage);
            socket.on("support:messages_read", handleMessagesRead);

            return () => {
                socket.off("support:new_message", handleNewMessage);
                socket.off("support:messages_read", handleMessagesRead);
            };
        }
    }, []);

    // Auto scroll whenever messages update
    useEffect(() => {
        scrollToBottom("auto");
    }, [messages, loading]);

    // Send a message (support direct or quick prompt with auto-reply)
    const handleSendMessage = async (customContent = null, autoReply = null) => {
        const textToSend = (customContent || inputText || (inputRef.current?.innerText || "")).trim();
        if (!textToSend || sending) return;

        // 1. Optimistic message insertion (WhatsApp instant feel)
        const optimisticId = `temp_${Date.now()}`;
        const optimisticMsg = {
            id: optimisticId,
            senderRole: "OWNER",
            senderId: user?.id,
            content: textToSend,
            createdAt: new Date().toISOString(),
            readByAdmin: false,
            isOptimistic: true
        };

        setMessages((prev) => [...prev, optimisticMsg]);
        if (!customContent) {
            setInputText("");
            if (inputRef.current) inputRef.current.innerText = "";
        }
        setTimeout(() => scrollToBottom("smooth"), 30);

        setSending(true);
        try {
            const res = await apiFetch("/v1/support/messages", {
                method: "POST",
                body: JSON.stringify({
                    content: textToSend,
                    autoReply: autoReply || undefined
                })
            });

            if (res.success && res.data) {
                // Seamlessly replace optimistic message with server entity
                setMessages((prev) =>
                    prev.map((m) => (m.id === optimisticId ? res.data : m))
                );
                setTimeout(() => scrollToBottom("smooth"), 60);
            }
        } catch (error) {
            console.error("Error sending support message:", error);
            // Revert optimistic message on error
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            if (!customContent) {
                setInputText(textToSend);
                if (inputRef.current) inputRef.current.innerText = textToSend;
            }
            if (triggerToast) triggerToast("Erreur lors de l'envoi du message.", true);
        } finally {
            setSending(false);
            if (inputRef.current) inputRef.current.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatMessageTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    };

    const formatMessageDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        if (isNaN(date)) return "";

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();

        if (isToday) return "Aujourd'hui";
        if (isYesterday) return "Hier";

        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        let formatted = new Intl.DateTimeFormat('fr-FR', options).format(date);
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };

    // Non-owner restriction warning (e.g. if a technician somehow accesses)
    if (!isOwner && role !== "SUPERADMIN") {
        return (
            <div style={{
                padding: '30px',
                textAlign: 'center',
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
            }}>
                <Lock size={36} style={{ color: 'var(--muted-foreground)' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Accès réservé au dirigeant (Owner)</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)', maxWidth: '420px' }}>
                    Le canal de support direct avec l'équipe fondatrice GestArt est accessible uniquement par le titulaire du compte. Pour toute question, veuillez vous adresser à votre gérant.
                </p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: isMobileView ? '100%' : 'auto',
            flex: isMobileView ? '1 1 0' : 'none',
            minHeight: (isMobileView || isCollapsed) ? '0' : '580px',
            backgroundColor: isMobileView ? 'var(--background)' : 'var(--card)',
            border: isMobileView ? 'none' : '1px solid var(--border)',
            borderRadius: isMobileView ? '0' : '18px',
            boxShadow: isMobileView ? 'none' : '0 8px 30px rgba(0,0,0,0.08)',
            overflow: 'hidden'
        }}>
            {/* Chat Header */}
            <div style={{
                padding: isMobileView ? '12px 16px' : '16px 22px',
                borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Assistant Avatar with Live Status Dot */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: isMobileView ? '38px' : '42px',
                            height: isMobileView ? '38px' : '42px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--sidebar-primary)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            boxShadow: '0 2px 8px rgba(85, 107, 47, 0.3)'
                        }}>
                            <Headphones size={isMobileView ? 18 : 20} />
                        </div>
                        <span style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '10px',
                            height: '10px',
                            backgroundColor: '#22c55e',
                            border: '2px solid var(--card)',
                            borderRadius: '50%'
                        }}></span>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: isMobileView ? '14px' : '15px', fontWeight: 800 }}>
                                Assistant GestArt
                            </h3>
                            <span style={{
                                backgroundColor: 'rgba(85, 107, 47, 0.15)',
                                color: 'var(--sidebar-primary)',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '6px',
                                border: '1px solid rgba(85, 107, 47, 0.3)'
                            }}>
                                Support Direct
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
                            En ligne • Réponse rapide en direct
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => loadMessages(false)}
                        title="Actualiser les messages"
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 600
                        }}
                    >
                        <RefreshCw size={13} className={loading ? "spin" : ""} />
                        <span className="hide-on-mobile">Actualiser</span>
                    </button>
                    {!isMobileView && (
                        <button
                            type="button"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            title={isCollapsed ? "Agrandir le chat" : "Réduire le chat"}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                color: 'var(--foreground)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: 600
                            }}
                        >
                            {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                            <span>{isCollapsed ? "Ouvrir" : "Réduire"}</span>
                        </button>
                    )}
                </div>
            </div>

            {!isCollapsed && (
                <>
                    {/* Messages Thread Container */}
                    <div style={{
                        padding: isMobileView ? '14px 16px' : '20px',
                        flex: '1 1 0',
                        minHeight: isMobileView ? '0' : '360px',
                        maxHeight: isMobileView ? 'none' : '520px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        backgroundColor: 'var(--background)'
                    }}>
                        {/* Welcome Message Card */}
                        <div style={{
                            alignSelf: 'center',
                            maxWidth: isMobileView ? '95%' : '85%',
                            backgroundColor: 'rgba(85, 107, 47, 0.08)',
                            border: '1px solid rgba(85, 107, 47, 0.2)',
                            borderRadius: '14px',
                            padding: isMobileView ? '14px 18px' : '12px 16px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--sidebar-primary)', fontWeight: 800, fontSize: isMobileView ? '14px' : '12.5px' }}>
                                <Sparkles size={isMobileView ? 17 : 15} />
                                <span>Bienvenue sur votre canal d'assistance directe</span>
                            </div>
                            <p style={{ margin: 0, fontSize: isMobileView ? '13.5px' : '12px', color: 'var(--muted-foreground)', lineHeight: '1.5' }}>
                                Un assistant GestArt est à votre écoute pour vous accompagner dans l'utilisation de la plateforme.
                            </p>
                        </div>

                        {loading && messages.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0', width: '100%' }}>
                                {/* Skeleton Message 1 (Assistant) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', maxWidth: '75%' }}>
                                    <div className="skeleton-shimmer" style={{ width: '110px', height: '12px', borderRadius: '6px', marginBottom: '2px' }} />
                                    <div className="skeleton-shimmer" style={{ width: isMobileView ? '240px' : '300px', height: '48px', borderRadius: '18px 18px 18px 4px' }} />
                                </div>

                                {/* Skeleton Message 2 (User) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', maxWidth: '70%', alignSelf: 'flex-end' }}>
                                    <div className="skeleton-shimmer" style={{ width: isMobileView ? '180px' : '220px', height: '42px', borderRadius: '18px 18px 4px 18px' }} />
                                </div>

                                {/* Skeleton Message 3 (Assistant) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', maxWidth: '82%' }}>
                                    <div className="skeleton-shimmer" style={{ width: '120px', height: '12px', borderRadius: '6px', marginBottom: '2px' }} />
                                    <div className="skeleton-shimmer" style={{ width: isMobileView ? '270px' : '360px', height: '62px', borderRadius: '18px 18px 18px 4px' }} />
                                </div>

                                {/* Skeleton Message 4 (User) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', maxWidth: '65%', alignSelf: 'flex-end' }}>
                                    <div className="skeleton-shimmer" style={{ width: isMobileView ? '150px' : '190px', height: '38px', borderRadius: '18px 18px 4px 18px' }} />
                                </div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted-foreground)', fontSize: isMobileView ? '14.5px' : '13px' }}>
                                <MessageSquare size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                                Aucun message pour le moment. Démarrez la discussion ci-dessous !
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isFromMe = msg.senderRole === "OWNER" || msg.senderId === user?.id;
                                const showDateHeader =
                                    index === 0 ||
                                    formatMessageDate(messages[index - 1].createdAt) !==
                                        formatMessageDate(msg.createdAt);

                                return (
                                    <React.Fragment key={msg.id || index}>
                                        {showDateHeader && (
                                            <div style={{
                                                position: 'sticky',
                                                top: '6px',
                                                zIndex: 20,
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                width: '100%',
                                                margin: '10px 0 6px 0',
                                                pointerEvents: 'none'
                                            }}>
                                                <span style={{
                                                    pointerEvents: 'auto',
                                                    backgroundColor: 'rgba(60, 60, 60, 0.65)',
                                                    color: '#ffffff',
                                                    padding: '4px 14px',
                                                    borderRadius: '20px',
                                                    fontSize: '11.5px',
                                                    fontWeight: 600,
                                                    backdropFilter: 'blur(8px)',
                                                    WebkitBackdropFilter: 'blur(8px)',
                                                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    textAlign: 'center'
                                                }}>
                                                    {formatMessageDate(msg.createdAt)}
                                                </span>
                                            </div>
                                        )}

                                        <div 
                                            key={msg.id || index}
                                            className={isFromMe ? "chat-bubble-outgoing" : "chat-bubble-incoming"}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: isFromMe ? 'flex-end' : 'flex-start',
                                                gap: '3px',
                                                maxWidth: isMobileView ? '88%' : '80%',
                                                alignSelf: isFromMe ? 'flex-end' : 'flex-start'
                                            }}
                                        >
                                            {!isFromMe && (
                                                <span style={{ fontSize: isMobileView ? '12.5px' : '11px', fontWeight: 700, color: 'var(--sidebar-primary)', marginLeft: '6px', marginBottom: '1px' }}>
                                                    {msg.senderName || "Assistant GestArt"}
                                                </span>
                                            )}

                                            <div style={{
                                                padding: isMobileView ? '12px 16px' : '10px 14px',
                                                borderRadius: isFromMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                backgroundColor: isFromMe ? 'var(--sidebar-primary)' : 'var(--card)',
                                                color: isFromMe ? '#ffffff' : 'var(--foreground)',
                                                border: isFromMe ? 'none' : '1px solid var(--border)',
                                                boxShadow: isFromMe ? '0 2px 8px rgba(85, 107, 47, 0.25)' : '0 2px 6px rgba(0,0,0,0.04)',
                                                fontSize: isMobileView ? '15.5px' : '13.5px',
                                                lineHeight: '1.5',
                                                wordBreak: 'break-word',
                                                whiteSpace: 'pre-wrap',
                                                position: 'relative'
                                            }}>
                                                {msg.content}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: isMobileView ? '11px' : '10px',
                                                color: 'var(--muted-foreground)',
                                                marginRight: isFromMe ? '4px' : '0',
                                                marginLeft: isFromMe ? '0' : '4px'
                                            }}>
                                                <span>{formatMessageTime(msg.createdAt)}</span>
                                                {isFromMe && (
                                                    <span>
                                                        {msg.readByAdmin ? (
                                                            <CheckCheck size={14} style={{ color: '#22c55e' }} title="Lu par l'assistant" />
                                                        ) : (
                                                            <Check size={14} style={{ color: 'var(--muted-foreground)' }} title={msg.isOptimistic ? "Envoi en cours..." : "Distribué"} />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Prompts Suggestion Bar with Lucide Icons */}
                    <div style={{
                        padding: isMobileView ? '10px 14px' : '8px 12px',
                        backgroundColor: 'var(--card)',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch',
                        flexShrink: 0
                    }}>
                        {quickPrompts.map((prompt) => {
                            const PromptIcon = prompt.icon;
                            return (
                                <button
                                    key={prompt.id}
                                    type="button"
                                    className="quick-prompt-btn"
                                    onClick={() => handleSendMessage(prompt.label, prompt.autoReply)}
                                    disabled={sending}
                                    style={{
                                        whiteSpace: 'nowrap',
                                        fontSize: isMobileView ? '13px' : '11px',
                                        padding: isMobileView ? '7px 13px' : '5px 11px',
                                        borderRadius: '16px',
                                        backgroundColor: 'var(--background)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--foreground)',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        flexShrink: 0
                                    }}
                                >
                                    <PromptIcon size={isMobileView ? 14 : 12} style={{ color: 'var(--sidebar-primary)', flexShrink: 0 }} />
                                    <span>{prompt.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Chat Input Bar */}
                    <div style={{
                        padding: isMobileView 
                            ? (isKeyboardOpen ? '8px 12px 8px 12px' : '10px 14px max(14px, env(safe-area-inset-bottom, 14px)) 14px')
                            : '14px 18px',
                        borderTop: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexShrink: 0
                    }}>
                        <div
                            ref={inputRef}
                            contentEditable={true}
                            role="textbox"
                            aria-multiline="true"
                            tabIndex={0}
                            enterKeyHint="send"
                            autoCapitalize="sentences"
                            autoCorrect="on"
                            spellCheck="true"
                            data-placeholder="Posez votre question à un assistant..."
                            className="chat-contenteditable-input"
                            onInput={(e) => setInputText(e.currentTarget.innerText || "")}
                            onKeyDown={handleKeyDown}
                            onPaste={(e) => {
                                e.preventDefault();
                                const text = e.clipboardData.getData('text/plain');
                                document.execCommand('insertText', false, text);
                                setInputText(inputRef.current?.innerText || "");
                            }}
                            style={{
                                flex: 1,
                                padding: isMobileView ? '11px 14px' : '9px 12px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--foreground)',
                                fontSize: isMobileView ? '15.5px' : '13.5px',
                                outline: 'none',
                                fontFamily: 'inherit',
                                minHeight: isMobileView ? '44px' : '40px',
                                maxHeight: '110px',
                                overflowY: 'auto',
                                lineHeight: '1.4',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                                userSelect: 'text',
                                WebkitUserSelect: 'text',
                                boxSizing: 'border-box'
                            }}
                        />
                        <button
                            type="button"
                            className="chat-send-btn"
                            onClick={() => handleSendMessage()}
                            disabled={!inputText.trim() || sending}
                            style={{
                                height: isMobileView ? '44px' : '42px',
                                padding: isMobileView ? '0 14px' : '0 22px',
                                minWidth: isMobileView ? '44px' : '115px',
                                backgroundColor: 'var(--sidebar-primary)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                whiteSpace: 'nowrap',
                                cursor: inputText.trim() && !sending ? 'pointer' : 'not-allowed',
                                opacity: inputText.trim() && !sending ? 1 : 0.6,
                                flexShrink: 0
                            }}
                        >
                            <Send size={16} className={sending ? "spin" : ""} style={{ flexShrink: 0 }} />
                            <span className="hide-on-mobile" style={{ whiteSpace: 'nowrap' }}>Envoyer</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}


