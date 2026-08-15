import React, { useState, useEffect, useRef } from "react";
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
  Edit3,
  Calendar,
  MessageSquare,
  Search,
  Plus
} from "lucide-react";
import "../HomePage/Homepage.css";
import "./MessagesPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { apiFetch } from "../utils/api";

// Mock data matching screenshot exactly plus detailed client database matching CRM styles
const mockChatsData = [];
const crmContactsList = [];

function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [chats, setChats] = useState([]);
  const [inputText, setInputText] = useState("");
  const [detailTab, setDetailTab] = useState("interventions");
  const [activeCall, setActiveCall] = useState(null);

  // Auto-open chat for client passed in navigation state
  useEffect(() => {
    if (location.state?.clientName || location.state?.clientId) {
      const clientName = location.state.clientName || "Client";
      const clientId = location.state.clientId;
      const existingChat = chats.find(c =>
        (clientId && c.clientInfo?.id === clientId) ||
        (c.name && c.name.toLowerCase() === clientName.toLowerCase())
      );

      if (existingChat) {
        navigate(`/messages?chat=${existingChat.id}`, { replace: true });
      } else {
        const newChatId = Date.now();
        const newChat = {
          id: newChatId,
          name: clientName,
          lastMessage: "Nouvelle discussion SMS",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          unread: 0,
          online: true,
          statusText: "En ligne",
          clientInfo: {
            id: clientId,
            phone: location.state.phone || "",
            email: location.state.email || "",
            address: location.state.address || "",
            type: "particulier",
            equipment: null,
            maintenance: { status: "OK", nextMaintenance: "N/A" },
            interventions: [],
            factures: [],
            devis: []
          },
          messages: [
            { id: 1, sender: "agent", text: "Bonjour, comment puis-je vous aider ?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }
          ]
        };
        setChats(prev => [newChat, ...prev]);
        navigate(`/messages?chat=${newChatId}`, { replace: true });
      }
    }
  }, [location.state]);

  useEffect(() => {
    const fetchSmsMessages = async () => {
      try {
        const data = await apiFetch('/v1/sms');
        const smsList = data.data?.sms || data.sms || (Array.isArray(data) ? data : []);
        if (smsList.length > 0) {
          const mappedChats = smsList.map((item, idx) => ({
            id: item.id || idx + 1,
            name: item.client ? `${item.client.firstName || ''} ${item.client.lastName || ''}`.trim() : (item.recipient || "Client"),
            lastMessage: item.message || "Message SMS",
            time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
            unread: 0,
            online: true,
            statusText: item.status || "Envoyé",
            clientInfo: {
              phone: item.recipient || item.client?.phone || "",
              email: item.client?.email || "",
              address: item.client?.address || "",
              zip: item.client?.postalCode || "",
              city: item.client?.city || "",
              type: "particulier",
              equipment: null
            },
            messages: [
              { id: 1, sender: "me", text: item.message, time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "" }
            ]
          }));
          setChats(mappedChats);
        } else {
          setChats([]);
        }
      } catch (err) {
        console.warn("API SMS error:", err.message);
        setChats([]);
      }
    };

    fetchSmsMessages();
  }, []);

  // Custom dialog selectors
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // lock html + body scroll on mobile chat
  useEffect(() => {
    if (!isMobile) return;

    const html = document.documentElement;
    const body = document.body;

    const lock = (el) => {
      const prev = {
        overflow: el.style.overflow,
        position: el.style.position,
        width: el.style.width,
        height: el.style.height
      };
      el.style.overflow = 'hidden';
      el.style.position = 'fixed';
      el.style.width = '100%';
      el.style.height = '100%';
      return prev;
    };

    const prevHtml = lock(html);
    const prevBody = lock(body);

    return () => {
      Object.assign(html.style, prevHtml);
      Object.assign(body.style, prevBody);
    };
  }, [isMobile]);



  // Dropdown menu click outside listener
  useEffect(() => {
    if (!isActionsMenuOpen) return;
    const closeActionsMenu = () => setIsActionsMenuOpen(false);
    window.addEventListener("click", closeActionsMenu);
    return () => window.removeEventListener("click", closeActionsMenu);
  }, [isActionsMenuOpen]);
  // Sync state routing parameters
  const activeChatIdParam = searchParams.get("chat");
  const isInfoParam = searchParams.get("info") === "true";

  // Compute selected chat ID from URL
  const selectedChatId = activeChatIdParam ? parseInt(activeChatIdParam, 10) : null;
  const selectedChat = selectedChatId ? (chats.find(c => c.id === selectedChatId) || null) : null;
  const messages = selectedChat ? (selectedChat.messages || []) : [];

  const messagesContainerRef = React.useRef(null);
  const chatPaneRef = React.useRef(null);
  const messagesLength = messages.length;

  useEffect(() => {
    // Scroll to bottom instantly when switching chats
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [selectedChatId]);

  useEffect(() => {
    // Scroll to bottom smoothly when a new message is appended (sent/received)
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messagesLength]);

  // Cross-browser keyboard fix for iOS Safari + Chrome
  // Adjusts the PARENT container height when keyboard opens
  const initialViewportHeight = React.useRef(null);

  useEffect(() => {
    if (!isMobile) return;

    const pageContent = document.querySelector('.messages-page-content');
    if (!pageContent) return;

    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };

    const onViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      if (initialViewportHeight.current === null) {
        initialViewportHeight.current = vv.height;
      }

      const heightDiff = initialViewportHeight.current - vv.height;

      if (heightDiff > 100) {
        pageContent.style.height = `${vv.height}px`;
      } else {
        pageContent.style.height = '';
      }

      scrollToBottom();
    };

    const onFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        window.scrollTo(0, 0);
        requestAnimationFrame(() => window.scrollTo(0, 0));
        setTimeout(scrollToBottom, 300);
      }
    };
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', onViewportChange);
      // vv.addEventListener('scroll', onViewportChange);
    }
    document.addEventListener('focusin', onFocusIn);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', onViewportChange);
        // vv.removeEventListener('scroll', onViewportChange);
      }
      document.removeEventListener('focusin', onFocusIn);
      pageContent.style.height = '';
      pageContent.style.bottom = '';
    };
  }, [isMobile, selectedChatId]);


  // Compute mobile sub-view layout based on parameters
  let mobileView = "list";
  if (activeChatIdParam) {
    mobileView = isInfoParam ? "info" : "chat";
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChat) return;

    const messageText = inputText.trim();
    const newMsg = {
      id: Date.now(),
      sender: "agent",
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    };

    setChats(prevChats => prevChats.map(c => {
      if (c.id === selectedChat.id) {
        return {
          ...c,
          lastMessage: messageText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          messages: [...(c.messages || []), newMsg]
        };
      }
      return c;
    }));

    setInputText("");

    try {
      await apiFetch('/v1/sms/send', {
        method: 'POST',
        body: JSON.stringify({
          recipient: selectedChat.clientInfo?.phone || "0600000000",
          message: messageText
        })
      });
    } catch (err) {
      console.error("Send SMS API error:", err);
    }
  };

  const handleSelectChat = (chatId) => {
    navigate(`/messages?chat=${chatId}`);
  };

  const toggleClientInfo = () => {
    if (isInfoParam) {
      navigate(`/messages?chat=${selectedChatId}`, { replace: true });
    } else {
      navigate(`/messages?chat=${selectedChatId}&info=true`);
    }
  };

  const handleBackToChats = () => {
    navigate(-1);
  };

  const handleBackToChatPane = () => {
    navigate(-1);
  };

  const getInitials = (name) => {
    return name.split(" ").map(n => n[0]).join("");
  };

  const handleStartChatWithContact = (contact) => {
    const fullName = `${contact.firstName} ${contact.lastName}`;
    const existingChat = chats.find(c => c.name.toLowerCase() === fullName.toLowerCase());

    if (existingChat) {
      navigate(`/messages?chat=${existingChat.id}`);
    } else {
      const newChatId = chats.length + 1;
      const newChat = {
        id: newChatId,
        name: fullName,
        lastMessage: "Discussion créée.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        unread: 0,
        online: true,
        statusText: "En ligne",
        clientInfo: {
          phone: contact.phone,
          email: contact.email,
          address: contact.address,
          zip: contact.zip,
          city: contact.city,
          type: "particulier",
          equipment: { model: "Daikin 3.5kW Inverter", installDate: "18/07/2026", serialNumber: "DK-NEW-0001" },
          maintenance: { status: "OK", nextMaintenance: "18/07/2029" },
          interventions: [],
          factures: [],
          devis: []
        },
        messages: [
          { id: 1, sender: "agent", text: "Bonjour, comment puis-je vous aider ?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }
        ]
      };
      setChats([newChat, ...chats]);
      navigate(`/messages?chat=${newChatId}`);
    }
    setIsClientModalOpen(false);
    setModalSearchTerm("");
  };

  const filteredContactsList = crmContactsList.filter(contact => {
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
    return fullName.includes(modalSearchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(modalSearchTerm.toLowerCase());
  });

  const renderClientInfoContent = (client) => {
    const info = client.clientInfo || {};
    const equipment = info.equipment || { model: "N/A", installDate: "N/A", serialNumber: "N/A" };
    const maintenance = info.maintenance || { status: "OK", nextMaintenance: "N/A" };
    const interventions = info.interventions || [];
    const factures = info.factures || [];
    const devis = info.devis || [];

    return (
      <div className="client-info-drawer-content">
        <div className="info-profile-section">
          <div className="info-avatar">{getInitials(client.name)}</div>
          <h3 className="info-name">{client.name}</h3>
          <span className="info-badge">{info.type === "particulier" ? "Particulier" : "Professionnel"}</span>
        </div>

        <div className="info-divider"></div>

        <div className="info-details-list">
          <div className="info-row">
            <Phone size={15} className="info-row-icon" />
            <span>{info.phone || "Non renseigné"}</span>
          </div>
          <div className="info-row">
            <Mail size={15} className="info-row-icon" />
            <span>{info.email || "Non renseigné"}</span>
          </div>
          <div className="info-row">
            <MapPin size={15} className="info-row-icon" />
            <span>{info.address ? `${info.address}, ${info.zip} ${info.city}` : "Non renseigné"}</span>
          </div>
        </div>

        <div className="info-divider"></div>

        <h4 className="info-section-title">ÉQUIPEMENT</h4>
        <div className="info-equipment-card">
          <div className="equipment-item">
            <span className="eq-label">Modèle</span>
            <span className="eq-val">{equipment.model}</span>
          </div>
          <div className="equipment-item">
            <span className="eq-label">Installé le</span>
            <span className="eq-val">{equipment.installDate}</span>
          </div>
          <div className="equipment-item">
            <span className="eq-label">N° de série</span>
            <span className="eq-val font-mono">{equipment.serialNumber}</span>
          </div>
        </div>

        <div className="info-divider"></div>

        <h4 className="info-section-title">MAINTENANCE</h4>
        <div className="info-maintenance-card">
          <span className={`maintenance-status-pill ${maintenance.status.toLowerCase()}`}>
            {maintenance.status}
          </span>
          <span className="maintenance-next-date">Prochain: {maintenance.nextMaintenance}</span>
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
                      <h5>{item.title}</h5>
                      <span className="panel-item-date">{item.date}</span>
                    </div>
                    <p className="panel-item-body">Tech: {item.tech} · <span className="status-badge-ok">{item.status}</span></p>
                    <p className="panel-item-desc">"{item.desc}"</p>
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
                      <h5>{item.id}</h5>
                      <span className="panel-item-date">{item.date}</span>
                    </div>
                    <p className="panel-item-body">Montant: <strong>{item.amount}</strong> · <span className="status-badge-ok">{item.status}</span></p>
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
                      <h5>{item.id}</h5>
                      <span className="panel-item-date">{item.date}</span>
                    </div>
                    <p className="panel-item-body">Montant: <strong>{item.amount}</strong> · <span className="status-badge-ok">{item.status}</span></p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderChatList = () => (
    <div className="inbox-sidebar flex-shrink-0">
      <div className="inbox-header">
        <h2>Chats</h2>
        <div className="inbox-actions">
          <button className="inbox-action-icon" title="Nouveau message" onClick={() => setIsClientModalOpen(true)}>
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div className="chat-list">
        {chats.length === 0 ? (
          <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--muted-foreground)", width: "100%", boxSizing: "border-box" }}>
            <MessageSquare size={36} style={{ opacity: 0.4, margin: "0 auto 12px auto", display: "block" }} />
            <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--foreground)", marginBottom: "4px" }}>
              Vous n'avez pas encore de messages
            </p>
            <p style={{ fontSize: "0.8rem", marginBottom: "16px" }}>
              Contactez vos clients ou envoyez des SMS directement.
            </p>
            <button
              onClick={() => navigate("/client")}
              style={{
                padding: "8px 16px",
                backgroundColor: "var(--sidebar-primary)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Voir mes clients
            </button>
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = activeChatIdParam ? (selectedChatId === chat.id) : false;
            return (
              <div
                key={chat.id}
                className={`chat-item ${isActive ? "active" : ""}`}
                onClick={() => handleSelectChat(chat.id)}
              >
                <div className="chat-avatar-wrapper">
                  <div className="chat-avatar">{getInitials(chat.name)}</div>
                  {chat.online && <span className="online-indicator"></span>}
                </div>
                <div className="chat-meta">
                  <div className="chat-meta-row">
                    <span className="chat-name">{chat.name}</span>
                    <span className="chat-time">{chat.time}</span>
                  </div>
                  <div className="chat-preview-row">
                    <p className="chat-preview">{chat.lastMessage}</p>
                    {chat.unread > 0 && <span className="chat-unread-badge">{chat.unread}</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderChatPane = () => (
    <div className="chat-pane flex-1" ref={chatPaneRef}>

      {/* Mobile header – rendered through a portal directly into the body,
        so that position:fixed works relative to the window,
        not relative to the animated motion.div */}
      {isMobile && selectedChat && createPortal(
        <div className="chat-pane-header">
          <button className="chat-back-btn" onClick={handleBackToChats}>
            <ArrowLeft size={20} />
          </button>
          <div className="chat-header-user-clickable" onClick={toggleClientInfo}>
            <div className="active-chat-avatar">{getInitials(selectedChat.name)}</div>
            <div className="active-chat-info">
              <h3>{selectedChat.name}</h3>
              <span className="active-chat-status">{selectedChat.statusText}</span>
            </div>
          </div>
          <div className="chat-pane-header-actions">
            <button className="pane-header-action-btn" title="Appeler" onClick={() => setActiveCall({ type: "audio", contactName: selectedChat.name })}>
              <Phone size={17} />
            </button>
            <button className="pane-header-action-btn" title="Appel Vidéo" onClick={() => setActiveCall({ type: "video", contactName: selectedChat.name })}>
              <Video size={18} />
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
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); navigate('/planning', { state: { clientName: selectedChat.name } }); }}>
                    <Calendar size={14} className="dropdown-action-icon" />
                    <span>Planifier</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); navigate('/factures', { state: { clientName: selectedChat.name, openNewModal: true } }); }}>
                    <FileText size={14} className="dropdown-action-icon" />
                    <span>Créer facture</span>
                  </button>
                  <div className="chat-action-divider"></div>
                  <button type="button" className="chat-action-item danger" onClick={() => { setIsActionsMenuOpen(false); setChats(prev => prev.filter(c => c.id !== selectedChat.id)); navigate('/messages'); }}>
                    <X size={14} className="dropdown-action-icon" />
                    <span>Archiver chat</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Десктопная шапка — рендерится как обычно, в потоке */}
      {!isMobile && (
        <div className="chat-pane-header">
          <div className="chat-header-user-clickable" onClick={toggleClientInfo}>
            <div className="active-chat-avatar">{getInitials(selectedChat.name)}</div>
            <div className="active-chat-info">
              <h3>{selectedChat.name}</h3>
              <span className="active-chat-status">{selectedChat.statusText}</span>
            </div>
          </div>
          <div className="chat-pane-header-actions">
            <button className="pane-header-action-btn" title="Appeler" onClick={() => setActiveCall({ type: "audio", contactName: selectedChat.name })}>
              <Phone size={17} />
            </button>
            <button className="pane-header-action-btn" title="Appel Vidéo" onClick={() => setActiveCall({ type: "video", contactName: selectedChat.name })}>
              <Video size={18} />
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
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); navigate('/planning', { state: { clientName: selectedChat.name } }); }}>
                    <Calendar size={14} className="dropdown-action-icon" />
                    <span>Planifier</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); navigate('/factures', { state: { clientName: selectedChat.name, openNewModal: true } }); }}>
                    <FileText size={14} className="dropdown-action-icon" />
                    <span>Créer facture</span>
                  </button>
                  <div className="chat-action-divider"></div>
                  <button type="button" className="chat-action-item danger" onClick={() => { setIsActionsMenuOpen(false); setChats(prev => prev.filter(c => c.id !== selectedChat.id)); navigate('/messages'); }}>
                    <X size={14} className="dropdown-action-icon" />
                    <span>Archiver chat</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="chat-messages-container" ref={messagesContainerRef}>
        {messages.map((msg) => {
          const isMe = msg.sender === "agent";
          if (msg.isFile) {
            return (
              <div key={msg.id} className="message-bubble-wrapper them">
                <div className="file-attachment-bubble">
                  <div className="file-icon-box">
                    <FileText size={20} />
                  </div>
                  <div className="file-info-box">
                    <span className="file-name">{msg.fileName}</span>
                    <span className="file-size">{msg.fileSize}</span>
                  </div>
                  <span className="file-time">{msg.time}</span>
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`message-bubble-wrapper ${isMe ? "me" : "them"}`}>
              <div className="message-bubble">
                <p className="message-text">{msg.text}</p>
                <span className="message-time">{msg.time}</span>
              </div>
            </div>
          );
        })}
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <button type="button" className="chat-form-action-btn" title="Joindre un fichier">
          <Paperclip size={18} />
        </button>
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Write a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="chat-input"
          />
          <button type="button" className="chat-emoji-btn" title="Emojis">
            <Smile size={18} />
          </button>
        </div>
        <button type="submit" className="chat-send-btn" title="Envoyer">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
  return (
    <div className={`home-page ${isMobile ? `mobile-view-${mobileView}` : ""}`}>
      {/* Sidebar - hides on mobile active panes */}
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

            {/* Desktop View layout: 3 panes layout side-by-side */}
            {!isMobile && (
              <>
                {renderChatList()}
                {selectedChat ? renderChatPane() : (
                  <div className="chat-pane-placeholder flex-1 flex flex-col items-center justify-center bg-card text-muted-foreground p-8 text-center" style={{ borderRight: "1px solid var(--border)" }}>
                    <MessageSquare size={48} className="mb-4 opacity-40" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Aucune discussion sélectionnée</h3>
                    <p className="text-sm max-w-sm">Choisissez un contact dans la liste à gauche pour commencer la discussion.</p>
                  </div>
                )}

                {/* Desktop Slide-out Side Drawer for client details */}
                <AnimatePresence>
                  {isInfoParam && selectedChat && (
                    <motion.div
                      className="client-info-drawer-pane"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 340, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                    >
                      <div className="drawer-header">
                        <h4>Client Info</h4>
                        <button className="drawer-close-btn" onClick={() => navigate(`/messages?chat=${selectedChatId}`, { replace: true })}>
                          <X size={18} />
                        </button>
                      </div>
                      {renderClientInfoContent(selectedChat)}
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
                      <h4>Client Info</h4>
                      <div style={{ width: 36 }}></div>
                    </div>
                    <div className="mobile-info-scroll-body flex-1 overflow-y-auto">
                      {renderClientInfoContent(selectedChat)}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </motion.div>
      </div>

      {/* Client List Selection Modal */}
      {isClientModalOpen && (
        <div className="client-modal-overlay" onClick={() => setIsClientModalOpen(false)}>
          <div className="client-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="client-modal-header">
              <h3>Sélectionner un client</h3>
              <button className="client-modal-close" onClick={() => setIsClientModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="client-modal-search">
              <Search size={16} className="modal-search-icon" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
              />
            </div>
            <div className="client-modal-list">
              {filteredContactsList.length === 0 ? (
                <p className="no-data">Aucun client trouvé</p>
              ) : (
                filteredContactsList.map((contact, idx) => {
                  const fullName = `${contact.firstName} ${contact.lastName}`;
                  return (
                    <div
                      key={idx}
                      className="client-modal-item"
                      onClick={() => handleStartChatWithContact(contact)}
                    >
                      <div className="client-modal-avatar">
                        {contact.firstName[0]}{contact.lastName[0]}
                      </div>
                      <div className="client-modal-info">
                        <span className="client-modal-name">{fullName}</span>
                        <span className="client-modal-email">{contact.email}</span>
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
            {activeCall.contactName ? activeCall.contactName.substring(0, 2).toUpperCase() : 'CS'}
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
            {activeCall.contactName}
          </h3>
          <p style={{ color: '#94A3B8', fontSize: '1rem', marginBottom: 40 }}>
            Appel {activeCall.type === 'video' ? 'Vidéo' : 'Audio'} en cours...
          </p>
          <button
            type="button"
            onClick={() => setActiveCall(null)}
            style={{
              width: 64, height: 64, borderRadius: '50%', background: '#EF4444',
              border: 'none', color: '#fff', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
              transition: 'transform 0.2s'
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
