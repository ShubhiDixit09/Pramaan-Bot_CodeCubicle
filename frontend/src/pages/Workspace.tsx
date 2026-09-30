import { BookOpen, FilePenLine, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { EmptyState, ErrorBanner, Loading, PageHeader } from '../components'
import { localStore } from '../store'
import type { Analysis, CaseRecord } from '../types'

const depositQuestion =
  'What steps should I take to recover the ₹25,000 deposit, challenge the undocumented painting and cleaning deductions, and prepare a formal notice?'

export default function Workspace() {
  const params = useParams()
  const caseId = params.caseId || localStore.getCaseId()
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(localStore.getAnalysis(caseId))
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!caseId) return
    localStore.setCaseId(caseId)
    setAnalysis(localStore.getAnalysis(caseId))
    api.case(caseId).then((record) => {
      setCaseRecord(record)
      setMessage(record.title === 'Landlord is refusing to return my security deposit' ? depositQuestion : '')
    }).catch((err: Error) => setError(err.message))
  }, [caseId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!caseId || !caseRecord) return
    setBusy(true)
    setError('')
    try {
      const result = await api.analyze(caseId, message, caseRecord.language)
      setAnalysis(result)
      localStore.setAnalysis(caseId, result)
      setMessage('')
      const refreshed = await api.case(caseId)
      setCaseRecord(refreshed)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!caseId) {
    return (
      <EmptyState title="Choose a case first" description="Create a case or open one from the dashboard.">
        <Link className="button primary" to="/cases/new">Create a case</Link>
      </EmptyState>
    )
  }
  if (!caseRecord && !error) return <Loading label="Opening the private case workspace…" />

  return (
    <>
      <PageHeader
        eyebrow={`${caseRecord?.jurisdiction || ''} · ${caseRecord?.status || ''}`}
        title={caseRecord?.title || 'Case workspace'}
        description={caseRecord?.description || 'Analyse the matter using the local legal corpus.'}
        action={<span className={`urgency ${caseRecord?.urgency}`}>{caseRecord?.urgency} urgency</span>}
      />
      {error && <ErrorBanner message={error} />}
      <div className="workspace-grid">
        <section className="panel facts-panel">
          <span className="eyebrow">Case record</span>
          <h2>Known facts</h2>
          <dl>
            <div><dt>Jurisdiction</dt><dd>{caseRecord?.jurisdiction}</dd></div>
            <div><dt>Language</dt><dd>{caseRecord?.language}</dd></div>
            <div><dt>Revision</dt><dd>{caseRecord?.revision}</dd></div>
          </dl>
          <div className="subtle-box">
            <strong>Evidence</strong>
            <span>{caseRecord?.related?.evidence?.length || 0} document(s) saved</span>
          </div>
          <div className="subtle-box">
            <strong>Audit history</strong>
            <span>{caseRecord?.related?.audit_events?.length || 0} immutable event(s)</span>
          </div>
        </section>
        <section className="panel conversation-panel">
          <div className="panel-heading compact">
            <div><span className="eyebrow">Local analysis</span><h2>Legal guidance</h2></div>
            {analysis && <span className="mode-pill"><Sparkles size={14} /> {analysis.model_mode}</span>}
          </div>
          {analysis ? (
            <div className="analysis">
              <div className="intent-row">
                <span>{analysis.intent.domain}</span>
                <span>{Math.round(analysis.intent.confidence * 100)}% intent confidence</span>
              </div>
              <p className="answer">{analysis.answer}</p>
              <h3>Recommended next steps</h3>
              <ol>
                {analysis.next_steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <div className="citations-mini">
                {analysis.citations.map((citation) => (
                  citation.source_url ? (
                    <a key={citation.id} href={citation.source_url} target="_blank" rel="noreferrer" title="Open source text">
                      {citation.act} · {citation.section}
                    </a>
                  ) : <span key={citation.id}>{citation.act} · {citation.section}</span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Ready for the first analysis"
              description="Ask what rights, procedure, documents, or next action may apply."
            />
          )}
          <form className="message-box" onSubmit={submit}>
            <textarea
              rows={3}
              required
              minLength={3}
              placeholder="Example: Mere landlord ne bina written notice ghar chhodne ko bola…"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button className="button primary" disabled={busy}>
              <Send size={17} /> {busy ? 'Checking local law…' : 'Analyse'}
            </button>
          </form>
        </section>
        <aside className="panel trust-panel">
          <span className="eyebrow">Verification</span>
          <h2>Trust report</h2>
          {analysis ? (
            <>
              <div className="score-ring" style={{ '--score': `${analysis.trust_report.score * 3.6}deg` } as React.CSSProperties}>
                <div><strong>{analysis.trust_report.score}</strong><span>/ 100</span></div>
              </div>
              <div className="metric"><span>Citation coverage</span><strong>{analysis.trust_report.citation_coverage}%</strong></div>
              <div className="metric"><span>Grounding</span><strong>{analysis.trust_report.grounding_score}%</strong></div>
              <div className="check-line"><ShieldCheck size={17} /><span>PII {analysis.trust_report.pii_safe ? 'protected' : 'needs review'}</span></div>
              <p className="trust-caveat">{analysis.trust_report.findings[0]}</p>
              <Link className="text-link" to="/trust">Open full report</Link>
            </>
          ) : (
            <p className="muted">Run an analysis to generate citation and safety checks.</p>
          )}
          <div className="quick-actions">
            <Link to="/research"><BookOpen size={17} /> Research sources</Link>
            <Link to="/drafts"><FilePenLine size={17} /> Prepare document</Link>
          </div>
        </aside>
      </div>
    </>
  )
}


