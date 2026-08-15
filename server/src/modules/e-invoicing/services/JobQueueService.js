import { prisma } from "../../../config/db.js";
import { ProviderFactory } from "../providers/ProviderFactory.js";
import { CanonicalInvoiceMapper } from "./CanonicalInvoiceMapper.js";
import { EInvoicingValidator } from "./EInvoicingValidator.js";

/**
 * Persistent Database-Backed Asynchronous Job Queue Service
 * Handles non-blocking background jobs, retries with exponential backoff, and error tracking.
 */
export class JobQueueService {
    /**
     * Enqueue a job
     * @param {string} companyId 
     * @param {string} type 'CREATE_E_INVOICE' | 'SEND_E_INVOICE' | 'SYNC_E_INVOICE' | 'DOWNLOAD_RECEIVED_INVOICE' | 'SEND_PAYMENT_STATUS' | 'RECONCILIATION'
     * @param {Object} payload 
     * @param {Object} [options={}]
     * @returns {Promise<Object>} Created job
     */
    static async enqueue(companyId, type, payload, options = {}) {
        const job = await prisma.eInvoicingJob.create({
            data: {
                companyId,
                type,
                payload,
                status: "PENDING",
                attempts: 0,
                maxAttempts: options.maxAttempts || 5,
                nextRunAt: options.runAt ? new Date(options.runAt) : new Date()
            }
        });

        // Trigger asynchronous processing immediately in the background (non-blocking)
        setImmediate(() => {
            JobQueueService.processNextJob(job.id).catch(err => {
                console.error(`[JobQueueService] Immediate execution error for job ${job.id}:`, err.message);
            });
        });

        return job;
    }

    /**
     * Process a single job by ID with optimistic locking
     * @param {string} jobId 
     */
    static async processNextJob(jobId) {
        const lockWorkerId = `worker_${process.pid}_${Date.now()}`;

        // Attempt to lock job
        const job = await prisma.eInvoicingJob.findFirst({
            where: {
                id: jobId,
                status: { in: ["PENDING", "FAILED"] },
                nextRunAt: { lte: new Date() }
            }
        });

        if (!job || job.attempts >= job.maxAttempts) return null;

        // Lock job
        const updated = await prisma.eInvoicingJob.updateMany({
            where: {
                id: job.id,
                status: job.status,
                lockedAt: null
            },
            data: {
                status: "PROCESSING",
                lockedAt: new Date(),
                lockedBy: lockWorkerId,
                attempts: { increment: 1 }
            }
        });

        if (updated.count === 0) return null; // Another worker picked it up

        try {
            const provider = await ProviderFactory.getProviderForCompany(job.companyId);
            const payload = job.payload || {};

            switch (job.type) {
                case "CREATE_E_INVOICE": {
                    const invoice = await prisma.invoice.findUnique({
                        where: { id: payload.invoiceId },
                        include: { client: true, company: { include: { settings: true } }, lines: true }
                    });
                    if (!invoice) throw new Error(`Invoice ${payload.invoiceId} not found`);

                    const canonical = CanonicalInvoiceMapper.toCanonicalInvoice(invoice);
                    const validation = EInvoicingValidator.validate(canonical);
                    if (!validation.valid) {
                        const errorMsg = validation.errors.map(e => `${e.field}: ${e.message}`).join(", ");
                        throw new Error(`Validation error: ${errorMsg}`);
                    }

                    const result = await provider.createInvoice(job.companyId, canonical, { sendImmediately: payload.sendImmediately === true });

                    await prisma.invoice.update({
                        where: { id: invoice.id },
                        data: {
                            einvoicingStatus: result.status,
                            providerInvoiceId: result.providerInvoiceId,
                            einvoicingProcessedAt: new Date(),
                            einvoicingError: null
                        }
                    });
                    break;
                }

                case "SEND_E_INVOICE": {
                    const invoice = await prisma.invoice.findUnique({
                        where: { id: payload.invoiceId }
                    });
                    if (!invoice) throw new Error(`Invoice ${payload.invoiceId} not found`);
                    if (!invoice.providerInvoiceId) throw new Error(`Invoice ${payload.invoiceId} has no providerInvoiceId`);

                    const result = await provider.sendInvoice(job.companyId, invoice.providerInvoiceId);

                    await prisma.invoice.update({
                        where: { id: invoice.id },
                        data: {
                            einvoicingStatus: result.status,
                            einvoicingSentAt: result.sentAt,
                            einvoicingTransmissionId: result.transmissionId,
                            einvoicingProcessedAt: new Date(),
                            einvoicingError: null
                        }
                    });
                    break;
                }

                case "SYNC_E_INVOICE": {
                    const invoice = await prisma.invoice.findUnique({
                        where: { id: payload.invoiceId }
                    });
                    if (invoice && invoice.providerInvoiceId) {
                        const statusResult = await provider.getInvoiceStatus(job.companyId, invoice.providerInvoiceId);
                        await prisma.invoice.update({
                            where: { id: invoice.id },
                            data: {
                                einvoicingStatus: statusResult.status,
                                einvoicingProcessedAt: new Date()
                            }
                        });
                    }
                    break;
                }

                case "DOWNLOAD_RECEIVED_INVOICE": {
                    const receivedInvoice = await prisma.receivedInvoice.findUnique({
                        where: { id: payload.receivedInvoiceId }
                    });
                    if (receivedInvoice && receivedInvoice.providerInvoiceId) {
                        const doc = await provider.downloadInvoice(job.companyId, receivedInvoice.providerInvoiceId, payload.format || "pdf");
                        // In production, file buffer can be uploaded to Cloudinary/S3; here we record document availability
                        console.log(`[JobQueueService] Downloaded document for received invoice ${receivedInvoice.id} (${doc.data?.length || 0} bytes)`);
                    }
                    break;
                }

                case "SEND_PAYMENT_STATUS": {
                    const invoice = await prisma.invoice.findUnique({
                        where: { id: payload.invoiceId }
                    });
                    if (invoice && invoice.providerInvoiceId) {
                        await provider.sendPaymentStatus(job.companyId, invoice.providerInvoiceId, payload.paymentData || {});
                    }
                    break;
                }

                default:
                    console.warn(`[JobQueueService] Unknown job type: ${job.type}`);
            }

            // Mark job completed
            await prisma.eInvoicingJob.update({
                where: { id: job.id },
                data: {
                    status: "COMPLETED",
                    lockedAt: null,
                    lockedBy: null,
                    lastError: null
                }
            });

            return { success: true, jobId: job.id };
        } catch (error) {
            console.error(`[JobQueueService] Error processing job ${job.id}:`, error.message);

            const isPermanent = error.message.includes("Validation error") || error.status === 400 || error.status === 404;
            const newAttempts = job.attempts + 1;
            const willRetry = !isPermanent && newAttempts < job.maxAttempts;

            // Exponential backoff: 2s, 4s, 8s, 16s...
            const backoffSeconds = Math.pow(2, newAttempts) * 2;
            const nextRunAt = new Date(Date.now() + backoffSeconds * 1000);

            await prisma.eInvoicingJob.update({
                where: { id: job.id },
                data: {
                    status: willRetry ? "PENDING" : "FAILED",
                    lockedAt: null,
                    lockedBy: null,
                    lastError: error.message,
                    nextRunAt: willRetry ? nextRunAt : new Date()
                }
            });

            // If related to an invoice, log error
            if (job.payload && job.payload.invoiceId) {
                await prisma.invoice.update({
                    where: { id: job.payload.invoiceId },
                    data: {
                        einvoicingStatus: "ERROR",
                        einvoicingError: error.message
                    }
                }).catch(() => {});
            }

            throw error;
        }
    }

    /**
     * Polling worker that checks for pending jobs ready to be processed
     */
    static async processPendingJobs(limit = 10) {
        const pendingJobs = await prisma.eInvoicingJob.findMany({
            where: {
                status: "PENDING",
                nextRunAt: { lte: new Date() },
                lockedAt: null
            },
            take: limit,
            orderBy: { nextRunAt: "asc" }
        });

        for (const job of pendingJobs) {
            try {
                await JobQueueService.processNextJob(job.id);
            } catch (err) {
                // Handled in processNextJob
            }
        }
    }
}
