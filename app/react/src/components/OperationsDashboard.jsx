import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'

const API_BASE = '/api/monitoring'
const PAGE_SIZE = 50

export default function OperationsDashboard() {
    const [logs, setLogs] = useState([])
    const [interfaces, setInterfaces] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [displayCount, setDisplayCount] = useState(PAGE_SIZE)

    // Filters
    const [sourceFilter, setSourceFilter] = useState('')
    const [levelFilter, setLevelFilter] = useState('')
    const [interfaceFilter, setInterfaceFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [showResolved, setShowResolved] = useState(false)

    // Time filter
    const [timeRange, setTimeRange] = useState('5min')
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')

    useEffect(() => {
        loadData()
    }, [timeRange, customFrom, customTo])

    function getTimeFilter() {
        const now = new Date()
        let fromDate = null

        const timeMap = {
            '5min': 5 * 60 * 1000,
            '15min': 15 * 60 * 1000,
            '30min': 30 * 60 * 1000,
            '1hour': 60 * 60 * 1000,
            '6hours': 6 * 60 * 60 * 1000,
            '12hours': 12 * 60 * 60 * 1000,
            '1day': 24 * 60 * 60 * 1000,
            '1week': 7 * 24 * 60 * 60 * 1000,
            '1month': 30 * 24 * 60 * 60 * 1000
        }

        if (timeMap[timeRange]) {
            fromDate = new Date(now.getTime() - timeMap[timeRange])
        } else if (timeRange === 'custom' && customFrom) {
            fromDate = new Date(customFrom)
        }

        if (fromDate) {
            let filter = `timestamp ge ${fromDate.toISOString()}`
            if (timeRange === 'custom' && customTo) {
                const toDate = new Date(customTo)
                toDate.setHours(23, 59, 59)
                filter += ` and timestamp le ${toDate.toISOString()}`
            }
            return filter
        }
        return null
    }

    async function loadData() {
        setIsLoading(true)
        try {
            let logsUrl = `${API_BASE}/InterfaceLogs?$top=1000&$orderby=timestamp desc`
            const timeFilter = getTimeFilter()
            if (timeFilter) {
                logsUrl += `&$filter=${encodeURIComponent(timeFilter)}`
            }

            const [logsRes, interfacesRes] = await Promise.all([
                axios.get(logsUrl),
                axios.get(`${API_BASE}/InterfaceConfigs?$filter=isActive eq true`)
            ])
            setLogs(logsRes.data.value || [])
            setInterfaces(interfacesRes.data.value || [])
            setDisplayCount(PAGE_SIZE) // Reset pagination on refresh
        } catch (err) {
            console.error('Failed to load data', err)
        }
        setIsLoading(false)
    }

    async function markAsResolved(logId) {
        try {
            await axios.patch(`${API_BASE}/InterfaceLogs(${logId})`, {
                resolvedAt: new Date().toISOString(),
                resolvedBy: 'AMS User'
            })
            loadData()
        } catch (err) {
            console.error('Failed to mark as resolved', err)
        }
    }

    const filteredLogs = useMemo(() => {
        let result = logs.slice()

        if (sourceFilter) {
            result = result.filter(l => l.sourceSystem === sourceFilter)
        }
        if (levelFilter) {
            result = result.filter(l => l.level === levelFilter)
        }
        if (interfaceFilter) {
            result = result.filter(l => l.interfaceName === interfaceFilter)
        }
        if (statusFilter) {
            result = result.filter(l => l.status === statusFilter)
        }
        if (!showResolved) {
            result = result.filter(l => !l.resolvedAt || l.resolvedAt === '' || l.resolvedAt.startsWith('0'))
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            result = result.filter(l =>
                (l.message || '').toLowerCase().includes(q) ||
                (l.correlationId || '').toLowerCase().includes(q) ||
                (l.businessDocId || '').toLowerCase().includes(q)
            )
        }

        return result
    }, [logs, sourceFilter, levelFilter, interfaceFilter, statusFilter, showResolved, searchQuery])

    const displayedLogs = filteredLogs.slice(0, displayCount)
    const hasMore = displayCount < filteredLogs.length

    const sources = [...new Set(logs.map(l => l.sourceSystem).filter(Boolean))]
    const levels = [...new Set(logs.map(l => l.level).filter(Boolean))]
    const interfaceNames = [...new Set(logs.map(l => l.interfaceName).filter(Boolean))]
    const statuses = [...new Set(logs.map(l => l.status).filter(Boolean))]

    const getLevelClass = (level) => {
        if (level === 'ERROR') return 'level-badge error'
        if (level === 'WARN') return 'level-badge warn'
        return 'level-badge info'
    }

    const getStatusClass = (status) => {
        if (status === 'FAILED') return 'status-badge failed'
        if (status === 'SUCCESS') return 'status-badge success'
        if (status === 'RETRY') return 'status-badge retry'
        return 'status-badge'
    }

    return (
        <div className="dashboard-content">
            {isLoading && <div className="loading-overlay">Loading...</div>}

            {/* Filters */}
            <section className="filters-bar">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>Time Range</label>
                        <select value={timeRange} onChange={e => setTimeRange(e.target.value)}>
                            <option value="5min">Last 5 Minutes</option>
                            <option value="15min">Last 15 Minutes</option>
                            <option value="30min">Last 30 Minutes</option>
                            <option value="1hour">Last 1 Hour</option>
                            <option value="6hours">Last 6 Hours</option>
                            <option value="12hours">Last 12 Hours</option>
                            <option value="1day">Last 24 Hours</option>
                            <option value="1week">Last 7 Days</option>
                            <option value="1month">Last 30 Days</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {timeRange === 'custom' && (
                        <>
                            <div className="filter-group">
                                <label>From</label>
                                <input
                                    type="date"
                                    value={customFrom}
                                    onChange={e => setCustomFrom(e.target.value)}
                                />
                            </div>
                            <div className="filter-group">
                                <label>To</label>
                                <input
                                    type="date"
                                    value={customTo}
                                    onChange={e => setCustomTo(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="filter-group">
                        <label>Source</label>
                        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                            <option value="">All Systems</option>
                            {sources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Level</label>
                        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                            <option value="">All Levels</option>
                            {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Interface</label>
                        <select value={interfaceFilter} onChange={e => setInterfaceFilter(e.target.value)}>
                            <option value="">All Interfaces</option>
                            {interfaceNames.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Status</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="">All Status</option>
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Search</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Message, ID, Doc..."
                        />
                    </div>

                    <div className="filter-group checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={showResolved}
                                onChange={e => setShowResolved(e.target.checked)}
                            />
                            Show Resolved
                        </label>
                    </div>

                    <button className="refresh-btn" onClick={loadData}>
                        ↻ Refresh
                    </button>
                </div>

                <div className="filters-summary">
                    Showing {displayedLogs.length} of {filteredLogs.length} logs
                </div>
            </section>

            {/* Log Table */}
            <section className="section log-table-section">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Source</th>
                                <th>Level</th>
                                <th>Interface</th>
                                <th>Message</th>
                                <th>Doc ID</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedLogs.length === 0 ? (
                                <tr><td colSpan={8} className="empty-state">No logs found</td></tr>
                            ) : (
                                displayedLogs.map(log => (
                                    <tr key={log.ID} className={log.resolvedAt && !log.resolvedAt.startsWith('0') ? 'resolved' : ''}>
                                        <td className="timestamp">
                                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                                        </td>
                                        <td>
                                            <span className={`source-badge ${log.sourceSystem?.toLowerCase()}`}>
                                                {log.sourceSystem}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={getLevelClass(log.level)}>{log.level}</span>
                                        </td>
                                        <td className="interface-name">{log.interfaceName || '-'}</td>
                                        <td className="message-cell">
                                            <div className="message-text">{log.message}</div>
                                            {log.correlationId && (
                                                <div className="correlation-id">ID: {log.correlationId}</div>
                                            )}
                                        </td>
                                        <td className="doc-id">{log.businessDocId || '-'}</td>
                                        <td>
                                            {log.status && (
                                                <span className={getStatusClass(log.status)}>{log.status}</span>
                                            )}
                                        </td>
                                        <td className="actions-cell">
                                            {(!log.resolvedAt || log.resolvedAt.startsWith('0')) && log.level === 'ERROR' && (
                                                <button
                                                    className="resolve-btn"
                                                    onClick={() => markAsResolved(log.ID)}
                                                    title="Mark as Resolved"
                                                >
                                                    ✓
                                                </button>
                                            )}
                                            {log.resolvedAt && !log.resolvedAt.startsWith('0') && (
                                                <span className="resolved-badge" title={`Resolved by ${log.resolvedBy}`}>
                                                    ✓ Resolved
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Load More Button */}
                {hasMore && (
                    <div className="load-more-container">
                        <button
                            className="load-more-btn"
                            onClick={() => setDisplayCount(prev => prev + PAGE_SIZE)}
                        >
                            Load More ({filteredLogs.length - displayCount} remaining)
                        </button>
                    </div>
                )}
            </section>

            {/* Interface Matrix */}
            <section className="section">
                <h2 className="section-title">Interface Status Matrix</h2>
                <div className="interface-matrix">
                    {interfaces.map(iface => {
                        const ifaceLogs = logs.filter(l => l.interfaceName === iface.interfaceCode)
                        const hasErrors = ifaceLogs.some(l => l.level === 'ERROR' && (!l.resolvedAt || l.resolvedAt.startsWith('0')))
                        const hasWarnings = ifaceLogs.some(l => l.level === 'WARN' && (!l.resolvedAt || l.resolvedAt.startsWith('0')))

                        return (
                            <div
                                key={iface.ID}
                                className={`interface-card ${hasErrors ? 'error' : hasWarnings ? 'warn' : 'ok'}`}
                                title={iface.description}
                            >
                                <div className="interface-card-system">{iface.sourceSystem}</div>
                                <div className="interface-card-name">{iface.displayName}</div>
                                <div className="interface-card-meta">
                                    <span>{iface.frequency}</span>
                                    <span className={`criticality ${iface.criticality?.toLowerCase()}`}>
                                        {iface.criticality}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}
