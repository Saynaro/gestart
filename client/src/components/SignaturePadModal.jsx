import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, RotateCcw, Check, PenTool, Upload, Trash2 } from "lucide-react";
import "./SignaturePadModal.css";

export default function SignaturePadModal({ isOpen, onClose, onSave, existingSignature = null }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [history, setHistory] = useState([]);
    const [strokeColor, setStrokeColor] = useState("#1A1A1A");
    const [strokeWidth, setStrokeWidth] = useState(2.5);

    // Lock background scroll when modal is open
    useEffect(() => {
        if (!isOpen) return;

        const prevOverflowHtml = document.documentElement.style.overflow;
        const prevOverflowBody = document.body.style.overflow;
        const rootEl = document.getElementById("root");
        const prevRootOverflow = rootEl ? rootEl.style.overflow : "";

        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        if (rootEl) rootEl.style.overflow = "hidden";
        document.body.classList.add("modal-open");

        return () => {
            document.documentElement.style.overflow = prevOverflowHtml || "";
            document.body.style.overflow = prevOverflowBody || "";
            if (rootEl) rootEl.style.overflow = prevRootOverflow || "";
            document.body.classList.remove("modal-open");
        };
    }, [isOpen]);

    // Canvas sizing and initial setup on open
    useEffect(() => {
        if (!isOpen) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        // Handle high DPI / Retina displays
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);
        setHasDrawn(false);
        setHistory([]);
    }, [isOpen]);

    // Update stroke styling dynamically without clearing canvas
    useEffect(() => {
        if (!isOpen) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
        }
    }, [strokeColor, strokeWidth, isOpen]);

    if (!isOpen) return null;

    const getCanvasCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const saveHistorySnapshot = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory(prev => [...prev.slice(-10), imageData]);
    };

    const startDrawing = (e) => {
        e.preventDefault();
        saveHistorySnapshot();
        const { x, y } = getCanvasCoordinates(e);
        const ctx = canvasRef.current.getContext("2d");
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getCanvasCoordinates(e);
        const ctx = canvasRef.current.getContext("2d");
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = (e) => {
        if (!isDrawing) return;
        if (e) e.preventDefault();
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) ctx.closePath();
        setIsDrawing(false);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        setHasDrawn(false);
        setHistory([]);
    };

    const handleUndo = () => {
        if (history.length === 0) {
            handleClear();
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const lastState = history[history.length - 1];
        ctx.putImageData(lastState, 0, 0);
        setHistory(prev => prev.slice(0, -1));
        if (history.length <= 1) {
            setHasDrawn(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new window.Image();
                img.onload = () => {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext("2d");
                    const rect = canvas.getBoundingClientRect();
                    ctx.clearRect(0, 0, rect.width, rect.height);

                    // Fit image into canvas maintaining aspect ratio
                    const hRatio = rect.width / img.width;
                    const vRatio = rect.height / img.height;
                    const ratio = Math.min(hRatio, vRatio, 1);
                    const centerShiftX = (rect.width - img.width * ratio) / 2;
                    const centerShiftY = (rect.height - img.height * ratio) / 2;

                    ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
                    setHasDrawn(true);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirm = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) return;
        const dataUrl = canvas.toDataURL("image/png");
        onSave(dataUrl);
        onClose();
    };

    return createPortal(
        <div className="signature-modal-overlay" onClick={onClose}>
            <div className="signature-modal-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="signature-modal-header">
                    <div className="signature-modal-title-group">
                        <div className="signature-modal-icon-badge">
                            <PenTool size={18} />
                        </div>
                        <div>
                            <h3>Signature de l'entreprise</h3>
                            <p>Dessinez votre signature ou importez une image pour vos devis et factures</p>
                        </div>
                    </div>
                    <button type="button" className="signature-modal-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Canvas Box */}
                <div className="signature-canvas-wrapper">
                    <canvas
                        ref={canvasRef}
                        className="signature-canvas-element"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />

                    {!hasDrawn && (
                        <div className="signature-canvas-placeholder">
                            <PenTool size={28} style={{ opacity: 0.25, marginBottom: '8px' }} />
                            <span>Signez avec votre doigt ou la souris dans ce cadre</span>
                        </div>
                    )}

                    <div className="signature-canvas-baseline" />
                </div>

                {/* Toolbar */}
                <div className="signature-modal-toolbar">
                    <div className="signature-tools-left">
                        <button
                            type="button"
                            className="signature-tool-btn"
                            onClick={handleUndo}
                            disabled={history.length === 0}
                            title="Défaire le dernier trait"
                        >
                            <RotateCcw size={14} />
                            <span>Défaire</span>
                        </button>

                        <button
                            type="button"
                            className="signature-tool-btn signature-tool-btn-danger"
                            onClick={handleClear}
                            disabled={!hasDrawn}
                            title="Effacer tout"
                        >
                            <Trash2 size={14} />
                            <span>Effacer</span>
                        </button>

                        <label className="signature-tool-btn file-upload-label" title="Importer une image de signature">
                            <Upload size={14} />
                            <span>Importer</span>
                            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                    </div>

                    <div className="signature-color-picker">
                        {["#1A1A1A", "#0F294A", "#556B2F"].map(color => (
                            <button
                                key={color}
                                type="button"
                                className={`sig-color-swatch ${strokeColor === color ? "active" : ""}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setStrokeColor(color)}
                                title={`Couleur d'encre`}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer actions */}
                <div className="signature-modal-footer">
                    <button type="button" className="signature-cancel-btn" onClick={onClose}>
                        Annuler
                    </button>
                    <button
                        type="button"
                        className="signature-save-btn"
                        onClick={handleConfirm}
                        disabled={!hasDrawn}
                    >
                        <Check size={15} />
                        <span>Enregistrer</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
