import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from environment or secrets
 */
function getEncryptionKey() {
    const rawSecret = process.env.EINVOICING_ENCRYPTION_KEY || 
                      process.env.JWT_ACCESS_SECRET || 
                      process.env.JWT_SECRET || 
                      "gestart_einvoicing_master_secret_2026_key";
    
    return crypto.createHash("sha256").update(rawSecret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param {string} text 
 * @returns {string|null} base64-encoded encrypted payload: iv + tag + ciphertext
 */
export function encryptCredential(text) {
    if (!text || typeof text !== "string") return null;

    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, "utf8");
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        const tag = cipher.getAuthTag();

        // Combined buffer: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
        const combined = Buffer.concat([iv, tag, encrypted]);
        return combined.toString("base64");
    } catch (error) {
        console.error("Encryption error:", error.message);
        throw new Error("Failed to encrypt credential");
    }
}

/**
 * Decrypt a base64-encoded AES-256-GCM string
 * @param {string} encryptedBase64 
 * @returns {string|null} original plaintext
 */
export function decryptCredential(encryptedBase64) {
    if (!encryptedBase64 || typeof encryptedBase64 !== "string") return null;

    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(encryptedBase64, "base64");

        if (combined.length < IV_LENGTH + TAG_LENGTH) {
            throw new Error("Invalid encrypted payload length");
        }

        const iv = combined.subarray(0, IV_LENGTH);
        const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(ciphertext, undefined, "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (error) {
        console.error("Decryption error:", error.message);
        throw new Error("Failed to decrypt credential");
    }
}
