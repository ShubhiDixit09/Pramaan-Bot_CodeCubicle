import { CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { EmptyState, PageHeader } from '../components'
import { localStore } from '../store'
import type { Analysis } from '../types'

export default function Trust() {
  const analysis = localStore.getAnalysis(localStore.getCaseId()) as Analysis | null
  if (!analysis) {
    return (
      <>
        <PageHeader eyebrow="ShieldAI verification" title="Trust report" description="Claim grounding, citation coverage, privacy, and disclaimer checks." />
        <EmptyState title="No report yet" description="Run a legal analysis in the case workspace first." />
      </>
    )
  }
  const report = analysis.trust_report
  const metrics = [
    ['Citation coverage', report.citation_coverage, 'Share of attached provisions named in the answer'],
    ['Reference check', report.grounding_score, 'Section numbers matched against the attached local sources'],
    ['Answer review', report.score, 'Heuristic score with deductions for known limitations'],
  ]
  return (
    <>
      <PageHeader eyebrow="ShieldAI verification" title="Trust report" description="A transparent check of what the answer can—and cannot—support." />
      <div className="trust-grid">
        <section className="panel trust-summary">
          <div className="shield-large"><ShieldCheck size={34} /></div>
          <span>Answer review score</span><strong>{report.score}</strong><small>out of 100</small>
          <p>This score checks the answer's references and safety signals. It does not predict a case outcome or verify your documents.</p>
          <p>40% citation coverage + 35% section check + 15% PII check + 10% disclaimer, minus 15 points per stated limitation. No attached source means a score of zero.</p>
        </section>
        <section className="panel metrics-panel">
          {metrics.map(([label, value, note]) => (
            <div className="report-metric" key={label as string}>
              <div><strong>{label}</strong><span>{note}</span></div>
              <div className="metric-bar"><span style={{ width: `${value}%` }} /></div>
              <b>{value}%</b>
            </div>
          ))}
        </section>
      </div>
      <section className="panel findings">
        <div className="panel-heading compact"><div><span className="eyebrow">Findings</span><h2>Verification details</h2></div></div>
        <div className="finding"><CheckCircle2 size={19} /><div><strong>PII check</strong><span>{report.pii_safe ? 'No unmasked configured PII pattern was found.' : 'Sensitive data needs manual review.'}</span></div></div>
        <div className="finding"><CheckCircle2 size={19} /><div><strong>Disclaimer</strong><span>{report.disclaimer_present ? 'Required limitation statement is present.' : 'Required disclaimer is missing.'}</span></div></div>
        {report.findings.map((item) => <div className="finding warning" key={item}><ShieldAlert size={19} /><div><strong>Reviewer note</strong><span>{item}</span></div></div>)}
      </section>
      <section className="panel findings source-list">
        <div className="panel-heading compact"><div><span className="eyebrow">Evidence trail</span><h2>Sources used for this answer</h2></div></div>
        {analysis.citations.length ? analysis.citations.map((citation) => (
          <div className="source-row" key={citation.id}>
            <div><strong>{citation.act} · {citation.section}</strong><span>{citation.title}</span></div>
            <span>{citation.support_level === 'contextual' ? 'Contextual provision' : 'Source provision'}</span>
            {citation.source_url && <a href={citation.source_url} target="_blank" rel="noreferrer">Open official text ↗</a>}
          </div>
        )) : <p className="muted">No source was attached to this answer.</p>}
      </section>
    </>
  )
}


