import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDragControls } from "framer-motion";
import { Plus, Trash, X, ChevronDown, ChevronRight, MoreHorizontal, Search, Eye, FileText, Check, Edit2, ArrowLeft, ZoomIn, ZoomOut, Palette } from "lucide-react";
import InterventionPickerModal from "../../components/InterventionPickerModal";
import EcheancePickerModal, { computeDueDate, getEcheanceLabel } from "../../components/EcheancePickerModal";
import MobileEditBottomSheet from "../../ClientPage/components/MobileEditBottomSheet";
import DesktopEditModal from "../../ClientPage/components/DesktopEditModal";
import { LegalHelpTooltip } from "../../components/LegalHelpModal";
import DocumentCustomizerModal from "../../components/DocumentCustomizerModal";
import { useDocumentCustomization } from "../../utils/documentCustomization";

const initialClientDetails = [
    { name: "Jane Doe", type: "Particulier", email: "jane.doe@email.com", address: "12 Rue des Fleurs, 75001 Paris" },
    { name: "John Doe", type: "Particulier", email: "john.doe@email.com", address: "45 Avenue Foch, 69006 Lyon" },
    { name: "Khalid Sainaro", type: "Particulier", email: "khalid@gmail.com", address: "8 Boulevard de l'Industrie, 44000 Nantes" },
    { name: "Martin Dupont", type: "Particulier", email: "martin.dupont@email.com", address: "12 Rue des Fleurs, 75001 Paris" },
    { name: "Sophie Bernard", type: "Particulier", email: "sophie.b@email.com", address: "45 Avenue Foch, 69006 Lyon" },
    { name: "Jean Moreau", type: "Particulier", email: "jean.moreau@email.com", address: "8 Boulevard de l'Industrie, 44000 Nantes" },
    { name: "Marie Dubois", type: "Particulier", email: "marie.dubois@email.com", address: "12 Rue des Fleurs, 75001 Paris" },
    { name: "Claire Laurent", type: "Particulier", email: "claire.laurent@email.com", address: "45 Avenue Foch, 69006 Lyon" },
    { name: "Pierre Leroy", type: "Particulier", email: "pierre.leroy@email.com", address: "8 Boulevard de l'Industrie, 44000 Nantes" },
    { name: "LexCorp", type: "Organisation", email: "contact@lexcorp.com", address: "Metropolis City" },
    { name: "Acme Corp", type: "Organisation", email: "billing@acme.com", address: "109 Rue Saint-Dizier, 54000 Nancy" },
    { name: "Dupont & Co", type: "Organisation", email: "dupontco@gmail.com", address: "12 Rue des Fleurs, 75001 Paris" },
    { name: "Bernard SA", type: "Organisation", email: "contact@bernard.sa", address: "45 Avenue Foch, 69006 Lyon" }
].sort((a, b) => a.name.localeCompare(b.name));

function NewInvoiceModal({ onClose, onCreateInvoice }) {
    // Determine screen size dynamically
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Wizard step state on mobile (1 to 4)
    const [step, setStep] = useState(1);

    // Grouped Clients list matching /planning
    const [clientDetails, setClientDetails] = useState(initialClientDetails);

    // Full Client Edit / New Client BottomSheet states
    const dragControlsMain = useDragControls();
    const dragControlsSub = useDragControls();
    const [editingClient, setEditingClient] = useState(null);
    const [activeSubSheet, setActiveSubSheet] = useState(null);
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editAddress, setEditAddress] = useState("");
    const [editComplAddress, setEditComplAddress] = useState("");
    const [editZip, setEditZip] = useState("");
    const [editCity, setEditCity] = useState("");
    const [editDiffDelivery, setEditDiffDelivery] = useState(false);
    const [editEquipModel, setEditEquipModel] = useState("");
    const [editEquipInstallDate, setEditEquipInstallDate] = useState("");
    const [editEquipSerial, setEditEquipSerial] = useState("");

    const handleOpenAddClient = () => {
        setShowClientSearch(false);
        setEditFirstName("");
        setEditLastName("");
        setEditPhone("");
        setEditEmail("");
        setEditAddress("");
        setEditComplAddress("");
        setEditZip("");
        setEditCity("");
        setEditDiffDelivery(false);
        setEditEquipModel("");
        setEditEquipInstallDate("");
        setEditEquipSerial("");
        setEditingClient({ isNew: true, isOrg: false });
        window.history.pushState({ modal: "nouveau-client" }, "");
    };

    const handleSaveNewClient = () => {
        const fullName = editingClient?.isOrg
            ? editFirstName.trim()
            : `${editFirstName} ${editLastName}`.trim();
        if (!fullName) return;

        const newClientObj = {
            name: fullName,
            type: editingClient?.isOrg ? "Organisation" : "Particulier",
            email: editEmail || `${editFirstName.toLowerCase().replace(/\s+/g, ".")}@email.com`,
            address: editAddress ? `${editAddress}, ${editZip} ${editCity}`.trim() : "Adresse personnalisée"
        };

        setClientDetails(prev => [...prev, newClientObj].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedClient(newClientObj);
        setEditingClient(null);
        setShowClientSearch(false);
        if (isMobile) {
            setStep(2);
        }
    };

    // Mock catalog for supplies matching Screenshot style
    const mockCatalog = [
        { id: "cat1", description: "Filtre climatisation Daikin", unitPrice: 25 },
        { id: "cat2", description: "Recharge Fluide R32 (1kg)", unitPrice: 85 },
        { id: "cat3", description: "Main d'œuvre Entretien (Heure)", unitPrice: 65 },
        { id: "cat4", description: "Frais de déplacement", unitPrice: 45 },
        { id: "cat5", description: "Condenseur climatisation", unitPrice: 420 }
    ].sort((a, b) => a.description.localeCompare(b.description));

    // Form states
    const [selectedClient, setSelectedClient] = useState(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
    const [echeanceOptionId, setEcheanceOptionId] = useState("30j");
    const [echeanceCustomDate, setEcheanceCustomDate] = useState("");
    const [showEcheancePicker, setShowEcheancePicker] = useState(false);
    const [hasDeliveryDate, setHasDeliveryDate] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState("");
    const [tvaRate, setTvaRate] = useState(20);
    const [internalNotes, setInternalNotes] = useState("");

    const calculatedDueDate = computeDueDate(invoiceDate, echeanceOptionId, echeanceCustomDate);
    const echeanceLabel = getEcheanceLabel(echeanceOptionId, echeanceCustomDate);

    // Supplies rows
    const [lines, setLines] = useState([
        { id: Date.now(), description: "", qty: 1, unitPrice: 0, reference: "", urssafCategory: "Vente de marchandises (BIC)", unit: "À l'unité" }
    ]);

    // Client Selector Modal portal states
    const [showClientSearch, setShowClientSearch] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [pendingClient, setPendingClient] = useState(null);

    // Supplies Catalog Selector Modal portal states
    const [showCatalogSearch, setShowCatalogSearch] = useState(false);
    const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
    const [activeLineId, setActiveLineId] = useState(null);
    const [pendingCatalogItem, setPendingCatalogItem] = useState(null);

    // Sub-form for creating a brand new catalog item inside the popup
    const [showNewCatalogItemForm, setShowNewCatalogItemForm] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [newItemPrice, setNewItemPrice] = useState("");

    // Article Editor / Creator Drawer States
    const [isEditingItem, setIsEditingItem] = useState(false);
    const [isCreatingItem, setIsCreatingItem] = useState(false);
    const [editingLineId, setEditingLineId] = useState(null);

    // Temporary form states for the active drawer
    const [tempName, setTempName] = useState("");
    const [tempReference, setTempReference] = useState("");
    const [tempPrice, setTempPrice] = useState("");
    const [tempQty, setTempQty] = useState(1);
    const [tempUrssafCategory, setTempUrssafCategory] = useState("Vente de marchandises (BIC)");
    const [tempUnit, setTempUnit] = useState("À l'unité");

    // Drag to close tracking
    const [dragStartY, setDragStartY] = useState(0);
    const [isDraggingHandle, setIsDraggingHandle] = useState(false);

    // Sub-drawers for selecting properties
    const [showUrssafSelector, setShowUrssafSelector] = useState(false);
    const [showUnitSelector, setShowUnitSelector] = useState(false);
    const [unitSearchQuery, setUnitSearchQuery] = useState("");

    // Sub-form for creating a new client on mobile
    const [showNewClientFormMobile, setShowNewClientFormMobile] = useState(false);
    const [newClientNameMobile, setNewClientNameMobile] = useState("");
    const [newClientEmailMobile, setNewClientEmailMobile] = useState("");

    // Mobile preview overlay toggle and zoom
    const [showMobilePreview, setShowMobilePreview] = useState(false);
    const [previewZoom, setPreviewZoom] = useState(0.5);
    const zoomInPreview = () => setPreviewZoom(prev => Math.min(1.5, Math.round((prev + 0.1) * 100) / 100));
    const zoomOutPreview = () => setPreviewZoom(prev => Math.max(0.3, Math.round((prev - 0.1) * 100) / 100));
    const resetZoomPreview = () => setPreviewZoom(0.5);

    // Disable scrolling when mobile preview modal is active
    useEffect(() => {
        if (showMobilePreview) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showMobilePreview]);

    // Intercept browser back button & iOS edge swipe gesture
    const historyStepPushedRef = React.useRef(0);

    useEffect(() => {
        window.history.pushState({ modal: "invoice-modal", step }, "");
        historyStepPushedRef.current += 1;

        const handlePopState = () => {
            if (historyStepPushedRef.current > 0) {
                historyStepPushedRef.current -= 1;
            }

            if (editingClient) {
                if (activeSubSheet) {
                    setActiveSubSheet(null);
                } else {
                    setEditingClient(null);
                    if (!isMobile) {
                        setShowClientSearch(true);
                    }
                }
                return;
            }

            if (showNewCatalogItemForm) {
                setShowNewCatalogItemForm(false);
                return;
            }
            if (showCatalogSearch) {
                setShowCatalogSearch(false);
                return;
            }
            if (showUrssafSelector) {
                setShowUrssafSelector(false);
                return;
            }
            if (showUnitSelector) {
                setShowUnitSelector(false);
                return;
            }
            if (isCreatingItem || isEditingItem) {
                setIsCreatingItem(false);
                setIsEditingItem(false);
                return;
            }
            if (showEcheancePicker) {
                setShowEcheancePicker(false);
                return;
            }
            if (showNewClientFormMobile) {
                setShowNewClientFormMobile(false);
                return;
            }
            if (showMobilePreview) {
                setShowMobilePreview(false);
                return;
            }

            if (step > 1) {
                setStep(prev => prev - 1);
                return;
            }

            onClose();
        };

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [step, editingClient, activeSubSheet, isMobile, showCatalogSearch, showNewCatalogItemForm, isCreatingItem, isEditingItem, showUrssafSelector, showUnitSelector, showEcheancePicker, showNewClientFormMobile, showMobilePreview]);

    const handleGoBack = () => {
        window.history.back();
    };

    // Totals calculation
    const [subtotalHt, setSubtotalHt] = useState(0);
    const [tvaAmount, setTvaAmount] = useState(0);
    const [totalTtc, setTotalTtc] = useState(0);

    useEffect(() => {
        // Exclude empty helper lines from recap HT calculations
        const validLines = lines.filter(l => l.description.trim() !== "");
        const sub = validLines.reduce((sum, line) => sum + (parseFloat(line.unitPrice) || 0) * (parseInt(line.qty) || 1), 0);
        const tva = sub * (tvaRate / 100);
        setSubtotalHt(sub);
        setTvaAmount(tva);
        setTotalTtc(sub + tva);
    }, [lines, tvaRate]);

    const handleAddLine = () => {
        setLines([...lines, { id: Date.now(), description: "", qty: 1, unitPrice: 0 }]);
    };

    const handleRemoveLine = (id) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const handleLineChange = (id, field, value) => {
        setLines(lines.map(line => {
            if (line.id === id) {
                return { ...line, [field]: value };
            }
            return line;
        }));
    };

    const handleStartEditLine = (line) => {
        setEditingLineId(line.id);
        setTempName(line.description || "");
        setTempReference(line.reference || "");
        setTempPrice(line.unitPrice !== undefined ? line.unitPrice.toString() : "0");
        setTempQty(line.qty || 1);
        setTempUrssafCategory(line.urssafCategory || "Vente de marchandises (BIC)");
        setTempUnit(line.unit || "À l'unité");
        setShowUrssafSelector(false);
        setShowUnitSelector(false);
        setIsEditingItem(true);
    };

    const handleStartCreateLine = (initialName = "") => {
        setEditingLineId(null);
        setTempName(initialName);
        setTempReference("");
        setTempPrice("");
        setTempQty(1);
        setTempUrssafCategory("Vente de marchandises (BIC)");
        setTempUnit("À l'unité");
        setShowUrssafSelector(false);
        setShowUnitSelector(false);
        setIsCreatingItem(true);
    };

    const handleSaveEditedLine = () => {
        if (!tempName.trim()) {
            alert("Veuillez saisir une désignation.");
            return;
        }
        setLines(lines.map(line => line.id === editingLineId ? {
            ...line,
            description: tempName,
            reference: tempReference,
            qty: tempQty,
            unitPrice: parseFloat(tempPrice) || 0,
            urssafCategory: tempUrssafCategory,
            unit: tempUnit
        } : line));
        setIsEditingItem(false);
        setEditingLineId(null);
    };

    const handleSaveCreatedLine = () => {
        if (!tempName.trim()) {
            alert("Veuillez saisir une désignation.");
            return;
        }
        const price = parseFloat(tempPrice) || 0;
        const newLine = {
            id: Date.now(),
            description: tempName,
            reference: tempReference,
            qty: tempQty,
            unitPrice: price,
            urssafCategory: tempUrssafCategory,
            unit: tempUnit
        };
        setLines([...lines.filter(l => l.description.trim() !== ""), newLine]);
        setIsCreatingItem(false);
        setShowCatalogSearch(false);
    };

    const getGroupedClients = (list) => {
        const grouped = {};
        list.forEach(c => {
            const letter = c.name.charAt(0).toUpperCase();
            if (!grouped[letter]) {
                grouped[letter] = [];
            }
            grouped[letter].push(c);
        });
        return grouped;
    };

    const getGroupedCatalog = (list) => {
        const grouped = {};
        list.forEach(item => {
            const letter = item.description.charAt(0).toUpperCase();
            if (!grouped[letter]) {
                grouped[letter] = [];
            }
            grouped[letter].push(item);
        });
        return grouped;
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!selectedClient) {
            alert("Veuillez sélectionner un client.");
            return;
        }

        const validLines = lines.filter(l => (l.description || "").trim() !== "");
        if (validLines.length === 0) {
            alert("Veuillez ajouter au moins une prestation ou fourniture.");
            return;
        }

        const newInvoice = {
            id: Date.now(),
            clientName: selectedClient.name,
            clientEmail: selectedClient.email || "",
            clientAddress: selectedClient.address || "",
            date: invoiceDate,
            dueDate: calculatedDueDate,
            echeanceOptionId: echeanceOptionId,
            echeanceCustomDate: echeanceCustomDate,
            deliveryDate: hasDeliveryDate && deliveryDate ? deliveryDate : null,
            paymentConditions: echeanceLabel,
            tvaRate: tvaRate || 20,
            internalNotes: internalNotes || "",
            lines: validLines.map(l => ({
                description: l.description,
                qty: parseInt(l.qty) || 1,
                unitPrice: parseFloat(l.unitPrice) || 0,
                reference: l.reference || "",
                unit: l.unit || "À l'unité",
                urssafCategory: l.urssafCategory || "Vente de marchandises (BIC)"
            })),
            subtotalHt: subtotalHt,
            tvaAmount: tvaAmount,
            totalTtc: totalTtc,
            status: "pending"
        };

        onCreateInvoice(newInvoice);
    };

    const renderInvoiceLivePreviewSheet = () => (
        <div className="live-preview-a4-wrapper">
            <div
                className="live-preview-a4-sheet"
                style={{
                    backgroundColor: docCustomization.bgColor || '#FFFFFF',
                    color: docCustomization.textColor || '#1A1A1A',
                    fontSize: docCustomization.fontSize || '9pt',
                    fontFamily: docCustomization.fontFamily || 'Inter, sans-serif'
                }}
            >
                {docCustomization.structure === 'banner' && (
                    <div style={{ height: '8px', backgroundColor: docCustomization.primaryColor || '#556B2F', margin: '-24px -20px 14px -20px', borderRadius: '2px 2px 0 0' }} />
                )}

                <div className="pdf-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12pt' }}>
                    <div className="pdf-header-left" style={{ flex: 1 }}>
                        {docCustomization.showLogo && docCustomization.logoPosition !== 'right' && (
                            <div
                                className="pdf-logo-stub"
                                style={{
                                    fontSize: '11pt',
                                    padding: '4pt 8pt',
                                    height: `${docCustomization.logoSize || 45}px`,
                                    minWidth: `${(docCustomization.logoSize || 45) * 1.8}px`,
                                    backgroundColor: docCustomization.primaryColor || '#556B2F',
                                    color: '#FFF',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    borderRadius: '4px',
                                    marginBottom: '6pt'
                                }}
                            >
                                <span>CLIMPRO</span>
                            </div>
                        )}
                        <h3 className="company-name" style={{ fontSize: '10pt', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 700 }}>Dupont Climatisation</h3>
                        <p className="company-details" style={{ fontSize: '8pt', lineHeight: 1.3, margin: '2pt 0 0 0' }}>
                            {docCustomization.showAddress && <span>88 Rue de l'Aviation, 75015 Paris<br /></span>}
                            {docCustomization.showSiret && <span>SIRET : 849 203 103 00021<br /></span>}
                            {docCustomization.showPhone && <span>Tél : 06 51 60 43 16<br /></span>}
                            {docCustomization.showEmail && <span>Email : contact@climpro.fr</span>}
                        </p>
                    </div>
                    <div className="pdf-header-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                        {docCustomization.showLogo && docCustomization.logoPosition === 'right' && (
                            <div
                                className="pdf-logo-stub"
                                style={{
                                    fontSize: '11pt',
                                    padding: '4pt 8pt',
                                    height: `${docCustomization.logoSize || 45}px`,
                                    minWidth: `${(docCustomization.logoSize || 45) * 1.8}px`,
                                    backgroundColor: docCustomization.primaryColor || '#556B2F',
                                    color: '#FFF',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    borderRadius: '4px',
                                    marginBottom: '6pt'
                                }}
                            >
                                <span>CLIMPRO</span>
                            </div>
                        )}
                        <h1 className="doc-type-label" style={{ fontSize: '18pt', marginBottom: '4pt', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 800 }}>FACTURE</h1>
                        <table className="doc-meta-table" style={{ fontSize: '8pt' }}>
                            <tbody>
                                <tr>
                                    <td><strong>Numéro :</strong></td>
                                    <td>INV-2026-TEMP</td>
                                </tr>
                                <tr>
                                    <td><strong>Date d'émission :</strong></td>
                                    <td>{new Date(invoiceDate).toLocaleDateString("fr-FR")}</td>
                                </tr>
                                <tr>
                                    <td><strong>Date d'exigibilité :</strong></td>
                                    <td>{new Date(calculatedDueDate).toLocaleDateString("fr-FR")}</td>
                                </tr>
                                {docCustomization.showDeliveryDate && deliveryDate && (
                                    <tr>
                                        <td><strong>Date de livraison :</strong></td>
                                        <td>{new Date(deliveryDate).toLocaleDateString("fr-FR")}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div
                    className="pdf-billing-section"
                    style={{
                        margin: '10pt 0',
                        padding: '8pt 10pt',
                        backgroundColor: docCustomization.structure === 'modern' ? `${docCustomization.primaryColor || '#556B2F'}10` : '#FAFAF8',
                        borderRadius: '6px'
                    }}
                >
                    <div className="billing-to-card">
                        <span className="section-label" style={{ fontSize: '7.5pt', fontWeight: 700, opacity: 0.6 }}>FACTURÉ À :</span>
                        <h4 className="client-name" style={{ fontSize: '10pt', fontWeight: 700, margin: '2pt 0' }}>{selectedClient ? selectedClient.name : "Aucun client sélectionné"}</h4>
                        <p className="client-details" style={{ fontSize: '8.5pt', opacity: 0.85, margin: 0 }}>
                            {selectedClient ? selectedClient.address : "Adresse non définie"}<br />
                            {selectedClient ? selectedClient.email : ""}
                        </p>
                    </div>
                </div>

                <table className="pdf-items-table" style={{ fontSize: '8.5pt', marginBottom: '15pt' }}>
                    <thead style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '6pt 8pt' }}>Description</th>
                            <th className="text-center" style={{ width: '40px', padding: '6pt', whiteSpace: 'nowrap' }}>Qté</th>
                            <th className="text-right" style={{ minWidth: '75px', padding: '6pt 8pt', whiteSpace: 'nowrap' }}>Unit. HT</th>
                            <th className="text-right" style={{ minWidth: '75px', padding: '6pt 8pt', whiteSpace: 'nowrap' }}>Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.filter(l => l.description.trim() !== "").map((line, idx) => (
                            <tr key={idx}>
                                <td>{line.description || "—"}</td>
                                <td className="text-center" style={{ whiteSpace: 'nowrap' }}>{line.qty}</td>
                                <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{(line.unitPrice || 0).toLocaleString("fr-FR")} €</td>
                                <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{((line.unitPrice || 0) * (line.qty || 1)).toLocaleString("fr-FR")} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="pdf-summary-block" style={{ marginBottom: '15pt' }}>
                    <table className="pdf-summary-table" style={{ fontSize: '8.5pt', width: 'auto', minWidth: '180pt' }}>
                        <tbody>
                            <tr>
                                <td style={{ whiteSpace: 'nowrap', padding: '3pt 6pt' }}>Sous-total HT :</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '3pt 6pt' }}>{subtotalHt.toLocaleString("fr-FR")} €</td>
                            </tr>
                            <tr>
                                <td style={{ whiteSpace: 'nowrap', padding: '3pt 6pt' }}>TVA ({tvaRate}%) :</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '3pt 6pt' }}>{tvaAmount.toLocaleString("fr-FR")} €</td>
                            </tr>
                            <tr className="grand-total-row" style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                                <td style={{ whiteSpace: 'nowrap', padding: '6pt 8pt' }}><strong>TOTAL TTC :</strong></td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '6pt 8pt' }}><strong>{totalTtc.toLocaleString("fr-FR")} €</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {docCustomization.showPaymentConditions && (
                    <div className="pdf-footer-section" style={{ fontSize: '7.5pt', paddingTop: '8pt', borderTop: '1px solid #E0E0E0', marginTop: '12pt', display: 'flex', flexDirection: 'column', gap: '4pt' }}>
                        <div><strong>Conditions de paiement :</strong> Paiement {echeanceLabel} (Échéance le {new Date(calculatedDueDate).toLocaleDateString("fr-FR")})</div>
                        {docCustomization.showIban && <span>IBAN: FR76 3000 6000 0123 4567 8901 234</span>}
                        {docCustomization.showAgaMention && <div style={{ fontStyle: 'italic', marginTop: '2pt' }}>Membre d'une association agréée, le règlement par chèque est accepté.</div>}
                    </div>
                )}
            </div>
        </div>
    );

    // ── MOBILE WIZARD INTERFACE ────────────────────────────────────────
    if (isMobile) {
        return createPortal(
            <div className="mobile-preview-full-overlay" style={{ backgroundColor: 'var(--background)' }}>

                {/* Progress Header matching screenshot layout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                    <button
                        type="button"
                        onClick={handleGoBack}
                        style={{ border: 'none', background: 'var(--muted)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground)' }}
                    >
                        <ArrowLeft size={18} />
                    </button>

                    {/* 3 Segments Progress bar matching screenshot */}
                    <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: step >= 1 ? '#556B2F' : 'var(--border)', transition: 'background-color 0.2s' }}></div>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: step >= 2 ? '#556B2F' : 'var(--border)', transition: 'background-color 0.2s' }}></div>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: step >= 3 ? '#556B2F' : 'var(--border)', transition: 'background-color 0.2s' }}></div>
                    </div>

                    {step > 1 && (
                        <button
                            type="button"
                            onClick={() => setShowMobilePreview(true)}
                            style={{ border: 'none', background: 'var(--muted)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground)' }}
                        >
                            <Eye size={18} />
                        </button>
                    )}
                </div>

                {/* Main Steps Content container */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>

                    {/* STEP 1: Client selection */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>Quel client facturer ?</h2>
                                <LegalHelpTooltip lawArticle="art. 289 CGI & Décret 2026" title="Obligations Client Facture" text="Chaque facture B2B doit comporter l'identité complète du client et son numéro SIREN (réforme facturation électronique 2026)." />
                            </div>

                            <div className="client-search-input-wrapper" style={{ marginBottom: '12px' }}>
                                <Search size={18} className="client-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Nom ou entreprise..."
                                    value={clientSearchQuery}
                                    onChange={(e) => setClientSearchQuery(e.target.value)}
                                    className="client-search-input"
                                    style={{ color: 'var(--foreground)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', paddingRight: '2px', paddingBottom: '16px' }}>
                                {Object.entries(
                                    getGroupedClients(
                                        clientDetails.filter(c =>
                                            c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
                                        )
                                    )
                                ).map(([letter, list]) => (
                                    <div key={letter} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', paddingLeft: '4px' }}>{letter}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {list.map(c => {
                                                const isSelected = selectedClient && selectedClient.name === c.name;
                                                return (
                                                    <div
                                                        key={c.name}
                                                        onClick={() => {
                                                            setSelectedClient(c);
                                                            setStep(2);
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            backgroundColor: 'var(--card)',
                                                            border: isSelected ? '2px solid #556B2F' : '1px solid var(--border)',
                                                            borderRadius: '12px',
                                                            padding: '16px',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--foreground)' }}>{c.name}</span>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 800,
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            backgroundColor: c.type === 'Particulier' ? 'rgba(85, 107, 47, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                                                            color: c.type === 'Particulier' ? '#556B2F' : '#3b82f6'
                                                        }}>
                                                            {c.type === "Particulier" ? "Particulier test" : "Organisation test"}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Fixed bottom button for step 1 */}
                            <div style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--background)', paddingTop: '12px', paddingBottom: '16px', borderTop: '1px solid var(--border)', zIndex: 10, marginTop: 'auto' }}>
                                <button
                                    type="button"
                                    onClick={handleOpenAddClient}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: '#556B2F',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(85, 107, 47, 0.25)'
                                    }}
                                >
                                    Ajouter un client
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Items manager */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--foreground)' }}>Articles</h2>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', marginLeft: '8px' }}>Article test</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setActiveLineId(null);
                                    setCatalogSearchQuery("");
                                    setPendingCatalogItem(null);
                                    setShowCatalogSearch(true);
                                }}
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    backgroundColor: 'var(--card)',
                                    border: '1px dashed #556B2F',
                                    color: '#556B2F',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Plus size={16} /> Ajouter un article
                            </button>

                            {/* Render lines list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {lines.filter(l => l.description.trim() !== "").map((line, idx) => {
                                    const getUnitSuffix = (u) => {
                                        if (!u || u === "Aucune") return "";
                                        const sufs = {
                                            "À l'unité": "/ unité",
                                            "À l'heure": "/ heure",
                                            "À la journée": "/ jour",
                                            "À la semaine": "/ semaine",
                                            "À l'année": "/ an",
                                            "Au gramme": "/ g",
                                            "Au forfait": "/ forfait",
                                            "Au caractère": "/ caractère",
                                            "À la ligne": "/ ligne"
                                        };
                                        return sufs[u] || ` / ${u}`;
                                    };
                                    return (
                                        <div
                                            key={line.id}
                                            onClick={() => handleStartEditLine(line)}
                                            onTouchEnd={(e) => {
                                                if (e.target === e.currentTarget) {
                                                    handleStartEditLine(line);
                                                }
                                            }}
                                            style={{
                                                backgroundColor: 'var(--card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '12px',
                                                padding: '16px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                touchAction: 'manipulation'
                                            }}
                                        >
                                            <div>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 700 }}>Article {idx + 1}</span>
                                                <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '2px 0', color: 'var(--foreground)' }}>{line.description}</h4>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                                    {/* Qty controller inputs */}
                                                    <input
                                                        type="number"
                                                        value={line.qty}
                                                        onChange={(e) => handleLineChange(line.id, "qty", parseInt(e.target.value) || 1)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onTouchEnd={(e) => e.stopPropagation()}
                                                        style={{ width: '45px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.9rem', padding: '2px', backgroundColor: 'var(--background)', color: 'var(--foreground)', cursor: 'text', pointerEvents: 'auto' }}
                                                        min="1"
                                                    />
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                                        × {line.unitPrice} € HT {getUnitSuffix(line.unit)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '0.95rem' }}>{(line.qty * line.unitPrice).toLocaleString("fr-FR")} € HT</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveLine(line.id);
                                                    }}
                                                    onTouchEnd={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveLine(line.id);
                                                    }}
                                                    style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', pointerEvents: 'auto' }}
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* General recap matching screenshot */}
                            <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--muted-foreground)' }}>
                                    <span>Remise générale</span>
                                    <span>0 €</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px' }}>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', color: 'var(--foreground)' }}>Total</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                        <span>Total HT</span>
                                        <span>{subtotalHt.toLocaleString("fr-FR")} €</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                                        <span>Remise générale</span>
                                        <span>0,00 €</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, marginTop: '8px', color: 'var(--foreground)' }}>
                                        <span>Total HT final</span>
                                        <span>{subtotalHt.toLocaleString("fr-FR")} €</span>
                                    </div>
                                </div>
                            </div>

                            {/* Continuer & Draft buttons footer */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '16px', paddingBottom: '32px' }}>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: '#556B2F',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Continuer
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: 'var(--card)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--foreground)',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Enregistrer en brouillon
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Date, TVA and Description picker */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--foreground)' }}>Quand facturer ?</h2>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', marginLeft: '8px' }}>Article test</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Date picker row */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Date de la facture</label>
                                    <input
                                        type="date"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                        style={{ borderRadius: '12px', borderColor: 'var(--border)', border: '1px solid var(--border)', width: '100%', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)', padding: '8px', outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {/* Mandatory Date d'échéance picker trigger */}
                                <div
                                    onClick={() => setShowEcheancePicker(true)}
                                    style={{ backgroundColor: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Date d'échéance*</label>
                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)' }}>
                                            {echeanceLabel} ({new Date(calculatedDueDate).toLocaleDateString('fr-FR')})
                                        </span>
                                    </div>
                                    <ChevronRight size={20} style={{ color: 'var(--muted-foreground)' }} />
                                </div>

                                {/* Optional Date de livraison */}
                                {!hasDeliveryDate ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHasDeliveryDate(true);
                                            setDeliveryDate(invoiceDate);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '14px',
                                            borderRadius: '12px',
                                            border: '1.5px dashed #556B2F',
                                            backgroundColor: 'rgba(85, 107, 47, 0.05)',
                                            color: '#556B2F',
                                            fontWeight: 700,
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            width: '100%'
                                        }}
                                    >
                                        <Plus size={16} /> Ajouter une date de livraison
                                    </button>
                                ) : (
                                    <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Date de livraison</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setHasDeliveryDate(false);
                                                    setDeliveryDate("");
                                                }}
                                                style={{ border: 'none', background: 'none', color: 'var(--destructive)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                                            >
                                                <Trash size={14} /> Supprimer
                                            </button>
                                        </div>
                                        <input
                                            type="date"
                                            value={deliveryDate}
                                            onChange={(e) => setDeliveryDate(e.target.value)}
                                            style={{ borderRadius: '12px', borderColor: 'var(--border)', border: '1px solid var(--border)', width: '100%', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)', padding: '8px', outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Footer continue button */}
                            <div style={{ marginTop: 'auto', paddingTop: '16px', paddingBottom: '32px' }}>
                                <button
                                    type="button"
                                    onClick={() => setStep(4)}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: '#556B2F',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Continuer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Final recap sheet */}
                    {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--foreground)' }}>Récapitulatif</h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Client summary card */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 700 }}>Client</span>
                                    <h4 style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '4px', color: 'var(--foreground)' }}>{selectedClient?.name || "Client non défini"}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>{selectedClient?.email || ""}</p>
                                    <button type="button" onClick={() => setStep(1)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: '#556B2F', cursor: 'pointer' }}>
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                {/* Date / Échéance summary card */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 700 }}>Dates & Échéance</span>
                                    <div style={{ marginTop: '6px', color: 'var(--foreground)' }}>
                                        <span style={{ fontSize: '0.85rem', display: 'block' }}>Date d'émission : <strong>{invoiceDate ? new Date(invoiceDate).toLocaleDateString("fr-FR") : "—"}</strong></span>
                                        <span style={{ fontSize: '0.85rem', display: 'block', marginTop: '2px' }}>Date d'exigibilité : <strong>{new Date(calculatedDueDate).toLocaleDateString("fr-FR")}</strong></span>
                                        {hasDeliveryDate && deliveryDate && (
                                            <span style={{ fontSize: '0.85rem', display: 'block', marginTop: '2px' }}>Date de livraison : <strong>{new Date(deliveryDate).toLocaleDateString("fr-FR")}</strong></span>
                                        )}
                                        <span style={{ fontSize: '0.85rem', display: 'block', marginTop: '2px' }}>Conditions : <strong>{echeanceLabel}</strong></span>
                                    </div>
                                    <button type="button" onClick={() => setStep(3)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: '#556B2F', cursor: 'pointer' }}>
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                {/* Items summary card */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 700 }}>Articles</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', color: 'var(--foreground)' }}>
                                        {lines.filter(l => (l.description || "").trim() !== "").map(line => (
                                            <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                <span style={{ flex: 1 }}>{line.description} (x{line.qty})</span>
                                                <span style={{ fontWeight: 700 }}>{(line.qty * line.unitPrice).toLocaleString("fr-FR")} € HT</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => setStep(2)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: '#556B2F', cursor: 'pointer' }}>
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                {/* Recap sums card */}
                                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                        <span>Sous-total HT :</span>
                                        <span>{subtotalHt.toLocaleString("fr-FR")} €</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                                        <span>TVA ({tvaRate || 20}%) :</span>
                                        <span>{tvaAmount.toLocaleString("fr-FR")} €</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, marginTop: '8px', color: 'var(--foreground)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                                        <span>TOTAL TTC :</span>
                                        <span>{totalTtc.toLocaleString("fr-FR")} €</span>
                                    </div>
                                </div>
                            </div>

                            {/* Final validation button */}
                            <div style={{ marginTop: 'auto', paddingTop: '16px', paddingBottom: '32px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleSubmit()}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: '#556B2F',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Créer la facture
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Mobile Preview Portal */}
                {showMobilePreview && (
                    <div className="mobile-preview-full-overlay">
                        <div className="mobile-preview-header">
                            <h3>Aperçu Facture</h3>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--muted)', padding: '2px 8px', borderRadius: '8px' }}>
                                <button type="button" className="top-btn" onClick={zoomOutPreview} title="Уменьшить" style={{ padding: '4px 6px', border: 'none', background: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>
                                    <ZoomOut size={16} />
                                </button>
                                <button type="button" className="top-btn" onClick={resetZoomPreview} style={{ fontSize: '0.8rem', fontWeight: 800, minWidth: '42px', textAlign: 'center', padding: '4px 2px', border: 'none', background: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>
                                    {Math.round(previewZoom * 100)}%
                                </button>
                                <button type="button" className="top-btn" onClick={zoomInPreview} title="Приблизить" style={{ padding: '4px 6px', border: 'none', background: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>
                                    <ZoomIn size={16} />
                                </button>
                            </div>

                            <button className="top-btn close-x" onClick={() => setShowMobilePreview(false)}><X size={20} /></button>
                        </div>
                        <div className="mobile-preview-body">
                            <div style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center', marginBottom: `calc(-1 * (735px * (1 - ${previewZoom})))`, transition: 'transform 0.15s ease-out' }}>
                                {renderInvoiceLivePreviewSheet()}
                            </div>
                        </div>
                        <div className="mobile-preview-actions">
                            <button className="cancel-btn" onClick={() => setShowMobilePreview(false)}>Fermer</button>
                        </div>
                    </div>
                )}

                {/* Sub-form modal to add new client directly on mobile */}
                {showNewClientFormMobile && createPortal(
                    <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) setShowNewClientFormMobile(false); }}>
                        <div className="client-search-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ padding: '6px', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', borderRadius: '6px', display: 'inline-flex' }}>
                                    <Plus size={16} />
                                </div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Ajouter un nouveau client</h3>
                            </div>

                            <div className="form-field">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Nom / Entreprise*</label>
                                <input
                                    type="text"
                                    className="profile-input"
                                    placeholder="Ex: Sophie Bernard"
                                    value={newClientNameMobile}
                                    onChange={(e) => setNewClientNameMobile(e.target.value)}
                                    style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>E-mail du client*</label>
                                <input
                                    type="email"
                                    className="profile-input"
                                    placeholder="Ex: sophie.b@email.com"
                                    value={newClientEmailMobile}
                                    onChange={(e) => setNewClientEmailMobile(e.target.value)}
                                    style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    className="client-search-confirm-btn"
                                    style={{ flex: 2, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => {
                                        if (!newClientNameMobile.trim()) {
                                            alert("Veuillez saisir un nom.");
                                            return;
                                        }
                                        const nClient = {
                                            name: newClientNameMobile,
                                            type: "Particulier",
                                            email: newClientEmailMobile || `${newClientNameMobile.toLowerCase().replace(" ", ".")}@email.com`,
                                            address: "Adresse par défaut"
                                        };
                                        setSelectedClient(nClient);
                                        setShowNewClientFormMobile(false);
                                        setNewClientNameMobile("");
                                        setNewClientEmailMobile("");
                                        setStep(2);
                                    }}
                                >
                                    Créer et sélectionner
                                </button>
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    style={{ flex: 1, height: '42px', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
                                    onClick={() => setShowNewClientFormMobile(false)}
                                >
                                    Retour
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* ARTICLE EDIT/CREATE DRAWER PORTAL - MOBILE */}
                {(isEditingItem || isCreatingItem) && createPortal(
                    <div className="article-drawer-overlay" onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsEditingItem(false);
                            setIsCreatingItem(false);
                        }
                    }}>
                        <div className="article-drawer-content" onClick={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => {
                                if (!isDraggingHandle) return;
                                const dragEndY = e.changedTouches[0].clientY;
                                if (dragEndY - dragStartY > 80) {
                                    setIsEditingItem(false);
                                    setIsCreatingItem(false);
                                }
                                setIsDraggingHandle(false);
                            }}
                        >
                            <div
                                className="bottom-sheet-drag-handle"
                                onTouchStart={(e) => {
                                    setDragStartY(e.touches[0].clientY);
                                    setIsDraggingHandle(true);
                                }}
                            />

                            <div className="article-drawer-header">
                                <button
                                    type="button"
                                    className="drawer-round-btn"
                                    onClick={() => {
                                        setIsEditingItem(false);
                                        setIsCreatingItem(false);
                                    }}
                                >
                                    <X size={20} />
                                </button>
                                <h2>{isEditingItem ? "Modifier l'article" : "Créer un nouvel article"}</h2>
                                <button type="button" className="drawer-round-btn" style={{ opacity: 0.7 }}>
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>

                            <div className="article-drawer-body">
                                {/* Nom et référence group */}
                                <div>
                                    <div className="article-drawer-group-title">Nom et référence</div>
                                    <div className="article-drawer-group-card">
                                        <div className="article-drawer-field">
                                            <label className="article-drawer-label">Désignation*</label>
                                            <input
                                                type="text"
                                                className="article-drawer-input"
                                                placeholder="Ex: Main d'œuvre diagnostic"
                                                value={tempName}
                                                onChange={(e) => setTempName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="article-drawer-field">
                                            <label className="article-drawer-label">Référence</label>
                                            <input
                                                type="text"
                                                className="article-drawer-input"
                                                placeholder="Ex: REF-001"
                                                value={tempReference}
                                                onChange={(e) => setTempReference(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Prix et configuration group */}
                                <div>
                                    <div className="article-drawer-group-title">Tarification & Déclaration</div>
                                    <div className="article-drawer-group-card">
                                        <div className="article-drawer-field">
                                            <label className="article-drawer-label">Prix unitaire HT (€)*</label>
                                            <input
                                                type="number"
                                                className="article-drawer-input"
                                                placeholder="Ex: 85"
                                                value={tempPrice}
                                                onChange={(e) => setTempPrice(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="article-drawer-field">
                                            <label className="article-drawer-label">Type d'article (URSSAF)</label>
                                            <div
                                                className="article-drawer-trigger"
                                                onClick={() => setShowUrssafSelector(true)}
                                            >
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tempUrssafCategory}</span>
                                                <ChevronRight size={18} style={{ color: 'var(--muted-foreground)' }} />
                                            </div>
                                        </div>

                                        <div className="article-drawer-field">
                                            <label className="article-drawer-label">Unité de facturation</label>
                                            <div
                                                className="article-drawer-trigger"
                                                onClick={() => setShowUnitSelector(true)}
                                            >
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tempUnit}</span>
                                                <span className="article-drawer-trigger-value">
                                                    {tempUnit !== "Aucune" ? `/ ${tempUnit.replace("À l'", "").replace("À la ", "").replace("Au ", "").replace("À ", "")}` : ""}
                                                </span>
                                            </div>
                                        </div>

                                        {(isEditingItem || isCreatingItem) && (
                                            <div className="article-drawer-field">
                                                <label className="article-drawer-label">Quantité</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--background)', borderRadius: '8px', padding: '8px', border: '1px solid var(--border)' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTempQty(Math.max(1, tempQty - 1))}
                                                        style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={tempQty}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 1;
                                                            setTempQty(Math.max(1, val));
                                                        }}
                                                        style={{ flex: 1, textAlign: 'center', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--foreground)', fontWeight: 800, fontSize: '1rem', outline: 'none', padding: '8px' }}
                                                        min="1"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setTempQty(tempQty + 1)}
                                                        style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', backgroundColor: '#556B2F', color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="article-drawer-footer">
                                <button
                                    type="button"
                                    className="drawer-primary-btn"
                                    onClick={isEditingItem ? handleSaveEditedLine : handleSaveCreatedLine}
                                >
                                    {isEditingItem ? "Enregistrer les modifications" : "Confirmer et ajouter"}
                                </button>
                                {isEditingItem && (
                                    <button
                                        type="button"
                                        className="drawer-danger-btn"
                                        onClick={() => {
                                            handleRemoveLine(editingLineId);
                                            setIsEditingItem(false);
                                        }}
                                    >
                                        Supprimer l'article
                                    </button>
                                )}
                            </div>

                            {/* NESTED URSSAF SELECTOR */}
                            {showUrssafSelector && (
                                <div className="selector-subsheet">
                                    <div className="article-drawer-header">
                                        <button
                                            type="button"
                                            className="drawer-round-btn"
                                            onClick={() => setShowUrssafSelector(false)}
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <h2>Type d'article</h2>
                                        <button
                                            type="button"
                                            className="drawer-round-btn"
                                            style={{ opacity: 0 }}
                                        />
                                    </div>
                                    <div style={{ padding: '14px 20px 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                        Détermine la catégorie de votre déclaration URSSAF.
                                    </div>
                                    <div className="selector-options-list">
                                        {[
                                            "Vente de marchandises (BIC)",
                                            "Prestations de services (BNC)",
                                            "Prestations de services artisanales ou commerciales (BIC)",
                                            "Vente de produits fabriqués (BIC)",
                                            "Débours"
                                        ].map((cat) => {
                                            const isSelected = tempUrssafCategory === cat;
                                            return (
                                                <div
                                                    key={cat}
                                                    className={`selector-option-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setTempUrssafCategory(cat);
                                                        setShowUrssafSelector(false);
                                                    }}
                                                >
                                                    <div className="option-details">
                                                        <span className="option-title">{cat}</span>
                                                    </div>
                                                    <div className="option-radio">
                                                        <div className="option-radio-inner" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* NESTED UNIT SELECTOR */}
                            {showUnitSelector && (
                                <div className="selector-subsheet">
                                    <div className="article-drawer-header">
                                        <button
                                            type="button"
                                            className="drawer-round-btn"
                                            onClick={() => setShowUnitSelector(false)}
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <h2>Unité de facturation</h2>
                                        <button
                                            type="button"
                                            className="drawer-round-btn"
                                            style={{ opacity: 0 }}
                                        />
                                    </div>
                                    <div className="selector-options-list">
                                        {[
                                            "À l'unité",
                                            "À l'heure",
                                            "À la journée",
                                            "À la semaine",
                                            "À l'année",
                                            "Au gramme",
                                            "Au forfait",
                                            "Au caractère",
                                            "À la ligne",
                                            "Aucune"
                                        ].map((unit) => {
                                            const isSelected = tempUnit === unit;
                                            return (
                                                <div
                                                    key={unit}
                                                    className={`selector-option-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setTempUnit(unit);
                                                        setShowUnitSelector(false);
                                                    }}
                                                >
                                                    <div className="option-details">
                                                        <span className="option-title">{unit}</span>
                                                    </div>
                                                    <div className="option-radio">
                                                        <div className="option-radio-inner" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}

                {/* Full Screen Catalog search portal matching planning style */}
                {showCatalogSearch && createPortal(
                    <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) setShowCatalogSearch(false); }}>
                        <div className="client-search-panel">
                            <div className="client-search-header">
                                <button type="button" className="client-search-back-btn" onClick={() => setShowCatalogSearch(false)}><X size={22} /></button>
                                <h3>Sélectionner un article / service</h3>
                                <div style={{ width: 34 }}></div>
                            </div>

                            {showNewCatalogItemForm ? (
                                <div className="new-catalog-item-form-wrapper" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, backgroundColor: 'var(--card)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <div style={{ padding: '6px', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', borderRadius: '6px', display: 'inline-flex' }}>
                                            <Plus size={16} />
                                        </div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Créer un nouvel article</h3>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nom de l'article / service*</label>
                                        <input
                                            type="text"
                                            className="profile-input"
                                            placeholder="Ex: Main d'œuvre diagnostic"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                            required
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prix unitaire HT (€)*</label>
                                        <input
                                            type="number"
                                            className="profile-input"
                                            placeholder="Ex: 85"
                                            value={newItemPrice}
                                            onChange={(e) => setNewItemPrice(e.target.value)}
                                            style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                                        <button
                                            type="button"
                                            className="client-search-confirm-btn"
                                            style={{ flex: 2, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => {
                                                if (!newItemName.trim()) {
                                                    alert("Veuillez saisir un nom.");
                                                    return;
                                                }
                                                const price = parseFloat(newItemPrice) || 0;
                                                // Append to lines
                                                setLines([...lines.filter(l => l.description.trim() !== ""), { id: Date.now(), description: newItemName, qty: 1, unitPrice: price }]);
                                                setShowCatalogSearch(false);
                                                setCatalogSearchQuery("");
                                                setNewItemName("");
                                                setNewItemPrice("");
                                                setShowNewCatalogItemForm(false);
                                            }}
                                        >
                                            Confirmer et ajouter
                                        </button>
                                        <button
                                            type="button"
                                            className="cancel-btn"
                                            style={{ flex: 1, height: '42px', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
                                            onClick={() => setShowNewCatalogItemForm(false)}
                                        >
                                            Retour
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="client-search-bar-container">
                                        <div className="client-search-input-wrapper">
                                            <Search size={18} className="client-search-icon" />
                                            <input
                                                type="text"
                                                placeholder="Nom de la fourniture ou prestation..."
                                                value={catalogSearchQuery}
                                                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                                                className="client-search-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="client-search-list-container">
                                        {Object.entries(
                                            getGroupedCatalog(
                                                mockCatalog.filter(item =>
                                                    item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase())
                                                )
                                            )
                                        ).map(([letter, list]) => (
                                            <div key={letter} className="client-search-group">
                                                <span className="client-search-group-letter">{letter}</span>
                                                <div className="client-search-group-items">
                                                    {list.map(item => {
                                                        const isSelected = pendingCatalogItem && pendingCatalogItem.id === item.id;
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className={`client-search-item ${isSelected ? 'selected' : ''}`}
                                                                onClick={() => {
                                                                    // Directly add item to lines and close
                                                                    setLines([...lines.filter(l => l.description.trim() !== ""), { id: Date.now(), description: item.description, qty: 1, unitPrice: item.unitPrice, reference: "", urssafCategory: "Vente de marchandises (BIC)", unit: "À l'unité" }]);
                                                                    setShowCatalogSearch(false);
                                                                    setCatalogSearchQuery("");
                                                                    setPendingCatalogItem(null);
                                                                }}
                                                            >
                                                                <span className="client-item-name">{item.description}</span>
                                                                <span className="catalog-price-badge">
                                                                    {item.unitPrice} € HT
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                        {mockCatalog.filter(item =>
                                            item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase())
                                        ).length === 0 && (
                                                <div className="client-search-empty">
                                                    <span>Aucun article ne correspond à votre recherche</span>
                                                </div>
                                            )}
                                    </div>

                                    <div className="client-search-footer" style={{ gap: '8px' }}>
                                        <button
                                            type="button"
                                            className="client-search-add-btn secondary"
                                            onClick={() => {
                                                setShowCatalogSearch(false);
                                                setCatalogSearchQuery("");
                                                setPendingCatalogItem(null);
                                                // small delay so catalog closes first, then drawer opens
                                                setTimeout(() => handleStartCreateLine(""), 50);
                                            }}
                                        >
                                            + Créer un article
                                        </button>
                                    </div>
                                </>
                            )}

                        </div>
                    </div>,
                    document.body
                )}

                {/* Full Client Edit / New Client Portal Sheet (Mobile) */}
                {editingClient && (
                    <MobileEditBottomSheet
                        editingClient={editingClient}
                        setEditingClient={setEditingClient}
                        editFirstName={editFirstName}
                        setEditFirstName={setEditFirstName}
                        editLastName={editLastName}
                        setEditLastName={setEditLastName}
                        editPhone={editPhone}
                        setEditPhone={setEditPhone}
                        editEmail={editEmail}
                        setEditEmail={setEditEmail}
                        editAddress={editAddress}
                        setEditAddress={setEditAddress}
                        editComplAddress={editComplAddress}
                        setEditComplAddress={setEditComplAddress}
                        editZip={editZip}
                        setEditZip={setEditZip}
                        editCity={editCity}
                        setEditCity={setEditCity}
                        editDiffDelivery={editDiffDelivery}
                        setEditDiffDelivery={setEditDiffDelivery}
                        editEquipModel={editEquipModel}
                        setEditEquipModel={setEditEquipModel}
                        editEquipInstallDate={editEquipInstallDate}
                        setEditEquipInstallDate={setEditEquipInstallDate}
                        editEquipSerial={editEquipSerial}
                        setEditEquipSerial={setEditEquipSerial}
                        activeSubSheet={activeSubSheet}
                        setActiveSubSheet={setActiveSubSheet}
                        dragControlsMain={dragControlsMain}
                        dragControlsSub={dragControlsSub}
                        handleSaveClient={handleSaveNewClient}
                    />
                )}
                {/* Echeance picker overlay - Mobile */}
                {showEcheancePicker && (
                    <EcheancePickerModal
                        selectedOptionId={echeanceOptionId}
                        customDate={echeanceCustomDate}
                        onSelect={({ echeanceOptionId: optId, customDateStr: custStr }) => {
                            setEcheanceOptionId(optId);
                            setEcheanceCustomDate(custStr);
                        }}
                        onClose={() => setShowEcheancePicker(false)}
                    />
                )}

            </div>
            , document.body);
    }

    // ── DESKTOP SPLIT VIEW INTERFACE ──────────────────────────────────
    return (
        <div className="invoice-modal-overlay">
            <div className="invoice-modal-container wide-invoice-modal-container">

                {/* Left Side: form inputs */}
                <div className="invoice-modal-form-side">
                    <div className="invoice-modal-header">
                        <h2>Nouvelle facture</h2>
                        <button className="close-btn" onClick={onClose}><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="invoice-modal-form">
                        <div className="form-scrollable-area">
                            {/* Client select */}
                            <div className="form-field form-field-bordered">
                                <label className="form-label" style={{ letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>CLIENT*</label>
                                <div
                                    className="modal-select-trigger"
                                    onClick={() => {
                                        setPendingClient(selectedClient);
                                        setShowClientSearch(true);
                                    }}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        padding: '12px',
                                    }}
                                >
                                    <span className="trigger-val" style={{ fontSize: '1.2rem', fontWeight: '500', color: 'var(--foreground)' }}>
                                        {selectedClient ? selectedClient.name : "Sélectionner un client..."}
                                    </span>
                                    <ChevronDown size={18} style={{ color: 'var(--muted-foreground)' }} />
                                </div>
                            </div>

                            {/* Date */}
                            <div className="form-field form-field-bordered">
                                <label className="form-label" style={{ letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>DATE DE FACTURE*</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="date"
                                        className="profile-input borderless-large-input"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                        required
                                        style={{
                                            border: 'none',
                                            borderRadius: 0,
                                            padding: '8px 0',
                                            fontSize: '1.2rem',
                                            fontWeight: '500',
                                            height: 'auto',
                                            background: 'transparent',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Mandatory Date d'échéance */}
                            <div className="form-field form-field-bordered">
                                <label className="form-label" style={{ letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>DATE D'ÉCHÉANCE*</label>
                                <div
                                    className="modal-select-trigger"
                                    onClick={() => setShowEcheancePicker(true)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        padding: '12px 14px',
                                        background: 'none'
                                    }}
                                >
                                    <span style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--foreground)' }}>
                                        {echeanceLabel} ({new Date(calculatedDueDate).toLocaleDateString('fr-FR')})
                                    </span>
                                    <ChevronDown size={20} style={{ color: 'var(--muted-foreground)' }} />
                                </div>
                            </div>

                            {/* Optional Date de livraison */}
                            <div className="form-field form-field-bordered" style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="form-label" style={{ letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>DATE DE LIVRAISON (OPTIONNEL)</label>
                                    {!hasDeliveryDate ? (
                                        <button
                                            type="button"
                                            onClick={() => { setHasDeliveryDate(true); setDeliveryDate(invoiceDate); }}
                                            style={{ border: 'none', background: 'none', color: '#556B2F', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Plus size={14} /> Ajouter
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => { setHasDeliveryDate(false); setDeliveryDate(""); }}
                                            style={{ border: 'none', background: 'none', color: 'var(--destructive)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Trash size={14} /> Supprimer
                                        </button>
                                    )}
                                </div>
                                {hasDeliveryDate && (
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                                        <input
                                            type="date"
                                            className="profile-input borderless-large-input"
                                            value={deliveryDate}
                                            onChange={(e) => setDeliveryDate(e.target.value)}
                                            style={{
                                                border: 'none',
                                                borderRadius: 0,
                                                padding: '8px 0',
                                                fontSize: '1.1rem',
                                                fontWeight: '500',
                                                height: 'auto',
                                                background: 'transparent',
                                                width: '100%'
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Supplies grid spreadsheet */}
                            <div className="supplies-section">
                                <div className="section-title-row">
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>Fournitures & prestations</h3>
                                    <button type="button" className="add-line-btn" onClick={handleAddLine}>
                                        <Plus size={14} /> Ajouter
                                    </button>
                                </div>

                                <div className="supplies-table-wrapper">
                                    <table className="supplies-table">
                                        <thead>
                                            <tr>
                                                <th>Description</th>
                                                <th style={{ width: '80px' }}>Qté</th>
                                                <th style={{ width: '120px' }}>Prix unit. HT</th>
                                                <th style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line) => (
                                                <tr key={line.id}>
                                                    <td>
                                                        {/* Description Selector like /planning */}
                                                        <div
                                                            className="line-select-trigger"
                                                            onClick={() => {
                                                                if (line.description) {
                                                                    handleStartEditLine(line);
                                                                } else {
                                                                    setActiveLineId(line.id);
                                                                    setCatalogSearchQuery("");
                                                                    setPendingCatalogItem(null);
                                                                    setShowNewCatalogItemForm(false);
                                                                    setShowCatalogSearch(true);
                                                                }
                                                            }}
                                                            style={{
                                                                cursor: 'pointer',
                                                                padding: '8px',
                                                                fontSize: '0.85rem',
                                                                minHeight: '38px',
                                                                backgroundColor: 'transparent',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '2px',
                                                                alignItems: 'flex-start',
                                                                color: line.description ? 'var(--foreground)' : 'var(--muted-foreground)'
                                                            }}
                                                        >
                                                            <span style={{ fontWeight: line.description ? 700 : 400 }}>
                                                                {line.description || "Rechercher..."}
                                                            </span>
                                                            {line.description && (
                                                                <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                                                                    {line.reference ? `Réf: ${line.reference}` : "Sans réf"}
                                                                    {line.unit && line.unit !== "Aucune" ? ` • ${line.unit}` : ""}
                                                                    {line.urssafCategory ? ` • ${line.urssafCategory}` : ""}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="line-input text-center"
                                                            value={line.qty}
                                                            min="1"
                                                            onChange={(e) => handleLineChange(line.id, "qty", e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="line-input text-right"
                                                            value={line.unitPrice}
                                                            onChange={(e) => handleLineChange(line.id, "unitPrice", e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="text-center">
                                                        {lines.length > 1 && (
                                                            <button type="button" className="delete-line-btn" onClick={() => handleRemoveLine(line.id)}>
                                                                <Trash size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Recap */}
                                <div className="invoice-dynamic-recap">
                                    <div className="recap-row">
                                        <span>Sous-total HT :</span>
                                        <span>{subtotalHt.toLocaleString("fr-FR")} €</span>
                                    </div>
                                    <div className="recap-row">
                                        <span>TVA ({tvaRate}%) :</span>
                                        <span>{tvaAmount.toLocaleString("fr-FR")} €</span>
                                    </div>
                                    <div className="recap-row total">
                                        <span>Total TTC :</span>
                                        <span>{totalTtc.toLocaleString("fr-FR")} €</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="form-field" style={{ marginTop: '1.5rem' }}>
                                <label className="form-label">Notes internes <small style={{ color: "var(--muted-foreground)" }}>(Non visibles sur le PDF)</small></label>
                                <textarea
                                    className="profile-input textarea-field"
                                    rows="2"
                                    value={internalNotes}
                                    onChange={(e) => setInternalNotes(e.target.value)}
                                    placeholder="Notes de suivi interne..."
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="invoice-modal-actions">
                            <button type="button" className="cancel-btn" onClick={onClose}>Annuler</button>
                            <button type="submit" className="submit-invoice-btn">Créer la facture</button>
                        </div>
                    </form>
                </div>

                {/* Right Side: A4 Live Preview */}
                <div className="invoice-modal-preview-side">
                    <div className="preview-side-header">
                        <FileText size={16} />
                        <span>Aperçu de la facture</span>
                        <button className="personnaliser-btn" type="button" onClick={() => setShowCustomizer(true)}>
                            <Palette size={14} />
                            Personnaliser
                        </button>
                    </div>
                    <div className="preview-side-scrollable">
                        {renderInvoiceLivePreviewSheet()}
                    </div>
                </div>

            </div>

            {showCustomizer && (
                <DocumentCustomizerModal docType="facture" onClose={() => setShowCustomizer(false)} />
            )}

            {/* Client Search Portal */}
            {showClientSearch && createPortal(
                <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) setShowClientSearch(false); }}>
                    <div className="client-search-panel">
                        <div className="client-search-header">
                            <button type="button" className="client-search-back-btn" onClick={() => setShowClientSearch(false)}><X size={22} /></button>
                            <h3>Sélectionner un client</h3>
                            <div style={{ width: 34 }}></div>
                        </div>

                        <div className="client-search-bar-container">
                            <div className="client-search-input-wrapper">
                                <Search size={18} className="client-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Nom ou entreprise..."
                                    value={clientSearchQuery}
                                    onChange={(e) => setClientSearchQuery(e.target.value)}
                                    className="client-search-input"
                                />
                            </div>
                        </div>

                        <div className="client-search-list-container">
                            {Object.entries(
                                getGroupedClients(
                                    clientDetails.filter(c =>
                                        c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
                                    )
                                )
                            ).map(([letter, list]) => (
                                <div key={letter} className="client-search-group">
                                    <span className="client-search-group-letter">{letter}</span>
                                    <div className="client-search-group-items">
                                        {list.map(c => {
                                            const isSelected = pendingClient && pendingClient.name === c.name;
                                            return (
                                                <div
                                                    key={c.name}
                                                    className={`client-search-item ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => setPendingClient(c)}
                                                >
                                                    <span className="client-item-name">{c.name}</span>
                                                    <span className={`client-item-badge ${c.type.toLowerCase()}`}>
                                                        {c.type === "Particulier" ? "Particulier" : "Organisation"}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="client-search-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                            {pendingClient && (
                                <button
                                    type="button"
                                    className="client-search-confirm-btn"
                                    style={{ width: '100%', height: '44px' }}
                                    onClick={() => {
                                        setSelectedClient(pendingClient);
                                        setShowClientSearch(false);
                                        setClientSearchQuery("");
                                        setPendingClient(null);
                                    }}
                                >
                                    Confirmer — {pendingClient.name}
                                </button>
                            )}
                            <button
                                type="button"
                                className="client-search-add-btn secondary"
                                style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                onClick={handleOpenAddClient}
                            >
                                + Ajouter un nouveau client
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Catalog Supplies Selector Modal with direct new item addition form */}
            {showCatalogSearch && createPortal(
                <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) setShowCatalogSearch(false); }}>
                    <div className="client-search-panel">
                        <div className="client-search-header">
                            <button type="button" className="client-search-back-btn" onClick={() => setShowCatalogSearch(false)}><X size={22} /></button>
                            <h3>Sélectionner un article / service</h3>
                            <div style={{ width: 34 }}></div>
                        </div>

                        {showNewCatalogItemForm ? (
                            <div className="new-catalog-item-form-wrapper" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, backgroundColor: 'var(--card)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ padding: '6px', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', borderRadius: '6px', display: 'inline-flex' }}>
                                        <Plus size={16} />
                                    </div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Créer un nouvel article</h3>
                                </div>

                                <div className="form-field">
                                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nom de l'article / service*</label>
                                    <input
                                        type="text"
                                        className="profile-input"
                                        placeholder="Ex: Main d'œuvre diagnostic"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prix unitaire HT (€)*</label>
                                    <input
                                        type="number"
                                        className="profile-input"
                                        placeholder="Ex: 85"
                                        value={newItemPrice}
                                        onChange={(e) => setNewItemPrice(e.target.value)}
                                        style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                                    <button
                                        type="button"
                                        className="client-search-confirm-btn"
                                        style={{ flex: 2, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => {
                                            if (!newItemName.trim()) {
                                                alert("Veuillez saisir un nom.");
                                                return;
                                            }
                                            const price = parseFloat(newItemPrice) || 0;
                                            setLines(lines.map(line => line.id === activeLineId ? { ...line, description: newItemName, unitPrice: price } : line));
                                            setShowCatalogSearch(false);
                                            setCatalogSearchQuery("");
                                            setNewItemName("");
                                            setNewItemPrice("");
                                            setShowNewCatalogItemForm(false);
                                        }}
                                    >
                                        Confirmer et ajouter
                                    </button>
                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        style={{ flex: 1, height: '42px', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
                                        onClick={() => setShowNewCatalogItemForm(false)}
                                    >
                                        Retour
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="client-search-bar-container">
                                    <div className="client-search-input-wrapper">
                                        <Search size={18} className="client-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Nom de la fourniture ou prestation..."
                                            value={catalogSearchQuery}
                                            onChange={(e) => setCatalogSearchQuery(e.target.value)}
                                            className="client-search-input"
                                        />
                                    </div>
                                </div>

                                <div className="client-search-list-container">
                                    {Object.entries(
                                        getGroupedCatalog(
                                            mockCatalog.filter(item =>
                                                item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase())
                                            )
                                        )
                                    ).map(([letter, list]) => (
                                        <div key={letter} className="client-search-group">
                                            <span className="client-search-group-letter">{letter}</span>
                                            <div className="client-search-group-items">
                                                {list.map(item => {
                                                    const isSelected = pendingCatalogItem && pendingCatalogItem.id === item.id;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`client-search-item ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => setPendingCatalogItem(item)}
                                                        >
                                                            <span className="client-item-name">{item.description}</span>
                                                            <span className="client-item-badge organisation" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                                                {item.unitPrice} € HT
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    {mockCatalog.filter(item =>
                                        item.description.toLowerCase().includes(catalogSearchQuery.toLowerCase())
                                    ).length === 0 && (
                                            <div className="client-search-empty">
                                                <span>Aucun article ne correspond à votre recherche</span>
                                            </div>
                                        )}
                                </div>

                                <div className="client-search-footer" style={{ gap: '8px' }}>
                                    {pendingCatalogItem ? (
                                        <button
                                            type="button"
                                            className="client-search-confirm-btn"
                                            onClick={() => {
                                                setLines(lines.map(line => line.id === activeLineId ? { ...line, description: pendingCatalogItem.description, unitPrice: pendingCatalogItem.unitPrice } : line));
                                                setShowCatalogSearch(false);
                                                setCatalogSearchQuery("");
                                                setPendingCatalogItem(null);
                                            }}
                                        >
                                            Sélectionner — {pendingCatalogItem.description}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="client-search-confirm-btn"
                                            onClick={() => {
                                                const customDesc = catalogSearchQuery.trim();
                                                if (customDesc) {
                                                    setLines(lines.map(line => line.id === activeLineId ? { ...line, description: customDesc, unitPrice: 0 } : line));
                                                    setShowCatalogSearch(false);
                                                    setCatalogSearchQuery("");
                                                }
                                            }}
                                            disabled={!catalogSearchQuery.trim()}
                                            style={{ opacity: catalogSearchQuery.trim() ? 1 : 0.6 }}
                                        >
                                            Sélectionner le texte saisi
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="client-search-add-btn secondary"
                                        onClick={() => {
                                            setShowCatalogSearch(false);
                                            handleStartCreateLine(catalogSearchQuery);
                                        }}
                                    >
                                        + Ajouter un nouvel article (nom, prix...)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* ARTICLE EDIT/CREATE DRAWER PORTAL */}
            {(isEditingItem || isCreatingItem) && createPortal(
                <div className="article-drawer-overlay" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setIsEditingItem(false);
                        setIsCreatingItem(false);
                    }
                }}>
                    <div className="article-drawer-content" onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => setDragStartY(e.touches[0].clientY)}
                        onTouchEnd={(e) => {
                            const dragEndY = e.changedTouches[0].clientY;
                            if (dragEndY - dragStartY > 100) {
                                setIsEditingItem(false);
                                setIsCreatingItem(false);
                            }
                        }}
                    >
                        {isMobile && <div className="bottom-sheet-drag-handle" onTouchStart={(e) => {
                            e.stopPropagation();
                            setDragStartY(e.touches[0].clientY);
                        }} />}

                        <div className="article-drawer-header">
                            <button
                                type="button"
                                className="drawer-round-btn"
                                onClick={() => {
                                    setIsEditingItem(false);
                                    setIsCreatingItem(false);
                                }}
                            >
                                <X size={20} />
                            </button>
                            <h2>{isEditingItem ? "Modifier l'article" : "Créer un nouvel article"}</h2>
                            <button type="button" className="drawer-round-btn" style={{ opacity: 0.7 }}>
                                <MoreHorizontal size={20} />
                            </button>
                        </div>

                        <div className="article-drawer-body">
                            {/* Nom et référence group */}
                            <div>
                                <div className="article-drawer-group-title">Nom et référence</div>
                                <div className="article-drawer-group-card">
                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Désignation*</label>
                                        <input
                                            type="text"
                                            className="article-drawer-input"
                                            placeholder="Ex: Main d'œuvre diagnostic"
                                            value={tempName}
                                            onChange={(e) => setTempName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Référence</label>
                                        <input
                                            type="text"
                                            className="article-drawer-input"
                                            placeholder="Ex: REF-001"
                                            value={tempReference}
                                            onChange={(e) => setTempReference(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Prix et configuration group */}
                            <div>
                                <div className="article-drawer-group-title">Tarification & Déclaration</div>
                                <div className="article-drawer-group-card">
                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Prix unitaire HT (€)*</label>
                                        <input
                                            type="number"
                                            className="article-drawer-input"
                                            placeholder="Ex: 85"
                                            value={tempPrice}
                                            onChange={(e) => setTempPrice(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Type d'article (URSSAF)</label>
                                        <div
                                            className="article-drawer-trigger"
                                            onClick={() => setShowUrssafSelector(true)}
                                        >
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tempUrssafCategory}</span>
                                            <ChevronRight size={18} style={{ color: 'var(--muted-foreground)' }} />
                                        </div>
                                    </div>

                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Unité de facturation</label>
                                        <div
                                            className="article-drawer-trigger"
                                            onClick={() => setShowUnitSelector(true)}
                                        >
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tempUnit}</span>
                                            <span className="article-drawer-trigger-value">
                                                {tempUnit !== "Aucune" ? `/ ${tempUnit.replace("À l'", "").replace("À la ", "").replace("Au ", "").replace("À ", "")}` : ""}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Quantité</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--background)', borderRadius: '8px', padding: '8px', border: '1px solid var(--border)' }}>
                                            <button
                                                type="button"
                                                onClick={() => setTempQty(Math.max(1, tempQty - 1))}
                                                style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                value={tempQty}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 1;
                                                    setTempQty(Math.max(1, val));
                                                }}
                                                style={{ flex: 1, textAlign: 'center', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--foreground)', fontWeight: 800, fontSize: '1rem', outline: 'none', padding: '8px' }}
                                                min="1"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setTempQty(tempQty + 1)}
                                                style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', backgroundColor: '#556B2F', color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="article-drawer-footer">
                            <button
                                type="button"
                                className="drawer-primary-btn"
                                onClick={isEditingItem ? handleSaveEditedLine : handleSaveCreatedLine}
                            >
                                {isEditingItem ? "Enregistrer les modifications" : "Confirmer et ajouter"}
                            </button>
                            {isEditingItem && (
                                <button
                                    type="button"
                                    className="drawer-danger-btn"
                                    onClick={() => {
                                        handleRemoveLine(editingLineId);
                                        setIsEditingItem(false);
                                    }}
                                >
                                    Supprimer l'article
                                </button>
                            )}
                        </div>

                        {/* NESTED URSSAF SELECTOR */}
                        {showUrssafSelector && (
                            <div className="selector-subsheet">
                                <div className="article-drawer-header">
                                    <button
                                        type="button"
                                        className="drawer-round-btn"
                                        onClick={() => setShowUrssafSelector(false)}
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h2>Type d'article</h2>
                                    <button
                                        type="button"
                                        className="drawer-round-btn"
                                        onClick={() => setShowUrssafSelector(false)}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div style={{ padding: '14px 20px 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                    Détermine la catégorie de votre déclaration URSSAF.
                                </div>
                                <div className="selector-options-list">
                                    {[
                                        "Vente de marchandises (BIC)",
                                        "Prestations de services (BNC)",
                                        "Prestations de services artisanales ou commerciales (BIC)",
                                        "Vente de produits fabriqués (BIC)",
                                        "Débours"
                                    ].map((cat) => {
                                        const isSelected = tempUrssafCategory === cat;
                                        return (
                                            <div
                                                key={cat}
                                                className={`selector-option-card ${isSelected ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setTempUrssafCategory(cat);
                                                    setShowUrssafSelector(false);
                                                }}
                                            >
                                                <div className="option-details">
                                                    <span className="option-title">{cat}</span>
                                                </div>
                                                <div className="option-radio">
                                                    <div className="option-radio-inner" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* NESTED BILLING UNIT SELECTOR */}
                        {showUnitSelector && (
                            <div className="selector-subsheet">
                                <div className="article-drawer-header">
                                    <button
                                        type="button"
                                        className="drawer-round-btn"
                                        onClick={() => setShowUnitSelector(false)}
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h2>Unité de facturation</h2>
                                    <button
                                        type="button"
                                        className="drawer-round-btn"
                                        onClick={() => setShowUnitSelector(false)}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div style={{ padding: '14px 20px 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                    Apparaîtra après le prix sur votre document.
                                </div>
                                <div style={{ padding: '12px 20px' }}>
                                    <div className="client-search-input-wrapper">
                                        <Search size={18} className="client-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Rechercher une unité..."
                                            value={unitSearchQuery}
                                            onChange={(e) => setUnitSearchQuery(e.target.value)}
                                            className="client-search-input"
                                            style={{ color: 'var(--foreground)' }}
                                        />
                                    </div>
                                </div>
                                <div className="selector-options-list">
                                    {(() => {
                                        const groups = [
                                            {
                                                name: "",
                                                options: [
                                                    { name: "Aucune", suffix: "" },
                                                    { name: "À l'unité", suffix: " / unité" }
                                                ]
                                            },
                                            {
                                                name: "Temps",
                                                options: [
                                                    { name: "À l'heure", suffix: " / heure" },
                                                    { name: "À la journée", suffix: " / jour" },
                                                    { name: "À la semaine", suffix: " / semaine" },
                                                    { name: "À l'année", suffix: " / an" }
                                                ]
                                            },
                                            {
                                                name: "Quantité",
                                                options: [
                                                    { name: "Au gramme", suffix: " / g" },
                                                    { name: "Au forfait", suffix: " / forfait" },
                                                    { name: "Au caractère", suffix: " / caractère" },
                                                    { name: "À la ligne", suffix: " / ligne" }
                                                ]
                                            }
                                        ];

                                        const q = unitSearchQuery.toLowerCase().trim();
                                        const p = tempPrice || "24.99";

                                        return groups.map((g) => {
                                            const filteredOptions = g.options.filter(
                                                (o) => o.name.toLowerCase().includes(q)
                                            );
                                            if (filteredOptions.length === 0) return null;

                                            return (
                                                <React.Fragment key={g.name || "default"}>
                                                    {g.name && <div className="selector-group-header">{g.name}</div>}
                                                    {filteredOptions.map((opt) => {
                                                        const isSelected = tempUnit === opt.name;
                                                        return (
                                                            <div
                                                                key={opt.name}
                                                                className={`selector-option-card ${isSelected ? 'selected' : ''}`}
                                                                onClick={() => {
                                                                    setTempUnit(opt.name);
                                                                    setShowUnitSelector(false);
                                                                    setUnitSearchQuery("");
                                                                }}
                                                            >
                                                                <div className="option-details">
                                                                    <span className="option-title">{opt.name}</span>
                                                                    <span className="option-subtitle">
                                                                        {p} €{opt.suffix}
                                                                    </span>
                                                                </div>
                                                                <div className="option-radio">
                                                                    <div className="option-radio-inner" />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
            {showEcheancePicker && (
                <EcheancePickerModal
                    selectedOptionId={echeanceOptionId}
                    customDate={echeanceCustomDate}
                    onSelect={({ echeanceOptionId: optId, customDateStr: custStr }) => {
                        setEcheanceOptionId(optId);
                        setEcheanceCustomDate(custStr);
                    }}
                    onClose={() => setShowEcheancePicker(false)}
                />
            )}

            {/* Full Client Edit / New Client Portal Sheet (Mobile) & Modal (Desktop) */}
            {editingClient && (
                isMobile ? (
                    <MobileEditBottomSheet
                        editingClient={editingClient}
                        setEditingClient={setEditingClient}
                        editFirstName={editFirstName}
                        setEditFirstName={setEditFirstName}
                        editLastName={editLastName}
                        setEditLastName={setEditLastName}
                        editPhone={editPhone}
                        setEditPhone={setEditPhone}
                        editEmail={editEmail}
                        setEditEmail={setEditEmail}
                        editAddress={editAddress}
                        setEditAddress={setEditAddress}
                        editComplAddress={editComplAddress}
                        setEditComplAddress={setEditComplAddress}
                        editZip={editZip}
                        setEditZip={setEditZip}
                        editCity={editCity}
                        setEditCity={setEditCity}
                        editDiffDelivery={editDiffDelivery}
                        setEditDiffDelivery={setEditDiffDelivery}
                        editEquipModel={editEquipModel}
                        setEditEquipModel={setEditEquipModel}
                        editEquipInstallDate={editEquipInstallDate}
                        setEditEquipInstallDate={setEditEquipInstallDate}
                        editEquipSerial={editEquipSerial}
                        setEditEquipSerial={setEditEquipSerial}
                        activeSubSheet={activeSubSheet}
                        setActiveSubSheet={setActiveSubSheet}
                        dragControlsMain={dragControlsMain}
                        dragControlsSub={dragControlsSub}
                        handleSaveClient={handleSaveNewClient}
                    />
                ) : (
                    <DesktopEditModal
                        editingClient={editingClient}
                        setEditingClient={setEditingClient}
                        editFirstName={editFirstName}
                        setEditFirstName={setEditFirstName}
                        editLastName={editLastName}
                        setEditLastName={setEditLastName}
                        editPhone={editPhone}
                        setEditPhone={setEditPhone}
                        editEmail={editEmail}
                        setEditEmail={setEditEmail}
                        editAddress={editAddress}
                        setEditAddress={setEditAddress}
                        editZip={editZip}
                        setEditZip={setEditZip}
                        editCity={editCity}
                        setEditCity={setEditCity}
                        editEquipModel={editEquipModel}
                        setEditEquipModel={setEditEquipModel}
                        editEquipInstallDate={editEquipInstallDate}
                        setEditEquipInstallDate={setEditEquipInstallDate}
                        editEquipSerial={editEquipSerial}
                        setEditEquipSerial={setEditEquipSerial}
                        handleSaveClient={handleSaveNewClient}
                    />
                )
            )}
        </div>
    );
}

export default NewInvoiceModal;
