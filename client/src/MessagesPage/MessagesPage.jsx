import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
const mockChatsData = [
  {
    id: 1,
    name: "Jelena Denisova",
    lastMessage: "Great! Looking forward to it.",
    time: "11:16",
    unread: 0,
    online: true,
    statusText: "Last seen recently",
    clientInfo: {
      phone: "+33 6 12 34 56 78",
      email: "jelena.denisova@example.com",
      address: "14 Avenue de la République",
      zip: "06000",
      city: "NICE",
      type: "particulier",
      equipment: { model: "Daikin 3.5kW Inverter", installDate: "12/04/2024", serialNumber: "DK-2024-9876" },
      maintenance: { status: "OK", nextMaintenance: "12/04/2027" },
      interventions: [
        { title: "Installation Clim", date: "12/04/2024", tech: "Marc D.", status: "Terminé", desc: "Installation complète d'une unité Daikin Inverter." }
      ],
      factures: [
        { id: "FACT-2024-055", date: "12/04/2024", amount: "1 450,00 €", status: "Payé" }
      ],
      devis: [
        { id: "DEV-2024-042", date: "05/04/2024", amount: "1 450,00 €", status: "Accepté" }
      ]
    },
    messages: [
      { id: 1, sender: "client", isFile: true, fileName: "CryptoCoin-Release.pdf", fileSize: "12 mb", time: "10:57" },
      { id: 2, sender: "agent", text: "Wait. I'm looking into it!", time: "10:58" },
      { id: 3, sender: "client", text: "Let me know if it works or not?", time: "11:11" },
      { id: 4, sender: "agent", text: "I checked it. Yep, that works!", time: "11:13" },
      { id: 5, sender: "client", text: "Perfect! I'll prepare the next phase then.", time: "11:14" },
      { id: 6, sender: "agent", text: "Sounds good. When do you think it'll be ready?", time: "11:15" },
      { id: 7, sender: "client", text: "Should be done by tomorrow morning.", time: "11:15" },
      { id: 8, sender: "agent", text: "Great! Looking forward to it.", time: "11:16" }
    ]
  },
  {
    id: 2,
    name: "Yong Tonghyon",
    lastMessage: "What makes it different fro...",
    time: "11:32",
    unread: 2,
    online: true,
    statusText: "En ligne",
    clientInfo: {
      phone: "+33 7 98 76 54 32",
      email: "yong.t@example.com",
      address: "8 Place Garibaldi",
      zip: "06300",
      city: "NICE",
      type: "particulier",
      equipment: { model: "Mitsubishi Heavy 5kW", installDate: "18/02/2025", serialNumber: "MS-2025-2244" },
      maintenance: { status: "Bientôt", nextMaintenance: "18/02/2026" },
      interventions: [
        { title: "Mise en service", date: "18/02/2025", tech: "Pierre L.", status: "Terminé", desc: "Raccordement frigorifique et mise en route." }
      ],
      factures: [
        { id: "FACT-2025-019", date: "18/02/2025", amount: "2 100,00 €", status: "Payé" }
      ],
      devis: [
        { id: "DEV-2025-011", date: "10/02/2025", amount: "2 100,00 €", status: "Accepté" }
      ]
    },
    messages: [
      { id: 1, sender: "client", text: "What makes it different from previous models?", time: "11:30" },
      { id: 2, sender: "client", text: "What makes it different from other brands on the market?", time: "11:32" }
    ]
  },
  {
    id: 3,
    name: "Sarah Miller",
    lastMessage: "The project deadline is approachi...",
    time: "10:45",
    unread: 0,
    online: false,
    statusText: "Last seen 2 hours ago",
    clientInfo: {
      phone: "+33 6 45 78 12 90",
      email: "sarah.m@example.com",
      address: "45 Avenue Jean Médecin",
      zip: "06000",
      city: "NICE",
      type: "particulier",
      equipment: { model: "Daikin Multi-Split 4.0kW", installDate: "30/06/2023", serialNumber: "DK-2023-4554" },
      maintenance: { status: "OK", nextMaintenance: "30/06/2026" },
      interventions: [
        { title: "Contrôle d'étanchéité", date: "30/06/2024", tech: "Marc D.", status: "Terminé", desc: "Aucune fuite détectée, complément de charge OK." }
      ],
      factures: [{ id: "FACT-2024-102", date: "30/06/2024", amount: "180,00 €", status: "Payé" }],
      devis: [{ id: "DEV-2024-098", date: "20/06/2024", amount: "180,00 €", status: "Accepté" }]
    },
    messages: [
      { id: 1, sender: "agent", text: "Hi Sarah, can you confirm the layout for the office units?", time: "10:15" },
      { id: 2, sender: "client", text: "The project deadline is approaching, I will check and send it.", time: "10:45" }
    ]
  },
  {
    id: 4,
    name: "David Chen",
    lastMessage: "Can we schedule a meeting ...",
    time: "09:20",
    unread: 3,
    online: true,
    statusText: "En ligne",
    clientInfo: {
      phone: "+33 7 11 22 33 44",
      email: "d.chen@example.com",
      address: "102 Rue de France",
      zip: "06000",
      city: "NICE",
      type: "particulier",
      equipment: { model: "Toshiba Shorai 2.5kW", installDate: "10/01/2024", serialNumber: "TS-2024-8811" },
      maintenance: { status: "OK", nextMaintenance: "10/01/2027" },
      interventions: [{ title: "Installation standard", date: "10/01/2024", tech: "Marc D.", status: "Terminé", desc: "Pose et raccordements." }],
      factures: [{ id: "FACT-2024-001", date: "10/01/2024", amount: "1 250,00 €", status: "Payé" }],
      devis: [{ id: "DEV-2024-001", date: "02/01/2024", amount: "1 250,00 €", status: "Accepté" }]
    },
    messages: [
      { id: 1, sender: "client", text: "Hi, I have a question about the invoice.", time: "09:15" },
      { id: 2, sender: "client", text: "Can we schedule a meeting to review the project details?", time: "09:20" }
    ]
  },
  {
    id: 5,
    name: "Emma Thompson",
    lastMessage: "I reviewed the proposal and...",
    time: "08:15",
    unread: 0,
    online: false,
    statusText: "Last seen 4 hours ago",
    clientInfo: {
      phone: "+33 6 89 54 23 11",
      email: "emma.t@example.com",
      address: "34 Boulevard Victor Hugo",
      zip: "06200",
      city: "NICE",
      type: "particulier",
      equipment: { model: "Panasonic Aquarea 6kW", installDate: "05/11/2023", serialNumber: "PA-2023-3321" },
      maintenance: { status: "Urgent", nextMaintenance: "05/11/2024" },
      interventions: [{ title: "Dépannage PAC", date: "15/12/2024", tech: "Pierre L.", status: "Terminé", desc: "Remplacement circulateur défectueux." }],
      factures: [{ id: "FACT-2024-443", date: "15/12/2024", amount: "420,00 €", status: "Payé" }],
      devis: [{ id: "DEV-2024-399", date: "10/12/2024", amount: "420,00 €", status: "Accepté" }]
    },
    messages: [
      { id: 1, sender: "client", text: "I reviewed the proposal and approved the details.", time: "08:15" }
    ]
  }
];

// Complete CRM contacts database list for the selector modal
const crmContactsList = [
  { firstName: "Jane", lastName: "Doe", email: "jane-doe@yopmail.com", phone: "01 23 45 67 89", address: "23 Rue Paganini", zip: "06000", city: "NICE" },
  { firstName: "John", lastName: "Doe", email: "john-doe@yopmail.com", phone: "06 98 76 54 32", address: "45 Avenue Jean Médecin", zip: "06000", city: "NICE" },
  { firstName: "Khalid", lastName: "Sainaro", email: "khalidsainaro@gmail.com", phone: "07 12 34 56 78", address: "12 Blvd Victor Hugo", zip: "06200", city: "NICE" },
  { firstName: "Martin", lastName: "Dupont", email: "martin.dupont@email.com", phone: "06 12 34 56 78", address: "12 Rue de la Paix", zip: "75002", city: "Paris" },
  { firstName: "Sophie", lastName: "Bernard", email: "sophie.bernard@email.com", phone: "06 98 76 54 32", address: "45 Avenue Victor Hugo", zip: "69000", city: "Lyon" },
  { firstName: "Jean", lastName: "Moreau", email: "jean.moreau@email.com", phone: "07 12 34 56 78", address: "8 Boulevard Haussmann", zip: "75009", city: "Paris" },
  { firstName: "Marie", lastName: "Petit", email: "marie.petit@email.com", phone: "06 55 44 33 22", address: "23 Rue Lafayette", zip: "13000", city: "Marseille" },
  { firstName: "Claire", lastName: "Laurent", email: "claire.laurent@email.com", phone: "06 11 22 33 44", address: "56 Cours Gambetta", zip: "69000", city: "Lyon" },
  { firstName: "Jelena", lastName: "Denisova", email: "jelena.denisova@example.com", phone: "+33 6 12 34 56 78", address: "14 Avenue de la République", zip: "06000", city: "NICE" },
  { firstName: "Yong", lastName: "Tonghyon", email: "yong.t@example.com", phone: "+33 7 98 76 54 32", address: "8 Place Garibaldi", zip: "06300", city: "NICE" },
  { firstName: "Sarah", lastName: "Miller", email: "sarah.m@example.com", phone: "+33 6 45 78 12 90", address: "45 Avenue Jean Médecin", zip: "06000", city: "NICE" },
  { firstName: "David", lastName: "Chen", email: "d.chen@example.com", phone: "+33 7 11 22 33 44", address: "102 Rue de France", zip: "06000", city: "NICE" },
  { firstName: "Emma", lastName: "Thompson", email: "emma.t@example.com", phone: "+33 6 89 54 23 11", address: "34 Boulevard Victor Hugo", zip: "06200", city: "NICE" }
];

function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [chats, setChats] = useState(mockChatsData);
  const [inputText, setInputText] = useState("");
  const [detailTab, setDetailTab] = useState("interventions");

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
            time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "11:16",
            unread: 0,
            online: true,
            statusText: item.status || "Envoyé",
            clientInfo: {
              phone: item.recipient || item.client?.phone || "+33 6 00 00 00 00",
              email: item.client?.email || "",
              address: item.client?.address || "France",
              zip: item.client?.postalCode || "06000",
              city: item.client?.city || "NICE",
              type: "particulier",
              equipment: { model: "Daikin Inverter", installDate: "12/04/2024", serialNumber: "DK-2024" },
              maintenance: { status: "OK", nextMaintenance: "12/04/2027" }
            },
            messages: [
              { id: 1, sender: "me", text: item.message, time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "11:16" }
            ]
          }));
          setChats(mappedChats);
        }
      } catch (err) {
        console.warn("API SMS non disponible, utilisation des conversations locales:", err.message);
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
        {chats.map((chat) => {
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
        })}
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
            <button className="pane-header-action-btn" title="Appeler" onClick={() => alert("Appel vers " + selectedChat.name)}>
              <Phone size={17} />
            </button>
            <button className="pane-header-action-btn" title="Appel Vidéo" onClick={() => alert("Appel vidéo vers " + selectedChat.name)}>
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
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); alert("Planifier pour " + selectedChat.name); }}>
                    <Calendar size={14} className="dropdown-action-icon" />
                    <span>Planifier</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); alert("Créer facture pour " + selectedChat.name); }}>
                    <FileText size={14} className="dropdown-action-icon" />
                    <span>Créer facture</span>
                  </button>
                  <div className="chat-action-divider"></div>
                  <button type="button" className="chat-action-item danger" onClick={() => { setIsActionsMenuOpen(false); alert("Discussion archivée"); }}>
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
            <button className="pane-header-action-btn" title="Appeler" onClick={() => alert("Appel vers " + selectedChat.name)}>
              <Phone size={17} />
            </button>
            <button className="pane-header-action-btn" title="Appel Vidéo" onClick={() => alert("Appel vidéo vers " + selectedChat.name)}>
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
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); alert("Planifier pour " + selectedChat.name); }}>
                    <Calendar size={14} className="dropdown-action-icon" />
                    <span>Planifier</span>
                  </button>
                  <button type="button" className="chat-action-item" onClick={() => { setIsActionsMenuOpen(false); alert("Créer facture pour " + selectedChat.name); }}>
                    <FileText size={14} className="dropdown-action-icon" />
                    <span>Créer facture</span>
                  </button>
                  <div className="chat-action-divider"></div>
                  <button type="button" className="chat-action-item danger" onClick={() => { setIsActionsMenuOpen(false); alert("Discussion archivée"); }}>
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
    </div>
  );
}

export default MessagesPage;
