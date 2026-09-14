import crypto from "crypto";
import { prisma } from "../../config/db.js";
import { sendInvoiceClientEmail, sendQuoteClientEmail } from "../../utils/emailService.js";
import { emitToCompany } from "../../config/socket.js";

export class DocumentReminderScheduler {
    constructor() {
        this.timer = null;
        this.isRunning = false;
        // Check every 5 minutes
        this.intervalMs = 5 * 60 * 1000;
    }

    start() {
        if (this.timer) return;
        console.log("📑 [DOCUMENT_REMINDER_SCHEDULER] Démarrage du planificateur de relances Factures & Devis (5m)...");

        // Initial run after 15 seconds
        setTimeout(() => this.processReminders().catch(() => {}), 15000);

        this.timer = setInterval(() => {
            this.processReminders().catch(err => {
                console.error("[DOCUMENT_REMINDER_SCHEDULER_ERROR]:", err.message);
            });
        }, this.intervalMs);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log("📑 [DOCUMENT_REMINDER_SCHEDULER] Planificateur arrêté.");
        }
    }

    async processReminders() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const now = new Date();
            await this.processInvoiceReminders(now);
            await this.processQuoteReminders(now);
        } catch (error) {
            console.error("[DOCUMENT_REMINDER_SCHEDULER] Erreur globale lors du traitement des relances:", error);
        } finally {
            this.isRunning = false;
        }
    }

    async processInvoiceReminders(now) {
        try {
            // Find sent, unpaid invoices with reminder not yet sent and reminder not disabled
            const candidateInvoices = await prisma.invoice.findMany({
                where: {
                    status: { in: ["SENT", "OVERDUE"] },
                    emailSentAt: { not: null },
                    reminder1SentAt: null,
                    reminderDisabled: false,
                    company: {
                        settings: {
                            invoiceReminderEnabled: true
                        }
                    }
                },
                include: {
                    client: true,
                    company: {
                        include: {
                            settings: true,
                            users: {
                                where: { role: { in: ["OWNER", "MANAGER", "SUPERADMIN"] } },
                                select: { id: true, email: true, role: true }
                            }
                        }
                    },
                    items: true
                },
                take: 50
            });

            for (const invoice of candidateInvoices) {
                try {
                    const settings = invoice.company?.settings || {};
                    const reminderDays = invoice.customReminderDays || settings.invoiceReminderDays || 7;
                    const sentTime = new Date(invoice.emailSentAt).getTime();
                    const dueDateMs = sentTime + reminderDays * 24 * 60 * 60 * 1000;

                    if (now.getTime() < dueDateMs) {
                        // Not yet due
                        continue;
                    }

                    const recipientEmail = invoice.emailSentTo || invoice.client?.email;
                    if (!recipientEmail) {
                        console.warn(`[INVOICE_REMINDER] Facture ${invoice.number} sans email destinataire, relance ignorée.`);
                        continue;
                    }

                    // Ensure payment token is valid
                    let token = invoice.paymentToken;
                    let expiry = invoice.paymentTokenExpiry;
                    if (!token || !expiry || new Date(expiry) < now) {
                        token = crypto.randomBytes(32).toString("hex");
                        expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                        await prisma.invoice.update({
                            where: { id: invoice.id },
                            data: { paymentToken: token, paymentTokenExpiry: expiry }
                        });
                    }

                    const paymentUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/invoice/${token}`;
                    const effectiveCustomization = {
                        ...(settings.documentCustomization || {}),
                        ...(invoice.documentCustomization || {}),
                        primaryColor: invoice.documentCustomization?.primaryColor || settings.documentCustomization?.primaryColor || settings.primaryColor || "#556B2F"
                    };

                    const isStripeActive = Boolean(
                        (invoice.stripeEnabled || settings.stripePaymentEnabled || invoice.company?.onlinePaymentEnabled) &&
                        invoice.company?.stripeAccountId
                    );
                    const isBankTransferActive = Boolean(
                        invoice.bankTransferEnabled ?? (settings.bankTransferEnabled ?? true)
                    );

                    // Send email with isReminder = true
                    await sendInvoiceClientEmail({
                        to: recipientEmail,
                        invoice,
                        company: invoice.company,
                        paymentUrl,
                        senderEmail: invoice.company?.email,
                        primaryColor: effectiveCustomization.primaryColor,
                        customization: effectiveCustomization,
                        isReminder: true,
                        paymentOptions: {
                            stripeEnabled: isStripeActive,
                            bankTransferEnabled: isBankTransferActive,
                            bankDetails: {
                                iban: settings.bankIban || null,
                                bic: settings.bankBic || null,
                                accountOwner: settings.bankAccountOwner || invoice.company?.name || null,
                                bankName: settings.bankName || null,
                                reference: invoice.number
                            }
                        }
                    });

                    // Mark reminder as sent (guarantees sent once)
                    await prisma.invoice.update({
                        where: { id: invoice.id },
                        data: { reminder1SentAt: now }
                    });

                    // Create In-App Notification
                    const clientName = invoice.client
                        ? `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim() || invoice.client.companyName || recipientEmail
                        : recipientEmail;

                    const title = `Relance facture envoyée`;
                    const body = `Rappel de paiement automatique envoyé pour la facture ${invoice.number} à ${clientName}`;

                    const targetUsers = invoice.company?.users || [];
                    for (const user of targetUsers) {
                        const notif = await prisma.notification.create({
                            data: {
                                companyId: invoice.companyId,
                                userId: user.id,
                                type: "INVOICE_OVERDUE",
                                channel: "IN_APP",
                                status: "SENT",
                                title,
                                body,
                                entityType: "invoice",
                                entityId: invoice.id,
                                data: {
                                    invoiceNumber: invoice.number,
                                    clientName,
                                    totalTtc: invoice.totalTtc,
                                    isReminder: true
                                }
                            }
                        });

                        emitToCompany(invoice.companyId, "notification:new", notif);
                    }

                    console.log(`✓ [INVOICE_REMINDER] Relance envoyée avec succès pour facture ${invoice.number} à ${recipientEmail}`);
                } catch (singleInvoiceErr) {
                    console.error(`[INVOICE_REMINDER_ERROR] Erreur pour facture ${invoice.id}:`, singleInvoiceErr.message);
                }
            }
        } catch (err) {
            console.error("[INVOICE_REMINDERS_BATCH_ERROR]:", err.message);
        }
    }

    async processQuoteReminders(now) {
        try {
            // Find sent, unsigned quotes with reminder not yet sent and reminder not disabled
            const candidateQuotes = await prisma.quote.findMany({
                where: {
                    status: "SENT",
                    emailSentAt: { not: null },
                    reminder1SentAt: null,
                    reminderDisabled: false,
                    company: {
                        settings: {
                            quoteReminderEnabled: true
                        }
                    }
                },
                include: {
                    client: true,
                    company: {
                        include: {
                            settings: true,
                            users: {
                                where: { role: { in: ["OWNER", "MANAGER", "SUPERADMIN"] } },
                                select: { id: true, email: true, role: true }
                            }
                        }
                    },
                    items: true
                },
                take: 50
            });

            for (const quote of candidateQuotes) {
                try {
                    const settings = quote.company?.settings || {};
                    const reminderDays = quote.customReminderDays || settings.quoteReminderDays || 5;
                    const sentTime = new Date(quote.emailSentAt).getTime();
                    const dueDateMs = sentTime + reminderDays * 24 * 60 * 60 * 1000;

                    if (now.getTime() < dueDateMs) {
                        // Not yet due
                        continue;
                    }

                    const recipientEmail = quote.emailSentTo || quote.client?.email;
                    if (!recipientEmail) {
                        console.warn(`[QUOTE_REMINDER] Devis ${quote.number} sans email destinataire, relance ignorée.`);
                        continue;
                    }

                    // Ensure signature token is valid
                    let token = quote.signatureToken;
                    let expiry = quote.signatureTokenExpiry;
                    if (!token || !expiry || new Date(expiry) < now) {
                        token = crypto.randomBytes(32).toString("hex");
                        expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                        await prisma.quote.update({
                            where: { id: quote.id },
                            data: { signatureToken: token, signatureTokenExpiry: expiry }
                        });
                    }

                    const signatureUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/quote/${token}`;
                    const effectiveCustomization = {
                        ...(settings.documentCustomization || {}),
                        ...(quote.documentCustomization || {}),
                        primaryColor: quote.documentCustomization?.primaryColor || settings.documentCustomization?.primaryColor || settings.primaryColor || "#556B2F"
                    };

                    // Send email with isReminder = true
                    await sendQuoteClientEmail({
                        to: recipientEmail,
                        quote,
                        company: quote.company,
                        signatureUrl,
                        senderEmail: quote.company?.email,
                        primaryColor: effectiveCustomization.primaryColor,
                        customization: effectiveCustomization,
                        isReminder: true
                    });

                    // Mark reminder as sent (guarantees sent once)
                    await prisma.quote.update({
                        where: { id: quote.id },
                        data: { reminder1SentAt: now }
                    });

                    // Create In-App Notification
                    const clientName = quote.client
                        ? `${quote.client.firstName || ''} ${quote.client.lastName || ''}`.trim() || quote.client.companyName || recipientEmail
                        : recipientEmail;

                    const title = `Relance devis envoyée`;
                    const body = `Rappel de signature automatique envoyé pour le devis ${quote.number} à ${clientName}`;

                    const targetUsers = quote.company?.users || [];
                    for (const user of targetUsers) {
                        const notif = await prisma.notification.create({
                            data: {
                                companyId: quote.companyId,
                                userId: user.id,
                                type: "NEW_QUOTE_REQUEST",
                                channel: "IN_APP",
                                status: "SENT",
                                title,
                                body,
                                entityType: "quote",
                                entityId: quote.id,
                                data: {
                                    quoteNumber: quote.number,
                                    clientName,
                                    totalTtc: quote.totalTtc,
                                    isReminder: true
                                }
                            }
                        });

                        emitToCompany(quote.companyId, "notification:new", notif);
                    }

                    console.log(`✓ [QUOTE_REMINDER] Relance envoyée avec succès pour devis ${quote.number} à ${recipientEmail}`);
                } catch (singleQuoteErr) {
                    console.error(`[QUOTE_REMINDER_ERROR] Erreur pour devis ${quote.id}:`, singleQuoteErr.message);
                }
            }
        } catch (err) {
            console.error("[QUOTE_REMINDERS_BATCH_ERROR]:", err.message);
        }
    }
}

export const documentReminderScheduler = new DocumentReminderScheduler();
