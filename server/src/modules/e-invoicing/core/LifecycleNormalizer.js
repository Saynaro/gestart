/**
 * E-Invoicing Lifecycle Normalizer (XP Z12-012 / CDAR)
 * Normalizes provider-specific invoice statuses into standardized lifecycle states.
 */

export const NORMALIZED_STATUSES = {
    DRAFT: "DRAFT",
    PROCESSING: "PROCESSING",
    SUBMITTED: "SUBMITTED",     // Déposée sur la PA
    DELIVERED: "DELIVERED",     // Mise à disposition du destinataire
    RECEIVED: "RECEIVED",       // Prise en charge par le client
    ACCEPTED: "ACCEPTED",       // Approuvée
    REJECTED: "REJECTED",       // Refusée par le destinataire ou l'annuaire
    DISPUTED: "DISPUTED",       // En litige
    PARTIALLY_PAID: "PARTIALLY_PAID",
    PAID: "PAID",               // Réglée
    CANCELLED: "CANCELLED"      // Annulée
};

export const STATUS_LABELS_FR = {
    DRAFT: "Brouillon",
    PROCESSING: "En cours d'émission",
    SUBMITTED: "Déposée sur la Plateforme Agréée",
    DELIVERED: "Mise à disposition",
    RECEIVED: "Reçue",
    ACCEPTED: "Acceptée",
    REJECTED: "Rejetée",
    DISPUTED: "En litige",
    PARTIALLY_PAID: "Partiellement payée",
    PAID: "Payée",
    CANCELLED: "Annulée"
};

export class LifecycleNormalizer {
    /**
     * Map provider status code to normalized status
     * @param {string} providerId
     * @param {string} rawStatus
     * @returns {string}
     */
    static normalizeStatus(providerId, rawStatus) {
        if (!rawStatus) return NORMALIZED_STATUSES.DRAFT;
        const normalizedRaw = String(rawStatus).toUpperCase().trim();

        // 1. B2Brouter status mapping
        if (providerId?.toUpperCase() === "B2BROUTER") {
            switch (normalizedRaw) {
                case "NEW":
                case "DRAFT":
                    return NORMALIZED_STATUSES.DRAFT;
                case "PENDING":
                case "PROCESSING":
                case "SENDING":
                    return NORMALIZED_STATUSES.PROCESSING;
                case "SENT":
                case "DELIVERED":
                    return NORMALIZED_STATUSES.DELIVERED;
                case "RECEIVED":
                case "READ":
                    return NORMALIZED_STATUSES.RECEIVED;
                case "ACCEPTED":
                case "APPROVED":
                    return NORMALIZED_STATUSES.ACCEPTED;
                case "REJECTED":
                case "REFUSED":
                case "ERROR":
                    return NORMALIZED_STATUSES.REJECTED;
                case "PAID":
                case "SETTLED":
                    return NORMALIZED_STATUSES.PAID;
                case "CANCELLED":
                case "VOID":
                    return NORMALIZED_STATUSES.CANCELLED;
                default:
                    return NORMALIZED_STATUSES.SUBMITTED;
            }
        }

        // 2. Qonto status mapping
        if (providerId?.toUpperCase() === "QONTO") {
            switch (normalizedRaw) {
                case "DRAFT":
                    return NORMALIZED_STATUSES.DRAFT;
                case "UNPAID":
                case "PENDING":
                    return NORMALIZED_STATUSES.DELIVERED;
                case "PAID":
                    return NORMALIZED_STATUSES.PAID;
                case "CANCELLED":
                    return NORMALIZED_STATUSES.CANCELLED;
                default:
                    return NORMALIZED_STATUSES.DELIVERED;
            }
        }

        // 3. Fallback standard mapping
        if (Object.values(NORMALIZED_STATUSES).includes(normalizedRaw)) {
            return normalizedRaw;
        }

        return NORMALIZED_STATUSES.SUBMITTED;
    }

    /**
     * Get user-facing French label for status
     * @param {string} status
     * @returns {string}
     */
    static getStatusLabel(status) {
        return STATUS_LABELS_FR[status] || status || "Inconnu";
    }

    /**
     * Determine if a status transition is valid
     * @param {string} currentStatus
     * @param {string} targetStatus
     * @returns {boolean}
     */
    static isValidTransition(currentStatus, targetStatus) {
        if (!currentStatus || currentStatus === targetStatus) return true;
        if (currentStatus === NORMALIZED_STATUSES.CANCELLED) return false;
        if (currentStatus === NORMALIZED_STATUSES.PAID && targetStatus !== NORMALIZED_STATUSES.CANCELLED) return false;
        return true;
    }
}
