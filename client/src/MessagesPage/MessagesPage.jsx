import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  FileDown,
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
  Filter,
  RefreshCw,
  Eye
} from "lucide-react";
import "../HomePage/Homepage.css";
import "./MessagesPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import InvoicePdfView from "../FacturesPage/components/InvoicePdfView";
import QuotePdfView from "../DevisPage/components/QuotePdfView";
import { apiFetch } from "../utils/api";
import { getAuthToken } from "../utils/auth";
import { getApiUrl } from "../utils/config";
import { getSocket } from "../utils/socket";
import { WhatsAppIcon, EmailIcon, SmsIcon } from "../components/ChannelIcons";

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

function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [chats, setChats] = useState([]);
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
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Channel dropdown in composer
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);

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

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);

  const activeChatIdParam = searchParams.get("chat");
  const isInfoParam = searchParams.get("info") === "true";

  const messagesContainerRef = useRef(null);
  const chatPaneRef = useRef(null);

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

  // Format price helper (2 decimal places)
  const formatPrice = (val) => {
    const num = typeof val === "number" ? val : parseFloat(val || 0);
    if (isNaN(num)) return "0,00 €";
    return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " € TTC";
  };

  // Fetch Conversation List
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoadingChats(true);
      const res = await apiFetch("/v1/messages/inbox");
      const convList = res.data?.conversations || [];
      convList.sort((a, b) => {
        const timeA = new Date(a.lastMessage?.createdAt || a.time || 0).getTime();
        const timeB = new Date(b.lastMessage?.createdAt || b.time || 0).getTime();
        return timeB - timeA;
      });
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
        setChats(list);
      } catch (e) {
        console.warn("[MESSAGES] Erreur chargement boite:", e.message);
      }
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
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
            setChats(prev => prev.map(c => (c.clientId === activeChatIdParam || c.id === activeChatIdParam) ? { ...c, unreadCount: 0 } : c));
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

  // Handle Navigation State auto-open (e.g. from Client profile page)
  useEffect(() => {
    if (location.state?.clientId) {
      const targetClientId = location.state.clientId;
      navigate(`/messages?chat=${targetClientId}`, { replace: true });
    }
  }, [location.state, navigate]);

  // Real-time Socket.io events listener
  useEffect(() => {
    const socket = getSocket();

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
            lastMessage: message,
            channel: message.channel || updated[existingIndex].channel,
            time: message.createdAt,
            unreadCount: isCurrentlyActive ? 0 : ((updated[existingIndex].unreadCount || 0) + (message.direction === "INCOMING" ? 1 : 0))
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
      setChats(prev => prev.map(c => (c.clientId === clientId || c.id === clientId) ? { ...c, unreadCount: 0 } : c));
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

  // Scroll to bottom on message update
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages.length, isLoadingMessages]);

  // Send Omnichannel Message Handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && emailAttachments.length === 0) return;
    if (!activeChatIdParam || isSending) return;

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
      setSendError(err.message || "Impossible d'envoyer le message.");
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed", errorMessage: err.message } : m));
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectChat = (clientId) => {
    navigate(`/messages?chat=${clientId}`);
  };

  const toggleClientInfo = () => {
    if (isInfoParam) {
      navigate(`/messages?chat=${activeChatIdParam}`, { replace: true });
    } else {
      navigate(`/messages?chat=${activeChatIdParam}&info=true`);
    }
  };

  const handleBackToChats = () => {
    navigate("/messages");
  };

  const handleBackToChatPane = () => {
    navigate(`/messages?chat=${activeChatIdParam}`);
  };

  const handleStartChatWithContact = (client) => {
    navigate(`/messages?chat=${client.id}`);
    setIsClientModalOpen(false);
    setModalSearchTerm("");
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

  const filteredContactsList = crmClientsList.filter(client => {
    const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
    const phone = (client.phone || "").toLowerCase();
    const email = (client.email || "").toLowerCase();
    const query = modalSearchTerm.toLowerCase();
    return fullName.includes(query) || phone.includes(query) || email.includes(query);
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
          <WhatsAppIcon size={size === "lg" ? 15 : 13} />
          <span>WhatsApp</span>
        </span>
      );
    }
    if (c === "EMAIL") {
      return (
        <span className={`channel-badge channel-badge-email ${size === "lg" ? "channel-badge-lg" : ""}`} title="Canal Email">
          <EmailIcon size={size === "lg" ? 15 : 13} />
          <span>Email</span>
        </span>
      );
    }
    return (
      <span className={`channel-badge channel-badge-sms ${size === "lg" ? "channel-badge-lg" : ""}`} title="Canal SMS">
        <SmsIcon size={size === "lg" ? 15 : 13} />
        <span>SMS</span>
      </span>
    );
  };

  // Delivery status icon renderer
  const renderStatusIcon = (status, channel) => {
    const isWhatsApp = channel === "WHATSAPP";
    switch (status) {
      case "read":
        return <CheckCheck size={14} className="text-emerald-500 inline ml-1 status-icon-read" title="Lu par le destinataire" />;
      case "delivered":
        return <CheckCheck size={14} className="text-muted-foreground inline ml-1" title="Délivré sur le téléphone / boîte" />;
      case "sent":
        return <Check size={14} className="text-blue-400 inline ml-1" title="Envoyé via le provider" />;
      case "failed":
      case "undelivered":
        return <AlertCircle size={14} className="text-red-500 inline ml-1" title="Échec de distribution" />;
      case "pending":
      default:
        return <Clock size={12} className="opacity-60 inline ml-1" title="En cours d'envoi" />;
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

      {/* Search Input */}
      <div style={{ padding: "0 16px 12px 16px" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", color: "var(--muted-foreground)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Rechercher contact, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              fontSize: "12.5px"
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={{ position: "absolute", right: "10px", background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}>
              <X size={13} />
            </button>
          )}
        </div>
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
          return (
            <button
              key={filter.id}
              className={`channel-filter-chip ${filterChannel === filter.id ? "active" : ""}`}
              onClick={() => setFilterChannel(filter.id)}
            >
              {IconComp && <IconComp size={13} />}
              <span>{filter.label}</span>
            </button>
          );
        })}
      </div>

      <div className="chat-list">
        {isLoadingChats ? (
          <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--muted-foreground)" }}>
            <p className="text-sm">Chargement des conversations...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--muted-foreground)", width: "100%", boxSizing: "border-box" }}>
            <MessageSquare size={36} style={{ opacity: 0.4, margin: "0 auto 12px auto", display: "block" }} />
            <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--foreground)", marginBottom: "4px" }}>
              Aucun échange trouvé
            </p>
            <p style={{ fontSize: "0.8rem", marginBottom: "16px", lineHeight: "1.4" }}>
              Envoyez un message par SMS, WhatsApp ou Email. Les réponses apparaîtront ici.
            </p>
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
              <Plus size={16} /> Nouveau message
            </button>
          </div>
        ) : (
          filteredChats.map((chat, idx) => {
            const isSelected = activeChatIdParam === (chat.clientId || chat.id);
            const isUnread = (chat.unreadCount || 0) > 0;
            const previewText = chat.lastMessage?.subject
              ? `[${chat.lastMessage.subject}] ${chat.lastMessage?.body || ''}`
              : (chat.lastMessage?.body || "Discussion démarrée");
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
                </div>
                <div className="chat-meta">
                  <div className="chat-meta-row">
                    <span className="chat-name">{chat.name}</span>
                    <span className="chat-time">{msgTime}</span>
                  </div>
                  <div className="chat-preview-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {renderChannelBadge(lastChannel, "sm")}
                      <p className="chat-preview" style={{ margin: 0 }}>{previewText}</p>
                    </div>
                    {isUnread && <span className="chat-unread-badge">{chat.unreadCount}</span>}
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
      {isMobile && selectedClientData && createPortal(
        <div className="chat-pane-header">
          <button className="chat-back-btn" onClick={handleBackToChats}>
            <ArrowLeft size={20} />
          </button>
          <div className="chat-header-user-clickable" onClick={toggleClientInfo}>
            <div className="active-chat-avatar">{getInitials(activeClientName)}</div>
            <div className="active-chat-info">
              <h3>{activeClientName}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {renderChannelBadge(selectedChannel, "sm")}
                <span className="active-chat-status font-mono text-xs">{clientObj.phone || clientObj.email || "Contact"}</span>
              </div>
            </div>
          </div>
          <div className="chat-pane-header-actions">
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
                    <span>Planifier intervention</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); navigate('/factures', { state: { clientName: activeClientName, openNewModal: true } }); }}>
                    <FileText size={14} className="dropdown-action-icon" />
                    <span>Créer facture</span>
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="chat-messages-container" ref={messagesContainerRef}>
        {isLoadingMessages ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)" }}>
            <p className="text-sm">Chargement des messages chronologiques...</p>
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
          messages.map((msg, idx) => {
            const isMe = msg.direction === "OUTGOING" || msg.sender === "agent" || msg.sender === "me";
            const timeStr = formatMsgTime(msg.createdAt || msg.time);
            const channel = (msg.channel || "SMS").toUpperCase();
            const isEmail = channel === "EMAIL";
            const isWhatsApp = channel === "WHATSAPP";

            return (
              <div
                key={msg.id ? `msg_${msg.id}_${idx}` : `msg_${idx}`}
                className={`message-bubble-wrapper ${isMe ? "me" : "them"} channel-${channel.toLowerCase()}`}
                onClick={() => setActiveDetailMessage(activeDetailMessage?.id === msg.id ? null : msg)}
              >
                <div className={`message-bubble ${isEmail ? "email-bubble-card" : ""} ${isWhatsApp ? "whatsapp-bubble-card" : ""}`}>

                  {/* Channel Header Indicator */}
                  <div className="bubble-channel-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {renderChannelBadge(channel, "sm")}
                      <span className="bubble-author-name">
                        {isMe ? "Vous" : activeClientName}
                      </span>
                    </div>
                    {msg.autoType && msg.autoType !== "manual" && (
                      <span style={{ fontSize: "0.6rem", opacity: 0.7, textTransform: "uppercase" }}>Auto: {msg.autoType}</span>
                    )}
                  </div>

                  {/* Email Specific Subject Header */}
                  {isEmail && msg.subject && (
                    <div className="email-bubble-subject">
                      <Mail size={13} style={{ color: "#556B2F", flexShrink: 0 }} />
                      <strong>Objet : {msg.subject}</strong>
                    </div>
                  )}

                  {/* Message Body */}
                  {isEmail ? (
                    <FormattedEmailContent body={msg.body || msg.text} />
                  ) : (
                    <p className="message-text" style={{ whiteSpace: "pre-wrap" }}>
                      {msg.body || msg.text}
                    </p>
                  )}

                  {/* Attachments if any */}
                  {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                    <div className="message-attachments-list">
                      {msg.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="attachment-chip clickable"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDocPreview(att);
                          }}
                          title="Cliquer pour prévisualiser le document"
                        >
                          <FileDown size={13} />
                          <span>{att.filename || att.name || "Document.pdf"}</span>
                          <Eye size={12} style={{ opacity: 0.75, marginLeft: 3 }} />
                        </div>
                      ))}
                    </div>
                  )}

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
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
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

      {/* Adaptive Omnichannel Composer */}
      <div className={`omnichannel-composer-container ${selectedChannel === "EMAIL" ? "email-mode" : ""}`}>

        {/* Composer Controls Bar */}
        <div className="composer-top-bar">
          {/* Smart Channel Selector Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="channel-dropdown-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsChannelDropdownOpen(!isChannelDropdownOpen);
              }}
            >
              {renderChannelBadge(selectedChannel, "sm")}
              <ChevronDown size={14} />
            </button>

            {isChannelDropdownOpen && (
              <div className="channel-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                  Choisir le canal d'envoi
                </div>

                {/* SMS */}
                <button
                  type="button"
                  className={`channel-option-item ${selectedChannel === "SMS" ? "active" : ""}`}
                  disabled={channelAvailability.SMS?.available === false}
                  onClick={() => {
                    setSelectedChannel("SMS");
                    setIsChannelDropdownOpen(false);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="channel-icon-avatar sms">
                      <SmsIcon size={18} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--foreground)" }}>SMS Direct</div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        {channelAvailability.SMS?.available === false ? (channelAvailability.SMS?.reason || "Non disponible") : "Sur le mobile du client"}
                      </div>
                    </div>
                  </div>
                  {selectedChannel === "SMS" && <Check size={15} style={{ color: "var(--sidebar-primary)" }} />}
                </button>

                {/* WhatsApp */}
                <button
                  type="button"
                  className={`channel-option-item ${selectedChannel === "WHATSAPP" ? "active" : ""}`}
                  disabled={channelAvailability.WHATSAPP?.available === false}
                  onClick={() => {
                    setSelectedChannel("WHATSAPP");
                    setIsChannelDropdownOpen(false);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="channel-icon-avatar whatsapp">
                      <WhatsAppIcon size={18} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--foreground)" }}>WhatsApp Business</div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        {channelAvailability.WHATSAPP?.available === false ? (channelAvailability.WHATSAPP?.reason || "Non disponible") : "Meta Cloud API"}
                      </div>
                    </div>
                  </div>
                  {selectedChannel === "WHATSAPP" && <Check size={15} style={{ color: "#22c55e" }} />}
                </button>

                {/* Email */}
                <button
                  type="button"
                  className={`channel-option-item ${selectedChannel === "EMAIL" ? "active" : ""}`}
                  disabled={channelAvailability.EMAIL?.available === false}
                  onClick={() => {
                    setSelectedChannel("EMAIL");
                    setIsChannelDropdownOpen(false);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="channel-icon-avatar email">
                      <EmailIcon size={18} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--foreground)" }}>Email Professionnel</div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        {channelAvailability.EMAIL?.available === false ? (channelAvailability.EMAIL?.reason || "Sans email") : (clientObj.email || "Email client")}
                      </div>
                    </div>
                  </div>
                  {selectedChannel === "EMAIL" && <Check size={15} style={{ color: "#3b82f6" }} />}
                </button>
              </div>
            )}
          </div>

          {/* Recommendation tooltip notice */}
          {recommendationReason && (
            <span style={{ fontSize: "11px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Sparkles size={12} style={{ color: "#A3E635" }} />
              {recommendationReason}
            </span>
          )}
        </div>

        {/* 1. EMAIL COMPOSER (Rich mode) */}
        {selectedChannel === "EMAIL" ? (
          <form className="email-composer-form" onSubmit={handleSendMessage}>
            <div className="email-composer-meta">
              <div className="email-meta-row">
                <span className="email-meta-label">À :</span>
                <span className="email-meta-recipient font-mono">{activeClientName} &lt;{clientObj.email || "aucun email"}&gt;</span>
              </div>
              <div className="email-meta-row">
                <span className="email-meta-label">Objet :</span>
                <input
                  type="text"
                  placeholder="Objet obligatoire de l'email..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="email-subject-input"
                  required
                />
              </div>
            </div>

            <textarea
              placeholder={`Rédigez votre email à ${activeClientName}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="email-body-textarea"
              rows={4}
              disabled={isSending}
            />

            {/* Email Attachments List */}
            {emailAttachments.length > 0 && (
              <div className="email-attached-pills">
                {emailAttachments.map((att, idx) => (
                  <div key={idx} className="email-attached-pill">
                    <FileText size={13} />
                    <span>{att.filename || att.name}</span>
                    <button
                      type="button"
                      onClick={() => setEmailAttachments(emailAttachments.filter((_, i) => i !== idx))}
                      style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="email-composer-bottom">
              <button
                type="button"
                className="email-attach-btn"
                onClick={() => setIsAttachModalOpen(true)}
                title="Joindre un devis, facture ou document"
              >
                <Paperclip size={15} />
                <span>Joindre document / devis PDF</span>
              </button>

              <button
                type="submit"
                className="chat-send-btn email-send-btn"
                disabled={(!inputText.trim() && emailAttachments.length === 0) || !emailSubject.trim() || isSending}
              >
                <Send size={15} />
                <span>Envoyer l'email</span>
              </button>
            </div>
          </form>
        ) : (
          /* 2. CHAT COMPOSER (SMS & WhatsApp mode) */
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
                    : `Envoyer un SMS à ${clientObj.phone || activeClientName}...`
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="chat-input"
                disabled={isSending}
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
              title={`Envoyer via ${selectedChannel}`}
              disabled={!inputText.trim() || isSending}
              style={{ opacity: (!inputText.trim() || isSending) ? 0.6 : 1 }}
            >
              <Send size={16} />
            </button>
          </form>
        )}
      </div>

      {/* Document / PDF Attachment Modal */}
      {isAttachModalOpen && (
        <div className="client-modal-overlay" onClick={() => setIsAttachModalOpen(false)}>
          <div className="client-modal-card" style={{ maxHeight: "85vh", display: "flex", flexDirection: "column", width: "100%", maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="client-modal-header" style={{ flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={18} style={{ color: "var(--sidebar-primary)" }} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Joindre un document</h3>
              </div>
              <button className="client-modal-close" onClick={() => setIsAttachModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0, backgroundColor: "var(--accent)" }}>
              <p style={{ fontSize: "13px", color: "var(--foreground)", margin: 0, fontWeight: 500 }}>
                Documents de <strong>{activeClientName}</strong> :
              </p>
            </div>

            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px", flex: 1, overflowY: "auto", minHeight: 0, overscrollBehavior: "contain" }}>
              {/* Devis du client */}
              {clientObj.quotes && clientObj.quotes.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.04em" }}>
                    Devis ({clientObj.quotes.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {clientObj.quotes.map((q) => (
                      <div
                        key={q.id}
                        className="attachment-pick-item"
                      >
                        <div className="attachment-icon-badge" style={{ backgroundColor: "rgba(85, 107, 47, 0.12)", color: "#556B2F" }}>
                          <FileText size={19} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>Devis {q.number}</div>
                          <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                            Montant : <strong style={{ color: "var(--foreground)" }}>{formatPrice(q.amountTTC ?? q.totalTtc ?? q.total ?? 0)}</strong>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <button
                            type="button"
                            className="attachment-action-icon-btn"
                            title="Prévisualiser ce devis"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDocPreview(q, "quote");
                            }}
                          >
                            <Eye size={16} />
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
                            <Plus size={14} /> Joindre
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
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.04em" }}>
                    Factures ({clientObj.invoices.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {clientObj.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="attachment-pick-item"
                      >
                        <div className="attachment-icon-badge" style={{ backgroundColor: "rgba(34, 197, 94, 0.12)", color: "#16a34a" }}>
                          <FileText size={19} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>Facture {inv.number}</div>
                          <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                            Montant : <strong style={{ color: "var(--foreground)" }}>{formatPrice(inv.amountTTC ?? inv.totalTtc ?? inv.total ?? 0)}</strong>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <button
                            type="button"
                            className="attachment-action-icon-btn"
                            title="Prévisualiser cette facture"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDocPreview(inv, "invoice");
                            }}
                          >
                            <Eye size={16} />
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
                            <Plus size={14} /> Joindre
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
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`home-page ${isMobile ? `mobile-view-${mobileView}` : ""}`}>
      {/* Sidebar */}
      {(!isMobile || (isMobile && mobileView === "list")) && <SideBar />}

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
                {mobileView === "list" && renderChatList()}
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
      {isClientModalOpen && (
        <div className="client-modal-overlay" onClick={() => setIsClientModalOpen(false)}>
          <div className="client-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="client-modal-header">
              <h3>Sélectionner un contact pour écrire</h3>
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
                autoFocus
              />
            </div>
            <div className="client-modal-list">
              {isLoadingClients ? (
                <p className="no-data">Chargement de vos clients...</p>
              ) : filteredContactsList.length === 0 ? (
                <p className="no-data">Aucun client trouvé avec ce nom, téléphone ou email</p>
              ) : (
                filteredContactsList.map((client) => {
                  const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.companyName || "Client";
                  return (
                    <div
                      key={client.id}
                      className="client-modal-item"
                      onClick={() => handleStartChatWithContact(client)}
                    >
                      <div className="client-modal-avatar">
                        {getInitials(fullName)}
                      </div>
                      <div className="client-modal-info">
                        <span className="client-modal-name">{fullName}</span>
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
          </div>
        </div>
      )}

      {/* Active Call UI Modal */}
      {activeCall && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(12px)',
          zIndex: 99999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', color: '#fff',
          padding: '24px', textAlign: 'center'
        }}>
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
        </div>
      )}
      {/* Document PDF Previews */}
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
    </div>
  );
}

export default MessagesPage;
