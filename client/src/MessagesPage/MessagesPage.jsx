import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { createPortal } from "react-dom";
import {
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  ArrowLeft,
  X,
  FileText,
  Mail,
  MapPin,
  Calendar,
  MessageSquare,
  Search,
  Plus,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  Smartphone,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
  Filter,
  RefreshCw,
  Eye,
  Download,
  Trash2,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Lock,
  ExternalLink,
  CornerDownLeft
} from "lucide-react";
import "../HomePage/Homepage.css";
import "./MessagesPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import PullToRefresh from "../components/PullToRefresh";
import InvoicePdfView from "../FacturesPage/components/InvoicePdfView";
import QuotePdfView from "../DevisPage/components/QuotePdfView";
import { apiFetch } from "../utils/api";
import { getAuthToken } from "../utils/auth";
import { getApiUrl, BACKEND_URL } from "../utils/config";
import { getSocket } from "../utils/socket";
import { WhatsAppIcon, EmailIcon, SmsIcon } from "../components/ChannelIcons";
import { useSubscription } from "../utils/useSubscription";
import { useUser } from "../utils/useUser";
import PlanLimitBanner from "../components/PlanLimitBanner";

// Clean Email Content Component with Clean Quoted History (No raw > characters)
const FormattedEmailContent = ({ body }) => {
  const [showHistory, setShowHistory] = useState(false);

  if (!body) return null;

  // Split on common email quote reply markers
  const quoteSplitRegex = /(\n\s*(?:On\s+.+?wrote:|Le\s+.+?a écrit\s*:|[а-яa-z]{2,3},\s*\d{1,2}\s+[а-яa-z]{3,}\.?\s+\d{4}.+?:|-----Original Message-----|________________________________)\s*\n[\s\S]*$)|(\n\s*>[\s\S]*$)/i;

  const match = body.match(quoteSplitRegex);

  if (!match) {
    return <p className="message-text email-text-body">{body}</p>;
  }

  const mainText = body.slice(0, match.index).trim();
  const rawQuoted = body.slice(match.index).trim();

  // Clean raw quoted email string (strip all leading > symbols, remove boilerplate headers/footers)
  const parseQuoted = (raw) => {
    if (!raw) return { header: null, text: "" };
    const rawLines = raw.split("\n");
    let header = null;
    const cleanedLines = [];

    const isBoilerplate = (line) => {
      const t = line.trim();
      if (!t) return false;
      if (/^(?:Envoyé par|Pour toute question|Sent from|Get Outlook|Échange avec|Objet\s*:|Subject\s*:|De\s*:|From\s*:|À\s*:|To\s*:|Date\s*:)/i.test(t)) return true;
      if (/via (?:ClimPro|GestArt|CRM)/i.test(t)) return true;
      if (/^[A-Z0-9\s-]{3,40}$/.test(t) && !/[a-z]/.test(t)) return true;
      return false;
    };

    for (let line of rawLines) {
      const trimmed = line.trim();
      // Check if line is the reply attribution header
      if (!header && (/(?:On\s+.+?wrote|Le\s+.+?a écrit|[а-яa-z]{2,3},\s*\d{1,2}\s+[а-яa-z]{3,}\.?\s+\d{4}.+?|-----Original Message-----)/i.test(trimmed))) {
        header = trimmed.replace(/^[-_\s]+|[-_\s:]+$/g, "");
        continue;
      }
      // Strip all leading > or >> symbols
      const stripped = line.replace(/^\s*>+\s?/, "");

      // Filter out boilerplate lines
      if (isBoilerplate(stripped)) {
        continue;
      }

      if (stripped.trim() === "" && cleanedLines[cleanedLines.length - 1] === "") {
        continue;
      }
      cleanedLines.push(stripped);
    }

    while (cleanedLines.length > 0 && cleanedLines[0].trim() === "") cleanedLines.shift();
    while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === "") cleanedLines.pop();

    return { header, text: cleanedLines.join("\n") };
  };

  const quotedParsed = parseQuoted(rawQuoted);

  return (
    <div className="email-body-container">
      {mainText ? (
        <p className="message-text email-text-body">{mainText}</p>
      ) : (
        <p className="message-text email-text-body" style={{ fontStyle: "italic", opacity: 0.7 }}>[Réponse dans l'historique]</p>
      )}
      {rawQuoted && (
        <div className="email-quoted-section">
          <button
            type="button"
            className="email-quote-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowHistory(prev => !prev);
            }}
          >
            <span>{showHistory ? "▲ Masquer l'historique du message" : "••• Historique des messages"}</span>
          </button>
          {showHistory && (
            <div className="email-quoted-content">
              {quotedParsed.header && (
                <div className="email-quoted-header">
                  <Clock size={12} style={{ flexShrink: 0 }} />
                  <span>{quotedParsed.header}</span>
                </div>
              )}
              {quotedParsed.text && (
                <div className="email-quoted-body">
                  {quotedParsed.text}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Module-level in-memory cache for instant (0ms) page switching
let cachedMessagesChats = null;

function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const attachDragControls = useDragControls();
  const {
    isExpired,
    isUnlimited,
    isStarter,
    isPro,
    subscription,
    displayName,
    isSmsLimitReached,
    isSmsLimitWarning,
    smsUsed,
    smsMax,
    smsRemaining,
    triggerUpgrade
  } = useSubscription();
  const { company, user } = useUser();
  const companyDisplayName = company?.name || "Votre entreprise";
  const companyEmailAddress = company?.email || user?.email || "votre-email@entreprise.fr";

  const [smsUsage, setSmsUsage] = useState(null);

  const fetchSmsUsage = useCallback(async () => {
    try {
      const res = await apiFetch("/v1/subscription/usage");
      if (res?.data?.usage?.sms) {
        setSmsUsage(res.data.usage.sms);
      }
    } catch (_) { }
  }, []);

  useEffect(() => {
    fetchSmsUsage();
  }, [fetchSmsUsage]);

  const [chats, setChats] = useState(() => cachedMessagesChats || []);
  const [selectedClientData, setSelectedClientData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailAttachments, setEmailAttachments] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState("SMS"); // SMS, WHATSAPP, EMAIL
  const [channelAvailability, setChannelAvailability] = useState({});
  const [recommendationReason, setRecommendationReason] = useState("");

  const [filterChannel, setFilterChannel] = useState("ALL"); // ALL, UNREAD, SMS, WHATSAPP, EMAIL
  const [searchTerm, setSearchTerm] = useState("");

  const [detailTab, setDetailTab] = useState("interventions");
  const [activeCall, setActiveCall] = useState(null);
  const [isLoadingChats, setIsLoadingChats] = useState(() => !cachedMessagesChats);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [lightboxGallery, setLightboxGallery] = useState(null); // { images: [{ url, name }], index: 0 }

  // Channel dropdown & Email meta in composer
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
  const [isEmailMetaExpanded, setIsEmailMetaExpanded] = useState(false);

  // Attachment Picker Modal
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  // Client Selection Modal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [crmClientsList, setCrmClientsList] = useState([]);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Message details popover
  const [activeDetailMessage, setActiveDetailMessage] = useState(null);

  // Actions Dropdown
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Message Selection & Deletion
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingEntireConversation, setIsDeletingEntireConversation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);

  const activeChatIdParam = searchParams.get("chat") || searchParams.get("id") || searchParams.get("clientId") || searchParams.get("client");
  const isInfoParam = searchParams.get("info") === "true";

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatPaneRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Keyboard navigation for Lightbox Gallery
  useEffect(() => {
    if (!lightboxGallery) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setLightboxGallery(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxGallery(prev => prev ? {
          ...prev,
          index: (prev.index - 1 + prev.images.length) % prev.images.length
        } : null);
      } else if (e.key === "ArrowRight") {
        setLightboxGallery(prev => prev ? {
          ...prev,
          index: (prev.index + 1) % prev.images.length
        } : null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxGallery]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock scroll on mobile
  useEffect(() => {
    if (!isMobile) return;
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [isMobile]);

  // Dropdown menu click outside listener
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsActionsMenuOpen(false);
      setIsChannelDropdownOpen(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Format initials
  const getInitials = (name) => {
    if (!name) return "CL";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Format message time
  const formatMsgTime = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return "";
    }
  };

  const formatMessageGroupDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
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
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };


  // Format price helper (2 decimal places)
  const formatPrice = (val) => {
    const num = typeof val === "number" ? val : parseFloat(val || 0);
    if (isNaN(num)) return "0,00 €";
    return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " € TTC";
  };

  // Fetch Conversation List
  const fetchConversations = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoadingChats(true);
      const res = await apiFetch("/v1/messages/inbox");
      const convList = res.data?.conversations || [];
      convList.sort((a, b) => {
        const timeA = new Date(a.lastMessage?.createdAt || a.time || 0).getTime();
        const timeB = new Date(b.lastMessage?.createdAt || b.time || 0).getTime();
        return timeB - timeA;
      });
      cachedMessagesChats = convList;
      setChats(convList);
    } catch (err) {
      // Fallback sur /v1/sms/inbox
      try {
        const resFallback = await apiFetch("/v1/sms/inbox");
        const list = resFallback.data?.conversations || [];
        list.sort((a, b) => {
          const timeA = new Date(a.lastMessage?.createdAt || a.time || 0).getTime();
          const timeB = new Date(b.lastMessage?.createdAt || b.time || 0).getTime();
          return timeB - timeA;
        });
        cachedMessagesChats = list;
        setChats(list);
      } catch (e) {
        console.warn("[MESSAGES] Erreur chargement boite:", e.message);
        if (!isBackground && !cachedMessagesChats) setChats([]);
      }
    } finally {
      if (!isBackground) setIsLoadingChats(false);
    }
  }, []);

  const [isSyncingEmail, setIsSyncingEmail] = useState(false);

  const handleRefresh = useCallback(async () => {
    await fetchConversations(true);
    if (activeChatIdParam) {
      try {
        const res = await apiFetch(`/v1/messages/inbox/${activeChatIdParam}`);
        if (res.data?.messages) setMessages(res.data.messages);
      } catch (_) { }
    }
  }, [fetchConversations, activeChatIdParam]);

  const handleManualSyncInbox = async () => {
    try {
      setIsSyncingEmail(true);
      await apiFetch("/v1/communication/email/sync", { method: "POST" });
    } catch (_) {
    } finally {
      await handleRefresh();
      setIsSyncingEmail(false);
    }
  };

  useEffect(() => {
    fetchConversations(!!cachedMessagesChats);
  }, [fetchConversations]);

  // Load clients for the "New Message" selection modal
  const fetchCrmClients = async () => {
    try {
      setIsLoadingClients(true);
      const res = await apiFetch("/v1/clients?limit=100");
      const list = res.data?.clients || [];
      setCrmClientsList(list);
    } catch (err) {
      console.error("Erreur chargement clients:", err.message);
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    if (isClientModalOpen) {
      fetchCrmClients();
    }
  }, [isClientModalOpen]);

  // Load Messages & Channel Availability for Active Conversation
  useEffect(() => {
    if (!activeChatIdParam) {
      setSelectedClientData(null);
      setMessages([]);
      return;
    }

    const loadConversation = async () => {
      setIsLoadingMessages(true);
      setSendError(null);
      try {
        const res = await apiFetch(`/v1/messages/inbox/${activeChatIdParam}`);
        if (res.success && res.data) {
          setSelectedClientData(res.data.client);

          // Deduplicate messages by ID to prevent any duplicate keys
          const rawMsgs = res.data.messages || [];
          const uniqueMsgs = Array.from(new Map(rawMsgs.map(m => [m.id || m.twilioSid || m.whatsappMessageId || Math.random(), m])).values());
          setMessages(uniqueMsgs);

          setChannelAvailability(res.data.channels || {});
          setRecommendationReason(res.data.recommendationReason || "");

          // Sélection automatique intelligente du canal (Dernier message reçu > Préféré > Fallback)
          if (res.data.recommendedChannel) {
            setSelectedChannel(res.data.recommendedChannel);
          }

          // Pré-remplir l'objet de l'email si sélectionné
          if (res.data.client) {
            const clientName = `${res.data.client.firstName || ''} ${res.data.client.lastName || ''}`.trim();
            setEmailSubject(`Échange avec ${clientName}`);
          }

          // Marquer comme lus
          try {
            await apiFetch(`/v1/messages/read/${activeChatIdParam}`, { method: "PATCH" });
            setChats(prev => prev.map(c =>
              (c.clientId === activeChatIdParam || c.id === activeChatIdParam)
                ? { ...c, unreadCount: 0, lastMessage: c.lastMessage ? { ...c.lastMessage, isRead: true } : c.lastMessage }
                : c
            ));
            window.dispatchEvent(new Event("messages-read"));
          } catch (e) {
            console.warn("Erreur marquage lecture:", e.message);
          }
        }
      } catch (err) {
        console.error("Erreur chargement historique messages:", err.message);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadConversation();
  }, [activeChatIdParam]);

  const autoOpenedChatRef = useRef(false);

  // Handle Navigation State auto-open (e.g. from Client profile page)
  useEffect(() => {
    if (location.state?.clientId && !autoOpenedChatRef.current) {
      autoOpenedChatRef.current = true;
      const targetClientId = location.state.clientId;
      navigate(`/messages?chat=${targetClientId}`, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Real-time Socket.io events listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (payload) => {
      console.log("[REALTIME] Nouveau message omnicanal reçu:", payload);
      const { clientId, message } = payload;

      // 1. Si la conversation est ouverte, ajouter le message en direct
      if (activeChatIdParam && (activeChatIdParam === clientId || activeChatIdParam === message?.clientId)) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id || (m.twilioSid && m.twilioSid === message.twilioSid) || (m.whatsappMessageId && m.whatsappMessageId === message.whatsappMessageId))) {
            return prev;
          }
          return [...prev, message];
        });

        // Mettre à jour automatiquement le sélecteur si c'est un message entrant
        if (message.direction === "INCOMING" && message.channel) {
          setSelectedChannel(message.channel);
          setRecommendationReason(`Basculé automatiquement sur ${message.channel} suite au message reçu`);
        }

        // Marquer comme lu immédiatement si nous sommes sur cette conversation
        if (message.direction === "INCOMING") {
          apiFetch(`/v1/messages/read/${clientId}`, { method: "PATCH" }).catch(() => { });
        }
      }

      // 2. Mettre à jour la liste des conversations
      setChats(prev => {
        const existingIndex = prev.findIndex(c => c.clientId === clientId || c.id === clientId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          const isCurrentlyActive = activeChatIdParam === clientId;
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: { ...message, isRead: isCurrentlyActive ? true : Boolean(message.isRead) },
            channel: message.channel || updated[existingIndex].channel,
            time: message.createdAt,
            unreadCount: isCurrentlyActive ? 0 : ((Number(updated[existingIndex].unreadCount) || 0) + (message.direction === "INCOMING" ? 1 : 0))
          };
          const item = updated.splice(existingIndex, 1)[0];
          return [item, ...updated];
        } else {
          fetchConversations();
          return prev;
        }
      });
    };

    const handleStatusUpdate = (payload) => {
      console.log("[REALTIME] Mise à jour statut message:", payload);
      const { messageId, twilioSid, whatsappMessageId, status } = payload;

      setMessages(prev => prev.map(m => {
        if (m.id === messageId || (twilioSid && m.twilioSid === twilioSid) || (whatsappMessageId && m.whatsappMessageId === whatsappMessageId)) {
          return { ...m, status };
        }
        return m;
      }));
    };

    const handleReadUpdate = (payload) => {
      const { clientId } = payload;
      setChats(prev => prev.map(c =>
        (c.clientId === clientId || c.id === clientId)
          ? { ...c, unreadCount: 0, lastMessage: c.lastMessage ? { ...c.lastMessage, isRead: true } : c.lastMessage }
          : c
      ));
      window.dispatchEvent(new Event("messages-read"));
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:status", handleStatusUpdate);
    socket.on("message:read", handleReadUpdate);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:status", handleStatusUpdate);
      socket.off("message:read", handleReadUpdate);
    };
  }, [activeChatIdParam, fetchConversations]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior = "smooth", delay = 0) => {
    const doScroll = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
      }
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior
        });
      }
    };
    if (delay > 0) {
      setTimeout(doScroll, delay);
    } else {
      requestAnimationFrame(doScroll);
    }
  }, []);

  // When input is focused/clicked (especially on mobile when keyboard opens)
  const handleInputFocus = useCallback(() => {
    scrollToBottom("smooth", 30);
    scrollToBottom("smooth", 250);
    scrollToBottom("smooth", 450);
  }, [scrollToBottom]);

  // Handle virtual keyboard viewport resizing on mobile
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handleViewportResize = () => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        scrollToBottom("smooth", 60);
      }
    };
    window.visualViewport.addEventListener("resize", handleViewportResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
    };
  }, [scrollToBottom]);

  // Scroll to bottom on message update
  useEffect(() => {
    scrollToBottom("auto", 0);
  }, [messages.length, isLoadingMessages, scrollToBottom]);

  // Send Omnichannel Message Handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (isExpired) {
      window.dispatchEvent(new CustomEvent('subscription_expired', {
        detail: { message: "Votre abonnement a expiré. Pour envoyer des messages (SMS, WhatsApp, Email), veuillez renouveler votre abonnement." }
      }));
      return;
    }
    if (!inputText.trim() && emailAttachments.length === 0) return;
    if (!activeChatIdParam || isSending) return;

    // Check SMS quota limit
    if (selectedChannel === "SMS" && (isSmsLimitReached || (smsUsage?.isLimitReached && !isUnlimited))) {
      triggerUpgrade({
        reason: "sms",
        title: "Solde SMS mensuel épuisé",
        description: `Vous avez utilisé l'intégralité de vos SMS inclus pour ce mois (${smsUsed || smsUsage?.current || 0}/${smsMax || smsUsage?.max || 100} SMS). Passez à l'offre ${isStarter ? "Pro (500 SMS)" : "Unlimited (1 500 SMS)"} pour continuer à relancer vos clients en continu.`,
        targetPlan: isStarter ? "PRO" : "UNLIMITED"
      });
      return;
    }

    if (selectedChannel === "EMAIL" && !emailSubject.trim()) {
      setSendError("L'objet de l'email est obligatoire.");
      return;
    }

    const messageText = inputText.trim();
    setSendError(null);
    setIsSending(true);

    // Optimistic UI update
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      clientId: activeChatIdParam,
      direction: "OUTGOING",
      channel: selectedChannel,
      body: messageText,
      subject: selectedChannel === "EMAIL" ? emailSubject.trim() : undefined,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
      status: "pending",
      createdAt: new Date().toISOString(),
      isRead: true
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText("");
    const sentAttachments = [...emailAttachments];
    setEmailAttachments([]);
    scrollToBottom("smooth", 30);
    scrollToBottom("smooth", 150);

    try {
      const res = await apiFetch("/v1/messages/send", {
        method: "POST",
        body: JSON.stringify({
          clientId: activeChatIdParam,
          channel: selectedChannel,
          message: messageText,
          subject: selectedChannel === "EMAIL" ? emailSubject.trim() : undefined,
          attachments: sentAttachments
        })
      });

      if (res.success && res.data?.messageLog) {
        const savedLog = res.data.messageLog;
        setMessages(prev => prev.map(m => m.id === tempId ? savedLog : m));
        scrollToBottom("smooth", 50);

        // Mettre à jour la conversation dans la liste
        setChats(prev => {
          const idx = prev.findIndex(c => c.clientId === activeChatIdParam || c.id === activeChatIdParam);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = {
              ...copy[idx],
              lastMessage: savedLog,
              channel: savedLog.channel,
              time: savedLog.createdAt
            };
            const item = copy.splice(idx, 1)[0];
            return [item, ...copy];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("[MESSAGE SEND ERROR]", err.message);
      if (err.message && (err.message.includes("Limite") || err.message.includes("limite") || err.code === "LIMIT_REACHED" || err.message.includes("SMS") || err.message.includes("quota"))) {
        window.dispatchEvent(new CustomEvent('open_upgrade_modal', {
          detail: {
            reason: "sms",
            title: "Solde SMS mensuel épuisé",
            description: err.message,
            targetPlan: "UNLIMITED"
          }
        }));
      }
      setSendError(err.message || "Impossible d'envoyer le message.");
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed", errorMessage: err.message } : m));
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectChat = (clientId) => {
    setChats(prev => prev.map(c =>
      (c.clientId === clientId || c.id === clientId)
        ? { ...c, unreadCount: 0, lastMessage: c.lastMessage ? { ...c.lastMessage, isRead: true } : c.lastMessage }
        : c
    ));
    navigate(`/messages?chat=${clientId}`);
  };

  const toggleClientInfo = () => {
    if (isInfoParam) {
      navigate(`/messages?chat=${activeChatIdParam}`, { replace: true });
    } else {
      navigate(`/messages?chat=${activeChatIdParam}&info=true`);
    }
  };

  const handleBackToChats = (e) => {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    autoOpenedChatRef.current = true;
    setSearchParams({});
    navigate("/messages", { replace: true, state: {} });
  };

  // Mobile: handle iOS swipe back to return to list view
  useEffect(() => {
    if (!isMobile) return;
    const handlePopState = () => {
      if (activeChatIdParam) {
        setSearchParams({});
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isMobile, activeChatIdParam, setSearchParams]);

  // Hide mobile bottom navigation bar when inside an active chat
  useEffect(() => {
    if (isMobile && (activeChatIdParam || selectedClientData)) {
      document.body.classList.add("hide-mobile-bottom-nav");
    } else {
      document.body.classList.remove("hide-mobile-bottom-nav");
    }
    return () => {
      document.body.classList.remove("hide-mobile-bottom-nav");
    };
  }, [isMobile, activeChatIdParam, selectedClientData]);

  const handleBackToChatPane = () => {
    navigate(`/messages?chat=${activeChatIdParam}`);
  };

  const handleStartChatWithContact = (client) => {
    const cleanClientPhone = (client.phone || "").replace(/\D/g, "");
    const existing = chats.find(c =>
      (c.clientId && c.clientId === client.id) ||
      c.id === client.id ||
      (cleanClientPhone && c.phone && (
        c.phone.replace(/\D/g, "") === cleanClientPhone ||
        c.phone.replace(/\D/g, "").endsWith(cleanClientPhone) ||
        cleanClientPhone.endsWith(c.phone.replace(/\D/g, ""))
      ))
    );
    const targetChatId = existing ? (existing.clientId || existing.id) : client.id;
    navigate(`/messages?chat=${targetChatId}`);
    setIsClientModalOpen(false);
    setModalSearchTerm("");
  };

  // Message Selection Handlers
  const handleToggleSelectMessage = (msgId) => {
    if (!msgId) return;
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedMessageIds.size === messages.length && messages.length > 0) {
      setSelectedMessageIds(new Set());
    } else {
      setSelectedMessageIds(new Set(messages.map(m => m.id || m._id).filter(Boolean)));
    }
  };

  const handleCancelSelectMode = () => {
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());
    setIsDeleteModalOpen(false);
  };

  const longPressTimerRef = useRef(null);
  const isLongPressTriggered = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleTouchStartMessage = (e, msgId) => {
    isLongPressTriggered.current = false;
    const touch = e?.touches ? e.touches[0] : e;
    if (touch) {
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    }
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(25); } catch (_) { }
      }
      setIsSelectMode(true);
      handleToggleSelectMessage(msgId);
    }, 450);
  };

  const handleTouchMoveMessage = (e) => {
    if (!longPressTimerRef.current) return;
    const touch = e?.touches ? e.touches[0] : e;
    if (touch) {
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > 12 || dy > 12) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEndMessage = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeleteSelectedMessages = async () => {
    if (isDeleting) return;
    if (selectedMessageIds.size === 0 && !isDeletingEntireConversation) return;
    setIsDeleting(true);

    const idsArray = Array.from(selectedMessageIds);
    const idsSet = new Set(idsArray.map(id => String(id)));
    const targetChatId = activeChatIdParam;
    const isEntire = isDeletingEntireConversation || (messages.length > 0 && idsArray.length >= messages.length);

    if (isEntire) {
      // Optimistically remove conversation from state and cache immediately
      setChats(prev => prev.filter(c => c.id !== targetChatId && c.clientId !== targetChatId));
      if (cachedMessagesChats) {
        cachedMessagesChats = cachedMessagesChats.filter(c => c.id !== targetChatId && c.clientId !== targetChatId);
      }
      setMessages([]);
      setSelectedMessageIds(new Set());
      setIsSelectMode(false);
      setIsDeleteModalOpen(false);
      setIsDeletingEntireConversation(false);
      setActiveDetailMessage(null);
      setSearchParams({});
      navigate("/messages", { replace: true, state: {} });
    } else {
      // Optimistic local state update immediately
      setMessages(prev => prev.filter(m => !idsSet.has(String(m.id)) && !idsSet.has(String(m._id))));
      setSelectedMessageIds(new Set());
      setIsSelectMode(false);
      setIsDeleteModalOpen(false);
      setActiveDetailMessage(null);
    }

    try {
      const payload = {};
      if (idsArray.length > 0) {
        payload.messageIds = idsArray;
        payload.ids = idsArray;
      }
      if (isEntire && targetChatId) {
        payload.clientIds = [targetChatId];
      }

      const queryParam = idsArray.length > 0
        ? `?ids=${encodeURIComponent(idsArray.join(","))}`
        : (targetChatId ? `?clientIds=${encodeURIComponent(targetChatId)}` : "");

      await apiFetch(`/v1/messages/batch${queryParam}`, {
        method: "DELETE",
        body: payload
      });

      if (!isEntire) {
        // Mettre à jour la conversation dans la liste de gauche
        setChats(prev => prev.map(c => {
          if (c.clientId === targetChatId || c.id === targetChatId) {
            if (c.lastMessage && (idsSet.has(String(c.lastMessage.id)) || idsSet.has(String(c.lastMessage._id)))) {
              return {
                ...c,
                lastMessage: null
              };
            }
          }
          return c;
        }));
      }
    } catch (err) {
      console.warn("[DELETE MESSAGES WARN]", err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadAttachment = async (e, url, filename) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!url) return;

    if (url.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = url;
      link.download = (filename || "fichier").replace(/[^a-zA-Z0-9._-]/g, "_");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      const targetUrl = url.startsWith("http") ? url : `${BACKEND_URL}${url}`;
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error("Erreur réseau");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = (filename || "fichier").replace(/[^a-zA-Z0-9._-]/g, "_");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Téléchargement direct impossible, ouverture du lien:", err.message);
      const link = document.createElement("a");
      link.href = url.startsWith("http") ? url : `${BACKEND_URL}${url}`;
      link.download = filename || "fichier";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return "";
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        setEmailAttachments(prev => [
          ...prev,
          {
            filename: file.name,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            data: base64Data,
            type: "custom_file",
            isImage: file.type.startsWith("image/")
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = null;
  };

  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.items) {
      const items = e.clipboardData.items;
      const fileList = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const file = new File([blob], `Capture_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`, { type: blob.type });
            fileList.push(file);
          }
        }
      }
      if (fileList.length > 0) {
        handleFiles(fileList);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handlePreviewAttachedItem = (att) => {
    if (!att) return;
    const isImg = att.isImage || (att.mimeType || "").startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.filename || att.name || "");
    if (isImg && (att.data || att.url || att.path)) {
      const imgSrc = att.data || (att.url ? (att.url.startsWith("http") ? att.url : `${BACKEND_URL}${att.url}`) : `${BACKEND_URL}${att.path}`);
      setLightboxGallery({ images: [{ url: imgSrc, name: att.filename || att.name || "Photo" }], index: 0 });
      return;
    }
    if (att.type === "quote" || att.type === "invoice" || att.quoteId || att.invoiceId) {
      handleOpenDocPreview(att);
      return;
    }
    if (att.data) {
      try {
        const base64Part = att.data.includes(',') ? att.data.split(',')[1] : att.data;
        const byteCharacters = atob(base64Part);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: att.mimeType || 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      } catch (err) {
        console.warn("Erreur ouverture aperçu fichier:", err.message);
      }
    }
    if (att.url) {
      const fullUrl = att.url.startsWith("http") ? att.url : `${BACKEND_URL}${att.url}`;
      window.open(fullUrl, "_blank");
      return;
    }
    handleOpenDocPreview(att);
  };

  const handleOpenDocPreview = async (item, explicitType) => {
    if (!item) return;

    const isQuote = explicitType === "quote" || item.type === "quote" || item.quoteId || (item.filename && item.filename.toLowerCase().startsWith("devis_")) || (item.name && item.name.toLowerCase().startsWith("devis_"));
    const isInvoice = explicitType === "invoice" || item.type === "invoice" || item.invoiceId || (item.filename && item.filename.toLowerCase().startsWith("facture_")) || (item.name && item.name.toLowerCase().startsWith("facture_"));

    const docId = item.id || item.quoteId || item.invoiceId;
    let docNumber = item.number;
    if (!docNumber && (item.filename || item.name)) {
      docNumber = (item.filename || item.name).replace(/^(Devis_|Facture_)/i, "").replace(/\.pdf$/i, "");
    }

    const targetClient = item.client || activeChat?.client || clientObj || {};

    try {
      if (isQuote) {
        // 1. If item already has full lines and client
        if (item.lines && item.lines.length > 0 && item.client) {
          setPreviewQuote(item);
          return;
        }
        // 2. Fetch full quote by ID
        if (docId && typeof docId === "string" && docId.length > 10) {
          try {
            const res = await apiFetch(`/v1/quotes/${docId}`);
            const q = res?.data?.quote || res?.quote || res?.data;
            if (q && q.id) {
              setPreviewQuote({
                ...q,
                client: q.client || targetClient
              });
              return;
            }
          } catch (e) {
            console.warn("[FETCH_QUOTE_PREVIEW_WARN]", e.message);
          }
        }
        // 3. Search in clientObj.quotes
        const found = clientObj.quotes?.find(q => q.id === docId || (docNumber && q.number === docNumber));
        if (found) {
          try {
            const detailedRes = await apiFetch(`/v1/quotes/${found.id}`);
            const q = detailedRes?.data?.quote || detailedRes?.quote || detailedRes?.data || found;
            setPreviewQuote({
              ...q,
              client: q.client || targetClient
            });
            return;
          } catch {
            setPreviewQuote({
              ...found,
              client: found.client || targetClient
            });
            return;
          }
        }
        // 4. Fallback search by number
        if (docNumber) {
          try {
            const resSearch = await apiFetch(`/v1/quotes?search=${encodeURIComponent(docNumber)}`);
            const quotes = resSearch?.data?.quotes || resSearch?.quotes || [];
            const matched = quotes.find(q => q.number === docNumber);
            if (matched) {
              const detailedRes = await apiFetch(`/v1/quotes/${matched.id}`);
              const q = detailedRes?.data?.quote || detailedRes?.quote || detailedRes?.data || matched;
              setPreviewQuote({
                ...q,
                client: q.client || targetClient
              });
              return;
            }
          } catch (e) {
            console.warn("[SEARCH_QUOTE_WARN]", e.message);
          }
        }
        // 5. Direct fallback
        setPreviewQuote({
          ...item,
          number: docNumber || item.number || "Devis",
          client: targetClient
        });
      } else if (isInvoice) {
        // 1. If item already has full lines and client
        if (item.lines && item.lines.length > 0 && item.client) {
          setPreviewInvoice(item);
          return;
        }
        // 2. Fetch full invoice by ID
        if (docId && typeof docId === "string" && docId.length > 10) {
          try {
            const res = await apiFetch(`/v1/invoices/${docId}`);
            const inv = res?.data?.invoice || res?.invoice || res?.data;
            if (inv && inv.id) {
              setPreviewInvoice({
                ...inv,
                client: inv.client || targetClient
              });
              return;
            }
          } catch (e) {
            console.warn("[FETCH_INVOICE_PREVIEW_WARN]", e.message);
          }
        }
        // 3. Search in clientObj.invoices
        const found = clientObj.invoices?.find(inv => inv.id === docId || (docNumber && inv.number === docNumber));
        if (found) {
          try {
            const detailedRes = await apiFetch(`/v1/invoices/${found.id}`);
            const inv = detailedRes?.data?.invoice || detailedRes?.invoice || detailedRes?.data || found;
            setPreviewInvoice({
              ...inv,
              client: inv.client || targetClient
            });
            return;
          } catch {
            setPreviewInvoice({
              ...found,
              client: found.client || targetClient
            });
            return;
          }
        }
        // 4. Fallback search by number
        if (docNumber) {
          try {
            const resSearch = await apiFetch(`/v1/invoices?search=${encodeURIComponent(docNumber)}`);
            const invoices = resSearch?.data?.invoices || resSearch?.invoices || [];
            const matched = invoices.find(inv => inv.number === docNumber);
            if (matched) {
              const detailedRes = await apiFetch(`/v1/invoices/${matched.id}`);
              const inv = detailedRes?.data?.invoice || detailedRes?.invoice || detailedRes?.data || matched;
              setPreviewInvoice({
                ...inv,
                client: inv.client || targetClient
              });
              return;
            }
          } catch (e) {
            console.warn("[SEARCH_INVOICE_WARN]", e.message);
          }
        }
        // 5. Direct fallback
        setPreviewInvoice({
          ...item,
          number: docNumber || item.number || "Facture",
          client: targetClient
        });
      }
    } catch (e) {
      console.error("[PREVIEW_DOC_ERROR]", e);
    }
  };

  // Filter conversations list
  const filteredChats = chats
    .filter(chat => {
      // 1. Channel Filter
      if (filterChannel === "UNREAD" && (!chat.unreadCount || chat.unreadCount === 0)) return false;
      if (filterChannel === "SMS" && chat.channel !== "SMS") return false;
      if (filterChannel === "WHATSAPP" && chat.channel !== "WHATSAPP") return false;
      if (filterChannel === "EMAIL" && chat.channel !== "EMAIL") return false;

      // 2. Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const name = (chat.name || "").toLowerCase();
        const phone = (chat.client?.phone || "").toLowerCase();
        const email = (chat.client?.email || "").toLowerCase();
        const preview = (chat.lastMessage?.body || chat.lastMessage?.subject || "").toLowerCase();
        return name.includes(q) || phone.includes(q) || email.includes(q) || preview.includes(q);
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || a.time || 0).getTime();
      const timeB = new Date(b.lastMessage?.createdAt || b.time || 0).getTime();
      return timeB - timeA;
    });

  const hasActiveChat = (client) => {
    if (!client) return false;
    const cleanClientPhone = (client.phone || "").replace(/\D/g, "");
    return chats.some(c => {
      if (c.clientId && c.clientId === client.id) return true;
      if (c.id && c.id === client.id) return true;
      if (cleanClientPhone && c.phone) {
        const cleanChatPhone = c.phone.replace(/\D/g, "");
        if (cleanChatPhone && (
          cleanChatPhone === cleanClientPhone ||
          cleanChatPhone.endsWith(cleanClientPhone) ||
          cleanClientPhone.endsWith(cleanChatPhone)
        )) {
          return true;
        }
      }
      return false;
    });
  };

  const filteredContactsList = crmClientsList.filter(client => {
    const fullName = `${client.firstName || ''} ${client.lastName || ''} ${client.companyName || ''}`.toLowerCase();
    const phone = (client.phone || "").toLowerCase();
    const email = (client.email || "").toLowerCase();
    const query = modalSearchTerm.toLowerCase().trim();

    // If searching by text: search across all contacts
    if (query) {
      return fullName.includes(query) || phone.includes(query) || email.includes(query);
    }

    // Default view when opening +: only contacts WITHOUT an existing chat
    return !hasActiveChat(client);
  });

  // Mobile layout state
  let mobileView = "list";
  if (activeChatIdParam) {
    mobileView = isInfoParam ? "info" : "chat";
  }

  // Active client object
  const activeChat = chats.find(c => (c.clientId === activeChatIdParam || c.id === activeChatIdParam));
  const clientObj = selectedClientData || activeChat?.client || {};
  const activeClientName = `${clientObj.firstName || ''} ${clientObj.lastName || ''}`.trim() || clientObj.companyName || clientObj.phone || activeChat?.name || "Client";

  // Channel Icon / Badge Renderer
  const renderChannelBadge = (channel, size = "sm") => {
    const c = (channel || "SMS").toUpperCase();
    if (c === "WHATSAPP") {
      return (
        <span className={`channel-badge channel-badge-whatsapp ${size === "lg" ? "channel-badge-lg" : ""}`} title="Canal WhatsApp">
          <WhatsAppIcon size={size === "lg" ? 17 : 13} />
          <span>WhatsApp</span>
        </span>
      );
    }
    if (c === "EMAIL") {
      return (
        <span className={`channel-badge channel-badge-email ${size === "lg" ? "channel-badge-lg" : ""}`} title="Canal Email">
          <EmailIcon size={size === "lg" ? 17 : 13} />
          <span>Email</span>
        </span>
      );
    }
    return (
      <span className={`channel-badge channel-badge-sms ${size === "lg" ? "channel-badge-lg" : ""}`} title="Canal SMS">
        <SmsIcon size={size === "lg" ? 17 : 13} />
        <span>SMS</span>
      </span>
    );
  };

  // Delivery status icon renderer
  const renderStatusIcon = (status, channel) => {
    const isWhatsApp = channel === "WHATSAPP";
    const s = String(status || "").toLowerCase().trim();
    switch (s) {
      case "read":
        return <CheckCheck size={14} className="text-white opacity-90 inline ml-1 status-icon-read" title="Lu par le destinataire" />;
      case "delivered":
        return <CheckCheck size={14} className="text-white opacity-90 inline ml-1" title="Délivré sur le téléphone / boîte" />;
      case "sent":
        return <Check size={14} className="text-white opacity-90 inline ml-1" title="Envoyé via le provider" />;
      case "failed":
      case "undelivered":
      case "error":
        return <AlertCircle size={14} className="text-white opacity-90 inline ml-1" title="Échec de distribution" />;
      case "pending":
      case "sending":
        return <Clock size={12} className="text-white opacity-70 inline ml-1" title="En cours d'envoi" />;
      default:
        // Si le message est déjà enregistré dans l'historique sans statut explicite ou statut inconnu
        return <Check size={14} className="text-white opacity-90 inline ml-1" title="Envoyé" />;
    }
  };


  // Render Client Info Sidebar / Drawer
  const renderClientInfoContent = (client) => {
    const equipmentList = client?.equipment || [];
    const equipment = equipmentList[0] || { model: "Non renseigné", installDate: "N/A", serialNumber: "N/A" };
    const interventions = client?.interventions || [];
    const factures = client?.invoices || [];
    const devis = client?.quotes || [];

    const isSmsAvail = Boolean(client?.phone);
    const isWaAvail = Boolean(client?.phone);
    const isEmailAvail = Boolean(client?.email && client?.email.includes("@"));

    return (
      <div className="client-info-drawer-content">
        <div className="info-profile-section">
          <div className="info-avatar">{getInitials(activeClientName)}</div>
          <h3 className="info-name">{activeClientName}</h3>
          <span className="info-badge">{client?.companyName ? "Professionnel (B2B)" : "Particulier"}</span>
        </div>

        <div className="info-divider"></div>

        {/* Canaux de communication disponibles */}
        <h4 className="info-section-title">CANAUX DISPONIBLES</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--accent)", borderRadius: "8px", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <SmsIcon size={16} />
              <span style={{ fontWeight: 600 }}>SMS Direct</span>
            </div>
            {isSmsAvail ? <Check size={15} style={{ color: "#22c55e" }} /> : <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Indisponible</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--accent)", borderRadius: "8px", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <WhatsAppIcon size={16} />
              <span style={{ fontWeight: 600 }}>WhatsApp Business</span>
            </div>
            {isWaAvail ? <Check size={15} style={{ color: "#22c55e" }} /> : <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Indisponible</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--accent)", borderRadius: "8px", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <EmailIcon size={16} />
              <span style={{ fontWeight: 600 }}>Email Pro</span>
            </div>
            {isEmailAvail ? <Check size={15} style={{ color: "#22c55e" }} /> : <span style={{ fontSize: "11px", color: "#ef4444" }}>Sans email</span>}
          </div>
        </div>

        <div className="info-divider"></div>

        <div className="info-details-list">
          <div className="info-row">
            <Phone size={15} className="info-row-icon" />
            <span className="font-mono">{client?.phone || "Aucun numéro"}</span>
          </div>
          <div className="info-row">
            <Mail size={15} className="info-row-icon" />
            <span>{client?.email || "Non renseigné"}</span>
          </div>
          <div className="info-row">
            <MapPin size={15} className="info-row-icon" />
            <span>{client?.address ? `${client.address}, ${client.postalCode || ''} ${client.city || ''}` : "Non renseigné"}</span>
          </div>
        </div>

        <div className="info-divider"></div>

        <h4 className="info-section-title">ÉQUIPEMENT</h4>
        <div className="info-equipment-card">
          <div className="equipment-item">
            <span className="eq-label">Modèle</span>
            <span className="eq-val">{equipment.brand ? `${equipment.brand} ${equipment.model || ''}` : equipment.model || "Aucun équipement"}</span>
          </div>
          <div className="equipment-item">
            <span className="eq-label">N° de série</span>
            <span className="eq-val font-mono">{equipment.serialNumber || "—"}</span>
          </div>
        </div>

        <div className="info-divider"></div>

        <div className="info-tabs">
          {["interventions", "factures", "devis"].map((tab) => (
            <button
              key={tab}
              className={`info-tab-btn ${detailTab === tab ? "active" : ""}`}
              onClick={() => setDetailTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="info-tab-panel">
          {detailTab === "interventions" && (
            <div className="panel-scroll">
              {interventions.length === 0 ? (
                <p className="no-data">Aucune intervention</p>
              ) : (
                interventions.map((item, idx) => (
                  <div key={idx} className="panel-item-card">
                    <div className="panel-item-header">
                      <h5>{item.title || "Intervention"}</h5>
                      <span className="panel-item-date">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString() : "—"}</span>
                    </div>
                    <p className="panel-item-body">Statut: <span className="status-badge-ok">{item.status}</span></p>
                  </div>
                ))
              )}
            </div>
          )}

          {detailTab === "factures" && (
            <div className="panel-scroll">
              {factures.length === 0 ? (
                <p className="no-data">Aucune facture</p>
              ) : (
                factures.map((item, idx) => (
                  <div key={idx} className="panel-item-card text-xs">
                    <div className="panel-item-header">
                      <h5>{item.number || "Facture"}</h5>
                      <span className="panel-item-date">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</span>
                    </div>
                    <p className="panel-item-body">Montant: <strong>{item.amountTTC ? `${item.amountTTC} €` : "—"}</strong> · <span className="status-badge-ok">{item.status}</span></p>
                  </div>
                ))
              )}
            </div>
          )}

          {detailTab === "devis" && (
            <div className="panel-scroll">
              {devis.length === 0 ? (
                <p className="no-data">Aucun devis</p>
              ) : (
                devis.map((item, idx) => (
                  <div key={idx} className="panel-item-card text-xs">
                    <div className="panel-item-header">
                      <h5>{item.number || "Devis"}</h5>
                      <span className="panel-item-date">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</span>
                    </div>
                    <p className="panel-item-body">Montant: <strong>{item.amountTTC ? `${item.amountTTC} €` : "—"}</strong> · <span className="status-badge-ok">{item.status}</span></p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Conversation List (Left Sidebar)
  const renderChatList = () => (
    <div className="inbox-sidebar flex-shrink-0">
      <div className="inbox-header">
        <div>
          <h2>Messagerie</h2>
          <span style={{ fontSize: "11.5px", color: "var(--muted-foreground)", fontWeight: 500 }}>
            Inbox Omnicanal Unifié
          </span>
        </div>
        <div className="inbox-actions">
          <button
            className="inbox-action-icon"
            title="Nouveau Message"
            onClick={() => setIsClientModalOpen(true)}
            style={{ backgroundColor: "var(--sidebar-primary)", color: "#fff" }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Search Input & Action */}
      <div className="inbox-search-row" style={{ padding: "0 16px 12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1 }}>
          <Search size={15} style={{ position: "absolute", left: "12px", color: "var(--muted-foreground)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Rechercher contact, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              fontSize: "13px"
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={{ position: "absolute", right: "10px", background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}>
              <X size={13} />
            </button>
          )}
        </div>
        <button
          type="button"
          className="inbox-sync-btn"
          title="Actualiser et synchroniser les emails"
          aria-label="Actualiser les messages"
          disabled={isSyncingEmail}
          onClick={handleManualSyncInbox}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--background)",
            color: isSyncingEmail ? "#2563eb" : "var(--muted-foreground)",
            cursor: isSyncingEmail ? "not-allowed" : "pointer",
            flexShrink: 0,
            transition: "all 0.15s ease"
          }}
        >
          <RefreshCw size={15} className={isSyncingEmail ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          className="inbox-mobile-new-chat-btn"
          title="Nouveau Message"
          onClick={() => setIsClientModalOpen(true)}
          aria-label="Nouveau Message"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Channel Filters */}
      <div className="channel-filter-bar">
        {[
          { id: "ALL", label: "Tous" },
          { id: "UNREAD", label: "Non lus" },
          { id: "SMS", label: "SMS", icon: SmsIcon },
          { id: "WHATSAPP", label: "WhatsApp", icon: WhatsAppIcon },
          { id: "EMAIL", label: "Email", icon: EmailIcon }
        ].map(filter => {
          const IconComp = filter.icon;
          const isActive = filterChannel === filter.id;
          return (
            <button
              key={filter.id}
              className={`channel-filter-chip ${isActive ? "active" : ""}`}
              onClick={(e) => {
                setFilterChannel(filter.id);
                e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
              }}
            >
              {IconComp && <IconComp size={14} color={isActive ? "#ffffff" : undefined} />}
              <span>{filter.label}</span>
            </button>
          );
        })}
      </div>

      <div className="chat-list">
        {isLoadingChats ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="chat-item"
                style={{ pointerEvents: "none", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px" }}
              >
                <div className="skeleton-shimmer" style={{ width: "42px", height: "42px", borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="skeleton-shimmer" style={{ width: `${90 + (idx % 3) * 25}px`, height: "15px", borderRadius: "4px" }} />
                    <div className="skeleton-shimmer" style={{ width: "38px", height: "12px", borderRadius: "4px", opacity: 0.6 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="skeleton-shimmer" style={{ width: "16px", height: "16px", borderRadius: "4px", opacity: 0.7 }} />
                    <div className="skeleton-shimmer" style={{ width: `${120 + (idx % 2) * 40}px`, height: "12px", borderRadius: "4px", opacity: 0.6 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="inbox-empty-state" style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--muted-foreground)", width: "100%", boxSizing: "border-box" }}>
            <MessageSquare size={isMobile ? 42 : 36} style={{ opacity: 0.4, margin: "0 auto 12px auto", display: "block" }} />
            <p className="inbox-empty-title" style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--foreground)", marginBottom: "4px" }}>
              Aucun échange trouvé
            </p>
            <p className="inbox-empty-desc" style={{ fontSize: "0.8rem", marginBottom: "16px", lineHeight: "1.4" }}>
              Envoyez un message par SMS, WhatsApp ou Email. Les réponses apparaîtront ici.
            </p>
            {!isMobile && (
              <button
                type="button"
                className="empty-inbox-new-btn"
                onClick={() => setIsClientModalOpen(true)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--sidebar-primary)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Plus size={16} /> Nouveau message
              </button>
            )}
          </div>
        ) : (
          filteredChats.map((chat, idx) => {
            const isSelected = activeChatIdParam === (chat.clientId || chat.id);
            const rawUnread = chat.unreadCount !== undefined && chat.unreadCount !== null
              ? Number(chat.unreadCount)
              : (chat.lastMessage && chat.lastMessage.direction === "INCOMING" && chat.lastMessage.isRead === false ? 1 : 0);
            const unreadCount = isSelected ? 0 : rawUnread;
            const isUnread = unreadCount > 0;
            const isOutgoing = chat.lastMessage?.direction === "OUTGOING";
            const rawBody = chat.lastMessage?.subject
              ? `[${chat.lastMessage.subject}] ${chat.lastMessage?.body || ''}`
              : (chat.lastMessage?.body || "Discussion démarrée");
            const previewText = isOutgoing ? `Vous : ${rawBody}` : rawBody;
            const msgTime = formatMsgTime(chat.lastMessage?.createdAt || chat.time);
            const lastChannel = chat.lastMessage?.channel || chat.channel || "SMS";

            return (
              <div
                key={chat.clientId ? `chat_${chat.clientId}` : (chat.id ? `chat_${chat.id}` : `chat_${idx}`)}
                className={`chat-item ${isSelected ? "active" : ""} ${isUnread ? "unread" : ""}`}
                onClick={() => handleSelectChat(chat.clientId || chat.id)}
              >
                <div className="chat-avatar-wrapper">
                  <div className="chat-avatar">{getInitials(chat.name)}</div>
                  {isUnread && <div className="chat-avatar-unread-dot" />}
                </div>
                <div className="chat-meta">
                  <div className="chat-meta-row">
                    <span className="chat-name">{chat.name}</span>
                    <span className="chat-time">{msgTime}</span>
                  </div>
                  <div className="chat-preview-row">
                    <div className="chat-preview-content">
                      {renderChannelBadge(lastChannel, "sm")}
                      <p className="chat-preview">{previewText}</p>
                    </div>
                    {isUnread && (
                      <span className="chat-unread-badge">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Render Chat Pane (Active Omnichannel Conversation)
  const renderChatPane = () => (
    <div className="chat-pane flex-1" ref={chatPaneRef}>
      {/* Mobile Header via Portal */}
      {isMobile && (selectedClientData || activeChat) && !previewQuote && !previewInvoice && !lightboxGallery && !activeCall && createPortal(
        <div className="chat-pane-header">
          <button
            type="button"
            className="chat-back-btn"
            onClick={handleBackToChats}
            aria-label="Retour aux messages"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="chat-header-user-clickable" onClick={toggleClientInfo}>
            <div className="active-chat-avatar">{getInitials(activeClientName)}</div>
            <div className="active-chat-info">
              <h3>{activeClientName}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden" }}>
                {renderChannelBadge(selectedChannel, "sm")}
                <span className="active-chat-status font-mono" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clientObj.phone || clientObj.email || "Contact"}</span>
              </div>
            </div>
          </div>
          <div className="chat-pane-header-actions">
            <button className="pane-header-action-btn" title="Appeler" onClick={() => setActiveCall({ type: "audio", contactName: activeClientName })}>
              <Phone size={20} />
            </button>
            <div className="pane-header-action-btn-wrapper" style={{ position: "relative" }}>
              <button
                className="pane-header-action-btn"
                title="Plus"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsActionsMenuOpen(!isActionsMenuOpen);
                }}
              >
                <MoreVertical size={20} />
              </button>
              {isActionsMenuOpen && (
                <div className="chat-actions-dropdown">
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); toggleClientInfo(); }}>
                    <Mail size={14} className="dropdown-action-icon" />
                    <span>Détails Client</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); navigate('/planning', { state: { clientName: activeClientName } }); }}>
                    <Calendar size={14} className="dropdown-action-icon" />
                    <span>Planifier intervention</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); navigate('/factures', { state: { clientName: activeClientName, openNewModal: true } }); }}>
                    <FileText size={14} className="dropdown-action-icon" />
                    <span>Créer facture</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); setIsSelectMode(true); }}>
                    <CheckSquare size={14} className="dropdown-action-icon" />
                    <span>Sélectionner des messages</span>
                  </button>
                  <button
                    type="button"
                    className="chat-action-item"
                    style={{ color: "#EF4444" }}
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      setIsDeletingEntireConversation(true);
                      setSelectedMessageIds(new Set(messages.map(m => m.id || m._id).filter(Boolean)));
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 size={14} className="dropdown-action-icon" />
                    <span>Supprimer la conversation</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="chat-pane-header">
          <div className="chat-header-user-clickable" onClick={toggleClientInfo}>
            <div className="active-chat-avatar">{getInitials(activeClientName)}</div>
            <div className="active-chat-info">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3>{activeClientName}</h3>
                {renderChannelBadge(selectedChannel, "sm")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                <span className="active-chat-status font-mono">{clientObj.phone || "Sans téléphone"}</span>
                {clientObj.email && <span className="active-chat-status">· {clientObj.email}</span>}
              </div>
            </div>
          </div>
          <div className="chat-pane-header-actions">
            <button
              className="pane-header-action-btn"
              title="Actualiser et synchroniser les emails"
              onClick={() => {
                fetchConversations();
                if (activeChatIdParam) {
                  apiFetch(`/v1/messages/inbox/${activeChatIdParam}`).then(res => {
                    if (res.success && res.data) {
                      setMessages(res.data.messages || []);
                    }
                  }).catch(() => { });
                }
              }}
            >
              <RefreshCw size={16} className={isLoadingChats ? "animate-spin" : ""} />
            </button>
            <button className="pane-header-action-btn" title="Appeler" onClick={() => setActiveCall({ type: "audio", contactName: activeClientName })}>
              <Phone size={17} />
            </button>
            <div className="pane-header-action-btn-wrapper" style={{ position: "relative" }}>
              <button
                className="pane-header-action-btn"
                title="Plus"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsActionsMenuOpen(!isActionsMenuOpen);
                }}
              >
                <MoreVertical size={18} />
              </button>
              {isActionsMenuOpen && (
                <div className="chat-actions-dropdown">
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); toggleClientInfo(); }}>
                    <Mail size={14} className="dropdown-action-icon" />
                    <span>Détails Client</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); navigate('/planning', { state: { clientName: activeClientName } }); }}>
                    <Calendar size={14} className="dropdown-action-icon" />
                    <span>Planifier</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); navigate('/factures', { state: { clientName: activeClientName, openNewModal: true } }); }}>
                    <FileText size={14} className="dropdown-action-icon" />
                    <span>Créer facture</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); setIsSelectMode(true); }}>
                    <CheckSquare size={14} className="dropdown-action-icon" />
                    <span>Sélectionner des messages</span>
                  </button>
                  <button
                    type="button"
                    className="chat-action-item"
                    style={{ color: "#EF4444" }}
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      setIsDeletingEntireConversation(true);
                      setSelectedMessageIds(new Set(messages.map(m => m.id || m._id).filter(Boolean)));
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 size={14} className="dropdown-action-icon" />
                    <span>Supprimer la conversation</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="chat-messages-container" ref={messagesContainerRef}>
        {isLoadingMessages ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", padding: "16px 8px", width: "100%" }}>
            {/* Incoming message skeleton */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", alignSelf: "flex-start", maxWidth: "75%" }}>
              <div className="skeleton-shimmer" style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="skeleton-shimmer" style={{ width: "220px", height: "46px", borderRadius: "16px 16px 16px 4px" }} />
                <div className="skeleton-shimmer" style={{ width: "45px", height: "10px", borderRadius: "3px", opacity: 0.5 }} />
              </div>
            </div>

            {/* Outgoing message skeleton */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", alignSelf: "flex-end", maxWidth: "75%" }}>
              <div className="skeleton-shimmer" style={{ width: "260px", height: "58px", borderRadius: "16px 16px 4px 16px" }} />
              <div className="skeleton-shimmer" style={{ width: "55px", height: "10px", borderRadius: "3px", opacity: 0.5 }} />
            </div>

            {/* Incoming message skeleton */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", alignSelf: "flex-start", maxWidth: "75%" }}>
              <div className="skeleton-shimmer" style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="skeleton-shimmer" style={{ width: "180px", height: "38px", borderRadius: "16px 16px 16px 4px" }} />
                <div className="skeleton-shimmer" style={{ width: "45px", height: "10px", borderRadius: "3px", opacity: 0.5 }} />
              </div>
            </div>

            {/* Outgoing message skeleton */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", alignSelf: "flex-end", maxWidth: "75%" }}>
              <div className="skeleton-shimmer" style={{ width: "210px", height: "42px", borderRadius: "16px 16px 4px 16px" }} />
              <div className="skeleton-shimmer" style={{ width: "55px", height: "10px", borderRadius: "3px", opacity: 0.5 }} />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)", textAlign: "center", padding: "20px" }}>
            <Sparkles size={40} className="mb-2 opacity-40" />
            <p style={{ fontWeight: 600, color: "var(--foreground)" }}>Début du fil omnicanal avec {activeClientName}</p>
            <p className="text-xs max-w-xs mt-1">
              Tous vos échanges par SMS, WhatsApp et Email avec ce client apparaîtront ici dans l'ordre chronologique.
            </p>
          </div>
        ) : (
          (() => {
            const grouped = [];
            let currentGroup = { date: null, messages: [] };

            messages.forEach((msg, idx) => {
              const dateStr = formatMessageGroupDate(msg.createdAt || msg.time);
              if (dateStr !== currentGroup.date) {
                if (currentGroup.messages.length > 0) {
                  grouped.push(currentGroup);
                }
                currentGroup = { date: dateStr, messages: [{ msg, idx }] };
              } else {
                currentGroup.messages.push({ msg, idx });
              }
            });
            if (currentGroup.messages.length > 0) {
              grouped.push(currentGroup);
            }

            return grouped.map((group, groupIdx) => (
              <div key={`date-group-${groupIdx}`} className="message-date-group">
                <div className="date-separator-container">
                  <span className="date-separator-pill">
                    {group.date}
                  </span>
                </div>
                {group.messages.map(({ msg, idx }) => {
                  const msgId = msg.id || msg._id || `temp_${idx}`;
                  const isSelected = selectedMessageIds.has(msgId);
                  const isMe = msg.direction === "OUTGOING" || msg.sender === "agent" || msg.sender === "me";
                  const timeStr = formatMsgTime(msg.createdAt || msg.time);
                  const channel = (msg.channel || "SMS").toUpperCase();
                  const isEmail = channel === "EMAIL";
                  const isWhatsApp = channel === "WHATSAPP";

                  return (
                    <div
                      key={msg.id ? `msg_${msg.id}_${idx}` : `msg_${idx}`}
                      className={`message-bubble-wrapper ${isMe ? "me" : "them"} channel-${channel.toLowerCase()} ${isSelectMode ? "select-mode-active" : ""} ${isSelected ? "selected-msg" : ""}`}
                      onTouchStart={(e) => handleTouchStartMessage(e, msgId)}
                      onTouchMove={(e) => handleTouchMoveMessage(e)}
                      onTouchEnd={handleTouchEndMessage}
                      onTouchCancel={handleTouchEndMessage}
                      onContextMenu={(e) => {
                        if (!isSelectMode) {
                          e.preventDefault();
                          setIsSelectMode(true);
                          handleToggleSelectMessage(msgId);
                        }
                      }}
                      onClick={(e) => {
                        if (isLongPressTriggered.current) {
                          isLongPressTriggered.current = false;
                          return;
                        }
                        if (isSelectMode) {
                          e.stopPropagation();
                          handleToggleSelectMessage(msgId);
                        } else {
                          setActiveDetailMessage(activeDetailMessage?.id === msg.id ? null : msg);
                        }
                      }}
                    >
                      {/* Checkbox when in select mode */}
                      {isSelectMode && (
                        <div
                          className={`message-select-checkbox ${isSelected ? "checked" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelectMessage(msgId);
                          }}
                        >
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                      )}

                      <div className="message-bubble-row">
                        {/* Quick hover actions on left for outgoing ('me') messages (Desktop only) */}
                        {isMe && !isSelectMode && !isMobile && (
                          <div className="message-hover-actions">
                            <button
                              type="button"
                              className="msg-hover-btn delete"
                              title="Supprimer ce message"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsDeletingEntireConversation(false);
                                setSelectedMessageIds(new Set([msgId]));
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="msg-hover-btn select"
                              title="Sélectionner"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsSelectMode(true);
                                setSelectedMessageIds(new Set([msgId]));
                              }}
                            >
                              <CheckSquare size={13} />
                            </button>
                          </div>
                        )}

                        <div className={`message-bubble ${isEmail ? "email-bubble-card" : ""} ${isWhatsApp ? "whatsapp-bubble-card" : ""}`}>

                          {/* Channel Header Indicator */}
                          <div className="bubble-channel-header">
                            <div className="bubble-channel-header-left">
                              {renderChannelBadge(channel, "sm")}
                              <span className="bubble-author-name">
                                {isMe ? "Vous" : activeClientName}
                              </span>
                            </div>
                          </div>

                          {/* Email Specific Subject Header */}
                          {isEmail && msg.subject && (
                            <div className="email-bubble-subject">
                              <Mail size={13} className="email-subject-icon" />
                              <span className="email-subject-label">Objet :</span>
                              <span className="email-subject-text">{msg.subject}</span>
                            </div>
                          )}
                          {/* Message Body (only if non-empty text) */}
                          {(msg.body || msg.text)?.trim() && (
                            isEmail ? (
                              <FormattedEmailContent body={msg.body || msg.text} />
                            ) : (
                              <p className="message-text" style={{ whiteSpace: "pre-wrap" }}>
                                {msg.body || msg.text}
                              </p>
                            )
                          )}

                          {/* Attachments Section (Images as big preview cards, PDFs & Files as compact single-line chips) */}
                          {(() => {
                            const parseAtts = (raw) => {
                              if (!raw) return [];
                              if (Array.isArray(raw)) return raw;
                              if (typeof raw === "string") {
                                try {
                                  const parsed = JSON.parse(raw);
                                  return Array.isArray(parsed) ? parsed : [];
                                } catch {
                                  return [];
                                }
                              }
                              return [];
                            };

                            const attList = parseAtts(msg.attachments);
                            if (attList.length === 0) return null;

                            const getAttachmentSrc = (att) => {
                              if (att.data) return att.data;
                              if (att.url) return att.url.startsWith("http") ? att.url : `${BACKEND_URL}${att.url}`;
                              if (att.path) return att.path.startsWith("http") ? att.path : `${BACKEND_URL}${att.path}`;
                              return null;
                            };

                            const images = attList.filter(att => {
                              const isImg = att.isImage || (att.mimeType || "").startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.filename || att.name || "");
                              const src = getAttachmentSrc(att);
                              return isImg && src;
                            });

                            const docs = attList.filter(att => {
                              const isImg = att.isImage || (att.mimeType || "").startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.filename || att.name || "");
                              const src = getAttachmentSrc(att);
                              return !(isImg && src);
                            });

                            const imagesList = images.map(att => ({
                              url: getAttachmentSrc(att),
                              name: att.filename || att.name || "Photo"
                            }));

                            const hasMixedAttachments = images.length > 0 && docs.length > 0;

                            return (
                              <div className={`message-attachments-container ${hasMixedAttachments ? "mixed-row" : ""}`}>
                                {/* If only images and no docs: Use Smart Media Grid */}
                                {!hasMixedAttachments && images.length > 0 && (() => {
                                  const maxVisible = 4;
                                  const isOverflow = images.length > maxVisible;
                                  const visibleImages = isOverflow ? images.slice(0, maxVisible) : images;
                                  const remainingCount = images.length - maxVisible + 1;

                                  const gridClass = images.length === 1 ? "grid-1"
                                    : images.length === 2 ? "grid-2"
                                      : images.length === 3 ? "grid-3"
                                        : "grid-4";

                                  return (
                                    <div className={`smart-media-grid ${gridClass}`}>
                                      {visibleImages.map((att, i) => {
                                        const imgSrc = getAttachmentSrc(att);
                                        const isLastAndOverflow = isOverflow && i === maxVisible - 1;

                                        return (
                                          <div
                                            key={`img_${i}`}
                                            className={`smart-media-item ${isLastAndOverflow ? "has-more-overlay" : ""}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setLightboxGallery({ images: imagesList, index: i });
                                            }}
                                          >
                                            <img
                                              src={imgSrc}
                                              alt={att.filename || att.name || "Photo"}
                                              className="smart-media-img"
                                              loading="lazy"
                                            />
                                            {isLastAndOverflow ? (
                                              <div className="smart-media-more-badge">
                                                <span>+{remainingCount}</span>
                                              </div>
                                            ) : (
                                              <div className="smart-media-hover-overlay">
                                                <span className="smart-media-name">{att.filename || att.name || "Photo"}</span>
                                                <div className="smart-media-actions">
                                                  <button
                                                    type="button"
                                                    className="att-btn"
                                                    title="Agrandir"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setLightboxGallery({ images: imagesList, index: i });
                                                    }}
                                                  >
                                                    <Eye size={12} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="att-btn"
                                                    title="Télécharger"
                                                    onClick={(e) => handleDownloadAttachment(e, imgSrc, att.filename || att.name || "photo.jpg")}
                                                  >
                                                    <Download size={12} />
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* If mixed (images + docs): Render compact square thumbnails inline alongside PDF chips */}
                                {hasMixedAttachments && images.map((att, i) => {
                                  const imgSrc = getAttachmentSrc(att);
                                  return (
                                    <div
                                      key={`inline_img_${i}`}
                                      className="attachment-inline-thumb-card"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxGallery({ images: imagesList, index: i });
                                      }}
                                      title="Cliquer pour agrandir la photo"
                                    >
                                      <img
                                        src={imgSrc}
                                        alt={att.filename || att.name || "Photo"}
                                        className="inline-thumb-img"
                                      />
                                      <div className="inline-thumb-hover">
                                        <Eye size={12} />
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Documents / Files List (Inline Chips) */}
                                {docs.length > 0 && docs.map((att, i) => {
                                  const docSrc = getAttachmentSrc(att);
                                  const isPdf = (att.filename || att.name || "").toLowerCase().endsWith(".pdf") || att.type === "quote" || att.type === "invoice" || att.mimeType === "application/pdf";
                                  return (
                                    <div
                                      key={`doc_${i}`}
                                      className="attachment-chip clickable"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePreviewAttachedItem(att);
                                      }}
                                      title="Cliquer pour prévisualiser"
                                    >
                                      {isPdf ? (
                                        <span className="pdf-tag-badge">PDF</span>
                                      ) : (
                                        <FileText size={13} className="attachment-chip-icon" />
                                      )}
                                      <span className="attachment-chip-name">{att.filename || att.name || "Document.pdf"}</span>
                                      <div className="attachment-chip-actions">
                                        <button
                                          type="button"
                                          className="att-chip-action-btn"
                                          title="Voir"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePreviewAttachedItem(att);
                                          }}
                                        >
                                          <Eye size={11} />
                                        </button>
                                        <button
                                          type="button"
                                          className="att-chip-action-btn"
                                          title="Télécharger"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (docSrc) {
                                              handleDownloadAttachment(e, docSrc, att.filename || att.name || "document");
                                            } else {
                                              handlePreviewAttachedItem(att);
                                            }
                                          }}
                                        >
                                          <Download size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Message Meta Footer */}
                          <div className="bubble-meta-footer">
                            <span className="message-time">{timeStr}</span>
                            {isMe && renderStatusIcon(msg.status, channel)}
                          </div>

                          {/* Popover detail on click */}
                          {activeDetailMessage?.id === msg.id && (
                            <div className="message-quick-details">
                              <div>Canal : <strong>{channel}</strong></div>
                              <div>Date : <span>{new Date(msg.createdAt).toLocaleString()}</span></div>
                              <div>Statut : <strong>{msg.status || "Délivré"}</strong></div>
                              {msg.externalMessageId && <div className="font-mono text-xs">ID : {msg.externalMessageId.slice(0, 24)}...</div>}
                              {msg.errorMessage && <div style={{ color: "#ef4444" }}>Erreur : {msg.errorMessage}</div>}
                              <div style={{ marginTop: "6px", display: "flex", gap: "8px" }}>
                                <button
                                  type="button"
                                  className="delete-quick-detail-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDeletingEntireConversation(false);
                                    setSelectedMessageIds(new Set([msgId]));
                                    setIsDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 size={13} />
                                  <span>Supprimer ce message</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Quick hover actions on right for incoming ('them') messages (Desktop only) */}
                        {!isMe && !isSelectMode && !isMobile && (
                          <div className="message-hover-actions">
                            <button
                              type="button"
                              className="msg-hover-btn delete"
                              title="Supprimer ce message"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsDeletingEntireConversation(false);
                                setSelectedMessageIds(new Set([msgId]));
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="msg-hover-btn select"
                              title="Sélectionner"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsSelectMode(true);
                                setSelectedMessageIds(new Set([msgId]));
                              }}
                            >
                              <CheckSquare size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()
        )}
        <div ref={messagesEndRef} style={{ height: 1, width: "100%", pointerEvents: "none" }} />
      </div>

      {/* Send Error Notice */}
      {sendError && (
        <div style={{ padding: "10px 20px", backgroundColor: "rgba(239, 68, 68, 0.12)", color: "#ef4444", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(239, 68, 68, 0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} />
            <span>{sendError}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {selectedChannel === "WHATSAPP" && (
              <button
                type="button"
                onClick={() => {
                  setSelectedChannel("SMS");
                  setSendError(null);
                }}
                style={{ padding: "4px 10px", backgroundColor: "var(--sidebar-primary)", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
              >
                📱 Basculer sur SMS
              </button>
            )}
            <button onClick={() => setSendError(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Selection & Delete Action Bar (Matching Planning / Interventions style) */}
      <AnimatePresence>
        {isSelectMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="messages-floating-action-bar"
          >
            <button
              type="button"
              className="bell-select-all-btn"
              onClick={handleToggleSelectAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--foreground)',
                fontSize: '0.94rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '8px 4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              {selectedMessageIds.size === messages.length && messages.length > 0 ? (
                <CheckSquare size={19} color="#556B2F" style={{ flexShrink: 0 }} />
              ) : (
                <Square size={19} color="var(--muted-foreground)" style={{ flexShrink: 0 }} />
              )}
              <span>{selectedMessageIds.size === messages.length && messages.length > 0 ? "Aucun" : "Tous"}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                className="bell-delete-selected-btn"
                disabled={selectedMessageIds.size === 0 || isDeleting}
                onClick={() => {
                  setIsDeletingEntireConversation(false);
                  setIsDeleteModalOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: selectedMessageIds.size === 0 ? 'rgba(220, 38, 38, 0.35)' : '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  minHeight: '42px',
                  padding: '9px 16px',
                  borderRadius: '12px',
                  fontSize: '0.90rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: selectedMessageIds.size === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: selectedMessageIds.size === 0 ? 'none' : '0 2px 8px rgba(220, 38, 38, 0.25)',
                  transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
                  transform: 'translateZ(0)',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  isolation: 'isolate'
                }}
              >
                <Trash2 size={18} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap' }}>Supprimer{selectedMessageIds.size > 0 ? ` (${selectedMessageIds.size})` : ""}</span>
              </button>

              <button
                type="button"
                className="chat-select-done-btn"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedMessageIds(new Set());
                }}
                title="Fermer la sélection"
                aria-label="Fermer la sélection"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adaptive Omnichannel Composer */}
      <div className={`omnichannel-composer-container ${selectedChannel === "EMAIL" ? "email-mode" : ""}`}>

        {/* SMS Quota Alert Banner when limit is reached */}
        {selectedChannel === "SMS" && smsUsage?.isLimitReached && (
          <div className="sms-limit-alert-banner">
            <div className="sms-limit-alert-text">
              <AlertCircle size={14} className="sms-limit-alert-icon" />
              <span>
                Quota SMS mensuel épuisé ({smsUsage.current}/{smsUsage.max} SMS).
              </span>
            </div>
            <button
              type="button"
              className="sms-limit-upgrade-btn"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open_upgrade_modal', {
                  detail: {
                    reason: "sms",
                    title: "Solde SMS mensuel épuisé",
                    description: `Votre quota de ${smsUsage.max} SMS est épuisé pour ce mois. Passez au plan Unlimited pour bénéficier de 500 SMS inclus par mois.`,
                    targetPlan: "UNLIMITED"
                  }
                }));
              }}
            >
              <Zap size={13} />
              <span>Débloquer 500 SMS</span>
            </button>
          </div>
        )}

        {/* Composer Controls Bar */}
        <div className="composer-top-bar">
          {/* Smart Channel Selector Dropdown & Meta Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
            <button
              type="button"
              className="channel-dropdown-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsChannelDropdownOpen(!isChannelDropdownOpen);
              }}
            >
              {renderChannelBadge(selectedChannel, "lg")}
              <ChevronDown size={16} />
            </button>

            {/* Email Meta Details Toggle Button (À, Objet) */}
            {selectedChannel === "EMAIL" && (
              <button
                type="button"
                className={`email-meta-toggle-btn ${isEmailMetaExpanded ? "active" : ""}`}
                onClick={() => setIsEmailMetaExpanded(!isEmailMetaExpanded)}
                title={isEmailMetaExpanded ? "Masquer les détails (À, Objet)" : "Afficher / Modifier À et Objet"}
              >
                <span className="email-meta-toggle-label">
                  {emailSubject ? `Objet : ${emailSubject}` : "À, Objet"}
                </span>
                <ChevronDown size={13} className={`email-meta-toggle-chevron ${isEmailMetaExpanded ? "open" : ""}`} />
              </button>
            )}

            {isChannelDropdownOpen && (() => {
              const isSmsNotConnected = channelAvailability.SMS?.notConnected || (channelAvailability.SMS?.available === false && channelAvailability.SMS?.reason?.toLowerCase().includes("connecté"));
              const isWhatsAppNotConnected = channelAvailability.WHATSAPP?.notConnected || (channelAvailability.WHATSAPP?.available === false && channelAvailability.WHATSAPP?.reason?.toLowerCase().includes("connecté"));
              const isEmailNotConnected = channelAvailability.EMAIL?.notConnected || (channelAvailability.EMAIL?.available === false && channelAvailability.EMAIL?.reason?.toLowerCase().includes("connecté"));

              return (
                <div className="channel-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: "8px 12px 6px", fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Choisir le canal d'envoi
                  </div>

                  {/* SMS */}
                  <div
                    className={`channel-option-item ${selectedChannel === "SMS" ? "active" : ""} ${channelAvailability.SMS?.available === false ? "disabled" : ""}`}
                    onClick={() => {
                      if (channelAvailability.SMS?.available !== false) {
                        setSelectedChannel("SMS");
                        setIsChannelDropdownOpen(false);
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                      <div className="channel-icon-avatar sms">
                        <SmsIcon size={18} />
                      </div>
                      <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--foreground)" }}>SMS Direct</div>
                        <div style={{ fontSize: "11px", color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {channelAvailability.SMS?.available === false ? (channelAvailability.SMS?.reason || "Non disponible") : "Sur le mobile du client"}
                        </div>
                      </div>
                    </div>
                    {isSmsNotConnected ? (
                      <button
                        type="button"
                        className="channel-connect-btn"
                        title="Configurer SMS dans les paramètres"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsChannelDropdownOpen(false);
                          navigate("/settings?tab=communication");
                        }}
                      >
                        <span>Connecter</span>
                        <ExternalLink size={11} />
                      </button>
                    ) : (
                      selectedChannel === "SMS" && <Check size={15} style={{ color: "var(--sidebar-primary)", flexShrink: 0 }} />
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div
                    className={`channel-option-item ${selectedChannel === "WHATSAPP" ? "active" : ""} ${channelAvailability.WHATSAPP?.available === false ? "disabled" : ""}`}
                    onClick={() => {
                      if (channelAvailability.WHATSAPP?.available !== false) {
                        setSelectedChannel("WHATSAPP");
                        setIsChannelDropdownOpen(false);
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                      <div className="channel-icon-avatar whatsapp">
                        <WhatsAppIcon size={18} />
                      </div>
                      <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--foreground)" }}>WhatsApp Business</div>
                        <div style={{ fontSize: "11px", color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {channelAvailability.WHATSAPP?.available === false ? (channelAvailability.WHATSAPP?.reason || "Non disponible") : "Meta Cloud API"}
                        </div>
                      </div>
                    </div>
                    {isWhatsAppNotConnected ? (
                      <button
                        type="button"
                        className="channel-connect-btn"
                        title="Configurer WhatsApp Business dans les paramètres"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsChannelDropdownOpen(false);
                          navigate("/settings?tab=communication");
                        }}
                      >
                        <span>Connecter</span>
                        <ExternalLink size={11} />
                      </button>
                    ) : (
                      selectedChannel === "WHATSAPP" && <Check size={15} style={{ color: "#22c55e", flexShrink: 0 }} />
                    )}
                  </div>

                  {/* Email */}
                  <div
                    className={`channel-option-item ${selectedChannel === "EMAIL" ? "active" : ""} ${!clientObj.email ? "disabled" : ""}`}
                    onClick={() => {
                      if (clientObj.email) {
                        setSelectedChannel("EMAIL");
                        setIsChannelDropdownOpen(false);
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                      <div className="channel-icon-avatar email">
                        <EmailIcon size={18} />
                      </div>
                      <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--foreground)" }}>Email Professionnel</div>
                        <div style={{ fontSize: "11px", color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {clientObj.email ? (isEmailNotConnected ? `${clientObj.email} (Relais GestArt)` : clientObj.email) : "Sans adresse email"}
                        </div>
                      </div>
                    </div>
                    {isEmailNotConnected ? (
                      <button
                        type="button"
                        className="channel-connect-btn"
                        title="Connecter Google Gmail en 1 clic dans les paramètres"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsChannelDropdownOpen(false);
                          navigate("/settings?tab=communication");
                        }}
                      >
                        <span>Connecter Google</span>
                        <ExternalLink size={11} />
                      </button>
                    ) : (
                      selectedChannel === "EMAIL" && <Check size={15} style={{ color: "#3b82f6", flexShrink: 0 }} />
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Recommendation tooltip notice */}
          {recommendationReason && (
            <span className="email-recommendation-notice" style={{ fontSize: "11px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Sparkles size={12} style={{ color: "#A3E635" }} />
              <span>{recommendationReason}</span>
            </span>
          )}
        </div>

        {/* 1. EMAIL COMPOSER (Rich mode) */}
        {selectedChannel === "EMAIL" ? (
          <form className="email-composer-form" onSubmit={handleSendMessage}>
            {/* Dynamic GestArt Relay Info Banner with Lucide Icons (No emojis) - Hidden on mobile */}
            <div className="email-relay-banner">
              <div className="email-relay-item">
                <Mail size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                <span>Expéditeur : <strong style={{ color: 'var(--foreground)' }}>{companyDisplayName} via GestArt</strong> (support.gestart@gmail.com)</span>
              </div>
              <div className="email-relay-item">
                <CornerDownLeft size={12} style={{ color: '#2563eb', flexShrink: 0 }} />
                <span>Réponses redirigées vers : <strong style={{ color: 'var(--foreground)' }}>{companyEmailAddress}</strong></span>
              </div>
            </div>

                  {isEmailMetaExpanded && (
                    <div className="email-composer-meta">
                      <div className="email-meta-row">
                        <span className="email-meta-label">De :</span>
                        <span className="email-meta-recipient font-mono">{companyDisplayName} via GestArt &lt;support.gestart@gmail.com&gt;</span>
                      </div>
                      <div className="email-meta-row">
                        <span className="email-meta-label">Réponses :</span>
                        <span className="email-meta-recipient font-mono">{companyEmailAddress}</span>
                      </div>
                      <div className="email-meta-row">
                        <span className="email-meta-label">À :</span>
                        <span className="email-meta-recipient font-mono">{activeClientName} &lt;{clientObj.email || "aucun email"}&gt;</span>
                      </div>
                      <div className="email-meta-row">
                        <span className="email-meta-label">Objet :</span>
                        <input
                          type="text"
                          placeholder="Objet de l'email..."
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          onFocus={handleInputFocus}
                          onClick={handleInputFocus}
                          className="email-subject-input"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="email-input-row" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', width: '100%' }}>
                    <textarea
                      placeholder={`Rédigez votre message à ${activeClientName}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      onPaste={handlePaste}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`email-body-textarea ${isDraggingFile ? "drag-active" : ""}`}
                      rows={2}
                      disabled={isSending}
                      style={{ flex: 1, minWidth: 0 }}
                    />

                    <button
                      type="submit"
                      className="chat-send-btn email-send-btn"
                      disabled={(!inputText.trim() && emailAttachments.length === 0) || !emailSubject.trim() || isSending}
                      title={isExpired ? "Abonnement requis pour envoyer" : "Envoyer l'email"}
                      style={{
                        flexShrink: 0,
                        opacity: (!inputText.trim() && emailAttachments.length === 0) || !emailSubject.trim() || isSending ? 0.6 : 1
                      }}
                    >
                      {isExpired ? <Lock size={16} /> : <Send size={16} />}
                    </button>
                  </div>

                  {/* Email Attachments List */}
                  {emailAttachments.length > 0 && (
                    <div className="email-attached-pills">
                      {emailAttachments.map((att, idx) => {
                        const isImg = att.isImage || (att.mimeType || "").startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.filename || att.name || "");
                        const isPdf = (att.filename || att.name || "").toLowerCase().endsWith(".pdf") || att.type === "quote" || att.type === "invoice" || att.mimeType === "application/pdf";
                        const imgSrc = isImg ? (att.data || att.url) : null;

                        return (
                          <div key={idx} className="email-attached-pill">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt="thumb"
                                className="email-attached-thumb"
                                onClick={() => handlePreviewAttachedItem(att)}
                              />
                            ) : isPdf ? (
                              <span className="pdf-tag-badge">PDF</span>
                            ) : (
                              <FileText size={13} className="email-attached-icon" />
                            )}
                            <span
                              className="email-attached-name"
                              onClick={() => handlePreviewAttachedItem(att)}
                              title="Cliquer pour prévisualiser"
                            >
                              {att.filename || att.name}
                              {att.size ? ` (${formatFileSize(att.size)})` : (att.total ? ` • ${Number(att.total).toFixed(2)} €` : "")}
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePreviewAttachedItem(att)}
                              className="email-attached-preview-btn"
                              title="Prévisualiser ce document"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEmailAttachments(emailAttachments.filter((_, i) => i !== idx))}
                              className="email-attached-remove-btn"
                              title="Retirer ce fichier"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="email-composer-bottom">
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />

                    <div className="email-attach-buttons-group">
                      <button
                        type="button"
                        className="email-attach-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Sélectionner des fichiers ou photos depuis votre ordinateur"
                      >
                        <Paperclip size={14} />
                        <span>Fichier / Photo</span>
                      </button>

                      <button
                        type="button"
                        className="email-attach-btn secondary"
                        onClick={() => setIsAttachModalOpen(true)}
                        title="Joindre un devis ou une facture du client"
                      >
                        <FileText size={14} />
                        <span>Devis / Facture</span>
                      </button>
                    </div>
                  </div>
                </form>
                ) : (
                /* 2. CHAT COMPOSER (SMS & WhatsApp mode) */
                <>
                  {selectedChannel === "SMS" && (isSmsLimitReached || isSmsLimitWarning) && (
                    <PlanLimitBanner
                      compact
                      type="sms"
                      variant={isSmsLimitReached ? "reached" : "warning"}
                      current={smsUsed}
                      max={smsMax}
                      unit="SMS"
                      targetPlan={isStarter ? "PRO" : "UNLIMITED"}
                      customTitle={isSmsLimitReached ? "Solde SMS mensuel épuisé (0 SMS restant)" : `Quota SMS : plus que ${smsRemaining} SMS disponible${smsRemaining > 1 ? "s" : ""}`}
                      customDescription={isSmsLimitReached ? `Passez à l'offre ${isStarter ? "Pro (500 SMS)" : "Unlimited (1 500 SMS)"}. Les canaux Email et WhatsApp restent illimités.` : `Votre solde SMS arrive à expiration pour ce mois.`}
                      style={{ margin: '0 0 10px 0' }}
                    />
                  )}
                  <form className="chat-input-form" onSubmit={handleSendMessage}>
                    {selectedChannel === "WHATSAPP" && (
                      <button
                        type="button"
                        className="composer-action-btn"
                        title="Joindre un devis ou document"
                        onClick={() => setIsAttachModalOpen(true)}
                      >
                        <Paperclip size={18} />
                      </button>
                    )}

                    <div className="input-wrapper" style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder={
                          selectedChannel === "WHATSAPP"
                            ? `Envoyer un message WhatsApp à ${clientObj.phone || activeClientName}...`
                            : (selectedChannel === "SMS" && isSmsLimitReached)
                              ? `Solde SMS épuisé (Passez à ${isStarter ? "Pro" : "Unlimited"} ou utilisez WhatsApp/Email)...`
                              : `Envoyer un SMS à ${clientObj.phone || activeClientName}...`
                        }
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onFocus={handleInputFocus}
                        onClick={handleInputFocus}
                        className="chat-input"
                        disabled={isSending || (selectedChannel === "SMS" && isSmsLimitReached)}
                      />
                      <span className="input-channel-tag">
                        {selectedChannel === "WHATSAPP" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#22c55e" }}><WhatsAppIcon size={14} /> WhatsApp</span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--sidebar-primary)" }}><SmsIcon size={14} /> SMS</span>
                        )}
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="chat-send-btn"
                      title={
                        isExpired
                          ? "Abonnement requis pour envoyer"
                          : (selectedChannel === "SMS" && isSmsLimitReached)
                            ? `Solde SMS épuisé · Passer à ${isStarter ? "Pro" : "Unlimited"}`
                            : `Envoyer via ${selectedChannel}`
                      }
                      disabled={(!inputText.trim() && !(selectedChannel === "SMS" && isSmsLimitReached)) || isSending}
                      style={{
                        opacity: (!inputText.trim() && !(selectedChannel === "SMS" && isSmsLimitReached)) || isSending ? 0.6 : 1,
                        backgroundColor: (selectedChannel === "SMS" && isSmsLimitReached) ? 'rgba(239, 68, 68, 0.15)' : undefined,
                        color: (selectedChannel === "SMS" && isSmsLimitReached) ? '#ef4444' : undefined,
                        border: (selectedChannel === "SMS" && isSmsLimitReached) ? '1px solid rgba(239, 68, 68, 0.3)' : undefined
                      }}
                    >
                      {isExpired ? <Lock size={16} /> : (selectedChannel === "SMS" && isSmsLimitReached) ? <Lock size={16} /> : <Send size={16} />}
                    </button>
                  </form>
                </>
        )}
              </div>

              {/* Document / PDF Attachment Modal */}
              <AnimatePresence>
                {isAttachModalOpen && (
                  <motion.div
                    className="client-modal-overlay attachment-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    onClick={() => setIsAttachModalOpen(false)}
                  >
                    <motion.div
                      className="client-modal-card attachment-modal-card"
                      onClick={(e) => e.stopPropagation()}
                      initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
                      animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                      exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
                      transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
                      drag={isMobile ? "y" : false}
                      dragListener={false}
                      dragControls={attachDragControls}
                      dragConstraints={{ top: 0 }}
                      dragElastic={{ top: 0, bottom: 0.6 }}
                      onDragEnd={(e, info) => {
                        if (info.offset.y > 80 || info.velocity.y > 300) setIsAttachModalOpen(false);
                      }}
                    >
                      {isMobile && (
                        <div
                          className="attachment-bottom-sheet-handle"
                          onPointerDown={(e) => attachDragControls.start(e)}
                        >
                          <div className="attachment-bottom-sheet-bar" />
                        </div>
                      )}

                      <div
                        className="client-modal-header attachment-modal-header"
                        style={{ flexShrink: 0 }}
                        onPointerDown={(e) => {
                          if (e.target.closest("button")) return;
                          attachDragControls.start(e);
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FileText size={20} style={{ color: "var(--sidebar-primary)" }} />
                          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>Joindre un document</h3>
                        </div>
                        <button
                          type="button"
                          className="client-modal-close"
                          onClick={() => setIsAttachModalOpen(false)}
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="attachment-modal-client-bar" style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0, backgroundColor: "var(--accent)" }}>
                        <p style={{ fontSize: "13px", color: "var(--foreground)", margin: 0, fontWeight: 500 }}>
                          Documents de <strong>{activeClientName}</strong> :
                        </p>
                      </div>

                      <div className="attachment-modal-body" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px", flex: 1, overflowY: "auto", minHeight: 0, overscrollBehavior: "contain" }}>
                        {/* Devis du client */}
                        {clientObj.quotes && clientObj.quotes.length > 0 && (
                          <div>
                            <div className="attachment-section-heading" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.04em" }}>
                              Devis ({clientObj.quotes.length})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {clientObj.quotes.map((q) => (
                                <div
                                  key={q.id}
                                  className="attachment-pick-item"
                                >
                                  <div className="attachment-icon-badge" style={{ backgroundColor: "rgba(85, 107, 47, 0.12)", color: "#556B2F" }}>
                                    <FileText size={18} />
                                  </div>
                                  <div className="attachment-item-info">
                                    <div className="attachment-item-title">Devis {q.number}</div>
                                    <div className="attachment-item-amount">
                                      <span className="attachment-amount-label">Montant : </span><strong>{formatPrice(q.amountTTC ?? q.totalTtc ?? q.total ?? 0)}</strong>
                                    </div>
                                  </div>
                                  <div className="attachment-item-actions">
                                    <button
                                      type="button"
                                      className="attachment-action-icon-btn"
                                      title="Prévisualiser ce devis"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDocPreview(q, "quote");
                                      }}
                                    >
                                      <Eye size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      className="attachment-join-btn"
                                      style={{ color: "#ffffff", backgroundColor: "#556B2F", boxShadow: "0 2px 8px rgba(85, 107, 47, 0.25)" }}
                                      onClick={() => {
                                        setEmailAttachments(prev => [...prev, { filename: `Devis_${q.number}.pdf`, id: q.id, quoteId: q.id, type: "quote", number: q.number, total: q.amountTTC ?? q.totalTtc ?? q.total ?? 0, ...q }]);
                                        setIsAttachModalOpen(false);
                                      }}
                                    >
                                      <Plus size={13} /> Joindre
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Factures du client */}
                        {clientObj.invoices && clientObj.invoices.length > 0 && (
                          <div>
                            <div className="attachment-section-heading" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.04em" }}>
                              Factures ({clientObj.invoices.length})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {clientObj.invoices.map((inv) => (
                                <div
                                  key={inv.id}
                                  className="attachment-pick-item"
                                >
                                  <div className="attachment-icon-badge" style={{ backgroundColor: "rgba(34, 197, 94, 0.12)", color: "#16a34a" }}>
                                    <FileText size={18} />
                                  </div>
                                  <div className="attachment-item-info">
                                    <div className="attachment-item-title">Facture {inv.number}</div>
                                    <div className="attachment-item-amount">
                                      <span className="attachment-amount-label">Montant : </span><strong>{formatPrice(inv.amountTTC ?? inv.totalTtc ?? inv.total ?? 0)}</strong>
                                    </div>
                                  </div>
                                  <div className="attachment-item-actions">
                                    <button
                                      type="button"
                                      className="attachment-action-icon-btn"
                                      title="Prévisualiser cette facture"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDocPreview(inv, "invoice");
                                      }}
                                    >
                                      <Eye size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      className="attachment-join-btn"
                                      style={{ color: "#ffffff", backgroundColor: "#16a34a", boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)" }}
                                      onClick={() => {
                                        setEmailAttachments(prev => [...prev, { filename: `Facture_${inv.number}.pdf`, id: inv.id, invoiceId: inv.id, type: "invoice", number: inv.number, total: inv.amountTTC ?? inv.totalTtc ?? inv.total ?? 0, ...inv }]);
                                        setIsAttachModalOpen(false);
                                      }}
                                    >
                                      <Plus size={13} /> Joindre
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!clientObj.quotes || clientObj.quotes.length === 0) && (!clientObj.invoices || clientObj.invoices.length === 0) && (
                          <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--muted-foreground)" }}>
                            <p className="no-data" style={{ margin: 0 }}>Aucun devis ni facture trouvé pour {activeClientName}.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            );

            return (
            <div className={`home-page ${isMobile ? `mobile-view-${mobileView}` : ""}`}>
              {/* Sidebar - Always keep bottom navigation visible */}
              <SideBar hideFab={isMobile && mobileView !== "list"} />

              <div className="main-content">
                {(!isMobile || (isMobile && mobileView === "list")) && <Header />}

                <motion.div
                  className="page-content messages-page-content"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="messaging-container">
                    {/* Desktop View Layout */}
                    {!isMobile && (
                      <>
                        {renderChatList()}
                        {activeChatIdParam ? renderChatPane() : (
                          <div className="chat-pane-placeholder flex-1 flex flex-col items-center justify-center bg-card text-muted-foreground p-8 text-center" style={{ borderRight: "1px solid var(--border)" }}>
                            <MessageSquare size={48} className="mb-4 opacity-40" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">Aucune discussion sélectionnée</h3>
                            <p className="text-sm max-w-sm mb-4">Choisissez un contact dans la boîte de réception à gauche ou cliquez sur Nouveau Message pour échanger par SMS, WhatsApp ou Email.</p>
                            <button
                              onClick={() => setIsClientModalOpen(true)}
                              style={{
                                padding: "8px 16px",
                                backgroundColor: "var(--sidebar-primary)",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                              }}
                            >
                              <Plus size={16} /> Démarrer un message
                            </button>
                          </div>
                        )}

                        {/* Desktop Slide-out Client Info Drawer */}
                        <AnimatePresence>
                          {isInfoParam && activeChatIdParam && (
                            <motion.div
                              className="client-info-drawer-pane"
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: 340, opacity: 1 }}
                              exit={{ width: 0, opacity: 0 }}
                              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                            >
                              <div className="drawer-header">
                                <h4>Détails Client</h4>
                                <button className="drawer-close-btn" onClick={() => navigate(`/messages?chat=${activeChatIdParam}`, { replace: true })}>
                                  <X size={18} />
                                </button>
                              </div>
                              {renderClientInfoContent(selectedClientData || activeChat?.client)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}

                    {/* Mobile View Layout */}
                    {isMobile && (
                      <div className="mobile-view-wrapper flex-1 flex flex-col relative w-full h-full overflow-hidden">
                        {mobileView === "list" && (
                          <PullToRefresh onRefresh={handleRefresh} style={{ height: "100%", width: "100%", flex: 1, minHeight: 0 }}>
                            {renderChatList()}
                          </PullToRefresh>
                        )}
                        {mobileView === "chat" && renderChatPane()}
                        {mobileView === "info" && (
                          <div className="mobile-info-view-container absolute inset-0 bg-background z-50 flex flex-col w-full h-full">
                            <div className="mobile-info-header">
                              <button className="mobile-info-back-btn" onClick={handleBackToChatPane}>
                                <ArrowLeft size={20} />
                              </button>
                              <h4>Détails Client</h4>
                              <div style={{ width: 36 }}></div>
                            </div>
                            <div className="mobile-info-scroll-body flex-1 overflow-y-auto">
                              {renderClientInfoContent(selectedClientData || activeChat?.client)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Select Client for New Message Modal */}
              <AnimatePresence>
                {isClientModalOpen && (
                  <motion.div
                    className="client-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    onClick={() => setIsClientModalOpen(false)}
                  >
                    <motion.div
                      className="client-modal-card"
                      onClick={(e) => e.stopPropagation()}
                      initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
                      animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                      exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
                      transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.32 }}
                      drag={isMobile ? "y" : false}
                      dragConstraints={{ top: 0 }}
                      dragElastic={{ top: 0, bottom: 0.8 }}
                      onDragEnd={(e, info) => {
                        if (info.offset.y > 80) setIsClientModalOpen(false);
                      }}
                    >
                      <div className="client-modal-pull-handle" />
                      <div className="client-modal-header">
                        <h3>Nouvelle discussion</h3>
                        <button className="client-modal-close" onClick={() => setIsClientModalOpen(false)}>
                          <X size={20} />
                        </button>
                      </div>
                      <div className="client-modal-search">
                        <Search size={16} className="modal-search-icon" />
                        <input
                          type="text"
                          placeholder="Rechercher par nom, téléphone ou email..."
                          value={modalSearchTerm}
                          onChange={(e) => setModalSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="client-modal-list">
                        {isLoadingClients ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "6px 0" }}>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px" }}>
                                <div className="skeleton-shimmer" style={{ width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0 }} />
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                                  <div className="skeleton-shimmer" style={{ width: `${110 + (i % 3) * 35}px`, height: "14px", borderRadius: "4px" }} />
                                  <div className="skeleton-shimmer" style={{ width: `${140 + (i % 2) * 30}px`, height: "11px", borderRadius: "4px", opacity: 0.6 }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : filteredContactsList.length === 0 ? (
                          <div style={{ padding: "34px 20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                            <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--foreground)", marginBottom: "4px" }}>
                              {!modalSearchTerm.trim() ? "Tous vos clients ont déjà un fil actif" : "Aucun contact trouvé"}
                            </p>
                            <p style={{ fontSize: "0.82rem", lineHeight: "1.4" }}>
                              {!modalSearchTerm.trim() ? "Recherchez un client ci-dessus pour ouvrir directement sa conversation." : "Vérifiez l'orthographe du nom, numéro ou email."}
                            </p>
                          </div>
                        ) : (
                          filteredContactsList.map((client) => {
                            const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.companyName || "Client";
                            const inChat = hasActiveChat(client);
                            return (
                              <div
                                key={client.id}
                                className="client-modal-item"
                                onClick={() => handleStartChatWithContact(client)}
                              >
                                <div className="client-modal-avatar">
                                  {getInitials(fullName)}
                                </div>
                                <div className="client-modal-info" style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                    <span className="client-modal-name">{fullName}</span>
                                    {inChat && (
                                      <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        padding: "2px 7px",
                                        borderRadius: "6px",
                                        backgroundColor: "rgba(85, 107, 47, 0.12)",
                                        color: "#556B2F",
                                        whiteSpace: "nowrap"
                                      }}>
                                        <MessageSquare size={11} strokeWidth={2.2} />
                                        <span>En cours</span>
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", gap: "8px", fontSize: "11.5px", color: "var(--muted-foreground)" }}>
                                    {client.phone && <span className="font-mono">{client.phone}</span>}
                                    {client.email && <span>· {client.email}</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active Call UI Modal */}
              <AnimatePresence>
                {activeCall && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{
                      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(12px)',
                      zIndex: 99999, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', color: '#fff',
                      padding: '24px', textAlign: 'center'
                    }}
                  >
                    <div style={{
                      width: 104, height: 104, borderRadius: '50%', background: 'linear-gradient(135deg, #36451C 0%, #556B2F 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2.2rem', fontWeight: 800, marginBottom: 24,
                      boxShadow: '0 0 40px rgba(85, 107, 47, 0.4)'
                    }}>
                      {activeCall.contactName ? getInitials(activeCall.contactName) : 'CS'}
                    </div>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
                      {activeCall.contactName}
                    </h3>
                    <p style={{ color: '#94A3B8', fontSize: '1rem', marginBottom: 40 }}>
                      Appel en cours...
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveCall(null)}
                      style={{
                        width: 64, height: 64, borderRadius: '50%', background: '#EF4444',
                        border: 'none', color: '#fff', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)'
                      }}
                      title="Raccrocher"
                    >
                      <X size={28} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Document PDF Previews */}
              <AnimatePresence>
                {previewQuote && (
                  <QuotePdfView
                    quote={previewQuote}
                    onClose={() => setPreviewQuote(null)}
                    onDownload={async (q) => {
                      const targetQ = q || previewQuote;
                      if (targetQ?.id && typeof targetQ.id === "string" && targetQ.id.length > 10) {
                        const token = getAuthToken();
                        try {
                          const res = await fetch(getApiUrl(`/v1/quotes/${targetQ.id}/pdf`), {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            credentials: "include"
                          });
                          if (res.ok) {
                            const blob = await res.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = blobUrl;
                            link.download = `Devis_${(targetQ.number || 'devis').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(blobUrl);
                            return;
                          }
                        } catch (err) {
                          console.error("Erreur téléchargement PDF devis:", err);
                        }
                      }
                      window.print();
                    }}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {previewInvoice && (
                  <InvoicePdfView
                    invoice={previewInvoice}
                    onClose={() => setPreviewInvoice(null)}
                    onDownload={async (inv) => {
                      const targetInv = inv || previewInvoice;
                      if (targetInv?.id && typeof targetInv.id === "string" && targetInv.id.length > 10) {
                        const token = getAuthToken();
                        try {
                          const res = await fetch(getApiUrl(`/v1/invoices/${targetInv.id}/pdf`), {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            credentials: "include"
                          });
                          if (res.ok) {
                            const blob = await res.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = blobUrl;
                            link.download = `Facture_${(targetInv.number || 'facture').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(blobUrl);
                            return;
                          }
                        } catch (err) {
                          console.error("Erreur téléchargement PDF facture:", err);
                        }
                      }
                      window.print();
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Lightbox Modal Gallery for attached photos */}
              {typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                  {lightboxGallery && (
                    <motion.div
                      key="lightbox-backdrop"
                      className="lightbox-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setLightboxGallery(null)}
                    >
                      <motion.div
                        key="lightbox-content"
                        className="lightbox-content"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="lightbox-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span className="lightbox-title">{lightboxGallery.images[lightboxGallery.index]?.name || "Photo"}</span>
                            {lightboxGallery.images.length > 1 && (
                              <span style={{ fontSize: "12px", color: "var(--muted-foreground, #94a3b8)", fontWeight: 600 }}>
                                {lightboxGallery.index + 1} / {lightboxGallery.images.length}
                              </span>
                            )}
                          </div>
                          <div className="lightbox-actions">
                            <button
                              type="button"
                              className="lightbox-btn"
                              title="Télécharger l'image"
                              onClick={(e) => handleDownloadAttachment(
                                e,
                                lightboxGallery.images[lightboxGallery.index]?.url,
                                lightboxGallery.images[lightboxGallery.index]?.name || "photo.jpg"
                              )}
                            >
                              <Download size={16} />
                            </button>
                            <button
                              type="button"
                              className="lightbox-btn"
                              onClick={() => setLightboxGallery(null)}
                              title="Fermer (Échap)"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="lightbox-body" style={{ position: "relative" }}>
                          {lightboxGallery.images.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="lightbox-nav-btn prev"
                                title="Précédente (←)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxGallery(prev => ({
                                    ...prev,
                                    index: (prev.index - 1 + prev.images.length) % prev.images.length
                                  }));
                                }}
                              >
                                <ChevronLeft size={24} />
                              </button>
                              <button
                                type="button"
                                className="lightbox-nav-btn next"
                                title="Suivante (→)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxGallery(prev => ({
                                    ...prev,
                                    index: (prev.index + 1) % prev.images.length
                                  }));
                                }}
                              >
                                <ChevronRight size={24} />
                              </button>
                            </>
                          )}
                          <img
                            src={lightboxGallery.images[lightboxGallery.index]?.url}
                            alt={lightboxGallery.images[lightboxGallery.index]?.name}
                            className="lightbox-full-img"
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>,
                document.body
              )}

              {/* Delete Confirmation Modal */}
              {typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                  {isDeleteModalOpen && (
                    <motion.div
                      key="delete-modal-backdrop"
                      className="delete-modal-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                    >
                      <motion.div
                        key="delete-modal-content"
                        className="delete-modal-content"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.25 }}
                      >
                        <div className="delete-modal-header">
                          <div className="delete-modal-icon-wrapper">
                            <Trash2 size={22} className="delete-modal-icon" />
                          </div>
                          <div className="delete-modal-titles">
                            <h3>Supprimer ?</h3>
                            <p>
                              {isDeletingEntireConversation
                                ? "Voulez-vous supprimer l'intégralité de cette conversation de votre historique CRM ?"
                                : selectedMessageIds.size > 1
                                  ? `Voulez-vous supprimer ces ${selectedMessageIds.size} messages de votre historique CRM ?`
                                  : "Voulez-vous supprimer ce message de votre historique CRM ?"}
                            </p>
                          </div>
                        </div>
                        <div className="delete-modal-actions">
                          <button
                            type="button"
                            className="delete-modal-btn cancel"
                            disabled={isDeleting}
                            onClick={() => setIsDeleteModalOpen(false)}
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            className="delete-modal-btn confirm"
                            disabled={isDeleting}
                            onClick={handleDeleteSelectedMessages}
                          >
                            {isDeleting ? "Suppression..." : "Supprimer"}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>,
                document.body
              )}
            </div>
            );
}

            export default MessagesPage;
