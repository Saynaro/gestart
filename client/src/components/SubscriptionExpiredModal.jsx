import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Star, X } from "lucide-react";
import { useUser } from "../utils/useUser";

export default function SubscriptionExpiredModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const navigate = useNavigate();
    const { role } = useUser();
    const isTechnician = role === "TECHNICIAN";

    useEffect(() => {
        const handleExpired = (e) => {
            setModalData(e.detail || {});
            setIsOpen(true);
        };

        window.addEventListener("subscription_expired", handleExpired);
        return () => window.removeEventListener("subscription_expired", handleExpired);
    }, []);

    if (!isOpen) return null;

    const handleGoToBilling = () => {
        setIsOpen(false);
        navigate("/settings?tab=abonnement");
    };

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
        }}>
            <div style={{
                backgroundColor: "var(--card, #FFFFFF)",
                color: "var(--foreground, #0F172A)",
                borderRadius: "16px",
                maxWidth: "480px",
                width: "100%",
                padding: "28px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                position: "relative",
                textAlign: "center"
            }}>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted-foreground, #64748b)"
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 18px auto"
                }}>
                    <AlertTriangle size={28} />
                </div>

                <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 10px 0" }}>
                    {isTechnician ? "Abonnement entreprise expiré" : "Abonnement ou période d'essai expiré"}
                </h3>

                <p style={{ fontSize: "14px", color: "var(--muted-foreground, #64748b)", lineHeight: "1.5", margin: "0 0 24px 0" }}>
                    {modalData?.message || (isTechnician
                        ? "L'abonnement de votre entreprise a expiré. Veuillez contacter votre responsable ou dirigeant pour réactiver l'accès complet."
                        : "La période d'essai ou d'abonnement de votre société est expirée. Choisissez une offre pour réactiver l'accès complet à vos fonctionnalités CRM."
                    )}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {!isTechnician ? (
                        <>
                            <button
                                onClick={handleGoToBilling}
                                style={{
                                    width: "100%",
                                    padding: "12px 20px",
                                    backgroundColor: "#556B2F",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: "10px",
                                    fontWeight: 700,
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    boxShadow: "0 4px 12px rgba(85, 107, 47, 0.25)"
                                }}
                            >
                                <Star size={16} fill="currentColor" />
                                Voir les offres & Renouveler l'abonnement
                            </button>
                            
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    width: "100%",
                                    padding: "10px 20px",
                                    backgroundColor: "transparent",
                                    color: "var(--muted-foreground, #64748b)",
                                    border: "1px solid var(--border, #e2e8f0)",
                                    borderRadius: "10px",
                                    fontWeight: 600,
                                    fontSize: "13px",
                                    cursor: "pointer"
                                }}
                            >
                                Fermer
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                width: "100%",
                                padding: "12px 20px",
                                backgroundColor: "#0F172A",
                                color: "#FFFFFF",
                                border: "none",
                                borderRadius: "10px",
                                fontWeight: 700,
                                fontSize: "14px",
                                cursor: "pointer"
                            }}
                        >
                            Compris
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
