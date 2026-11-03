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

function PublicLanding() {
  return (
    <section className="dashboard-hero" aria-labelledby="public-title">
      <div className="dashboard-hero-copy">
        <div className="dashboard-hero-topline"><span>PRAMAANBOT / PUBLIC RESEARCH</span><span>READ · VERIFY · LEARN</span></div>
        <h1 id="public-title">Explore Indian law<br /><em>with sources.</em></h1>
        <p>Search the project's small curated set of legal provisions and review public action guides. This preview uses real source ranking, not a generative AI model or an authenticated case-management backend.</p>
        <div className="dashboard-hero-actions">
          <Link className="hero-start" to="/research">Search legal sources</Link>
          <Link className="hero-research" to="/procedures">View action guides</Link>
        </div>
        <p>Informational prototype only. Do not enter names, case details, identity numbers, or other confidential information. The public site does not store private case files.</p>
      </div>
    </section>
  )
}

export default function App() {
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking')
  const [ollama, setOllama] = useState(false)
  const location = useLocation()
  const isPublicDemo = import.meta.env.PROD
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
            {navigation.filter(({ to }) => !isPublicDemo || ['/', '/research', '/procedures'].includes(to)).map(({ to, label }) => (
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
            <span className="header-privacy" title={import.meta.env.DEV ? "Case data remains on your local backend" : "Public demonstration — configure a secure backend before handling case data"}>
              <ShieldCheck size={17} />
              {import.meta.env.DEV ? 'Local & secure' : 'Research-only preview'}
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
            <span>{health === 'online' ? (isPublicDemo ? 'Research API connected' : 'API connected') : health === 'offline' ? 'API offline' : 'Checking API'}</span>
            <span className="divider" />
            <CircleGauge size={16} />
            <span>{ollama ? 'Gemma connected' : isPublicDemo ? 'No generative AI' : 'Safe fallback mode'}</span>
          </div>
        </div>
      </header>
      <div className="main-column">
        <main id="main-content">
          {isPublicDemo && (
            <div role="status" style={{ margin: '1rem 1.5rem', padding: '1rem', border: '1px solid #a87e39', borderRadius: '0.5rem' }}>
              Public research preview: only the curated legal corpus and action guides are available.
              Private case files, uploads, document drafting and AI analysis require the authenticated local service.
              Do not submit personal information.
              {health === 'offline' ? ' The research API is currently unavailable.' : ''}
            </div>
          )}
          {isPublicDemo ? (
            <Routes>
              <Route path="/" element={<PublicLanding />} />
              <Route path="/research" element={<Research />} />
              <Route path="/procedures" element={<Procedures />} />
              <Route path="*" element={<Navigate to="/research" replace />} />
            </Routes>
          ) : (
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
          )}
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
          <div className="footer-status"><ShieldCheck size={16} /> {import.meta.env.DEV ? "Local data stays on your computer" : "Do not submit confidential case data in this public demo"}</div>
        </footer>
      </div>
    </div>
  )
}
