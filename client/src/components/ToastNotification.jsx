import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, Sparkles } from 'lucide-react';

/**
 * Universal Toast Notification Component
 * Matches the ultra-smooth, flicker-free sliding animation of SettingsPage.
 *
 * Features:
 * - Pure Framer-Motion physics: slide down on enter, slide up on exit
 * - AnimatePresence mode="wait" to guarantee smooth exit transitions without cutoffs
 * - Auto-dismiss after `duration` ms (default: 3200ms)
 * - Pause on mouse hover & resume on mouse leave (with 1.5s reading grace period)
 * - Click anywhere on the toast to dismiss immediately
 */
export default function ToastNotification({
    toast,
    onClose,
    duration = 3200,
    className = "",
    style = {},
}) {
    const timerRef = useRef(null);

    // Normalize input (can be string, or object with message/msg, type, isError, show)
    let isVisible = false;
    let message = "";
    let type = "success";
    let key = "";

    if (toast) {
        if (typeof toast === 'string') {
            isVisible = Boolean(toast.trim());
            message = toast;
            type = "success";
            key = toast;
        } else if (typeof toast === 'object') {
            if (toast.show !== undefined) {
                isVisible = Boolean(toast.show);
            } else {
                isVisible = true;
            }

            const rawMsg = toast.message !== undefined ? toast.message : toast.msg;
            if (typeof rawMsg === 'object' && rawMsg !== null) {
                message = rawMsg.message || rawMsg.msg || JSON.stringify(rawMsg);
            } else {
                message = rawMsg || "";
            }

            if (toast.isError || toast.type === 'error') {
                type = "error";
            } else if (toast.type === 'info') {
                type = "info";
            } else if (toast.type === 'sparkles') {
                type = "sparkles";
            } else {
                type = "success";
            }

            key = toast.id || toast.key || message;
        }
    }

    // Auto-dismiss management
    useEffect(() => {
        if (!isVisible || !message || !onClose) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onClose();
            timerRef.current = null;
        }, duration);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isVisible, key, message, duration, onClose]);

    const handleMouseEnter = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleMouseLeave = () => {
        if (!isVisible || !message || !onClose) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onClose();
            timerRef.current = null;
        }, 1500);
    };

    const handleClick = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (onClose) onClose();
    };

    const renderIcon = () => {
        if (type === 'error') {
            return <AlertTriangle size={20} style={{ color: "#EF4444", flexShrink: 0, minWidth: '20px', minHeight: '20px', marginTop: '1px' }} />;
        }
        if (type === 'info') {
            return <Info size={20} style={{ color: "#3B82F6", flexShrink: 0, minWidth: '20px', minHeight: '20px', marginTop: '1px' }} />;
        }
        if (type === 'sparkles') {
            return <Sparkles size={20} style={{ color: "#a855f7", flexShrink: 0, minWidth: '20px', minHeight: '20px', marginTop: '1px' }} />;
        }
        return <CheckCircle2 size={20} style={{ color: "#10B981", flexShrink: 0, minWidth: '20px', minHeight: '20px', marginTop: '1px' }} />;
    };

    const toastContent = (
        <AnimatePresence mode="wait">
            {isVisible && message && (
                <motion.div
                    key={key}
                    initial={{ opacity: 0, y: -36, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, y: -24, x: "-50%" }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                    className={`toast-notification custom-toast ${type} ${className}`}
                    style={{
                        pointerEvents: "auto",
                        cursor: "pointer",
                        userSelect: "none",
                        ...style,
                    }}
                    title="Cliquer pour masquer"
                >
                    {renderIcon()}
                    <span style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>{message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );

    if (typeof document !== 'undefined') {
        return createPortal(toastContent, document.body);
    }
    return toastContent;
}
