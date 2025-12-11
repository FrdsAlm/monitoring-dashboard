import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const API_BASE = '/api/monitoring'

export default function ExecutiveDashboard() {
    const [systemHealth, setSystemHealth] = useState([])
    const [procurementStats, setProcurementStats] = useState([])
    const [recentErrors, setRecentErrors] = useState([])
    const [errorTrend, setErrorTrend] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [statsPeriod, setStatsPeriod] = useState('DAILY')

    useEffect(() => {
        loadData()
    }, [statsPeriod])

    async function loadData() {
        setIsLoading(true)
        try {
            const [healthRes, statsRes, logsRes] = await Promise.all([
                axios.get(`${API_BASE}/SystemHealth`),
                axios.get(`${API_BASE}/ProcurementStats?$filter=period eq '${statsPeriod}'&$orderby=timestamp desc`),
                axios.get(`${API_BASE}/InterfaceLogs?$top=1000&$orderby=timestamp desc`)
            ])

            setSystemHealth(healthRes.data.value || [])
            setProcurementStats(statsRes.data.value || [])

            const logs = logsRes.data.value || []
            setRecentErrors(logs.filter(l => l.level === 'ERROR').slice(0, 5))

            const trend = calculateTrend(logs)
            setErrorTrend(trend)
        } catch (err) {
            console.error('Failed to load dashboard data', err)
        }
        setIsLoading(false)
    }

    function calculateTrend(logs) {
        const days = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            days.push(d.toISOString().slice(0, 10))
        }

        return days.map(day => ({
            date: day.slice(5),
            errors: logs.filter(l => l.timestamp?.startsWith(day) && l.level === 'ERROR').length,
            warnings: logs.filter(l => l.timestamp?.startsWith(day) && l.level === 'WARN').length
        }))
    }

    const getStatusColor = (status) => {
        if (status === 'HEALTHY') return '#22c55e'
        if (status === 'DEGRADED') return '#f59e0b'
        return '#ef4444'
    }

    const getStatusIcon = (status) => {
        if (status === 'HEALTHY') return '✓'
        if (status === 'DEGRADED') return '⚠'
        return '✕'
    }

    const totalErrors24h = systemHealth.reduce((sum, s) => sum + (s.last24hFailed || 0), 0)
    const totalSuccess24h = systemHealth.reduce((sum, s) => sum + (s.last24hSuccess || 0), 0)
    const overallSuccessRate = totalSuccess24h + totalErrors24h > 0
        ? ((totalSuccess24h / (totalSuccess24h + totalErrors24h)) * 100).toFixed(1)
        : 0

    const errorsBySource = systemHealth.map(s => ({
        name: s.systemName,
        value: s.last24hFailed || 0
    })).filter(s => s.value > 0)

    const COLORS = ['#1F2F57', '#6091C3', '#A8A8A8']

    const poCount = procurementStats.find(s => s.statType === 'PO_COUNT')
    const prCount = procurementStats.find(s => s.statType === 'PR_COUNT')
    const contractCount = procurementStats.find(s => s.statType === 'CONTRACT_COUNT')
    const invoiceCount = procurementStats.find(s => s.statType === 'INVOICE_COUNT')

    const getPeriodLabel = () => {
        if (statsPeriod === 'DAILY') return 'Today'
        if (statsPeriod === 'MTD') return 'Month to Date'
        if (statsPeriod === 'YTD') return 'Year to Date'
        return statsPeriod
    }

    return (
        <div className="dashboard-content">
            {isLoading && <div className="loading-overlay">Loading...</div>}

            {/* Header with Refresh */}
            <div className="dashboard-header">
                <h1 className="page-title">Dashboard Overview</h1>
                <button className="refresh-btn" onClick={loadData} disabled={isLoading}>
                    {isLoading ? '⟳ Loading...' : '↻ Refresh'}
                </button>
            </div>

            {/* System Health Cards */}
            <section className="section">
                <h2 className="section-title">System Health</h2>
                <div className="health-cards">
                    {systemHealth.map(sys => (
                        <div key={sys.ID} className={`health-card ${sys.status?.toLowerCase()}`}>
                            <div className="health-card-header">
                                <span className="health-card-icon" style={{ color: getStatusColor(sys.status) }}>
                                    {getStatusIcon(sys.status)}
                                </span>
                                <span className="health-card-name">{sys.systemName}</span>
                            </div>
                            <div className="health-card-status" style={{ color: getStatusColor(sys.status) }}>
                                {sys.status}
                            </div>
                            <div className="health-card-stats">
                                <div className="health-stat">
                                    <span className="health-stat-value">{sys.successRate?.toFixed(1) || 0}%</span>
                                    <span className="health-stat-label">Success Rate</span>
                                </div>
                                <div className="health-stat">
                                    <span className="health-stat-value error">{sys.activeErrors || 0}</span>
                                    <span className="health-stat-label">Active Errors</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Summary Stats */}
            <section className="section">
                <div className="summary-row">
                    <div className="summary-card large">
                        <div className="summary-value">{overallSuccessRate}%</div>
                        <div className="summary-label">Overall Success Rate (24h)</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-value success">{totalSuccess24h}</div>
                        <div className="summary-label">Successful (24h)</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-value error">{totalErrors24h}</div>
                        <div className="summary-label">Failed (24h)</div>
                    </div>
                </div>
            </section>

            {/* Charts Row */}
            <section className="section">
                <h2 className="section-title">Trends & Analysis</h2>
                <div className="charts-row">
                    <div className="chart-card">
                        <h3>Error Trend (7 Days)</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={errorTrend}>
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name="Errors" />
                                <Line type="monotone" dataKey="warnings" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} name="Warnings" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="chart-card">
                        <h3>Errors by System (24h)</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={errorsBySource.length ? errorsBySource : [{ name: 'No Errors', value: 1 }]}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={70}
                                    label
                                >
                                    {(errorsBySource.length ? errorsBySource : [{ name: 'No Errors', value: 1 }]).map((entry, index) => (
                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            {/* Procurement KPIs */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">Procurement Metrics ({getPeriodLabel()})</h2>
                    <div className="period-filter">
                        <select value={statsPeriod} onChange={e => setStatsPeriod(e.target.value)}>
                            <option value="DAILY">Daily</option>
                            <option value="MTD">Monthly (MTD)</option>
                            <option value="YTD">Yearly (YTD)</option>
                        </select>
                    </div>
                </div>
                <div className="kpi-row">
                    <div className="kpi-card">
                        <div className="kpi-value">{poCount?.value || 0}</div>
                        <div className="kpi-label">Purchase Orders</div>
                        {poCount?.previousValue && statsPeriod === 'DAILY' && (
                            <div className={`kpi-trend ${poCount.value >= poCount.previousValue ? 'up' : 'down'}`}>
                                {poCount.value >= poCount.previousValue ? '↑' : '↓'} vs previous
                            </div>
                        )}
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-value">{prCount?.value || 0}</div>
                        <div className="kpi-label">Purchase Requisitions</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-value">{contractCount?.value || 0}</div>
                        <div className="kpi-label">Contracts</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-value">{invoiceCount?.value || 0}</div>
                        <div className="kpi-label">Invoices</div>
                    </div>
                </div>
            </section>

            {/* Recent Errors */}
            <section className="section">
                <h2 className="section-title">Recent Critical Errors</h2>
                <div className="recent-errors">
                    {recentErrors.length === 0 ? (
                        <div className="empty-state">No critical errors in the last 24 hours</div>
                    ) : (
                        recentErrors.map(err => (
                            <div key={err.ID} className="error-item">
                                <div className="error-item-header">
                                    <span className="error-source">{err.sourceSystem}</span>
                                    <span className="error-time">
                                        {err.timestamp ? new Date(err.timestamp).toLocaleString() : '-'}
                                    </span>
                                </div>
                                <div className="error-message">{err.message}</div>
                                {err.interfaceName && (
                                    <div className="error-interface">Interface: {err.interfaceName}</div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    )
}
