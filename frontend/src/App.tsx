import {
  Activity, AlertTriangle, ArrowRight, BadgeCheck, Bell, BookOpen, Bot, Boxes,
  Braces, Check, ChevronDown, ChevronRight, CircleDot, Clock3, Command,
  Database, ExternalLink, Eye, FileCheck2, FileSearch, Filter, Fingerprint,
  GitCompareArrows, GitFork, Globe2, History, Inbox, Layers3, LayoutDashboard,
  Menu, Network, PanelLeftClose, Play, Plus, Radar, RefreshCw, Search, Send,
  Scale, Settings2, ShieldCheck, Sparkles, Table2, TerminalSquare, Workflow, X, Zap,
} from 'lucide-react'
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { api } from './api'
import type { Change, Evidence, Mission, RecordRow, Review, RunEvent, Source } from './types'

const nav = [
  { to: '/', label: 'Operations', icon: LayoutDashboard },
  { to: '/missions/new', label: 'New collection', icon: Sparkles },
  { to: '/missions', label: 'Programmes', icon: Workflow },
  { to: '/dataset', label: 'Records', icon: Table2 },
  { to: '/changes', label: 'Change log', icon: GitCompareArrows },
  { to: '/reviews', label: 'Decisions', icon: Inbox, badge: 4 },
  { to: '/sources', label: 'Sources', icon: Network },
  { to: '/nyaya', label: 'NyayaBot legal desk', icon: Scale },
  { to: '/legal-radar', label: 'Legal source radar', icon: Radar },
]

const routeNames: Record<string, string> = {
  '/': 'Operations', '/missions/new': 'New collection', '/missions': 'Programmes',
  '/dataset': 'Records', '/changes': 'Change log', '/reviews': 'Decisions',
  '/sources': 'Source network', '/legal-radar': 'Legal radar',
  '/nyaya': 'NyayaBot legal desk',
}

function Mark() {
  return <div className="mark" aria-label="CodeCubicle"><span>C</span><i /><b /></div>
}

function Shell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  return (
    <div className="shell">
      <aside className={`rail ${open ? 'open' : ''}`}>
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <Mark />
          <div><strong>CODECUBICLE</strong><span>Research & evidence register</span></div>
        </Link>
        <div className="rail-section-label">Workspace index</div>
        <nav className="main-nav">
          {nav.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{badge && <em>{badge}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="rail-bottom">
          <div className="engine-card">
            <div className="engine-orbit"><CircleDot size={14} /></div>
            <div><strong>Collection service</strong><span>1 connector · pending live check</span></div>
          </div>
          <button className="rail-link"><Settings2 size={17} /> Workspace settings</button>
          <div className="profile"><span>SD</span><div><strong>Shubhi</strong><small>Builder workspace</small></div><ChevronRight size={15} /></div>
        </div>
      </aside>
      {open && <button className="mobile-scrim" onClick={() => setOpen(false)} />}
      <section className="stage">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
            <span className="workspace-name">CODECUBICLE</span><ChevronRight size={13} />
            <strong>{routeNames[location.pathname] || 'Intelligence workspace'}</strong>
          </div>
          <div className="topbar-actions">
            <button className="command-button"><Search size={16} /><span>Search anything</span><kbd>⌘ K</kbd></button>
            <button className="icon-btn"><Bell size={18} /><i /></button>
            <Link className="primary-btn compact" to="/missions/new"><Plus size={16} /> New collection</Link>
          </div>
        </header>
        <main className="content">{children}</main>
      </section>
    </div>
  )
}

function PageIntro({ index, eyebrow, title, description, actions }: { index: string; eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-intro">
    <div className="page-index">{index}</div>
    <div className="page-copy"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
}

function Metric({ label, value, suffix, note, tone, icon: Icon }: { label: string; value: string | number; suffix?: string; note: string; tone: string; icon: typeof Activity }) {
  return <article className={`metric-card ${tone}`}>
    <div className="metric-top"><span>{label}</span><Icon size={18} /></div>
    <div className="metric-number">{value}<small>{suffix}</small></div>
    <div className="metric-note"><span className="pulse-dot" />{note}</div>
  </article>
}

function CoverageRing({ value, size = 'large' }: { value: number; size?: 'large' | 'small' }) {
  return <div className={`coverage-ring ${size}`} style={{ '--coverage': `${value * 3.6}deg` } as React.CSSProperties}>
    <div><strong>{value}</strong><span>%</span></div>
  </div>
}

function CommandCenter() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [events, setEvents] = useState<RunEvent[]>([])
  const [metrics, setMetrics] = useState({ active_missions: 0, sources_monitored: 0, changes_today: 0, open_conflicts: 0, coverage: 0 })
  useEffect(() => { api.overview().then((result) => { setMissions(result.missions); setEvents(result.events); setMetrics(result.metrics as typeof metrics) }) }, [])
  return <>
    <PageIntro index="01" eyebrow="Live register" title="Current operations" description="Collections in progress, newly recorded changes, incomplete fields and decisions waiting for review." actions={<><button className="ghost-btn"><History size={16} /> Last 24 hours</button><Link to="/missions/new" className="primary-btn"><Plus size={16} /> Start collection</Link></>} />
    <section className="metrics-grid">
      <Metric label="Active collections" value={metrics.active_missions} note="Verified runtime state" tone="cobalt" icon={Activity} />
      <Metric label="Sources monitored" value={metrics.sources_monitored} note="No monitoring claimed yet" tone="ink" icon={Globe2} />
      <Metric label="Changes today" value={metrics.changes_today} note="Evidence-backed only" tone="orange" icon={Zap} />
      <Metric label="Open conflicts" value={metrics.open_conflicts} note="No verified conflicts" tone="red" icon={AlertTriangle} />
      <Metric label="Data coverage" value={metrics.coverage} suffix="%" note="Starts after first valid run" tone="lime" icon={BadgeCheck} />
    </section>
    <div className="command-grid">
      <section className="surface active-collections">
        <div className="surface-head"><div><span className="eyebrow">Active collections</span><h2>Live mission board</h2></div><Link to="/missions">View all <ArrowRight size={15} /></Link></div>
        <div className="mission-board">
          {missions.map((mission, index) => <article className="mission-row" key={mission.id}>
            <div className="mission-seq">{String(index + 1).padStart(2, '0')}</div>
            <div className={`mission-state ${mission.status}`}><span /></div>
            <div className="mission-primary"><strong>{mission.name}</strong><p>{mission.prompt}</p><div className="micro-tags"><span>{mission.cadence}</span><span>{mission.last_run}</span></div></div>
            <div className="mission-stat"><span>Records</span><strong>{mission.record_count}</strong></div>
            <div className="mission-stat"><span>Changes</span><strong>{mission.change_count}</strong></div>
            <CoverageRing value={mission.coverage} size="small" />
            <button className="row-action"><ChevronRight size={18} /></button>
          </article>)}
        </div>
      </section>
      <aside className="surface live-wire">
        <div className="surface-head"><div><span className="eyebrow live"><i /> Live wire</span><h2>Engine activity</h2></div><button className="icon-plain"><Filter size={15} /></button></div>
        <div className="event-stream">
          {events.map((event, index) => <div className="event" key={`${event.time}-${index}`}>
            <time>{event.time}</time><div className={`event-symbol ${event.type}`}><span /></div><div><strong>{event.message}</strong><p>{event.detail}</p></div>
          </div>)}
        </div>
        <div className="stream-foot"><span><i /> Listening for events</span><button>Open run console <TerminalSquare size={14} /></button></div>
      </aside>
    </div>
    <div className="lower-grid">
      <section className="surface coverage-panel">
        <div className="surface-head"><div><span className="eyebrow">Coverage intelligence</span><h2>Where the dataset is still thin</h2></div><span className="version-chip">NO VERIFIED DATASET</span></div>
        <div className="coverage-content"><CoverageRing value={0} /><div className="field-bars">
          {[['Organisation', 0], ['Official source', 0], ['Deadline', 0], ['Eligibility', 0], ['Location', 0], ['Funding / value', 0]].map(([name, value]) => <div className="field-bar" key={name}><div><span>{name}</span><strong>{value}%</strong></div><i><b style={{ width: `${value}%` }} /></i></div>)}
        </div></div>
        <div className="coverage-action"><Zap size={17} /><div><strong>Waiting for the first verified collection</strong><span>Coverage is calculated only from source-backed records.</span></div><button>Configure sources <ArrowRight size={15} /></button></div>
      </section>
      <section className="surface attention-panel">
        <div className="surface-head"><div><span className="eyebrow">Needs judgment</span><h2>Review queue</h2></div><span className="count-badge">0 open</span></div>
        <div className="attention-item"><FileSearch size={18} /><div><strong>No verified review items</strong><span>Conflicts will appear after live collection.</span></div><em>—</em></div>
        <Link to="/reviews" className="wide-link">Open decision desk <ArrowRight size={15} /></Link>
      </section>
    </div>
  </>
}

const planFields = [
  ['organisation', 'Text', 'Required'], ['opportunity', 'Text', 'Required'], ['deadline', 'Date', 'Required'],
  ['eligibility', 'Long text', 'Enrich'], ['value', 'Currency', 'Enrich'], ['location', 'Place', 'Optional'], ['official_source', 'URL', 'Required'],
]

function MissionBuilder() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('Build a live intelligence dataset of AI-related government opportunities in India. Track organisation, deadline, eligibility, funding or value, location and official source. Keep it updated and flag meaningful changes.')
  const [planned, setPlanned] = useState(false)
  const [planning, setPlanning] = useState(false)
  const generate = (event: FormEvent) => { event.preventDefault(); setPlanning(true); window.setTimeout(() => { setPlanning(false); setPlanned(true) }, 850) }
  return <>
    <PageIntro index="02" eyebrow="Collection specification" title="Define a collection" description="State the records you need. Review the proposed fields, sources, checks and update interval before the first run." />
    <div className="builder-grid">
      <section className="builder-main">
        <form className="prompt-composer" onSubmit={generate}>
          <div className="prompt-top"><span><Sparkles size={15} /> Intelligence request</span><small>Plain English · any domain</small></div>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <div className="prompt-foot"><div className="prompt-hints"><span>Try: market watch</span><span>regulatory tracking</span><span>opportunity radar</span></div><button className="primary-btn" disabled={planning}>{planning ? <><RefreshCw className="spin" size={16} /> Designing workflow</> : <><Command size={16} /> Generate mission plan</>}</button></div>
        </form>
        {!planned ? <div className="builder-empty"><div className="blueprint-mark"><GitFork size={30} /></div><h2>Your workflow will assemble here</h2><p>The planner will infer entities, fields, source categories, validation rules, refresh cadence and a typed output schema.</p><div className="empty-steps"><span>01 Understand</span><i /><span>02 Design</span><i /><span>03 Validate</span></div></div> : <div className="plan-stack">
          <div className="plan-reveal"><span className="reveal-check"><Check size={16} /></span><div><strong>Mission plan generated</strong><p>7 fields · 5 source categories · 3 validation policies · 6 hour cadence</p></div><span className="confidence-chip">96% plan confidence</span></div>
          <section className="surface plan-section"><div className="surface-head"><div><span className="eyebrow">01 / Output contract</span><h2>Opportunity dataset</h2></div><button className="ghost-btn compact"><Plus size={14} /> Add field</button></div>
            <div className="schema-table"><div className="schema-head"><span>Field</span><span>Type</span><span>Collection policy</span><span /></div>{planFields.map(([field, type, policy]) => <div className="schema-row" key={field}><span><Braces size={14} />{field}</span><span>{type}</span><span className={`policy ${policy.toLowerCase()}`}>{policy}</span><button>•••</button></div>)}</div>
          </section>
          <section className="surface plan-section"><div className="surface-head"><div><span className="eyebrow">02 / Collection graph</span><h2>Generated workflow</h2></div><span className="version-chip">8 OPERATIONS</span></div>
            <div className="workflow-strip">{[['Discover', Search], ['Fetch', Globe2], ['Parse', FileSearch], ['Extract', Braces], ['Normalise', Boxes], ['Reconcile', GitCompareArrows], ['Cover', BadgeCheck], ['Publish', Database]].map(([label, Icon], i) => { const Comp = Icon as typeof Search; return <div className="workflow-node" key={String(label)}><span>{String(i + 1).padStart(2, '0')}</span><Comp size={20} /><strong>{String(label)}</strong>{i < 7 && <ArrowRight className="flow-arrow" size={14} />}</div> })}</div>
          </section>
          <div className="approval-bar"><div><ShieldCheck size={20} /><p><strong>Safe to run</strong><span>All sources require explicit permission. No generated code will execute.</span></p></div><button className="ghost-btn">Save draft</button><button className="primary-btn" onClick={() => navigate('/dataset')}><Play size={16} /> Approve & run mission</button></div>
        </div>}
      </section>
      <aside className="builder-side">
        <section className="side-note"><span className="eyebrow">How planning works</span><h3>The model proposes. The engine decides.</h3><p>Plans are constrained to registered connectors and typed operations. URLs, rate limits and permissions are validated before execution.</p><div className="guard-list"><span><ShieldCheck size={15} /> Source policy enforced</span><span><FileCheck2 size={15} /> Schema validated</span><span><Fingerprint size={15} /> Every action audited</span></div></section>
        <section className="source-preview"><span className="eyebrow">Likely source classes</span>{['Official procurement portals', 'Ministry publications', 'Gazette notifications', 'Public data APIs', 'Uploaded documents'].map((item, i) => <div key={item}><span>{String(i + 1).padStart(2, '0')}</span><strong>{item}</strong><BadgeCheck size={15} /></div>)}</section>
      </aside>
    </div>
  </>
}

function MissionsPage() {
  const [items, setItems] = useState<Mission[]>([])
  useEffect(() => { api.missions().then(setItems) }, [])
  return <><PageIntro index="03" eyebrow="Programme register" title="Collection programmes" description="Saved specifications with their source lists, run history, decisions and versioned output." actions={<Link className="primary-btn" to="/missions/new"><Plus size={16} /> New collection</Link>} />
    <div className="mission-cards">{items.map((mission, i) => <article className="mission-card" key={mission.id}><div className="mission-card-top"><span>{String(i + 1).padStart(2, '0')}</span><div className={`status-label ${mission.status}`}><i />{mission.status}</div><button>•••</button></div><h2>{mission.name}</h2><p>{mission.prompt}</p><div className="mission-card-stats"><div><span>Coverage</span><strong>{mission.coverage}%</strong></div><div><span>Records</span><strong>{mission.record_count}</strong></div><div><span>Changes</span><strong>{mission.change_count}</strong></div></div><div className="mission-card-foot"><span><Clock3 size={14} />{mission.cadence}</span><button>Open mission <ArrowRight size={14} /></button></div></article>)}</div></>
}

function EvidenceDrawer({ record, data, onClose }: { record: RecordRow; data: Evidence; onClose: () => void }) {
  return <><button className="drawer-scrim" onClick={onClose} /><aside className="evidence-drawer">
    <div className="drawer-head"><div><span className="eyebrow">Evidence inspector</span><h2>Why this value?</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
    <div className="drawer-record"><span>{record.organisation}</span><strong>{record.opportunity}</strong></div>
    <div className="canonical-value"><div><span>Canonical {data.field}</span><strong>{data.value}</strong></div><CoverageRing value={data.confidence} size="small" /></div>
    <section className="confidence-breakdown"><div className="section-kicker"><span>Confidence anatomy</span><em>{data.confidence}/100</em></div>{Object.entries(data.components).map(([key, value]) => <div className="confidence-row" key={key}><span>{key}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}</strong></div>)}</section>
    <section className="resolution-note"><GitCompareArrows size={19} /><div><strong>Resolution logic</strong><p>{data.resolution}</p></div></section>
    <section className="observations"><div className="section-kicker"><span>Evidence chain</span><em>{data.observations.length} observations</em></div>{data.observations.map((item, index) => <article className={`observation ${item.relation}`} key={`${item.source}-${index}`}><div className="observation-top"><span className="relation">{item.relation}</span><span>Authority {item.authority}</span></div><h3>{item.source}</h3><p>“{item.excerpt}”</p><dl><div><dt>Locator</dt><dd>{item.locator}</dd></div><div><dt>Fetched</dt><dd>{item.fetched}</dd></div></dl><a href={item.url} target="_blank" rel="noreferrer">Open original source <ExternalLink size={13} /></a></article>)}</section>
  </aside></>
}

function DatasetPage() {
  const [rows, setRows] = useState<RecordRow[]>([])
  const [query, setQuery] = useState('')
  const [changedOnly, setChangedOnly] = useState(false)
  const [selected, setSelected] = useState<RecordRow | null>(null)
  const [ev, setEv] = useState<Evidence | null>(null)
  useEffect(() => { api.records().then((result) => setRows(result.records)) }, [])
  const filtered = useMemo(() => rows.filter((row) => (!changedOnly || row.changed) && (!query || Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase()))), [rows, query, changedOnly])
  const inspect = async (row: RecordRow) => { setSelected(row); setEv(await api.evidence(row.id)) }
  return <><PageIntro index="04" eyebrow="Record register / Unpublished" title="Working dataset" description="Search and export accepted records. Open any changed value to inspect its source, extraction and decision history." actions={<><button className="ghost-btn"><History size={16} /> v0 <ChevronDown size={14} /></button><button className="primary-btn"><Database size={16} /> Export records</button></>} />
    <section className="dataset-summary"><div><span>Dataset</span><strong>India AI Opportunity Radar</strong></div><div><span>Published</span><strong>Not yet</strong></div><div><span>Records</span><strong>{rows.length} verified</strong></div><div><span>Coverage</span><strong>0%</strong></div><div><span>Delta</span><strong className="orange-text">—</strong></div></section>
    <section className="surface dataset-surface"><div className="dataset-tools"><label className="table-search"><Search size={16} /><input placeholder="Search records, fields or organisations…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><button className={`tool-toggle ${changedOnly ? 'active' : ''}`} onClick={() => setChangedOnly(!changedOnly)}><Zap size={15} /> Changed only</button><button className="tool-toggle"><Filter size={15} /> Filter</button><button className="tool-toggle"><PanelLeftClose size={15} /> Columns</button><span>{filtered.length} visible</span></div>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Organisation</th><th>Opportunity</th><th>Deadline</th><th>Value</th><th>Location</th><th>Status</th><th>Evidence</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} onClick={() => inspect(row)}><td><strong>{row.organisation}</strong></td><td><span className="opportunity-cell">{row.opportunity}{row.changed && <Zap size={12} />}</span></td><td><span className={row.id === 'rec-001' ? 'changed-cell' : ''}>{row.deadline}</span></td><td>{row.value}</td><td>{row.location}</td><td><span className={`record-status ${row.status.toLowerCase()}`}>{row.status}</span></td><td><span className={`confidence ${row.confidence < 75 ? 'low' : ''}`}>{row.confidence}%</span><small>{row.sources} src</small></td><td><button className="inspect-button"><Eye size={16} /></button></td></tr>)}</tbody></table></div>
      <div className="table-foot"><span>Showing {filtered.length} of {rows.length} verified records</span><div><button disabled>Previous</button><button className="current">1</button><button disabled>Next</button></div></div>
    </section>
    {selected && ev && <EvidenceDrawer record={selected} data={ev} onClose={() => { setSelected(null); setEv(null) }} />}
  </>
}

function ChangesPage() {
  const [items, setItems] = useState<Change[]>([])
  useEffect(() => { api.changes().then(setItems) }, [])
  return <><PageIntro index="05" eyebrow="Version comparison" title="Recorded changes" description="Field-level differences between accepted versions, with the evidence that caused each revision." actions={<button className="primary-btn"><FileSearch size={16} /> Prepare daily brief</button>} />
    <div className="change-layout"><section className="surface change-feed"><div className="surface-head"><div><span className="eyebrow">{items.length} verified changes</span><h2>Material change feed</h2></div><div className="inline-filters"><button>All impact <ChevronDown size={13} /></button><button>All missions <ChevronDown size={13} /></button></div></div>
      {items.map((item) => <article className="change-item" key={item.id}><div className={`impact-flag ${item.impact}`}><Zap size={16} /></div><div className="change-main"><div className="change-meta"><span>{item.kind.replace('_', ' ')}</span><time>{item.time}</time><em>{item.confidence}% confidence</em></div><h3>{item.title}</h3><p>{item.entity}</p><div className="diff"><span className="before">{item.before || 'No previous record'}</span><ArrowRight size={16} /><span className="after">{item.after}</span></div><div className="change-source"><FileCheck2 size={14} />{item.source}</div></div><button className="row-action"><ChevronRight size={18} /></button></article>)}
    </section><aside className="surface time-lens"><span className="eyebrow">Time lens</span><h2>Version delta</h2><div className="version-comparison"><div><span>From</span><strong>—</strong><small>No baseline</small></div><GitCompareArrows size={20} /><div><span>To</span><strong>v0</strong><small>Unpublished</small></div></div><div className="delta-grid"><div><strong>0</strong><span>Added</span></div><div><strong>0</strong><span>Removed</span></div><div><strong>0</strong><span>Changed</span></div><div><strong>0</strong><span>Conflict</span></div></div><button className="wide-link">Compare full versions <ArrowRight size={15} /></button></aside></div>
  </>
}

function ReviewsPage() {
  const [items, setItems] = useState<Review[]>([])
  const [done, setDone] = useState<Record<string, string>>({})
  useEffect(() => { api.reviews().then(setItems) }, [])
  return <><PageIntro index="06" eyebrow="Human review" title="Decision queue" description="Source disagreements, suspected removals and low-confidence changes remain pending until somebody decides." />
    <div className="review-stack">{items.map((item, index) => <article className={`review-card ${done[item.id] ? 'decided' : ''}`} key={item.id}><div className="review-number">{String(index + 1).padStart(2, '0')}</div><div className="review-body"><div className="review-meta"><span className={`priority ${item.priority}`}>{item.priority}</span><span>Field: <b>{item.field}</b></span><span>{item.sources.length} evidence sources</span></div><h2>{item.title}</h2><p className="review-record">{item.record}</p><p>{item.reason}</p><div className="recommendation"><span>System recommendation</span><strong>{item.recommended}</strong><em>{item.confidence}% confidence</em></div><div className="source-pills">{item.sources.map((source) => <span key={source}><FileCheck2 size={13} />{source}</span>)}</div></div><div className="review-actions">{done[item.id] ? <div className="decision-done"><Check size={24} /><strong>{done[item.id]}</strong><span>Decision recorded</span></div> : <><button className="accept" onClick={() => setDone({ ...done, [item.id]: 'Accepted' })}><Check size={16} />Accept</button><button onClick={() => setDone({ ...done, [item.id]: 'Investigating' })}><FileSearch size={16} />Investigate</button><button className="reject" onClick={() => setDone({ ...done, [item.id]: 'Rejected' })}><X size={16} />Reject</button></>}</div></article>)}</div>
  </>
}

function SourcesPage() {
  const [items, setItems] = useState<Source[]>([])
  useEffect(() => { api.sources().then(setItems) }, [])
  return <><PageIntro index="07" eyebrow="Source register" title="Sources and permissions" description="Official endpoints, their actual connector state, authority class and most recent successful retrieval." actions={<button className="primary-btn"><Plus size={16} /> Add source</button>} />
    <section className="source-map"><div className="source-map-center"><Mark /><strong>Evidence graph</strong><span>0 verified snapshots</span></div>{items.slice(0, 4).map((source, i) => <div className={`source-node n${i + 1}`} key={source.id}><Globe2 size={17} /><strong>{source.name}</strong><span>{source.records} records</span></div>)}<svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="50" y1="50" x2="16" y2="18" /><line x1="50" y1="50" x2="84" y2="18" /><line x1="50" y1="50" x2="16" y2="82" /><line x1="50" y1="50" x2="84" y2="82" /></svg></section>
    <section className="surface source-table-surface"><div className="surface-head"><div><span className="eyebrow">Source candidates</span><h2>Verification & connector registry</h2></div><button className="ghost-btn"><RefreshCw size={15} /> Check all</button></div><div className="source-table">{items.map((source) => <div className="source-row" key={source.id}><div className="source-logo"><Globe2 size={19} /></div><div className="source-name"><strong>{source.name}</strong><span>{source.verification || source.owner}</span></div><div><span>Class</span><strong>{source.authority_class || source.type}</strong></div><div><span>Connector</span><strong>{source.connector || 'none'}</strong></div><div><span>Verified records</span><strong>{source.records}</strong></div><div><span>Last success</span><strong>{source.last_checked}</strong></div><div className={`health ${source.status}`}><i />{source.status.replaceAll('_', ' ')}</div><a href={source.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a></div>)}</div></section>
  </>
}

const nyayaCapabilities = [
  { id: 'analysis', label: 'Matter analysis', icon: Bot },
  { id: 'research', label: 'Legal research', icon: BookOpen },
  { id: 'procedure', label: 'Action procedures', icon: Workflow },
  { id: 'drafting', label: 'Document drafting', icon: FileCheck2 },
  { id: 'trust', label: 'Trust & citations', icon: ShieldCheck },
]

function NyayaPage() {
  const [active, setActive] = useState('analysis')
  const [matter, setMatter] = useState('My landlord is asking me to vacate immediately without written notice and is refusing to return my security deposit.')
  const [analysed, setAnalysed] = useState(false)

  const runAnalysis = (event: FormEvent) => {
    event.preventDefault()
    setAnalysed(true)
  }

  return <>
    <PageIntro
      index="08"
      eyebrow="Specialist intelligence / Indian law"
      title="NyayaBot legal workspace"
      description="Case analysis, statute research, procedures and verified drafting, using the same source and evidence register as every other collection."
      actions={<span className="nyaya-reserved"><Scale size={15} /> Reserved specialist module</span>}
    />

    <section className="nyaya-banner">
      <div className="nyaya-identity"><div className="nyaya-seal"><Scale size={26} /></div><div><span>NYAYABOT / LEGAL DESK</span><strong>Citizen legal intelligence with inspectable evidence.</strong></div></div>
      <div className="nyaya-system"><span><i /> India Code connector</span><span><i /> Local privacy boundary</span><span><i /> Citation verifier ready</span></div>
    </section>

    <div className="nyaya-tabs">
      {nyayaCapabilities.map(({ id, label, icon: Icon }) => <button className={active === id ? 'active' : ''} key={id} onClick={() => setActive(id)}><Icon size={15} />{label}</button>)}
    </div>

    {active === 'analysis' && <div className="nyaya-workspace">
      <section className="surface nyaya-intake">
        <div className="surface-head"><div><span className="eyebrow">01 / Describe the matter</span><h2>Private case intake</h2></div><span className="privacy-signal"><ShieldCheck size={13} /> Local-first</span></div>
        <form onSubmit={runAnalysis}>
          <label>What happened?</label>
          <textarea value={matter} onChange={(event) => setMatter(event.target.value)} />
          <div className="intake-grid"><label><span>Jurisdiction</span><select defaultValue="Delhi"><option>Delhi</option><option>Rajasthan</option><option>Haryana</option><option>Other / determine automatically</option></select></label><label><span>Language</span><select defaultValue="Hinglish"><option>English</option><option>Hindi</option><option>Hinglish</option></select></label></div>
          <button className="primary-btn"><Sparkles size={15} /> Analyse rights & next actions</button>
        </form>
        <div className="pii-boundary"><Fingerprint size={16} /><div><strong>PII protection boundary</strong><span>Configured identifiers are masked before model processing.</span></div></div>
      </section>

      <section className="surface nyaya-analysis">
        <div className="surface-head"><div><span className="eyebrow">02 / Grounded analysis</span><h2>{analysed ? 'Source verification required' : 'Ready for analysis'}</h2></div>{analysed && <span className="confidence-chip">No verified result</span>}</div>
        {!analysed ? <div className="nyaya-empty"><Scale size={29} /><strong>No disposable chatbot answer.</strong><p>NyayaBot will create a persistent matter record, retrieve relevant law, attach evidence and generate a resumable action path.</p></div> : <div className="legal-output">
          <div className="issue-strip"><span>Runtime status</span><strong>Live legal retrieval did not run</strong><em>Fail closed</em></div>
          <div className="legal-guidance"><h3>No legal conclusion generated</h3><p>The matter was not analysed because the current build has not successfully retrieved and snapshotted the governing sources. CodeCubicle will not present a plausible-sounding legal answer as verified evidence.</p></div>
          <div className="legal-disclaimer"><AlertTriangle size={14} /> Connect and verify India Code plus the applicable state-law source before enabling matter analysis.</div>
        </div>}
      </section>

      <aside className="surface nyaya-actions">
        <div className="surface-head"><div><span className="eyebrow">03 / Action path</span><h2>Resumable procedure</h2></div></div>
        <div className="procedure-track">{[['Capture facts', true], ['Secure evidence', analysed], ['Send written response', false], ['Draft legal notice', false], ['Escalate if required', false]].map(([label, complete], index) => <div className={complete ? 'complete' : ''} key={String(label)}><span>{complete ? <Check size={13} /> : index + 1}</span><strong>{String(label)}</strong></div>)}</div>
        <button className="wide-link"><Workflow size={14} /> Open full action guide</button>
      </aside>
    </div>}

    {active === 'research' && <section className="surface nyaya-feature-panel"><BookOpen size={30} /><div><span className="eyebrow">NyayaBot legal research</span><h2>Search statutes, sections, rules and notifications.</h2><p>Run hierarchy-aware retrieval across India Code and approved legal sources, then save every selected provision into the matter evidence graph.</p><Link className="primary-btn" to="/legal-radar">Open official-source research <ArrowRight size={14} /></Link></div></section>}
    {active === 'procedure' && <section className="surface nyaya-feature-panel"><Workflow size={30} /><div><span className="eyebrow">NyayaBot action procedures</span><h2>Turn legal information into a resumable path.</h2><p>Consumer complaint, RTI, police complaint and matter-specific procedures preserve progress, deadlines, authority details and required documents.</p><button className="primary-btn">Browse action procedures</button></div></section>}
    {active === 'drafting' && <section className="surface nyaya-feature-panel"><FileCheck2 size={30} /><div><span className="eyebrow">NyayaBot document drafting</span><h2>Fact-bound documents, not generic templates.</h2><p>Create legal notices, RTI applications, police complaints and consumer complaints from verified matter facts, with version history and PDF export.</p><button className="primary-btn">Start a verified draft</button></div></section>}
    {active === 'trust' && <section className="nyaya-trust-grid"><div className="surface nyaya-feature-panel"><ShieldCheck size={30} /><div><span className="eyebrow">NyayaBot trust report</span><h2>Every answer is inspected before it reaches the citizen.</h2><p>Citation coverage, grounding, PII safety, disclaimer checks and conflicting evidence remain visible—not hidden behind one confidence number.</p></div></div><div className="surface trust-score"><CoverageRing value={92} /><div><span>Current grounding target</span><strong>92 / 100</strong><small>Official sources weighted highest</small></div></div></section>}
  </>
}

function LegalRadarPage() {
  const [query, setQuery] = useState('consumer protection')
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)
  const [live, setLive] = useState(false)
  const [results, setResults] = useState<Array<Record<string, string | number>>>([])
  const search = async (event: FormEvent) => { event.preventDefault(); setBusy(true); const response = await api.legalSearch(query); setResults(response.results); setLive(response.live); setSearched(true); setBusy(false) }
  return <><PageIntro index="09" eyebrow="Official legislation / India" title="Official law index" description="Query the India Code index directly and import selected provisions into a case evidence record." />
    <div className="legal-hero"><div><span className="legal-kicker"><BookOpen size={16} /> Official legislation discovery</span><h2>Search the law. Keep the lineage.</h2><p>Results resolve to India Code, an official Government of India source. Discovery results remain separate from verified evidence until fetched and snapshotted.</p><form onSubmit={search}><Search size={20} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try: data protection, consumer rights, mediation…" /><button disabled={busy}>{busy ? 'Searching…' : 'Search India Code'}</button></form><div className="legal-trust"><span><ShieldCheck size={14} /> Official domain only</span><span><Fingerprint size={14} /> Snapshot on import</span><span><GitCompareArrows size={14} /> Amendment-aware</span></div></div><div className="law-visual"><div className="law-number">100</div><span>authority score</span><i /><p>Ministry of Law & Justice<br />National Informatics Centre</p></div></div>
    {searched && <section className="surface legal-results"><div className="surface-head"><div><span className="eyebrow">Search results</span><h2>{results.length ? `${results.length} official records found` : 'Official connector response'}</h2></div><span className={`live-state ${live ? 'on' : ''}`}><i />{live ? 'Live source' : 'Source unavailable — no records invented'}</span></div>{results.length ? results.map((result, index) => <article className="law-result" key={index}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{String(result.title || 'Official record')}</strong><p>Act no. {String(result.act_number || '—')} · Enacted {String(result.enactment_date || '—')}</p></div><em>Authority 100</em><a href={String(result.official_url)} target="_blank" rel="noreferrer">Open official <ExternalLink size={14} /></a></article>) : <div className="connector-empty"><Network size={26} /><div><strong>The official source could not be read in this environment.</strong><p>CodeCubicle failed closed: it did not substitute generated or unverified legal records. Retry when network access is available.</p></div></div>}</section>}
  </>
}

function App() {
  return <Shell><Routes>
    <Route path="/" element={<CommandCenter />} />
    <Route path="/missions/new" element={<MissionBuilder />} />
    <Route path="/missions" element={<MissionsPage />} />
    <Route path="/dataset" element={<DatasetPage />} />
    <Route path="/changes" element={<ChangesPage />} />
    <Route path="/reviews" element={<ReviewsPage />} />
    <Route path="/sources" element={<SourcesPage />} />
    <Route path="/nyaya" element={<NyayaPage />} />
    <Route path="/legal-radar" element={<LegalRadarPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Shell>
}

export default App
