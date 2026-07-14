import React, { useState } from "react";
import { motion } from "framer-motion";
import "../HomePage/Homepage.css";
import "./MessagesPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";

const mockChats = [
    { id: 1, name: "Jean Dupont", lastMessage: "Bonjour, est-ce que le technicien passera bien à 9h ?", time: "10:24", unread: 1, online: true },
    { id: 2, name: "Sophie Martin", lastMessage: "Merci pour votre intervention rapide !", time: "Hier", unread: 0, online: false },
    { id: 3, name: "Pierre Leroy", lastMessage: "Pouvez-vous m'envoyer la facture par email ?", time: "Hier", unread: 0, online: true },
    { id: 4, name: "Marie Dubois", lastMessage: "Je valide le devis pour la pompe à chaleur.", time: "12 Juil", unread: 0, online: false }
];

const mockConversation = [
    { id: 1, sender: "client", text: "Bonjour, est-ce que le technicien passera bien à 9h ?", time: "10:24" },
    { id: 2, sender: "agent", text: "Bonjour Jean, oui tout à fait. Le technicien est en route, il devrait arriver d'ici 15 minutes.", time: "10:26" },
    { id: 3, sender: "client", text: "Super, merci beaucoup !", time: "10:28" }
];

function MessagesPage() {
    const [chats, setChats] = useState(mockChats);
    const [selectedChat, setSelectedChat] = useState(mockChats[0]);
    const [messages, setMessages] = useState(mockConversation);
    const [inputText, setInputText] = useState("");

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const newMsg = {
            id: messages.length + 1,
            sender: "agent",
            text: inputText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages([...messages, newMsg]);
        setInputText("");
    };

    return (
        <div className="home-page">
            <SideBar />
            <div className="main-content">
                <Header />
                <motion.div 
                    className="page-content messages-page-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="messaging-container">
                        {/* Inbox sidebar */}
                        <div className="inbox-sidebar">
                            <div className="inbox-header">
                                <h2>Discussions</h2>
                            </div>
                            <div className="chat-list">
                                {chats.map((chat) => (
                                    <div 
                                        key={chat.id} 
                                        className={`chat-item ${selectedChat.id === chat.id ? "active" : ""}`}
                                        onClick={() => setSelectedChat(chat)}
                                    >
                                        <div className="chat-avatar-wrapper">
                                            <div className="chat-avatar">{chat.name.split(" ").map(n => n[0]).join("")}</div>
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
                                ))}
                            </div>
                        </div>

                        {/* Active chat pane */}
                        <div className="chat-pane">
                            <div className="chat-pane-header">
                                <div className="active-chat-avatar">{selectedChat.name.split(" ").map(n => n[0]).join("")}</div>
                                <div className="active-chat-info">
                                    <h3>{selectedChat.name}</h3>
                                    <span className="active-chat-status">
                                        {selectedChat.online ? "En ligne" : "Hors ligne"}
                                    </span>
                                </div>
                            </div>

                            <div className="chat-messages-container">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`message-bubble-wrapper ${msg.sender === "agent" ? "me" : "them"}`}>
                                        <div className="message-bubble">
                                            <p className="message-text">{msg.text}</p>
                                            <span className="message-time">{msg.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form className="chat-input-form" onSubmit={handleSendMessage}>
                                <input 
                                    type="text" 
                                    placeholder="Écrivez un message..." 
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    className="chat-input"
                                />
                                <button type="submit" className="chat-send-btn">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default MessagesPage;
