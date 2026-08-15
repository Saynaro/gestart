import express from "express";
import {
    getProviders,
    getConnection,
    connectCompany,
    testConnection,
    disconnectCompany,
    getReceivedInvoices,
    getReceivedInvoiceById,
    downloadReceivedInvoice,
    transmitInvoice,
    cancelInvoice,
    runReconciliation
} from "../controllers/eInvoicingController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireManager, requireOwner } from "../middlewares/checkRole.js";

const router = express.Router();

// Require authentication and at least MANAGER role for e-invoicing endpoints
router.use(authMiddleware, requireManager);

// Providers & Connection management
router.get("/providers", getProviders);
router.get("/connection", getConnection);
router.post("/connect", requireOwner, connectCompany);
router.post("/test", testConnection);
router.delete("/connection", requireOwner, disconnectCompany);

// Received Invoices (Fournisseurs - 2026)
router.get("/invoices/received", getReceivedInvoices);
router.get("/invoices/received/:id", getReceivedInvoiceById);
router.get("/invoices/received/:id/download", downloadReceivedInvoice);

// Outgoing Invoices Actions
router.post("/invoices/:id/transmit", transmitInvoice);
router.post("/invoices/:id/cancel", cancelInvoice);

// Reconciliation
router.post("/reconciliation/run", runReconciliation);

export default router;
