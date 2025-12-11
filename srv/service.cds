using {monitoring as db} from '../db/schema';

// ============================================
// MONITORING SERVICE - OData API
// ============================================
@path: '/api/monitoring'
@impl: './monitoring-service.js'
service MonitoringService {

    // Main log table - full CRUD
    entity InterfaceLogs    as projection on db.InterfaceLog;
    // Interface configuration - read + admin CRUD
    entity InterfaceConfigs as projection on db.InterfaceConfig;
    // Procurement stats - create (from Ivalua) + read
    entity ProcurementStats as projection on db.ProcurementStat;

    // System health - calculated from InterfaceLogs
    @readonly
    entity SystemHealth     as projection on db.SystemHealth;
}
