// List of prominent French & European banks with BIC codes, colors and brand icons
export const FRENCH_BANKS = [
    {
        id: "lbp",
        name: "La Banque Postale",
        shortName: "LBP",
        bic: "PSSTFRPPXXX",
        bankCode: "20041",
        color: "#004B93",
        bgColor: "#004B93",
        textColor: "#FFD200",
        tag: "Poste",
        logoLetter: "LBP"
    },
    {
        id: "bnp",
        name: "BNP Paribas",
        shortName: "BNP",
        bic: "BNPAFRPPXXX",
        bankCode: "30004",
        color: "#00965E",
        bgColor: "#00965E",
        textColor: "#FFFFFF",
        tag: "BNP",
        logoLetter: "BNP"
    },
    {
        id: "ca",
        name: "Crédit Agricole",
        shortName: "CA",
        bic: "AGRIFRPPXXX",
        bankCode: "18206",
        color: "#008375",
        bgColor: "#008375",
        textColor: "#FFFFFF",
        tag: "Agricole",
        logoLetter: "CA"
    },
    {
        id: "sg",
        name: "Société Générale",
        shortName: "SG",
        bic: "SOGEFRPPXXX",
        bankCode: "30003",
        color: "#E2001A",
        bgColor: "#E2001A",
        textColor: "#FFFFFF",
        tag: "SocGen",
        logoLetter: "SG"
    },
    {
        id: "bourso",
        name: "BoursoBank (Boursorama Pro)",
        shortName: "BoursoBank",
        bic: "BOUSFRPPXXX",
        bankCode: "40618",
        color: "#E6007E",
        bgColor: "#E6007E",
        textColor: "#FFFFFF",
        tag: "Bourso",
        logoLetter: "BB"
    },
    {
        id: "qonto",
        name: "Qonto (Olinda SAS)",
        shortName: "Qonto",
        bic: "QNTOFRPPXXX",
        bankCode: "16688",
        color: "#6941C6",
        bgColor: "#6941C6",
        textColor: "#FFFFFF",
        tag: "Qonto",
        logoLetter: "Q"
    },
    {
        id: "shine",
        name: "Shine (Groupe Société Générale)",
        shortName: "Shine",
        bic: "SHINFRPPXXX",
        bankCode: "17298",
        color: "#FF6B4A",
        bgColor: "#FF6B4A",
        textColor: "#FFFFFF",
        tag: "Shine",
        logoLetter: "S"
    },
    {
        id: "cm",
        name: "Crédit Mutuel",
        shortName: "Crédit Mutuel",
        bic: "CMCIFRPPXXX",
        bankCode: "10278",
        color: "#E30613",
        bgColor: "#E30613",
        textColor: "#FFFFFF",
        tag: "Mutuel",
        logoLetter: "CM"
    },
    {
        id: "cic",
        name: "CIC (Crédit Industriel et Commercial)",
        shortName: "CIC",
        bic: "CICEFRPPXXX",
        bankCode: "30066",
        color: "#00558F",
        bgColor: "#00558F",
        textColor: "#FFFFFF",
        tag: "CIC",
        logoLetter: "CIC"
    },
    {
        id: "lcl",
        name: "LCL (Le Crédit Lyonnais)",
        shortName: "LCL",
        bic: "LCLYFRPPXXX",
        bankCode: "30002",
        color: "#002F6C",
        bgColor: "#002F6C",
        textColor: "#FFD200",
        tag: "LCL",
        logoLetter: "LCL"
    },
    {
        id: "ce",
        name: "Caisse d'Épargne",
        shortName: "Caisse d'Épargne",
        bic: "CEPAFRPPXXX",
        bankCode: "17515",
        color: "#D6001C",
        bgColor: "#D6001C",
        textColor: "#FFFFFF",
        tag: "Épargne",
        logoLetter: "CE"
    },
    {
        id: "bp",
        name: "Banque Populaire",
        shortName: "Banque Populaire",
        bic: "BPOPFRPPXXX",
        bankCode: "10107",
        color: "#003778",
        bgColor: "#003778",
        textColor: "#00B2E3",
        tag: "Populaire",
        logoLetter: "BP"
    },
    {
        id: "revolut",
        name: "Revolut Business (Succursale France)",
        shortName: "Revolut",
        bic: "REVOFRP2XXX",
        bankCode: "10058",
        color: "#191C1F",
        bgColor: "#191C1F",
        textColor: "#FFFFFF",
        tag: "Revolut",
        logoLetter: "R"
    },
    {
        id: "n26",
        name: "N26 Bank",
        shortName: "N26",
        bic: "NTSBDEB1XXX",
        bankCode: "N26",
        color: "#36A18B",
        bgColor: "#36A18B",
        textColor: "#FFFFFF",
        tag: "N26",
        logoLetter: "N26"
    },
    {
        id: "other",
        name: "Autre établissement bancaire",
        shortName: "Autre",
        bic: "",
        bankCode: "",
        color: "#475569",
        bgColor: "#475569",
        textColor: "#FFFFFF",
        tag: "Banque",
        logoLetter: "🏛️"
    }
];

// Clean and format IBAN into 4-character blocks (e.g. FR76 3000 3020 ...)
export function formatIBAN(raw) {
    if (!raw) return "";
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return clean.match(/.{1,4}/g)?.join(" ") || clean;
}

// Clean and format BIC (e.g. BNPAFRPPXXX)
export function formatBIC(raw) {
    if (!raw) return "";
    return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 11);
}

// Validate IBAN using standard ISO 7064 Modulo 97-10 algorithm
export function validateIBAN(iban) {
    if (!iban) return { valid: false, message: "IBAN requis" };
    
    const clean = iban.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    
    // Check length
    if (clean.length < 14 || clean.length > 34) {
        return { valid: false, message: "Longueur IBAN invalide" };
    }

    // Check country code
    const country = clean.substring(0, 2);
    if (country === "FR" && clean.length !== 27) {
        return { valid: false, message: "Un IBAN français doit comporter exactement 27 caractères" };
    }

    // Rearrange: move first 4 chars to the end
    const rearranged = clean.substring(4) + clean.substring(0, 4);

    // Convert letters to numbers: A=10, B=11, ..., Z=35
    let digits = "";
    for (let i = 0; i < rearranged.length; i++) {
        const charCode = rearranged.charCodeAt(i);
        if (charCode >= 65 && charCode <= 90) {
            digits += (charCode - 55).toString();
        } else if (charCode >= 48 && charCode <= 57) {
            digits += rearranged[i];
        } else {
            return { valid: false, message: "Caractères non autorisés" };
        }
    }

    // Calculate modulo 97 with BigInt for safety
    try {
        const remainder = BigInt(digits) % 97n;
        if (remainder === 1n) {
            // Detect French bank from 5-digit bank code (chars 5-9 in clean IBAN)
            let detectedBank = null;
            if (country === "FR" && clean.length >= 9) {
                const codeBanque = clean.substring(4, 9);
                detectedBank = FRENCH_BANKS.find(b => b.bankCode === codeBanque);
            }

            return {
                valid: true,
                message: "IBAN officiel valide (ISO 13616)",
                country,
                detectedBank
            };
        } else {
            return { valid: false, message: "Clé de contrôle IBAN invalide (erreur de saisie)" };
        }
    } catch (e) {
        return { valid: false, message: "Erreur de validation de l'IBAN" };
    }
}

// Validate BIC format (8 or 11 characters)
export function validateBIC(bic) {
    if (!bic) return { valid: false, message: "Code BIC requis" };
    const clean = bic.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const bicRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    if (bicRegex.test(clean)) {
        return { valid: true, message: "Code BIC / SWIFT valide" };
    }
    return { valid: false, message: "Le BIC doit comporter 8 ou 11 caractères valides (ex: BNPAFRPPXXX)" };
}
