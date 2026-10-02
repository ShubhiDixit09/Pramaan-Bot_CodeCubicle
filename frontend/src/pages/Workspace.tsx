import {
  AlertCircle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronRight,
  Clock3, Coins, Download, FilePenLine, FileText, FolderOpen, Globe2, Home,
  LockKeyhole, MessageSquareText, Paperclip, Send, ShieldCheck, UploadCloud,
} from 'lucide-react'
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { API_URL, api } from '../api'
import { EmptyState, ErrorBanner, Loading } from '../components'
import { localStore } from '../store'
import type { Analysis, CaseRecord } from '../types'

type Tab = 'overview' | 'evidence' | 'documents' | 'activity'
type Evidence = { id: string; filename: string; media_type: string; sha256: string; metadata_json: string; created_at: string }
type Draft = { id: string; title: string; document_type: string; created_at: string }
type AuditEvent = { id: string; action: string; created_at: string }

const depositQuestion =
  'What steps should I take to recover the ₹25,000 deposit, challenge the undocumented painting and cleaning deductions, and prepare a formal notice?'

function dateLabel(value?: string) {
  if (!value) return 'Not recorded'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function savedOriginal(item: Evidence) {
  try { return Boolean(JSON.parse(item.metadata_json).stored_locally) } catch { return false }
}

export default function Workspace() {
  const params = useParams()
  const caseId = params.caseId || localStore.getCaseId()
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(localStore.getAnalysis(caseId))
  const [tab, setTab] = useState<Tab>('overview')
  const [expanded, setExpanded] = useState(false)
  const [showGuidance, setShowGuidance] = useState(false)
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', jurisdiction: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!caseId) return
    localStore.setCaseId(caseId)
    setAnalysis(localStore.getAnalysis(caseId))
    setTab('overview')
    api.case(caseId).then((record) => {
      setCaseRecord(record)
      setEditForm({ title: record.title, description: record.description, jurisdiction: record.jurisdiction })
      setMessage(record.title === 'Landlord is refusing to return my security deposit' ? depositQuestion : '')
    }).catch((err: Error) => setError(err.message))
  }, [caseId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!caseId || !caseRecord || !message.trim()) return
    setBusy(true)
    setError('')
    try {
      const result = await api.analyze(caseId, message, caseRecord.language)
      setAnalysis(result)
      localStore.setAnalysis(caseId, result)
      setNotice('')
      setMessage('')
      setCaseRecord(await api.case(caseId))
      setTab('overview')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !caseId) return
    setError('')
    setNotice('')
    setUploading(true)
    try {
      await api.uploadEvidence(caseId, file)
      setCaseRecord(await api.case(caseId))
      setAnalysis(null)
      localStore.clearAnalysis()
      setTab('evidence')
      setNotice('Original file saved locally. Its contents have not been independently verified; rerun analysis to refresh the report.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!caseId || !caseRecord) return
    setBusy(true)
    setError('')
    try {
      await api.updateCase(caseId, { ...editForm, expected_revision: caseRecord.revision })
      setCaseRecord(await api.case(caseId))
      setAnalysis(null)
      localStore.clearAnalysis()
      setEditing(false)
      setNotice('Case updated. Rerun analysis to check the revised facts and sources.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!caseId) return <EmptyState title="Choose a case first" description="Create a case or open one from the dashboard."><Link className="button primary" to="/cases/new">Create a case</Link></EmptyState>
  if (!caseRecord && !error) return <Loading label="Opening the private case workspace…" />
  if (!caseRecord) return <ErrorBanner message={error} />

  const evidence = (caseRecord.related?.evidence || []) as Evidence[]
  const drafts = (caseRecord.related?.drafts || []) as Draft[]
  const audit = (caseRecord.related?.audit_events || []) as AuditEvent[]
  const accountText = caseRecord.title + ' ' + caseRecord.description
  const depositCase = /deposit/i.test(accountText) && /landlord|tenant|rent|flat|vacat/i.test(accountText)
  const missingBreakdown = /painting|cleaning|deduct|charges/i.test(accountText) && /no proper bill|written calculation|breakdown|itemis/i.test(accountText)
  const mentionedEvidence = depositCase ? [
    /agreement/i.test(accountText) && { label: 'Rent agreement', icon: FileText },
    /upi|payment|receipt/i.test(accountText) && { label: 'Payment record', icon: Coins },
    /whatsapp|message|chat/i.test(accountText) && { label: 'Messages', icon: MessageSquareText },
  ].filter((item): item is { label: string; icon: typeof FileText } => Boolean(item)) : []
  const amount = caseRecord.description.match(/₹\s?[\d,]+/)?.[0]
  const dates = caseRecord.description.match(/\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/gi) || []
  const overview = caseRecord.description.length > 360 && !expanded ? `${caseRecord.description.slice(0, 360).trimEnd()}…` : caseRecord.description
  const steps = analysis?.next_steps || [
    'Record a precise timeline of events and amounts.',
    'Gather agreements, receipts, messages and notices.',
    'Ask a specific question to check relevant local sources.',
    'Review any draft and sources before sending it.',
  ]
  const report = analysis?.trust_report

  return (
    <div className="case-workspace">
      <div className="case-kicker">{caseRecord.jurisdiction} <span>/</span> {analysis?.intent.domain || (depositCase ? 'Tenancy' : 'Case workspace')}</div>
      <div className="case-heading-row">
        <div>
          <h1>{depositCase ? 'Security deposit dispute' : caseRecord.title}</h1>
          {depositCase && <p>Recovering {amount || 'the deposit'} after vacating a rented flat.</p>}
        </div>
        <div className="case-heading-actions">
          <span className={`urgency ${caseRecord.urgency}`}><AlertCircle size={14} /> {caseRecord.urgency} urgency</span>
          <button className="button secondary" onClick={() => { setError(''); setEditing(true) }}><FilePenLine size={17} /> Edit case</button>
          <Link className="button primary" to="/drafts"><FilePenLine size={17} /> Prepare notice <ArrowRight size={17} /></Link>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {notice && <div className="case-notice"><CheckCircle2 size={17} /> {notice}</div>}

      <div className="case-body-grid">
        <div className="case-primary">
          <div className="case-fact-strip">
            {depositCase && amount ? <div><Coins size={23} /><span>Deposit</span><strong>{amount}</strong></div> : <div><FolderOpen size={23} /><span>Case status</span><strong>{caseRecord.status}</strong></div>}
            {depositCase && dates[0] ? <div><CalendarDays size={23} /><span>Paid, per account</span><strong>{dateLabel(dates[0])}</strong></div> : <div><CalendarDays size={23} /><span>Case opened</span><strong>{dateLabel(caseRecord.created_at)}</strong></div>}
            {depositCase && dates[1] ? <div><Home size={23} /><span>Vacated, per account</span><strong>{dateLabel(dates[1])}</strong></div> : <div><Paperclip size={23} /><span>Evidence records</span><strong>{evidence.length}</strong></div>}
          </div>
          <div className="case-tabs" role="tablist" aria-label="Case sections">
            {(['overview', 'evidence', 'documents', 'activity'] as Tab[]).map((item) => (
              <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>{item}</button>
            ))}
          </div>

          {tab === 'overview' && <section className="panel case-dossier">
            <div className="dossier-section overview-card">
              <div className="dossier-label">01 <span>/</span> Case summary <span className="case-language"><Globe2 size={14} /> {caseRecord.language}</span></div>
              <h2>What happened</h2>
              <p className="case-account">{overview}</p>
              {caseRecord.description.length > 360 && <button className="case-inline-action" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show less' : 'Read full account'}</button>}
              {missingBreakdown && <div className="case-quote">No written deduction breakdown shared, per your account.</div>}
              <div className="case-evidence-caption">Mentioned evidence</div>
              <div className="case-evidence-tags">
                {mentionedEvidence.length ? mentionedEvidence.map(({ label, icon: Icon }) => <span key={label}><Icon size={14} /> {label}</span>) : <span><Paperclip size={14} /> No document type identified in the account</span>}
              </div>
              <div className={evidence.length ? 'case-evidence-alert saved' : 'case-evidence-alert'}><AlertCircle size={16} /><span>{evidence.length ? `${evidence.length} file${evidence.length === 1 ? '' : 's'} saved locally; contents remain unverified.` : 'These documents have not been uploaded yet.'}</span><button onClick={() => fileInput.current?.click()}>Upload evidence <ArrowRight size={15} /></button></div>
            </div>

            <div className="dossier-section steps-card">
              <div className="dossier-label">02 <span>/</span> Action plan</div>
              <h2>Move your case forward</h2>
              <div className="step-list">
                {steps.slice(0, showAllSteps ? 5 : 4).map((step, index) => <div className="case-step" key={`${index}-${step}`}><span>{index + 1}</span><p>{step}</p><ChevronRight size={16} /></div>)}
              </div>
              {steps.length > 4 && <button className="case-more-steps" onClick={() => setShowAllSteps(!showAllSteps)}>{showAllSteps ? 'Show fewer steps' : `Show all ${steps.length} steps`} <ArrowRight size={14} /></button>}
              {!analysis && <p className="case-footnote">These are preparation steps, not case-specific legal guidance. Ask a question below to check the local corpus.</p>}
            </div>

            <div className="dossier-research">
              <BookOpen size={23} /><strong>Legal research</strong><span>{analysis ? 'Open the answer and cited sources.' : 'Ask a question to retrieve relevant law.'}</span><button onClick={() => setShowGuidance(!showGuidance)} aria-label={showGuidance ? 'Close legal guidance' : 'Open legal guidance'} aria-expanded={showGuidance}><ChevronRight size={17} /></button>
            </div>
            {showGuidance && <div className="guidance-card" id="case-guidance">
              <div className="case-card-title"><h2>Source-linked guidance</h2>{analysis && <span className="source-mode">{analysis.model_mode} answer</span>}</div>
              {analysis ? <>
                <div className="guidance-answer">{analysis.answer}</div>
                <div className="guidance-sources"><strong>Sources cited</strong>{analysis.citations.map((citation) => citation.source_url ? <a href={citation.source_url} target="_blank" rel="noreferrer" key={citation.id}>{citation.act} · {citation.section} <ArrowRight size={13} /></a> : <span key={citation.id}>{citation.act} · {citation.section}</span>)}</div>
              </> : <p className="muted">No legal analysis yet. Ask a question below; relevant provisions and limitations will appear here.</p>}
            </div>}
          </section>}

          {tab === 'evidence' && <section className="panel case-card tab-card">
            <div className="case-card-title"><span className="case-icon"><Paperclip size={21} /></span><h2>Evidence register</h2><button className="button secondary" onClick={() => fileInput.current?.click()} disabled={uploading}><UploadCloud size={16} /> Add file</button></div>
            <p className="muted">Files stay on this device. A hash records whether a saved file changes; it does not prove the file is authentic or that its contents are true.</p>
            {evidence.length ? <div className="case-list-simple">{evidence.map((item) => <div key={item.id}><FileText size={20} /><div><strong>{item.filename}</strong><span>{dateLabel(item.created_at)} · {savedOriginal(item) ? 'Original stored locally' : 'Older metadata-only record'}</span></div>{savedOriginal(item) && <a href={api.evidenceFileUrl(caseId, item.id)} aria-label={`Download ${item.filename}`}><Download size={18} /></a>}</div>)}</div> : <div className="case-empty"><Paperclip size={25} /><strong>No files saved yet</strong><span>Add the agreement, payment proof, messages, or other material you want to keep with this case.</span></div>}
          </section>}

          {tab === 'documents' && <section className="panel case-card tab-card">
            <div className="case-card-title"><span className="case-icon"><FilePenLine size={21} /></span><h2>Document drafts</h2><Link className="button secondary" to="/drafts">Prepare draft <ArrowRight size={16} /></Link></div>
            <p className="muted">Drafts use your saved account. Check every date, amount, name, legal claim, and requested relief before sending.</p>
            {drafts.length ? <div className="case-list-simple">{drafts.map((item) => <div key={item.id}><FileText size={20} /><div><strong>{item.title}</strong><span>Created {dateLabel(item.created_at)} · draft, not filed</span></div><a href={`${API_URL}/drafts/${item.id}/pdf`} aria-label={`Download ${item.title}`}><Download size={18} /></a></div>)}</div> : <div className="case-empty"><FileText size={25} /><strong>No drafts yet</strong><span>Prepare a notice or application once the account and requested relief are clear.</span></div>}
          </section>}

          {tab === 'activity' && <section className="panel case-card tab-card">
            <div className="case-card-title"><span className="case-icon"><Clock3 size={21} /></span><h2>Case activity</h2></div>
            {audit.length ? <div className="case-list-simple activity-list">{audit.map((item) => <div key={item.id}><Clock3 size={18} /><div><strong>{item.action.replaceAll('_', ' ')}</strong><span>{dateLabel(item.created_at)}</span></div></div>)}</div> : <div className="case-empty"><Clock3 size={25} /><strong>No audit entries yet</strong></div>}
          </section>}

          <form className="case-composer" onSubmit={submit}>
            <label htmlFor="case-question">Add a detail to your case</label>
            <div><textarea id="case-question" rows={2} required minLength={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell Pramaan Bot what happened or ask what to do next…" /><button className="case-send" disabled={busy} aria-label={busy ? 'Analysing' : 'Analyse question'}><Send size={19} /></button></div>
            <small>{busy ? 'Checking relevant local provisions…' : 'General legal information. Review the sources and facts before acting.'}</small>
          </form>
        </div>

        <aside className="case-rail panel">
          <section className="rail-section trust-rail-card">
            <div className="rail-title"><ShieldCheck size={23} /><h2>Source review</h2>{report && <span className="review-pill"><AlertCircle size={14} /> Needs review</span>}</div>
            {report ? <>
              <span className="rail-overline">Answer review score</span>
              <div className="rail-score"><strong>{report.score}</strong><span>/ 100</span></div>
              <div className="rail-score-track"><b style={{ width: `${report.score}%` }} /></div>
              <p className="rail-score-note">Checks references and safety signals—not case outcome or document authenticity.</p>
              <div className="rail-metric"><div><span>Citation coverage</span><strong>{report.citation_coverage}%</strong></div></div>
              <div className="rail-metric"><div><span>Section-reference check</span><strong>{report.grounding_score}%</strong></div></div>
              {report.findings[0] && <p className="rail-warning"><AlertCircle size={15} /> {report.findings[0]}</p>}
              <Link className="case-inline-link" to="/trust">Review trust report <ArrowRight size={15} /></Link>
            </> : <><p className="muted">Run an analysis to see the answer's source checks and limitations.</p><div className="rail-warning"><AlertCircle size={15} /> No score before an answer is checked.</div></>}
          </section>

          <section className="rail-section record-rail-card">
            <div className="rail-title"><FileText size={23} /><h2>Case file</h2></div>
            <dl><div><dt>Jurisdiction</dt><dd>{caseRecord.jurisdiction}</dd></div><div><dt>Language</dt><dd>{caseRecord.language}</dd></div><div><dt>Saved evidence</dt><dd>{evidence.length} document{evidence.length === 1 ? '' : 's'}</dd></div><div><dt>Audit history</dt><dd>{audit.length} event{audit.length === 1 ? '' : 's'}</dd></div></dl>
            <button className="button secondary wide" onClick={() => fileInput.current?.click()} disabled={uploading}><UploadCloud size={17} /> {uploading ? 'Saving locally…' : 'Upload evidence'}</button>
          </section>

          <section className="rail-section rail-draft"><div className="rail-title"><FilePenLine size={23} /><h2>Your notice draft</h2></div><p>Prepare a notice using the facts in this case. Review it before sending.</p><Link className="case-inline-link" to="/drafts">Open document workspace <ArrowRight size={15} /></Link></section>
          <p className="rail-privacy"><LockKeyhole size={17} /><span><strong>Local case storage</strong><small>Files stay on this device; use device access controls to protect them.</small></span></p>
        </aside>
      </div>
      <input ref={fileInput} className="visually-hidden" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.md" onChange={upload} aria-label="Choose evidence file" />
      {editing && <div className="case-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(false) }}>
        <form className="case-modal panel" role="dialog" aria-modal="true" aria-label="Edit case" onSubmit={saveEdit}>
          <h2>Edit case</h2>
          <p>Changes to the account clear the current answer review until you analyse again.</p>
          {error && <ErrorBanner message={error} />}
          <label>Case title<input required minLength={3} maxLength={160} value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} /></label>
          <label>Jurisdiction<input required maxLength={100} value={editForm.jurisdiction} onChange={(event) => setEditForm({ ...editForm, jurisdiction: event.target.value })} /></label>
          <label>What happened<textarea required minLength={10} maxLength={10000} rows={7} value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} /></label>
          <div><button type="button" className="button secondary" onClick={() => setEditing(false)}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </div>}
    </div>
  )
}
