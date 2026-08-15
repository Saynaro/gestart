/**
 * Canonical Data Types and Business Terms (BT) dictionary
 * compliant with EN 16931 European Standard and French DGFiP/AIFE Specifications
 */

// EN 16931 Business Terms Dictionary
export const EN16931_BT = {
    INVOICE_NUMBER: "BT-1",
    ISSUE_DATE: "BT-2",
    INVOICE_TYPE_CODE: "BT-3",
    CURRENCY_CODE: "BT-5",
    TAX_POINT_DATE: "BT-7",
    PAYMENT_DUE_DATE: "BT-9",
    BUYER_REFERENCE: "BT-10",
    PROJECT_REFERENCE: "BT-11",
    CONTRACT_REFERENCE: "BT-12",
    PURCHASE_ORDER_REFERENCE: "BT-13",
    ORDER_REFERENCE: "BT-14",
    RECEIPT_REFERENCE: "BT-15",
    DISPATCH_REFERENCE: "BT-16",
    ORIGINATOR_REFERENCE: "BT-17",
    PREVIOUS_INVOICE_REFERENCE: "BT-25",
    PREVIOUS_INVOICE_DATE: "BT-26",
    
    // Seller (BT-27 to BT-43)
    SELLER_NAME: "BT-27",
    SELLER_TRADING_NAME: "BT-28",
    SELLER_IDENTIFIER_SIREN: "BT-29",
    SELLER_LEGAL_REGISTRATION_SIRET: "BT-30",
    SELLER_VAT_IDENTIFIER: "BT-31",
    SELLER_TAX_REGISTRATION: "BT-32",
    SELLER_ADDRESS_LINE1: "BT-35",
    SELLER_CITY: "BT-37",
    SELLER_POSTAL_CODE: "BT-38",
    SELLER_COUNTRY_CODE: "BT-40",
    SELLER_ELECTRONIC_ADDRESS: "BT-34",
    SELLER_CONTACT_NAME: "BT-41",
    SELLER_CONTACT_PHONE: "BT-42",
    SELLER_CONTACT_EMAIL: "BT-43",

    // Buyer (BT-44 to BT-59)
    BUYER_NAME: "BT-44",
    BUYER_TRADING_NAME: "BT-45",
    BUYER_IDENTIFIER_SIREN: "BT-46",
    BUYER_LEGAL_REGISTRATION_SIRET: "BT-47",
    BUYER_VAT_IDENTIFIER: "BT-48",
    BUYER_ELECTRONIC_ADDRESS: "BT-49",
    BUYER_ADDRESS_LINE1: "BT-50",
    BUYER_CITY: "BT-52",
    BUYER_POSTAL_CODE: "BT-53",
    BUYER_COUNTRY_CODE: "BT-55",

    // Delivery (BT-70 to BT-80)
    DELIVERY_NAME: "BT-70",
    DELIVERY_ADDRESS_LINE1: "BT-75",
    DELIVERY_CITY: "BT-77",
    DELIVERY_POSTAL_CODE: "BT-78",
    DELIVERY_COUNTRY_CODE: "BT-80",
    ACTUAL_DELIVERY_DATE: "BT-72",

    // Payment & Banking (BT-81 to BT-91)
    PAYMENT_MEANS_CODE: "BT-81",
    PAYMENT_MEANS_TEXT: "BT-82",
    PAYMENT_ID: "BT-83",
    PAYEE_IBAN: "BT-84",
    PAYEE_BIC: "BT-86",
    PAYMENT_TERMS: "BT-20",

    // Allowances & Charges (BT-92 to BT-105)
    ALLOWANCE_AMOUNT: "BT-92",
    ALLOWANCE_PERCENT: "BT-94",
    ALLOWANCE_REASON: "BT-97",

    // Totals (BT-106 to BT-115)
    SUM_LINE_NET_AMOUNT: "BT-106",
    SUM_ALLOWANCES: "BT-107",
    SUM_CHARGES: "BT-108",
    TOTAL_TAX_EXCLUSIVE_AMOUNT: "BT-109",
    TOTAL_TAX_AMOUNT: "BT-110",
    TOTAL_TAX_INCLUSIVE_AMOUNT: "BT-112",
    PREPAID_AMOUNT: "BT-113",
    ROUNDING_AMOUNT: "BT-114",
    PAYABLE_AMOUNT: "BT-115",

    // VAT Breakdown (BT-116 to BT-125)
    VAT_CATEGORY_TAXABLE_AMOUNT: "BT-116",
    VAT_CATEGORY_TAX_AMOUNT: "BT-117",
    VAT_CATEGORY_CODE: "BT-118",
    VAT_CATEGORY_RATE: "BT-119",
    VAT_EXEMPTION_REASON_TEXT: "BT-120",
    VAT_EXEMPTION_REASON_CODE: "BT-121",

    // Lines (BT-126 to BT-165)
    LINE_IDENTIFIER: "BT-126",
    LINE_NOTE: "BT-127",
    LINE_INVOICED_QUANTITY: "BT-129",
    LINE_UNIT_CODE: "BT-130",
    LINE_NET_AMOUNT: "BT-131",
    LINE_PURCHASE_ORDER_REF: "BT-132",
    LINE_ALLOWANCE_AMOUNT: "BT-136",
    LINE_ALLOWANCE_PERCENT: "BT-138",
    LINE_ITEM_PRICE: "BT-146",
    LINE_ITEM_BASE_QUANTITY: "BT-149",
    LINE_VAT_CATEGORY_CODE: "BT-151",
    LINE_VAT_RATE: "BT-152",
    LINE_ITEM_NAME: "BT-153",
    LINE_ITEM_DESCRIPTION: "BT-154",
    LINE_SELLER_ITEM_ID: "BT-155",
};

// UNTDID 1001 Document Types
export const INVOICE_TYPE = {
    COMMERCIAL_INVOICE: "380", // Facture commerciale
    CREDIT_NOTE: "381",        // Avoir / Note de crédit
    DEBIT_NOTE: "383",         // Note de débit
    PREPAYMENT_INVOICE: "386", // Facture d'acompte
};

// UNTDID 5305 VAT Categories
export const VAT_CATEGORY = {
    STANDARD: "S",             // Taux normal (20%, 10%, 5.5%)
    ZERO_RATED: "Z",           // Taux 0%
    EXEMPT: "E",               // Exonéré (art. 293 B CGI franchise en base)
    REVERSE_CHARGE: "AE",      // Autoliquidation BTP (art. 283-2 nonies CGI)
    INTRA_COMMUNITY: "K",      // Livraison intracommunautaire exonérée
    EXPORT: "G",               // Exportation hors UE
};

// French Legal Operation Natures
export const OPERATION_NATURE = {
    SERVICES: "services", // Prestations de services
    GOODS: "biens",       // Livraisons de biens matériels
    MIXED: "mixte",       // Mixte (biens et services)
};

// Standard UNTDID 4461 Payment Means Codes
export const PAYMENT_MEANS = {
    BANK_TRANSFER: "42",  // Virement bancaire (SEPA)
    DIRECT_DEBIT: "49",   // Prélèvement SEPA
    CREDIT_CARD: "48",    // Carte bancaire
    CHEQUE: "20",         // Chèque
    CASH: "10",           // Espèces
    OTHER: "1",           // Autre moyen
};

// Standard Internal E-Invoicing Statuses
export const INTERNAL_EINVOICING_STATUS = {
    DRAFT: "DRAFT",
    PROCESSING: "PROCESSING",
    SENT: "SENT",
    RECEIVED: "RECEIVED",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
    PAID: "PAID",
    ERROR: "ERROR",
};
