-- CreateEnum
CREATE TYPE "PlanName" AS ENUM ('STARTER', 'PRO', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "PlanBillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('OK', 'WARNING', 'URGENT');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REFUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('OUTGOING', 'INCOMING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_CLIENT_ADDED', 'NEW_MESSAGE_RECEIVED', 'INTERVENTION_COMPLETED', 'INTERVENTION_CREATED', 'INVOICE_PAID', 'INVOICE_OVERDUE', 'MAINTENANCE_URGENT', 'MAINTENANCE_WARNING', 'NEW_QUOTE_REQUEST', 'TECHNICIAN_STARTED', 'PLAN_EXPIRING_SOON', 'PLAN_EXPIRED', 'SMS_LIMIT_WARNING', 'INTERVENTION_ASSIGNED', 'INTERVENTION_UPDATED', 'INTERVENTION_CANCELLED', 'REMINDER_TOMORROW', 'REMINDER_ONE_HOUR');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'SEPA', 'TRANSFER', 'CASH', 'CHEQUE');

-- CreateEnum
CREATE TYPE "AccountingExportType" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AccountingProvider" AS ENUM ('PENNYLANE', 'INDY', 'QUICKBOOKS', 'NONE');

-- CreateEnum
CREATE TYPE "PreferredChannel" AS ENUM ('SMS', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "CatalogItemType" AS ENUM ('PRODUCT', 'SERVICE', 'PACKAGE');

-- CreateEnum
CREATE TYPE "ItemUnit" AS ENUM ('UNITE', 'HEURE', 'FORFAIT', 'METRE', 'M2', 'KG', 'LITRE');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "TvaRate" AS ENUM ('ZERO', 'REDUIT', 'INTERMEDIAIRE', 'NORMAL');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" "PlanName" NOT NULL,
    "displayName" TEXT NOT NULL,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "priceAnnual" DOUBLE PRECISION NOT NULL,
    "maxClients" INTEGER NOT NULL,
    "maxTechnicians" INTEGER NOT NULL,
    "maxSmsPerMonth" INTEGER NOT NULL,
    "extraSmsCost" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "hasMobileApp" BOOLEAN NOT NULL DEFAULT false,
    "hasAutoSmsReminders" BOOLEAN NOT NULL DEFAULT false,
    "hasAdvancedReports" BOOLEAN NOT NULL DEFAULT false,
    "hasChorusPro" BOOLEAN NOT NULL DEFAULT false,
    "hasDedicatedSmsNumber" BOOLEAN NOT NULL DEFAULT false,
    "hasAccountManager" BOOLEAN NOT NULL DEFAULT false,
    "hasPrioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "hasPremiumSettings" BOOLEAN NOT NULL DEFAULT false,
    "stripeMonthlyPriceId" TEXT,
    "stripeAnnualPriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siret" TEXT,
    "siren" TEXT,
    "tvaNumber" TEXT,
    "legalForm" TEXT,
    "rcsNumber" TEXT,
    "shareCapital" TEXT,
    "nafCode" TEXT,
    "isTvaFranchise" BOOLEAN NOT NULL DEFAULT false,
    "isSubcontractor" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "slug" TEXT,
    "smsNumber" TEXT,
    "stripeAccountId" TEXT,
    "stripeAccountStatus" TEXT,
    "onlinePaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyTradeCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tradeCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyTradeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'TRIALING',
    "cycle" "PlanBillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "smsUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "smsResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL,
    "method" "PaymentMethod",
    "stripePaymentIntentId" TEXT,
    "stripeInvoiceUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "defaultChannelReminder" "PreferredChannel" NOT NULL DEFAULT 'SMS',
    "defaultChannelQuote" "PreferredChannel" NOT NULL DEFAULT 'EMAIL',
    "defaultChannelInvoice" "PreferredChannel" NOT NULL DEFAULT 'EMAIL',
    "defaultChannelConfirm" "PreferredChannel" NOT NULL DEFAULT 'SMS',
    "smsReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "smsSecondReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsSecondReminderDays" INTEGER NOT NULL DEFAULT 7,
    "smsReminderTemplate" TEXT,
    "smsSignature" TEXT,
    "notifyNewClient" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewMessage" BOOLEAN NOT NULL DEFAULT true,
    "notifyInterventionDone" BOOLEAN NOT NULL DEFAULT true,
    "notifyInvoicePaid" BOOLEAN NOT NULL DEFAULT true,
    "notifyUrgentMaintenance" BOOLEAN NOT NULL DEFAULT true,
    "notifyQuoteRequest" BOOLEAN NOT NULL DEFAULT true,
    "notifyPlanExpiring" BOOLEAN NOT NULL DEFAULT true,
    "notifySmsLimit" BOOLEAN NOT NULL DEFAULT true,
    "notifyTechAssigned" BOOLEAN NOT NULL DEFAULT true,
    "notifyTechUpdated" BOOLEAN NOT NULL DEFAULT true,
    "notifyTechCancelled" BOOLEAN NOT NULL DEFAULT true,
    "notifyTechReminder24h" BOOLEAN NOT NULL DEFAULT true,
    "notifyTechReminder1h" BOOLEAN NOT NULL DEFAULT true,
    "ownerChannels" "NotificationChannel"[] DEFAULT ARRAY['PUSH', 'IN_APP']::"NotificationChannel"[],
    "techChannels" "NotificationChannel"[] DEFAULT ARRAY['PUSH', 'IN_APP']::"NotificationChannel"[],
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceNextNumber" INTEGER NOT NULL DEFAULT 1,
    "quotePrefix" TEXT NOT NULL DEFAULT 'D',
    "quoteNextNumber" INTEGER NOT NULL DEFAULT 1,
    "invoiceFooter" TEXT,
    "invoiceConditions" TEXT,
    "defaultTvaRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "defaultPaymentDays" INTEGER NOT NULL DEFAULT 30,
    "defaultValidDays" INTEGER NOT NULL DEFAULT 30,
    "workStartHour" INTEGER NOT NULL DEFAULT 8,
    "workEndHour" INTEGER NOT NULL DEFAULT 18,
    "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshTokenHash" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device" TEXT,
    "platform" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "type" "CatalogItemType" NOT NULL,
    "defaultPrice" DOUBLE PRECISION NOT NULL,
    "tvaRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "unit" "ItemUnit" NOT NULL DEFAULT 'UNITE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionTypeItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterventionTypeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "postalCode" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "ClientStatus" NOT NULL DEFAULT 'OK',
    "source" TEXT,
    "preferredChannel" "PreferredChannel" NOT NULL DEFAULT 'SMS',
    "channelForReminder" "PreferredChannel",
    "channelForQuote" "PreferredChannel",
    "channelForInvoice" "PreferredChannel",
    "channelForConfirm" "PreferredChannel",
    "sirenNumber" TEXT,
    "clientTvaNumber" TEXT,
    "clientLegalForm" TEXT,
    "clientNafCode" TEXT,
    "hasDeliveryAddress" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAddress" TEXT,
    "deliveryCity" TEXT,
    "deliveryPostalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "power" TEXT,
    "location" TEXT,
    "tradeSlug" TEXT,
    "installDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "lastServiceDate" TIMESTAMP(3),
    "nextServiceDate" TIMESTAMP(3),
    "serviceInterval" INTEGER NOT NULL DEFAULT 12,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "technicianId" TEXT,
    "createdById" TEXT,
    "interventionTypeId" TEXT,
    "status" "InterventionStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "estimatedDuration" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "accessCode" TEXT,
    "techNotes" TEXT,
    "materialsUsed" TEXT,
    "clientSignature" TEXT,
    "clientSignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionPhoto" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'after',
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "interventionId" TEXT,
    "interventionTypeId" TEXT,
    "number" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "amountHT" DOUBLE PRECISION NOT NULL,
    "tvaRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "amountTTC" DOUBLE PRECISION NOT NULL,
    "subject" TEXT,
    "notes" TEXT,
    "conditions" TEXT,
    "validUntil" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "refusedAt" TIMESTAMP(3),
    "serviceDate" TIMESTAMP(3),
    "operationType" TEXT DEFAULT 'services',
    "depositPercent" DOUBLE PRECISION,
    "depositAmount" DOUBLE PRECISION,
    "paymentConditions" TEXT,
    "signatureToken" TEXT,
    "signatureTokenExpiry" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureUrl" TEXT,
    "signatureIp" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "emailSentTo" TEXT,
    "reminder1SentAt" TIMESTAMP(3),
    "reminder2SentAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "tvaRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "unit" "ItemUnit" NOT NULL DEFAULT 'UNITE',
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "interventionId" TEXT,
    "sourceQuoteId" TEXT,
    "interventionTypeId" TEXT,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "amountHT" DOUBLE PRECISION NOT NULL,
    "tvaRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "amountTTC" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceDate" TIMESTAMP(3),
    "operationType" TEXT DEFAULT 'services',
    "penaltyRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "recoveryFee" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "discountTerms" TEXT DEFAULT 'Aucun escompte pour paiement anticipé',
    "tvaOnDebit" BOOLEAN NOT NULL DEFAULT false,
    "isTvaFranchise" BOOLEAN NOT NULL DEFAULT false,
    "isAutoLiquidation" BOOLEAN NOT NULL DEFAULT false,
    "orderNumber" TEXT,
    "workDescription" TEXT,
    "subject" TEXT,
    "notes" TEXT,
    "conditions" TEXT,
    "paymentMethod" "PaymentMethod",
    "paymentRef" TEXT,
    "pdfUrl" TEXT,
    "onlinePaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutUrl" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "paymentToken" TEXT,
    "paymentTokenExpiry" TIMESTAMP(3),
    "paymentLinkOpenedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "emailSentTo" TEXT,
    "reminder1SentAt" TIMESTAMP(3),
    "reminder2SentAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "tvaRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "unit" "ItemUnit" NOT NULL DEFAULT 'UNITE',
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "channel" "PreferredChannel" NOT NULL DEFAULT 'SMS',
    "body" TEXT NOT NULL,
    "subject" TEXT,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "fromEmail" TEXT,
    "toEmail" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "twilioSid" TEXT,
    "status" TEXT,
    "autoType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsUsage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "extraCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "tradeSlug" TEXT,
    "message" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingExport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "type" "AccountingExportType" NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTva0" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTva55" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTva10" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTva20" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTvaAll" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "paidCount" INTEGER NOT NULL DEFAULT 0,
    "pennylaneExportedAt" TIMESTAMP(3),
    "indyExportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvaSummary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "caHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tva0" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tva55" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tva10" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tva20" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDeclared" BOOLEAN NOT NULL DEFAULT false,
    "declaredAt" TIMESTAMP(3),
    "declaredBy" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvaSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingIntegration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "AccountingProvider" NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "organizationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "syncOnCreate" BOOLEAN NOT NULL DEFAULT false,
    "syncOnSend" BOOLEAN NOT NULL DEFAULT true,
    "syncOnPaid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePaymentEvent" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stripeEventId" TEXT,
    "stripeData" JSONB,
    "clientIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'SUPPORT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "refreshTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "device" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_siret_key" ON "Company"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "Company_siren_key" ON "Company"("siren");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripeAccountId_key" ON "Company"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyTradeCategory_companyId_tradeCategoryId_key" ON "CompanyTradeCategory"("companyId", "tradeCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeCategory_name_key" ON "TradeCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TradeCategory_slug_key" ON "TradeCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_companyId_key" ON "Subscription"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_companyId_key" ON "CompanySettings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_companyId_email_key" ON "Invitation"("companyId", "email");

-- CreateIndex
CREATE INDEX "CatalogItem_companyId_idx" ON "CatalogItem"("companyId");

-- CreateIndex
CREATE INDEX "CatalogItem_companyId_isActive_idx" ON "CatalogItem"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "CatalogItem_companyId_usageCount_idx" ON "CatalogItem"("companyId", "usageCount");

-- CreateIndex
CREATE INDEX "InterventionTypeItem_companyId_idx" ON "InterventionTypeItem"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "InterventionTypeItem_companyId_name_key" ON "InterventionTypeItem"("companyId", "name");

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE INDEX "Client_companyId_status_idx" ON "Client"("companyId", "status");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "Equipment_clientId_idx" ON "Equipment"("clientId");

-- CreateIndex
CREATE INDEX "Equipment_nextServiceDate_idx" ON "Equipment"("nextServiceDate");

-- CreateIndex
CREATE INDEX "Intervention_companyId_idx" ON "Intervention"("companyId");

-- CreateIndex
CREATE INDEX "Intervention_technicianId_idx" ON "Intervention"("technicianId");

-- CreateIndex
CREATE INDEX "Intervention_scheduledAt_idx" ON "Intervention"("scheduledAt");

-- CreateIndex
CREATE INDEX "Intervention_status_idx" ON "Intervention"("status");

-- CreateIndex
CREATE INDEX "Intervention_companyId_status_idx" ON "Intervention"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_interventionId_key" ON "Quote"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_signatureToken_key" ON "Quote"("signatureToken");

-- CreateIndex
CREATE INDEX "Quote_companyId_idx" ON "Quote"("companyId");

-- CreateIndex
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "QuoteLine_quoteId_idx" ON "QuoteLine"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteLine_catalogItemId_idx" ON "QuoteLine"("catalogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_interventionId_key" ON "Invoice"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_sourceQuoteId_key" ON "Invoice"("sourceQuoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripePaymentIntentId_key" ON "Invoice"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeCheckoutSessionId_key" ON "Invoice"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentToken_key" ON "Invoice"("paymentToken");

-- CreateIndex
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueAt_idx" ON "Invoice"("dueAt");

-- CreateIndex
CREATE INDEX "Invoice_stripePaymentIntentId_idx" ON "Invoice"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Invoice_paymentToken_idx" ON "Invoice"("paymentToken");

-- CreateIndex
CREATE INDEX "Invoice_companyId_status_idx" ON "Invoice"("companyId", "status");

-- CreateIndex
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLine_catalogItemId_idx" ON "InvoiceLine"("catalogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsLog_twilioSid_key" ON "SmsLog"("twilioSid");

-- CreateIndex
CREATE INDEX "SmsLog_companyId_idx" ON "SmsLog"("companyId");

-- CreateIndex
CREATE INDEX "SmsLog_clientId_idx" ON "SmsLog"("clientId");

-- CreateIndex
CREATE INDEX "SmsLog_clientId_createdAt_idx" ON "SmsLog"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_toNumber_idx" ON "SmsLog"("toNumber");

-- CreateIndex
CREATE INDEX "SmsLog_fromNumber_idx" ON "SmsLog"("fromNumber");

-- CreateIndex
CREATE INDEX "SmsLog_isRead_idx" ON "SmsLog"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "SmsUsage_companyId_month_year_key" ON "SmsUsage"("companyId", "month", "year");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_companyId_idx" ON "QuoteRequest"("companyId");

-- CreateIndex
CREATE INDEX "QuoteRequest_isProcessed_idx" ON "QuoteRequest"("isProcessed");

-- CreateIndex
CREATE INDEX "AccountingExport_companyId_idx" ON "AccountingExport"("companyId");

-- CreateIndex
CREATE INDEX "AccountingExport_companyId_periodStart_idx" ON "AccountingExport"("companyId", "periodStart");

-- CreateIndex
CREATE INDEX "TvaSummary_companyId_idx" ON "TvaSummary"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TvaSummary_companyId_quarter_year_key" ON "TvaSummary"("companyId", "quarter", "year");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingIntegration_companyId_key" ON "AccountingIntegration"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentEvent_stripeEventId_key" ON "InvoicePaymentEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "InvoicePaymentEvent_invoiceId_idx" ON "InvoicePaymentEvent"("invoiceId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "CompanyTradeCategory" ADD CONSTRAINT "CompanyTradeCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTradeCategory" ADD CONSTRAINT "CompanyTradeCategory_tradeCategoryId_fkey" FOREIGN KEY ("tradeCategoryId") REFERENCES "TradeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionTypeItem" ADD CONSTRAINT "InterventionTypeItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_interventionTypeId_fkey" FOREIGN KEY ("interventionTypeId") REFERENCES "InterventionTypeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionPhoto" ADD CONSTRAINT "InterventionPhoto_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_interventionTypeId_fkey" FOREIGN KEY ("interventionTypeId") REFERENCES "InterventionTypeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_interventionTypeId_fkey" FOREIGN KEY ("interventionTypeId") REFERENCES "InterventionTypeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsUsage" ADD CONSTRAINT "SmsUsage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingExport" ADD CONSTRAINT "AccountingExport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvaSummary" ADD CONSTRAINT "TvaSummary_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingIntegration" ADD CONSTRAINT "AccountingIntegration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentEvent" ADD CONSTRAINT "InvoicePaymentEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
