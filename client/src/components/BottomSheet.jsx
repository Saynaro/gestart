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
                        <nav className="flex flex-col">
                            {/* Section 1 */}
                            <ul className="flex flex-col">
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
                                                className={`min-h-[56px] px-6 flex items-center gap-4 transition-all duration-100 outline-none hover:bg-[#F8FAFC] focus-visible:bg-[#F8FAFC] active:bg-[#F1F5F9] select-none ${
                                                    isActive ? "text-[#5B4DDB]" : "text-[#0F172A]"
                                                }`}
                                            >
                                                <IconComponent
                                                    className={`w-[22px] h-[22px] stroke-[1.5] ${
                                                        isActive ? "text-[#5B4DDB]" : "text-[#64748B]"
                                                    }`}
                                                />
                                                <span className="text-[16px] font-medium">{item.title}</span>
                                                {item.isPremium && (
                                                    <span className="ml-auto bg-[#5B4DDB] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                                                        PRO
                                                    </span>
                                                )}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Separator */}
                            <div className="h-[1px] bg-[#F1F5F9] my-1" />

                            {/* Section 2 (Account / Tools) */}
                            <ul className="flex flex-col">
                                <li>
                                    <a
                                        href="/settings"
                                        onClick={(e) => {
                                            navigateTo(e, "/settings");
                                            onClose();
                                        }}
                                        className="min-h-[56px] px-6 flex items-center gap-4 transition-all duration-100 outline-none hover:bg-[#F8FAFC] focus-visible:bg-[#F8FAFC] active:bg-[#F1F5F9] select-none text-[#0F172A]"
                                    >
                                        <Settings className="w-[22px] h-[22px] stroke-[1.5] text-[#64748B]" />
                                        <span className="text-[16px] font-medium">Paramètres</span>
                                    </a>
                                </li>
                                <li>
                                    <button
                                        onClick={() => {
                                            alert("Déconnexion");
                                            onClose();
                                        }}
                                        className="w-full min-h-[56px] px-6 flex items-center gap-4 transition-all duration-100 outline-none hover:bg-red-50 focus-visible:bg-red-50 active:bg-red-100 select-none text-[#DC2626]"
                                    >
                                        <LogOut className="w-[22px] h-[22px] stroke-[1.5] text-[#DC2626]" />
                                        <span className="text-[16px] font-medium">Déconnexion</span>
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
