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
  Smartphone
} from "lucide-react";
import "../HomePage/Homepage.css";
import "./MessagesPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { apiFetch } from "../utils/api";
import { getSocket } from "../utils/socket";

function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [chats, setChats] = useState([]);
  const [selectedClientData, setSelectedClientData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [detailTab, setDetailTab] = useState("interventions");
  const [activeCall, setActiveCall] = useState(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Client Selection Modal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [crmClientsList, setCrmClientsList] = useState([]);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);

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
    if (!isActionsMenuOpen) return;
    const closeActionsMenu = () => setIsActionsMenuOpen(false);
    window.addEventListener("click", closeActionsMenu);
    return () => window.removeEventListener("click", closeActionsMenu);
  }, [isActionsMenuOpen]);

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

  // Fetch Conversation List
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoadingChats(true);
      const res = await apiFetch("/v1/sms/inbox");
      const convList = res.data?.conversations || [];
      setChats(convList);
    } catch (err) {
      console.warn("[MESSAGES] Erreur chargement boite SMS:", err.message);
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

  // Load Messages for Active Conversation
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
        const res = await apiFetch(`/v1/sms/inbox/${activeChatIdParam}`);
        if (res.success && res.data) {
          setSelectedClientData(res.data.client);
          setMessages(res.data.messages || []);

          // Marquer comme lus
          try {
            await apiFetch(`/v1/sms/read/${activeChatIdParam}`, { method: "PATCH" });
            setChats(prev => prev.map(c => (c.clientId === activeChatIdParam || c.id === activeChatIdParam) ? { ...c, unreadCount: 0 } : c));
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
      console.log("[REALTIME] Nouveau SMS reçu:", payload);
      const { clientId, message } = payload;

      // 1. Si la conversation est ouverte, ajouter le message en direct
      if (activeChatIdParam && (activeChatIdParam === clientId || activeChatIdParam === message?.clientId)) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id || (m.twilioSid && m.twilioSid === message.twilioSid))) {
            return prev;
          }
          return [...prev, message];
        });

        // Marquer comme lu immédiatement si nous sommes sur cette conversation
        if (message.direction === "INCOMING") {
          apiFetch(`/v1/sms/read/${clientId}`, { method: "PATCH" }).catch(() => {});
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
            time: message.createdAt,
            unreadCount: isCurrentlyActive ? 0 : ((updated[existingIndex].unreadCount || 0) + (message.direction === "INCOMING" ? 1 : 0))
          };
          // Remonter la conversation en haut de liste
          const item = updated.splice(existingIndex, 1)[0];
          return [item, ...updated];
        } else {
          // Nouvelle conversation
          fetchConversations();
          return prev;
        }
      });
    };

    const handleStatusUpdate = (payload) => {
      console.log("[REALTIME] Mise à jour statut SMS:", payload);
      const { messageId, twilioSid, status } = payload;

      setMessages(prev => prev.map(m => {
        if (m.id === messageId || (twilioSid && m.twilioSid === twilioSid)) {
          return { ...m, status };
        }
        return m;
      }));
    };

    const handleReadUpdate = (payload) => {
      const { clientId } = payload;
      setChats(prev => prev.map(c => (c.clientId === clientId || c.id === clientId) ? { ...c, unreadCount: 0 } : c));
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

  // Send SMS Handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatIdParam || isSending) return;

    const messageText = inputText.trim();
    setSendError(null);
    setIsSending(true);

    // Optimistic UI update
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      clientId: activeChatIdParam,
      direction: "OUTGOING",
      channel: "SMS",
      body: messageText,
      status: "pending",
      createdAt: new Date().toISOString(),
      isRead: true
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText("");

    try {
      const res = await apiFetch("/v1/sms/send", {
        method: "POST",
        body: JSON.stringify({
          clientId: activeChatIdParam,
          message: messageText
        })
      });

      if (res.success && res.data?.smsLog) {
        const savedLog = res.data.smsLog;
        setMessages(prev => prev.map(m => m.id === tempId ? savedLog : m));

        // Mettre à jour la conversation dans la liste
        setChats(prev => {
          const idx = prev.findIndex(c => c.clientId === activeChatIdParam || c.id === activeChatIdParam);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = {
              ...copy[idx],
              lastMessage: savedLog,
              time: savedLog.createdAt
            };
            const item = copy.splice(idx, 1)[0];
            return [item, ...copy];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("[SMS SEND ERROR]", err.message);
      setSendError(err.message || "Impossible d'envoyer le SMS.");
      // Marquer le message optimiste comme échoué
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
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

  // Delivery status icon renderer
  const renderStatusIcon = (status) => {
    switch (status) {
      case "delivered":
        return <CheckCheck size={14} className="text-emerald-500 inline ml-1" title="Délivré sur le téléphone du client" />;
      case "sent":
        return <Check size={14} className="text-blue-400 inline ml-1" title="Envoyé via Twilio" />;
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

    return (
      <div className="client-info-drawer-content">
        <div className="info-profile-section">
          <div className="info-avatar">{getInitials(activeClientName)}</div>
          <h3 className="info-name">{activeClientName}</h3>
          <span className="info-badge">{client?.companyName ? "Professionnel" : "Particulier"}</span>
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

        <h4 className="info-section-title">CANAL PRINCIPAL</h4>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "var(--accent)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600 }}>
          <Smartphone size={16} style={{ color: "var(--sidebar-primary)" }} />
          <span>SMS Bidirectionnel Twilio</span>
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
        <h2>SMS & Chats</h2>
        <div className="inbox-actions">
          <button
            className="inbox-action-icon"
            title="Nouveau SMS"
            onClick={() => setIsClientModalOpen(true)}
            style={{ backgroundColor: "var(--sidebar-primary)", color: "#fff" }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="chat-list">
        {isLoadingChats ? (
          <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--muted-foreground)" }}>
            <p className="text-sm">Chargement des conversations...</p>
          </div>
        ) : chats.length === 0 ? (
          <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--muted-foreground)", width: "100%", boxSizing: "border-box" }}>
            <MessageSquare size={36} style={{ opacity: 0.4, margin: "0 auto 12px auto", display: "block" }} />
            <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--foreground)", marginBottom: "4px" }}>
              Aucun échange SMS pour le moment
            </p>
            <p style={{ fontSize: "0.8rem", marginBottom: "16px", lineHeight: "1.4" }}>
              Envoyez un premier SMS à un client. Ses réponses apparaîtront ici en temps réel.
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
              <Plus size={16} /> Nouveau SMS
            </button>
          </div>
        ) : (
          chats.map((chat) => {
            const isSelected = activeChatIdParam === (chat.clientId || chat.id);
            const previewText = chat.lastMessage?.body || "Discussion SMS";
            const msgTime = formatMsgTime(chat.lastMessage?.createdAt || chat.time);

            return (
              <div
                key={chat.clientId || chat.id}
                className={`chat-item ${isSelected ? "active" : ""}`}
                onClick={() => handleSelectChat(chat.clientId || chat.id)}
              >
                <div className="chat-avatar-wrapper">
                  <div className="chat-avatar">{getInitials(chat.name)}</div>
                  <span className="online-indicator" title="En ligne"></span>
                </div>
                <div className="chat-meta">
                  <div className="chat-meta-row">
                    <span className="chat-name">{chat.name}</span>
                    <span className="chat-time">{msgTime}</span>
                  </div>
                  <div className="chat-preview-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "0.65rem", padding: "1px 4px", borderRadius: "4px", backgroundColor: "rgba(95, 75, 219, 0.12)", color: "var(--sidebar-primary)", fontWeight: 700 }}>SMS</span>
                      <p className="chat-preview" style={{ margin: 0 }}>{previewText}</p>
                    </div>
                    {chat.unreadCount > 0 && <span className="chat-unread-badge">{chat.unreadCount}</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Render Chat Pane (Active Conversation)
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
              <span className="active-chat-status font-mono text-xs">{clientObj.phone || "Canal SMS"}</span>
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
                <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(95, 75, 219, 0.12)", color: "var(--sidebar-primary)", fontWeight: 700 }}>
                  SMS Twilio
                </span>
              </div>
              <span className="active-chat-status font-mono">{clientObj.phone || "Téléphone non renseigné"}</span>
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
            <p className="text-sm">Chargement des messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)", textAlign: "center" }}>
            <Smartphone size={40} className="mb-2 opacity-40" />
            <p style={{ fontWeight: 600, color: "var(--foreground)" }}>Début de la conversation SMS</p>
            <p className="text-xs max-w-xs mt-1">
              Les messages envoyés ici seront reçus directement comme SMS standard sur le téléphone du client ({clientObj.phone || "mobile"}).
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.direction === "OUTGOING" || msg.sender === "agent" || msg.sender === "me";
            const timeStr = formatMsgTime(msg.createdAt || msg.time);

            return (
              <div key={msg.id} className={`message-bubble-wrapper ${isMe ? "me" : "them"}`}>
                <div className="message-bubble">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.65rem", textTransform: "uppercase", opacity: 0.75, fontWeight: 700 }}>
                      {isMe ? "CRM (Vous)" : activeClientName} · SMS
                    </span>
                  </div>
                  <p className="message-text">{msg.body || msg.text}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    <span className="message-time">{timeStr}</span>
                    {isMe && renderStatusIcon(msg.status)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Send Error Notice */}
      {sendError && (
        <div style={{ padding: "8px 24px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertCircle size={15} />
            <span>{sendError}</span>
          </div>
          <button onClick={() => setSendError(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className="input-wrapper" style={{ position: "relative" }}>
          <input
            type="text"
            placeholder={clientObj.phone ? `Envoyer un SMS à ${clientObj.phone}...` : "Écrire un SMS au client..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="chat-input"
            disabled={isSending}
          />
          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--muted-foreground)", fontWeight: 600, pointerEvents: "none" }}>
            Canal: SMS
          </span>
        </div>
        <button
          type="submit"
          className="chat-send-btn"
          title="Envoyer le SMS"
          disabled={!inputText.trim() || isSending}
          style={{ opacity: (!inputText.trim() || isSending) ? 0.6 : 1 }}
        >
          <Send size={16} />
        </button>
      </form>
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
                    <p className="text-sm max-w-sm mb-4">Choisissez un contact dans la liste à gauche ou cliquez sur Nouveau SMS pour démarrer une conversation.</p>
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
                      <Plus size={16} /> Démarrer un SMS
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

      {/* Select Client for New SMS Modal */}
      {isClientModalOpen && (
        <div className="client-modal-overlay" onClick={() => setIsClientModalOpen(false)}>
          <div className="client-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="client-modal-header">
              <h3>Sélectionner un client pour SMS</h3>
              <button className="client-modal-close" onClick={() => setIsClientModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="client-modal-search">
              <Search size={16} className="modal-search-icon" />
              <input
                type="text"
                placeholder="Rechercher par nom ou numéro..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="client-modal-list">
              {isLoadingClients ? (
                <p className="no-data">Chargement de vos clients...</p>
              ) : filteredContactsList.length === 0 ? (
                <p className="no-data">Aucun client trouvé avec ce nom ou numéro</p>
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
                        <span className="client-modal-email font-mono">{client.phone || "Sans téléphone"}</span>
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
    </div>
  );
}

export default MessagesPage;
