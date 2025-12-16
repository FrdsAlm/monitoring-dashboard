import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const API_BASE = '/api/monitoring'

const getStatusColor = (status) => {
    if (status === 'HEALTHY') return '#22c55e'
    if (status === 'DEGRADED') return '#f59e0b'
    return '#ef4444'
}

const SystemHealthCard = ({ system }) => (
    <div className="card health-card" style={{ padding: '16px' }}>
        <div className="health-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{system.systemName}</h3>
            <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(system.status)
            }} />
        </div>
        <div className="health-metrics" style={{ display: 'flex', gap: '24px' }}>
            <div className="metric">
                <div className="value success" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                    {system.last24hSuccess || 0}
                </div>
                <div className="label" style={{ fontSize: '0.85rem', color: '#666' }}>Success</div>
            </div>
            <div className="metric">
                <div className="value error" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                    {system.last24hFailed || 0}
                </div>
                <div className="label" style={{ fontSize: '0.85rem', color: '#666' }}>Failed</div>
            </div>
        </div>
    </div>
)

const ChartFilter = ({ filters, setFilters, sources, interfaces }) => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <select
            value={filters.time || '7d'}
            onChange={e => setFilters(prev => ({ ...prev, time: e.target.value }))}
            style={{ fontSize: '0.8rem', padding: '2px 4px' }}
        >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
        </select>
        <select
            value={filters.source}
            onChange={e => setFilters(prev => ({ ...prev, source: e.target.value }))}
            style={{ fontSize: '0.8rem', padding: '2px 4px' }}
        >
            <option value="">All Systems</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
            value={filters.interface}
            onChange={e => setFilters(prev => ({ ...prev, interface: e.target.value }))}
            style={{ fontSize: '0.8rem', padding: '2px 4px' }}
        >
            <option value="">All Interfaces</option>
            {interfaces.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
    </div>
)

export default function ExecutiveDashboard() {
    const [trendFilters, setTrendFilters] = useState({ source: '', interface: '', time: '7d' })
    const [pieFilters, setPieFilters] = useState({ source: '', interface: '', time: '24h' })

    const [systemHealth, setSystemHealth] = useState([])
    const [procurementStats, setProcurementStats] = useState([])
    const [recentErrors, setRecentErrors] = useState([])
    const [errorTrend, setErrorTrend] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [statsPeriod, setStatsPeriod] = useState('DAILY')

    const [logs, setLogs] = useState([])

    useEffect(() => {
        loadData()
    }, [statsPeriod])

    // Effect to update charts when filters change
    useEffect(() => {
        updateCharts(logs)
    }, [trendFilters, pieFilters, logs])

    async function loadData() {
        setIsLoading(true)
        try {
            const [healthRes, statsRes, logsRes] = await Promise.all([
                axios.get(`${API_BASE}/SystemHealth`),
                axios.get(`${API_BASE}/ProcurementStats?$filter=period eq '${statsPeriod}'&$orderby=timestamp desc`),
                axios.get(`${API_BASE}/InterfaceLogs?$top=2000&$orderby=timestamp desc`)
            ])

            setSystemHealth(healthRes.data.value || [])
            setProcurementStats(statsRes.data.value || [])
            setLogs(logsRes.data.value || [])
            setRecentErrors((logsRes.data.value || []).filter(l => l.level === 'ERROR').slice(0, 5))

            // Initial calculations
            updateCharts(logsRes.data.value || [])
        } catch (err) {
            console.error('Failed to load dashboard data', err)
        }
        setIsLoading(false)
    }

    function updateCharts(data) {
        // Trend Data
        const trendData = calculateTrend(data, trendFilters)
        setErrorTrend(trendData)
    }

    function calculateTrend(data, filters) {
        let filtered = data
        if (filters.source) filtered = filtered.filter(l => l.sourceSystem === filters.source)
        if (filters.interface) filtered = filtered.filter(l => l.interfaceName === filters.interface)

        const timeRange = filters.time || '7d'
        const points = []

        if (timeRange === '24h') {
            // Hourly trend
            for (let i = 23; i >= 0; i--) {
                const d = new Date()
                d.setHours(d.getHours() - i)
                points.push(d)
            }
            return points.map(d => {
                const key = d.toISOString().slice(0, 13) // YYYY-MM-DDTHH
                return {
                    date: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    errors: filtered.filter(l => l.timestamp?.startsWith(key) && l.level === 'ERROR').length,
                    warnings: filtered.filter(l => l.timestamp?.startsWith(key) && l.level === 'WARN').length
                }
            })
        } else {
            // Daily trend (7d OR 30d)
            const daysCount = timeRange === '30d' ? 30 : 7
            for (let i = daysCount - 1; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                points.push(d)
            }
            return points.map(d => {
                const key = d.toISOString().slice(0, 10) // YYYY-MM-DD
                return {
                    date: key.slice(5), // MM-DD
                    errors: filtered.filter(l => l.timestamp?.startsWith(key) && l.level === 'ERROR').length,
                    warnings: filtered.filter(l => l.timestamp?.startsWith(key) && l.level === 'WARN').length
                }
            })
        }
    }

    const pieChartData = useMemo(() => {
        let filtered = logs
        const timeRange = pieFilters.time || '24h'

        let startTime = new Date()
        if (timeRange === '24h') startTime.setHours(startTime.getHours() - 24)
        else if (timeRange === '7d') startTime.setDate(startTime.getDate() - 7)
        else if (timeRange === '30d') startTime.setDate(startTime.getDate() - 30)

        const isoStart = startTime.toISOString()
        filtered = filtered.filter(l => l.timestamp >= isoStart)

        if (pieFilters.source) filtered = filtered.filter(l => l.sourceSystem === pieFilters.source)
        if (pieFilters.interface) filtered = filtered.filter(l => l.interfaceName === pieFilters.interface)

        const counts = {}
        filtered.forEach(l => {
            if (l.level === 'ERROR') {
                const sys = l.sourceSystem || 'Unknown'
                counts[sys] = (counts[sys] || 0) + 1
            }
        })

        return Object.keys(counts).map(key => ({
            name: key,
            value: counts[key]
        })).filter(d => d.value > 0)
    }, [logs, pieFilters])


    const sources = [...new Set(logs.map(l => l.sourceSystem).filter(Boolean))]
    const interfaces = [...new Set(logs.map(l => l.interfaceName).filter(Boolean))]



    const COLORS = ['#1F2F57', '#6091C3', '#A8A8A8']

    const getProcurementMetric = (type) => {
        if (statsPeriod === 'DAILY') {
            const todayStr = new Date().toISOString().slice(0, 10)
            const todayLogs = logs.filter(l => l.timestamp && l.timestamp.startsWith(todayStr))
            const count = (keyword) => todayLogs.filter(l => l.interfaceName && l.interfaceName.includes(keyword) && l.status === 'SUCCESS').length

            if (type === 'PO_COUNT') return { value: count('PO') }
            if (type === 'PR_COUNT') return { value: count('PR') }
            if (type === 'CONTRACT_COUNT') return { value: count('CONTRACT') }
            if (type === 'INVOICE_COUNT') return { value: count('INVOICE') }
            return { value: 0 }
        }
        return procurementStats.find(s => s.statType === type)
    }

    const poCount = getProcurementMetric('PO_COUNT')
    const prCount = getProcurementMetric('PR_COUNT')
    const contractCount = getProcurementMetric('CONTRACT_COUNT')
    const invoiceCount = getProcurementMetric('INVOICE_COUNT')

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
                <h2 className="section-title">System Health (Last 24 Hours)</h2>
                <div className="health-cards">
                    {systemHealth.map(sys => (
                        <SystemHealthCard key={sys.ID} system={sys} />
                    ))}
                </div>
            </section>



            {/* Charts Row */}
            <section className="section">
                <h2 className="section-title">Trends & Analysis</h2>
                <div className="charts-row">
                    <div className="chart-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Error Trend</h3>
                            <ChartFilter filters={trendFilters} setFilters={setTrendFilters} sources={sources} interfaces={interfaces} />
                        </div>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Errors by System</h3>
                            <ChartFilter filters={pieFilters} setFilters={setPieFilters} sources={sources} interfaces={interfaces} />
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={pieChartData.length ? pieChartData : [{ name: 'No Errors', value: 1 }]}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={70}
                                    label
                                >
                                    {(pieChartData.length ? pieChartData : [{ name: 'No Errors', value: 1 }]).map((entry, index) => (
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
