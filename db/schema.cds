namespace monitoring;

// ============================================
// INTERFACE LOG - Main error/event log table
// ============================================
entity InterfaceLog {
    key ID              : UUID;
        // Required fields (minimum payload)
        timestamp       : DateTime not null;
        sourceSystem    : String(50) not null; // CPI, MULESOFT, IVALUA
        level           : String(20) not null; // ERROR, WARN, INFO, DEBUG
        message         : String(500) not null;
        // Optional fields (system-dependent)
        sourceComponent : String(200); // iFlow name, Mule app, ETL job
        description     : LargeString; // Detailed description
        interfaceName   : String(200); // Business interface ID (e.g., PO_CREATE)
        correlationId   : String(100); // End-to-end tracing ID
        businessDocId   : String(100); // PO/PR/Contract number
        businessDocType : String(50); // PO, PR, CONTRACT, INVOICE
        status          : String(20); // FAILED, SUCCESS, RETRY, PENDING
        errorType       : String(100); // Error category/type
        httpStatusCode  : Integer; // HTTP status if applicable
        details         : LargeString; // JSON payload or stack trace
        retryCount      : Integer default 0; // Number of retry attempts

        // Resolution tracking
        resolvedAt      : DateTime; // When issue was resolved
        resolvedBy      : String(100); // Who resolved it
}

// ============================================
// INTERFACE CONFIG - Reference data (one-time load)
// ============================================
entity InterfaceConfig {
    key ID            : UUID;
        interfaceCode : String(50) not null; // Unique interface ID (e.g., CPI_PO_CREATE)
        displayName   : String(200) not null; // Human-readable name
        sourceSystem  : String(50) not null; // CPI, MULESOFT, IVALUA
        direction     : String(20); // INBOUND, OUTBOUND, BIDIRECTIONAL
        frequency     : String(20); // REALTIME, HOURLY, DAILY, ON_DEMAND
        owner         : String(100); // AMS team responsible
        criticality   : String(20); // HIGH, MEDIUM, LOW
        description   : String(500); // What this interface does
        isActive      : Boolean default true; // Is interface currently active?
}

// ============================================
// PROCUREMENT STATS - Business metrics (daily sync from Ivalua)
// ============================================
entity ProcurementStat {
    key ID            : UUID;
        timestamp     : DateTime not null; // When snapshot was taken
        statType      : String(50) not null; // PO_COUNT, PR_COUNT, CONTRACT_COUNT, etc.
        period        : String(20) not null; // DAILY, MTD, YTD
        value         : Decimal(15, 2) not null; // The metric value
        previousValue : Decimal(15, 2); // Previous period for trend
        sourceSystem  : String(50) not null default 'IVALUA';
}

// ============================================
// SYSTEM HEALTH - Aggregated status (computed/updated by job)
// ============================================
entity SystemHealth {
    key ID             : UUID;
        systemName     : String(50) not null; // CPI, MULESOFT, IVALUA
        status         : String(20) not null; // HEALTHY, DEGRADED, DOWN
        lastChecked    : DateTime not null; // Last update time
        activeErrors   : Integer default 0; // Unresolved errors (last 24h)
        last24hSuccess : Integer default 0; // Successful transactions
        last24hFailed  : Integer default 0; // Failed transactions
        successRate    : Decimal(5, 2); // Percentage
}
