import {
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CircleGauge,
  FilePenLine,
  FolderPlus,
  LayoutDashboard,
  Menu,
  Scale,
  ShieldCheck,
  Workflow,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { api } from './api'
import Dashboard from './pages/Dashboard'
import Drafts from './pages/Drafts'
import NewCase from './pages/NewCase'
import Procedures from './pages/Procedures'
import Research from './pages/Research'
import Trust from './pages/Trust'
import Workspace from './pages/Workspace'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cases/new', label: 'New case', icon: FolderPlus },
  { to: '/workspace', label: 'Case workspace', icon: BriefcaseBusiness },
  { to: '/research', label: 'Legal research', icon: BookOpen },
  { to: '/procedures', label: 'Action guides', icon: Workflow },
  { to: '/drafts', label: 'Document draft', icon: FilePenLine },
  { to: '/trust', label: 'Trust report', icon: ShieldCheck },
]

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking')
  const [ollama, setOllama] = useState(false)

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
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Scale size={23} /></div>
          <div>
            <strong>Pramaan Bot</strong>
            <span>Local legal action engine</span>
          </div>
          <button className="icon-button close-menu" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="privacy-card">
          <ShieldCheck size={21} />
          <div>
            <strong>Private by architecture</strong>
            <span>Case data remains on this device.</span>
          </div>
        </div>
      </aside>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} />}
      <div className="main-column">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <Bot size={17} />
            <span>Citizen workspace</span>
          </div>
          <div className="status-cluster">
            <span className={`status-dot ${health}`} />
            <span>{health === 'online' ? 'Local API ready' : health === 'offline' ? 'API offline' : 'Checking API'}</span>
            <span className="divider" />
            <CircleGauge size={16} />
            <span>{ollama ? 'Gemma connected' : 'Safe fallback mode'}</span>
          </div>
        </header>
        <main>
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
      </div>
    </div>
  )
}
