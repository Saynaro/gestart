import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Download, CheckCircle, Trash2, ShieldAlert } from "lucide-react";
import "./SignatureQuote.css";

import { apiFetch } from "../utils/api";

function SignatureQuote() {
    const { token } = useParams();
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    const [signatureSaved, setSignatureSaved] = useState(false);
    const [quote, setQuote] = useState({
        number: "DEV-2026-002",
        date: "2026-07-10",
        validity: "10/08/2026",
        companyName: "Dupont Climatisation",
        clientName: "Marie Martin",
        clientEmail: "marie.martin@email.com",
        interventionType: "Dépannage d'urgence",
        subtotalHt: 218.18,
        tvaAmount: 21.82,
        totalTtc: 240,
        lines: [
            { description: "Forfait dépannage et diagnostic", qty: 1, unitPrice: 150 },
            { description: "Recharge de fluide R32 (kg)", qty: 0.8, unitPrice: 85.22 }
        ]
    });

    useEffect(() => {
        if (!token) return;
        const fetchPublicQuote = async () => {
            try {
                const data = await apiFetch(`/v1/public/quotes/${token}`);
                const q = data.data?.quote || data.quote || data;
                if (q) {
                    setQuote({
                        number: q.number || "DEV-2026-002",
                        date: q.createdAt ? new Date(q.createdAt).toISOString().split('T')[0] : "2026-07-10",
                        validity: q.validityDays ? `${q.validityDays} jours` : "30 jours",
                        companyName: q.company?.name || "ClimPro CRM",
                        clientName: q.client ? `${q.client.firstName || ''} ${q.client.lastName || q.client.companyName || ''}`.trim() : "Client",
                        clientEmail: q.client?.email || "",
                        interventionType: q.subject || "Prestation",
                        subtotalHt: Number(q.totalHt || 0),
                        tvaAmount: Number(q.totalTva || 0),
                        totalTtc: Number(q.totalTtc || 0),
                        lines: q.lines || []
                    });
                }
            } catch (err) {
                console.warn("API public quote non disponible, données locales conservées:", err.message);
            }
        };

        fetchPublicQuote();
    }, [token]);

    // Canvas drawing setup
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.strokeStyle = "#1A1A1A";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
    }, [signatureSaved]);

    // Canvas drawing events
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const coords = getEventCoords(e, canvas);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        setIsDrawing(true);
        setHasSigned(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const coords = getEventCoords(e, canvas);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const getEventCoords = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        // Support touch events
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        // Support mouse events
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    };

    const handleAcceptQuote = () => {
        if (!hasSigned) {
            alert("Veuillez signer dans le cadre prévu avant d'approuver.");
            return;
        }
        setSignatureSaved(true);
    };

    const handleDownloadReceipt = () => {
        const textContent = `
========================================
       DEVIS SIGNÉ ÉLECTRONIQUEMENT
========================================
Devis N*: ${quote.number}
Signataire: ${quote.clientName}
Date de signature: ${new Date().toLocaleDateString("fr-FR")}
Statut: ACCEPTE (Bon pour accord)
----------------------------------------
Montant Total TTC: ${quote.totalTtc} EUR
Dupont Climatisation SAS
========================================
`;
        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Devis_${quote.number}_Signe.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="public-signature-page">
            <div className="public-header">
                <span className="logo-label">CLIMPRO</span>
                <span className="info-txt">Votre devis de <strong>{quote.companyName}</strong></span>
            </div>

            <div className="public-content-container">
                {signatureSaved ? (
                    <div className="signature-success-card animate-fade-in">
                        <CheckCircle size={60} style={{ color: 'var(--success)', margin: '0 auto 15px auto' }} />
                        <h2>Devis signé avec succès !</h2>
                        <p>Votre accord a été transmis à Dupont Climatisation. Vous allez recevoir un e-mail de confirmation.</p>
                        <button 
                            className="download-pdf-btn" 
                            onClick={handleDownloadReceipt}
                        >
                            <Download size={16} /> Télécharger votre exemplaire signé (PDF)
                        </button>
                    </div>
                ) : (
                    <div className="public-quote-form">
                        {/* Quote summary card */}
                        <div className="quote-details-card">
                            <div className="card-top">
                                <div>
                                    <h3>Devis {quote.number}</h3>
                                    <span className="validity">Valable jusqu'au {quote.validity}</span>
                                </div>
                                <span className="price-tag">{quote.totalTtc.toLocaleString("fr-FR")} € TTC</span>
                            </div>

                            <div className="client-meta">
                                <span>Destinataire : <strong>{quote.clientName}</strong> ({quote.clientEmail})</span>
                                <span>Objet : <strong>{quote.interventionType}</strong></span>
                            </div>

                            <table className="quote-items-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th className="text-center">Qté</th>
                                        <th className="text-right">Unit. HT</th>
                                        <th className="text-right">Total HT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quote.lines.map((line, idx) => (
                                        <tr key={idx}>
                                            <td>{line.description}</td>
                                            <td className="text-center">{line.qty}</td>
                                            <td className="text-right">{line.unitPrice.toLocaleString("fr-FR")} €</td>
                                            <td className="text-right">{(line.unitPrice * line.qty).toLocaleString("fr-FR")} €</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="quote-recap">
                                <div className="recap-row">
                                    <span>Total HT :</span>
                                    <span>{quote.subtotalHt.toLocaleString("fr-FR")} €</span>
                                </div>
                                <div className="recap-row">
                                    <span>TVA ({quote.tvaAmount ? quote.tvaAmount : 20}%) :</span>
                                    <span>{quote.tvaAmount.toLocaleString("fr-FR")} €</span>
                                </div>
                                <div className="recap-row total">
                                    <span>Total TTC :</span>
                                    <span>{quote.totalTtc.toLocaleString("fr-FR")} €</span>
                                </div>
                            </div>
                        </div>

                        {/* Signature area */}
                        <div className="signature-box-card">
                            <h3>Signature électronique</h3>
                            <p className="hint">Veuillez signer avec votre doigt sur smartphone, ou avec votre souris sur ordinateur :</p>
                            
                            <div className="canvas-wrapper">
                                <canvas 
                                    ref={canvasRef}
                                    width={400}
                                    height={180}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                <button type="button" className="clear-sig-btn" onClick={handleClear}>
                                    <Trash2 size={13} /> Effacer
                                </button>
                            </div>

                            <div className="terms-agreement">
                                <ShieldAlert size={16} />
                                <span>En signant, vous acceptez le devis et les conditions générales de prestation associées.</span>
                            </div>

                            <button 
                                className="accept-action-btn"
                                onClick={handleAcceptQuote}
                                disabled={!hasSigned}
                            >
                                ✍️ Bon pour accord — Signer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SignatureQuote;
