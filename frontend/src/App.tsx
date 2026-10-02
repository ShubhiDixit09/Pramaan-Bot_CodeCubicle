import {
  Accessibility,
  CircleGauge,
  Home,
  Landmark,
  Languages,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { api } from './api'
import Dashboard from './pages/Dashboard'
import Drafts from './pages/Drafts'
import NewCase from './pages/NewCase'
import Procedures from './pages/Procedures'
import Research from './pages/Research'
import Trust from './pages/Trust'
import Workspace from './pages/Workspace'

const navigation = [
  { to: '/', label: 'Overview' },
  { to: '/cases/new', label: 'New case' },
  { to: '/workspace', label: 'Case workspace' },
  { to: '/research', label: 'Legal research' },
  { to: '/procedures', label: 'Action guides' },
  { to: '/drafts', label: 'Documents' },
  { to: '/trust', label: 'Verification' },
]

export default function App() {
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking')
  const [ollama, setOllama] = useState(false)
  const location = useLocation()
  const currentPage = navigation.find((item) => item.to !== '/' && location.pathname.startsWith(item.to))?.label || (location.pathname.startsWith('/workspace') ? 'Case workspace' : 'Overview')

  useEffect(() => {
    api
      .health()
      .then((result) => {
        setHealth('online')
        setOllama(result.ollama.available)
      })
      .catch(() => setHealth('offline'))
  }, [])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <div className="civic-ribbon">
          <div className="civic-ribbon-inner">
            <span className="civic-label"><Landmark size={14} /> <span lang="hi">डिजिटल विधिक सेवा</span><i /> Digital Legal Services</span>
            <span className="prototype-mark">Public-service prototype</span>
            <span className="civic-tools"><Languages size={14} /> English&nbsp;&nbsp;|&nbsp;&nbsp;<span lang="hi">हिन्दी</span> <Accessibility size={14} /> Accessibility</span>
          </div>
        </div>
        <div className="masthead">
          <Link className="header-brand" to="/" aria-label="PramaanBot (प्रमाणबॉट) dashboard">
            <span className="header-brand-mark"><Scale size={29} strokeWidth={1.35} /></span>
            <span className="header-brand-copy">
              <span className="brand-name-row">
                <strong>PramaanBot</strong>
                <span className="brand-name-divider" aria-hidden="true">|</span>
                <strong className="brand-name-hindi" lang="hi">प्रमाणबॉट</strong>
              </span>
              <small>Citizen Legal Assistance Platform</small>
            </span>
          </Link>
          <nav className="primary-nav" aria-label="Primary navigation">
            {navigation.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <span className="header-privacy" title="Case data remains on this device">
              <ShieldCheck size={17} />
              Local &amp; secure
            </span>
          </div>
        </div>
        <div className="context-strip">
          <div className="breadcrumb">
            <Link to="/"><Home size={17} /> <span>My cases</span></Link>
            <span className="breadcrumb-slash">/</span>
            <strong>{currentPage}</strong>
          </div>
          <div className="status-cluster">
            <span className={`status-dot ${health}`} />
            <span>{health === 'online' ? 'Local workspace ready' : health === 'offline' ? 'API offline' : 'Checking API'}</span>
            <span className="divider" />
            <CircleGauge size={16} />
            <span>{ollama ? 'Gemma connected' : 'Safe fallback mode'}</span>
          </div>
        </div>
      </header>
      <div className="main-column">
        <main id="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases/new" element={<NewCase />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/workspace/:caseId" element={<Workspace />} />
            <Route path="/research" element={<Research />} />
            <Route path="/procedures" element={<Procedures />} />
            <Route path="/drafts" element={<Drafts />} />
            <Route path="/trust" element={<Trust />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <div className="footer-identity">
            <Scale size={25} />
            <div><strong>PramaanBot</strong><span>Digital public legal services prototype</span></div>
          </div>
          <div className="footer-links">
            <Link to="/trust">Trust &amp; verification</Link>
            <Link to="/research">Legal sources</Link>
            <span>Legal information, not legal advice</span>
          </div>
          <div className="footer-status"><ShieldCheck size={16} /> Case data remains on this device</div>
        </footer>
      </div>
    </div>
  )
}
