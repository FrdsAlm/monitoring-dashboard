import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import ExecutiveDashboard from './components/ExecutiveDashboard'
import OperationsDashboard from './components/OperationsDashboard'
import './styles.css'

function AppLayout({ children }) {
  return (
    <div className="app-root">
      <header className="top-bar">
        <div className="top-bar-logo">
          <img src="/vw-logo.png" alt="VW Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <span className="top-bar-title">Central Interface Monitoring</span>
        </div>
        <nav className="top-bar-nav">
          <NavLink to="/dashboard/overview" className={({ isActive }) => `top-bar-nav-item ${isActive ? 'active' : ''}`}>
            Overview
          </NavLink>
          <NavLink to="/dashboard/logs" className={({ isActive }) => `top-bar-nav-item ${isActive ? 'active' : ''}`}>
            Interface Logs
          </NavLink>
        </nav>
      </header>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/dashboard/overview" element={<ExecutiveDashboard />} />
          <Route path="/dashboard/logs" element={<OperationsDashboard />} />
          <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}
