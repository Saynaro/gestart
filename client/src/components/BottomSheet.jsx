import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogOut, Lock } from "lucide-react";
import { getSection1Items } from "./navigationConstants";
import { handleLogout } from "../utils/auth";
import { useSubscription } from "../utils/useSubscription";
import { useUser } from "../utils/useUser";

const BottomSheet = ({ isOpen, onClose, activePath, navigateTo, unreadMessagesCount = 0, unreadSupportCount = 0 }) => {
    const navigate = useNavigate();
    const { isStarter, isExpired } = useSubscription();
    const { role } = useUser();
    const section1Items = getSection1Items(role);
    const [showLogoutModal, setShowLogoutModal] = React.useState(false);
    const sheetRef = useRef(null);

    // Trap focus and handle escape key close
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose();
                return;
            }
            if (e.key === "Tab") {
                const focusableElements = sheetRef.current?.querySelectorAll(
                    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusableElements || focusableElements.length === 0) return;
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        const previousActiveElement = document.activeElement;
        
        // Focus the sheet container itself instead of the first link
        setTimeout(() => {
            sheetRef.current?.focus();
        }, 50);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (previousActiveElement && document.body.contains(previousActiveElement)) {
                try {
                    previousActiveElement.focus();
                } catch (e) {
                    // Ignore errors if focus fails during unmounting
                }
            }
        };
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop blurred overlay */}
                    <motion.div
                        className="fixed inset-0 z-[2000] bg-black/45 backdrop-blur-[4px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ willChange: "opacity" }}
                        onClick={onClose}
                    />

                    {/* Bottom Sheet Container */}
                    <motion.div
                        ref={sheetRef}
                        role="dialog"
                        aria-modal="true"
                        tabIndex="-1"
                        className="fixed bottom-0 left-0 right-0 z-[2100] mx-auto w-full max-w-md bg-card text-foreground rounded-t-[24px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] overflow-hidden outline-none focus:outline-none"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.28 }}
                        style={{ 
                            willChange: "transform",
                            transform: "translate3d(0, 0, 0)",
                            contain: "paint layout",
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 16px))'
                        }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.8 }}
                        onDragEnd={(event, info) => {
                            if (info.offset.y > 80) {
                                onClose();
                            }
                        }}
                    >
                        {/* Drag Handle Bar */}
                        <div className="flex justify-center w-full py-3 cursor-grab active:cursor-grabbing">
                            <div className="w-[36px] h-1 bg-border rounded-[2px]" />
                        </div>

                        {/* Menu Navigation List */}
                        <nav className="flex flex-col px-3 pb-3">
                            {/* Section 1 */}
                            <ul className="flex flex-col gap-1">
                                {section1Items.map((item, index) => {
                                    const IconComponent = item.icon;
                                    const isActive = activePath === item.path;
                                    return (
                                        <li key={index}>
                                            <motion.a
                                                href={item.path}
                                                onClick={(e) => {
                                                    navigateTo(e, item.path);
                                                    onClose();
                                                }}
                                                whileTap={{ scale: 0.96 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                                className={`relative min-h-[54px] px-4 flex items-center gap-4 transition-all duration-150 rounded-xl outline-none select-none ${
                                                    isActive 
                                                        ? "bg-sidebar-accent text-sidebar-primary font-semibold" 
                                                        : "text-foreground hover:bg-black/[0.02] focus-visible:bg-black/[0.02] active:bg-black/[0.04]"
                                                }`}
                                            >
                                                <IconComponent
                                                    className={`w-[25px] h-[25px] stroke-[1.8] ${
                                                        isActive ? "text-sidebar-primary" : "text-[#64748B]"
                                                    }`}
                                                />
                                                <span className="text-[17px] font-medium">{item.title}</span>
                                                {item.path === "/messages" && unreadMessagesCount > 0 && (
                                                    <span className="ml-auto bg-[#556B2F] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                                                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                                                    </span>
                                                )}
                                                {isExpired && (item.isPremium || (item.proOnly && isStarter) || item.path === "/premium") ? (
                                                    <span className="ml-auto bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-1 rounded-full flex items-center justify-center">
                                                        <Lock size={13} />
                                                    </span>
                                                ) : (item.isPremium || (item.proOnly && isStarter)) && item.path !== "/messages" && (
                                                    <span className="ml-auto bg-sidebar-primary text-white text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #5B4DDB, #7C3AED)' }}>
                                                        PRO
                                                    </span>
                                                )}
                                                {isActive && (
                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-sidebar-primary rounded-r-md" />
                                                )}
                                            </motion.a>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Separator */}
                            <div className="h-[1px] bg-border my-2" />

                            {/* Section 2 (Account / Tools) */}
                            <ul className="flex flex-col gap-1">
                                <li>
                                    <motion.a
                                        href="/settings"
                                        onClick={(e) => {
                                            navigateTo(e, "/settings");
                                            onClose();
                                        }}
                                        whileTap={{ scale: 0.96 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                        className={`relative min-h-[54px] px-4 flex items-center gap-4 transition-all duration-150 rounded-xl outline-none select-none ${
                                            activePath === "/settings"
                                                ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                                                : "text-foreground hover:bg-black/[0.02] focus-visible:bg-black/[0.02] active:bg-black/[0.04]"
                                        }`}
                                    >
                                        <Settings className={`w-[25px] h-[25px] stroke-[1.8] ${activePath === "/settings" ? "text-sidebar-primary" : "text-[#64748B]"}`} />
                                        <span className="text-[17px] font-medium">Paramètres</span>
                                        {unreadSupportCount > 0 && (
                                            <span className="ml-auto bg-[#EF4444] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                                                {unreadSupportCount}
                                            </span>
                                        )}
                                        {activePath === "/settings" && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-sidebar-primary rounded-r-md" />
                                        )}
                                    </motion.a>
                                </li>
                                <li>
                                    <motion.button
                                        onClick={() => {
                                            onClose();
                                            setShowLogoutModal(true);
                                        }}
                                        whileTap={{ scale: 0.96 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                        className="w-full min-h-[54px] px-4 flex items-center gap-4 transition-all duration-150 rounded-xl outline-none hover:bg-red-50 focus-visible:bg-red-50 active:bg-red-100 select-none text-[#DC2626]"
                                    >
                                        <LogOut className="w-[25px] h-[25px] stroke-[1.8] text-[#DC2626]" />
                                        <span className="text-[17px] font-medium">Déconnexion</span>
                                    </motion.button>
                                </li>
                            </ul>
                        </nav>
                    </motion.div>
                </>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutModal && typeof document !== "undefined" && createPortal(
                <div 
                    onClick={() => setShowLogoutModal(false)}
                    style={{
                        position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 99999999, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'var(--card, #FFFFFF)', border: '1px solid var(--border, #E2E8F0)',
                            borderRadius: '24px', padding: '28px', maxWidth: '400px', width: '100%',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.25)', textAlign: 'center'
                        }}
                    >
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px auto'
                        }}>
                            <LogOut size={26} />
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
                </div>,
                document.body
            )}
        </AnimatePresence>
    );
};

export default BottomSheet;
