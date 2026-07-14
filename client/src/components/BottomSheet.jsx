import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogOut } from "lucide-react";
import { section1Items } from "./navigationConstants";

const BottomSheet = ({ isOpen, onClose, activePath, navigateTo }) => {
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
            if (previousActiveElement) previousActiveElement.focus();
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
                        className="fixed bottom-0 left-0 right-0 z-[2100] mx-auto w-full max-w-md bg-white rounded-t-[24px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] overflow-hidden pb-[max(20px,env(safe-area-inset-bottom))] outline-none focus:outline-none"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
                        style={{ willChange: "transform" }}
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
                            <div className="w-[36px] h-1 bg-[#E2E8F0] rounded-[2px]" />
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
                                            <a
                                                href={item.path}
                                                onClick={(e) => {
                                                    navigateTo(e, item.path);
                                                    onClose();
                                                }}
                                                className={`relative min-h-[48px] px-4 flex items-center gap-4 transition-all duration-150 rounded-xl outline-none select-none ${
                                                    isActive 
                                                        ? "bg-sidebar-accent text-sidebar-primary font-semibold" 
                                                        : "text-[#0F172A] hover:bg-black/[0.02] focus-visible:bg-black/[0.02] active:bg-black/[0.04]"
                                                }`}
                                            >
                                                <IconComponent
                                                    className={`w-[22px] h-[22px] stroke-[1.8] ${
                                                        isActive ? "text-sidebar-primary" : "text-[#64748B]"
                                                    }`}
                                                />
                                                <span className="text-[14.5px] font-medium">{item.title}</span>
                                                {item.isPremium && (
                                                    <span className="ml-auto bg-sidebar-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        PRO
                                                    </span>
                                                )}
                                                {isActive && (
                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[16px] bg-sidebar-primary rounded-r-md" />
                                                )}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Separator */}
                            <div className="h-[1px] bg-[#F1F5F9] my-2" />

                            {/* Section 2 (Account / Tools) */}
                            <ul className="flex flex-col gap-1">
                                <li>
                                    <a
                                        href="/settings"
                                        onClick={(e) => {
                                            navigateTo(e, "/settings");
                                            onClose();
                                        }}
                                        className={`relative min-h-[48px] px-4 flex items-center gap-4 transition-all duration-150 rounded-xl outline-none select-none ${
                                            activePath === "/settings"
                                                ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                                                : "text-[#0F172A] hover:bg-black/[0.02] focus-visible:bg-black/[0.02] active:bg-black/[0.04]"
                                        }`}
                                    >
                                        <Settings className={`w-[22px] h-[22px] stroke-[1.8] ${activePath === "/settings" ? "text-sidebar-primary" : "text-[#64748B]"}`} />
                                        <span className="text-[14.5px] font-medium">Paramètres</span>
                                        {activePath === "/settings" && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[16px] bg-sidebar-primary rounded-r-md" />
                                        )}
                                    </a>
                                </li>
                                <li>
                                    <button
                                        onClick={() => {
                                            alert("Déconnexion");
                                            onClose();
                                        }}
                                        className="w-full min-h-[48px] px-4 flex items-center gap-4 transition-all duration-150 rounded-xl outline-none hover:bg-red-50 focus-visible:bg-red-50 active:bg-red-100 select-none text-[#DC2626]"
                                    >
                                        <LogOut className="w-[22px] h-[22px] stroke-[1.8] text-[#DC2626]" />
                                        <span className="text-[14.5px] font-medium">Déconnexion</span>
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BottomSheet;
