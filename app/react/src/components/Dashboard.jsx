import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const API = '/error-service/ErrorLogs'

function fetchLogs(params = '') {
  return axios.get(API + params).then(r => r.data.value || r.data)
}

// Top Bar Component
function TopBar() {
  return (
    <div className="top-bar">
      <div className="top-bar-logo">
        <img src="/vw-logo.png" alt="VW Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        <span className="top-bar-title">GPS Central Monitoring Dashboard</span>
      </div>
      <div className="top-bar-nav">
        <span className="top-bar-nav-item active">Dashboard</span>
        <span className="top-bar-nav-item">Alerts</span>
        <span className="top-bar-nav-item">Settings</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [logs, setLogs] = useState([])
  const [weekData, setWeekData] = useState({ labels: [], counts: [], sources: {} })
  const [levelFilter, setLevelFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    loadTable();
    loadWeek();
  }, [])

  async function loadTable() {
    const data = await fetchLogs('?%24top=100&%24orderby=timestamp%20desc')
    setLogs(data)
  }

  async function loadWeek() {
    const res = await fetchLogs('?%24top=10000')
    const all = res || []
    const end = new Date();
    const start = new Date(); start.setDate(start.getDate() - 6)
    const labels = []
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); labels.push(d.toISOString().slice(0, 10)) }

    const counts = labels.map(_ => 0)
    const sources = {}
    all.forEach(it => {
      if (!it.timestamp) return
      const day = new Date(it.timestamp).toISOString().slice(0, 10)
      const idx = labels.indexOf(day)
      if (idx >= 0) counts[idx]++
      const s = it.source || 'unknown'
      sources[s] = (sources[s] || 0) + 1
    })
    setWeekData({ labels, counts, sources })
  }

  const pieData = Object.entries(weekData.sources).map(([k, v]) => ({ name: k, value: v }))
  // Updated colors to match the Volkswagen palette
  const COLORS = ['#1F2F57', '#6091C3', '#A8A8A8', '#2a3f6d', '#5080b3', '#c4c4c4']

  const sourcesOptions = useMemo(() => {
    const set = new Set(logs.map(l => l.source).filter(Boolean))
    return ['', 'unknown', ...Array.from(set)]
  }, [logs])

  const displayedLogs = useMemo(() => {
    let items = logs.slice();
    if (levelFilter) items = items.filter(i => (i.level || '').toLowerCase() === levelFilter.toLowerCase())
    if (sourceFilter) items = items.filter(i => (i.source || '').toLowerCase() === sourceFilter.toLowerCase())
    if (q && q.trim()) {
      const qq = q.toLowerCase();
      items = items.filter(i => ((i.message || '') + ' ' + (i.description || '')).toLowerCase().includes(qq))
    }
    items.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'timestamp') {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return (ta - tb) * dir
      }
      const va = (a[sortBy] || '').toString().localeCompare((b[sortBy] || '').toString())
      return va * dir
    })
    return items
  }, [logs, levelFilter, sourceFilter, q, sortBy, sortDir])

  const getLevelClass = (level) => {
    if (level === 'ERROR') return 'level-badge error'
    if (level === 'WARN') return 'level-badge warn'
    return 'level-badge info'
  }

  return (
    <div>
      <TopBar />

      <div className="toolbar">
        <span className="toolbar-title">Error Logs Overview</span>
        <label>Level:
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
            <option value="">All</option>
            <option>ERROR</option>
            <option>WARN</option>
            <option>INFO</option>
          </select>
        </label>
        <label>Source:
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
            {sourcesOptions.map(s => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
        </label>
        <label>Search:
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="message or description" />
        </label>
        <label>Sort by:
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="timestamp">Timestamp</option>
            <option value="level">Level</option>
            <option value="source">Source</option>
          </select>
        </label>
        <label>Dir:
          <select value={sortDir} onChange={e => setSortDir(e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </label>
        <button className="refresh-btn" onClick={loadTable}>
          ↻ Refresh
        </button>
      </div>

      <div className="cards">
        <div className="card">
          <h3>Daily Errors (last 7 days)</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekData.labels.map((l, i) => ({ date: l, errors: weekData.counts[i] }))}>
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#1F2F57' }} />
                <YAxis tick={{ fontSize: 12, fill: '#1F2F57' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2F57',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Line type="monotone" dataKey="errors" stroke="#6091C3" strokeWidth={3} dot={{ fill: '#1F2F57', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3>Errors by Source</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.length ? pieData : [{ name: 'No data', value: 1 }]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label
                >
                  {(pieData.length ? pieData : [{ name: 'No data', value: 1 }]).map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="table card">
        <h3>Recent Error Logs</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Level</th>
              <th>Message</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.length === 0 ? (
              <tr><td colSpan={5} className="empty-state">No logs found</td></tr>
            ) : (
              displayedLogs.map(l => (
                <tr key={l.ID}>
                  <td>{l.ID}</td>
                  <td>{l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}</td>
                  <td><span className={getLevelClass(l.level)}>{l.level}</span></td>
                  <td>{l.message}</td>
                  <td>{l.source}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
