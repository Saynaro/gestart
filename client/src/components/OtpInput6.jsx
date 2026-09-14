import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './OtpInput6.css';

/**
 * OtpInput6 - 6-digit Animated Pin / OTP Input
 * Renders 6 distinct visual rounded boxes with smooth slide-down animation on entry.
 */
export default function OtpInput6({
    value = '',
    onChange,
    onComplete,
    autoFocus = false,
    disabled = false,
    className = ''
}) {
    const inputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    // Ensure value is a clean string of max 6 digits
    const cleanValue = (typeof value === 'string' ? value : Array.isArray(value) ? value.join('') : '').slice(0, 6);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const handleChange = (e) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
        if (onChange) {
            onChange(raw);
        }
        if (raw.length === 6 && onComplete) {
            onComplete(raw);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        if (onChange) {
            onChange(pasted);
        }
        if (pasted.length === 6 && onComplete) {
            onComplete(pasted);
        }
    };

    const handleClickWrapper = () => {
        if (inputRef.current && !disabled) {
            inputRef.current.focus();
        }
    };

    // The active slot index is the next empty slot, or slot 5 if full
    const activeIndex = Math.min(cleanValue.length, 5);

    return (
        <div className={`otp-input-wrapper ${className}`} onClick={handleClickWrapper}>
            {/* Invisible native input for full iOS/Android keyboard & autofill support */}
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                value={cleanValue}
                onChange={handleChange}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={disabled}
                className="otp-native-input"
                aria-label="Code de vérification à 6 chiffres"
            />

            {/* 6 Visual Slot Boxes */}
            {[0, 1, 2, 3, 4, 5].map((idx) => {
                const char = cleanValue[idx] || '';
                const hasDigit = Boolean(char);
                const isSlotFocused = isFocused && !disabled && (idx === activeIndex || (cleanValue.length === 6 && idx === 5));

                return (
                    <div
                        key={idx}
                        className={`otp-slot-box ${hasDigit ? 'filled' : ''} ${isSlotFocused ? 'focused' : ''}`}
                    >
                        <AnimatePresence mode="popLayout" initial={false}>
                            {hasDigit ? (
                                <motion.span
                                    key={`digit-${idx}-${char}`}
                                    initial={{ y: -26, opacity: 0, scale: 0.65 }}
                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                    exit={{ y: 18, opacity: 0, scale: 0.65 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 480,
                                        damping: 24
                                    }}
                                    className="otp-digit-text"
                                >
                                    {char}
                                </motion.span>
                            ) : isSlotFocused ? (
                                <span key={`cursor-${idx}`} className="otp-dot-active">·</span>
                            ) : (
                                <span key={`empty-${idx}`} className="otp-dot-placeholder">·</span>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
