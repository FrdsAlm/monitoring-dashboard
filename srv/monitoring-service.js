const cds = require('@sap/cds')

module.exports = class MonitoringService extends cds.ApplicationService {

    async init() {
        const { InterfaceLog } = cds.entities

        // Override SystemHealth read to calculate dynamically
        this.on('READ', 'SystemHealth', async (req) => {
            const db = await cds.connect.to('db')

            // Get distinct source systems - Ivalua first as primary target system
            const systems = ['IVALUA', 'CPI', 'MULESOFT']
            const now = new Date()
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

            const healthData = await Promise.all(systems.map(async (systemName) => {
                // Get logs for this system in last 24 hours
                const logs = await db.run(
                    SELECT.from(InterfaceLog)
                        .where({ sourceSystem: systemName })
                        .and({ timestamp: { '>=': yesterday.toISOString() } })
                )

                // Get unresolved errors (active errors) - handle both null and empty string
                const allErrors = await db.run(
                    SELECT.from(InterfaceLog)
                        .where({
                            sourceSystem: systemName,
                            level: 'ERROR'
                        })
                )
                const unresolvedErrors = allErrors.filter(e => {
                    const resolved = e.resolvedAt
                    return !resolved || resolved === '' || resolved === '0.0Z' || resolved.startsWith('0')
                })

                // Calculate metrics
                const totalLogs = logs.length
                const failedLogs = logs.filter(l => l.level === 'ERROR').length
                const successLogs = totalLogs - failedLogs
                const successRate = totalLogs > 0
                    ? parseFloat(((successLogs / totalLogs) * 100).toFixed(2))
                    : 100.00
                const activeErrors = unresolvedErrors.length

                // Determine status
                let status = 'HEALTHY'
                if (successRate < 80 || activeErrors > 10) {
                    status = 'DOWN'
                } else if (successRate < 95 || activeErrors > 2) {
                    status = 'DEGRADED'
                }

                return {
                    ID: `${systemName.toLowerCase()}-health-001`,
                    systemName,
                    status,
                    lastChecked: now.toISOString(),
                    activeErrors,
                    last24hSuccess: successLogs,
                    last24hFailed: failedLogs,
                    successRate
                }
            }))

            return healthData
        })

        await super.init()
    }
}
