import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { Title, Button } from '@ui5/webcomponents-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const API = '/error-service/ErrorLogs'

function fetchLogs(params=''){
  return axios.get(API + params).then(r=>r.data.value || r.data)
}

export default function Dashboard(){
  const [logs,setLogs] = useState([])
  const [weekData,setWeekData] = useState({labels:[],counts:[],sources:{}})
  const [levelFilter, setLevelFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(()=>{
    loadTable();
    loadWeek();
  },[])

  async function loadTable(){
    const data = await fetchLogs('?%24top=100&%24orderby=timestamp%20desc')
    setLogs(data)
  }

  async function loadWeek(){
    const res = await fetchLogs('?%24top=10000')
    const all = res || []
    const end = new Date();
    const start = new Date(); start.setDate(start.getDate()-6)
    const labels = []
    for(let i=0;i<7;i++){ const d = new Date(start); d.setDate(start.getDate()+i); labels.push(d.toISOString().slice(0,10)) }

    const counts = labels.map(_=>0)
    const sources = {}
    all.forEach(it=>{
      if (!it.timestamp) return
      const day = new Date(it.timestamp).toISOString().slice(0,10)
      const idx = labels.indexOf(day)
      if (idx>=0) counts[idx]++
      const s = it.source || 'unknown'
      sources[s] = (sources[s]||0)+1
    })
    setWeekData({labels,counts,sources})
  }

  const pieData = Object.entries(weekData.sources).map(([k,v])=>({name:k,value:v}))
  const COLORS = ['#1976d2','#c0392b','#27ae60','#f39c12','#8e44ad','#2c3e50']

  const sourcesOptions = useMemo(()=>{
    const set = new Set(logs.map(l=>l.source).filter(Boolean))
    return ['','unknown',...Array.from(set)]
  },[logs])

  // filtered and sorted logs for the UI5 table
  const displayedLogs = useMemo(()=>{
    let items = logs.slice();
    if (levelFilter) items = items.filter(i=> (i.level||'').toLowerCase() === levelFilter.toLowerCase())
    if (sourceFilter) items = items.filter(i=> (i.source||'').toLowerCase() === sourceFilter.toLowerCase())
    if (q && q.trim()) {
      const qq = q.toLowerCase();
      items = items.filter(i=> ((i.message||'')+' '+(i.description||'')).toLowerCase().includes(qq))
    }
    items.sort((a,b)=>{
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'timestamp'){
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return (ta - tb) * dir
      }
      const va = (a[sortBy]||'').toString().localeCompare((b[sortBy]||'').toString())
      return va * dir
    })
    return items
  },[logs, levelFilter, sourceFilter, q, sortBy, sortDir])

  return (
    <div>
      <div className="toolbar">
        <Title>Monitoring Dashboard</Title>
        <div style={{display:'flex',gap:8,alignItems:'center',marginLeft:12}}>
          <label>Level:<select value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}><option value="">All</option><option>ERROR</option><option>WARN</option><option>INFO</option></select></label>
          <label>Source:<select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}>{sourcesOptions.map(s=> <option key={s} value={s}>{s||'All'}</option>)}</select></label>
          <label>Search:<input value={q} onChange={e=>setQ(e.target.value)} placeholder="message or description"/></label>
          <label>Sort by:<select value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="timestamp">Timestamp</option><option value="level">Level</option><option value="source">Source</option></select></label>
          <label>Dir:<select value={sortDir} onChange={e=>setSortDir(e.target.value)}><option value="desc">Desc</option><option value="asc">Asc</option></select></label>
          <Button onClick={loadTable}>Refresh</Button>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <h3>Daily Errors (last 7 days)</h3>
          <div style={{height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekData.labels.map((l,i)=>({date:l,errors:weekData.counts[i]}))}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="errors" stroke="#c0392b" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3>Errors by Source</h3>
          <div style={{height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData.length?pieData:[{name:'No data',value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                  {(pieData.length?pieData:[{name:'No data',value:1}]).map((entry,index)=>(<Cell key={index} fill={COLORS[index%COLORS.length]} />))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="table card table">
        <h3>Recent Error Logs</h3>
        <ui5-table no-data-text="No logs">
          <ui5-table-column slot="columns">ID</ui5-table-column>
          <ui5-table-column slot="columns">Timestamp</ui5-table-column>
          <ui5-table-column slot="columns">Level</ui5-table-column>
          <ui5-table-column slot="columns">Message</ui5-table-column>
          <ui5-table-column slot="columns">Source</ui5-table-column>

          {displayedLogs.map(l => (
            <ui5-table-row key={l.ID}>
              <ui5-table-cell>{l.ID}</ui5-table-cell>
              <ui5-table-cell>{l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}</ui5-table-cell>
              <ui5-table-cell>{l.level}</ui5-table-cell>
              <ui5-table-cell>{l.message}</ui5-table-cell>
              <ui5-table-cell>{l.source}</ui5-table-cell>
            </ui5-table-row>
          ))}
        </ui5-table>
      </div>
    </div>
  )
}
