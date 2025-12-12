using {monitoring as db} from '../db/schema';

// ============================================
// MONITORING SERVICE - OData API
// OAuth protected via XSUAA
// ============================================
@path    : '/api/monitoring'
@impl    : './monitoring-service.js'
@requires: 'authenticated-user'
service MonitoringService {

    // Main log table - read requires 'read' scope, write requires 'write' scope
    @restrict: [
        {
            grant: 'READ',
            to   : 'read'
        },
        {
            grant: [
                'CREATE',
                'UPDATE',
                'DELETE'
            ],
            to   : 'write'
        }
    ]
    entity InterfaceLogs    as projection on db.InterfaceLog;

    // Interface configuration - read for all, write only for admin
    @restrict: [
        {
            grant: 'READ',
            to   : 'read'
        },
        {
            grant: [
                'CREATE',
                'UPDATE',
                'DELETE'
            ],
            to   : 'admin'
        }
    ]
    entity InterfaceConfigs as projection on db.InterfaceConfig;

    // Procurement stats - read and create for operators
    @restrict: [
        {
            grant: 'READ',
            to   : 'read'
        },
        {
            grant: 'CREATE',
            to   : 'write'
        }
    ]
    entity ProcurementStats as projection on db.ProcurementStat;

    // System health - read only
    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'read'
    }]
    entity SystemHealth     as projection on db.SystemHealth;
}
