import { CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { EmptyState, PageHeader } from '../components'
import { localStore } from '../store'
import type { Analysis } from '../types'

export default function Trust() {
  const analysis = localStore.getAnalysis() as Analysis | null
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
    ['Citation coverage', report.citation_coverage, 'Important claims referencing retrieved provisions'],
    ['Grounding score', report.grounding_score, 'Section references supported by the local corpus'],
    ['Overall trust', report.score, 'Weighted safety and evidence score'],
  ]
  return (
    <>
      <PageHeader eyebrow="ShieldAI verification" title="Trust report" description="A transparent check of what the answer can—and cannot—support." />
      <div className="trust-grid">
        <section className="panel trust-summary">
          <div className="shield-large"><ShieldCheck size={34} /></div>
          <span>Overall trust score</span><strong>{report.score}</strong><small>out of 100</small>
          <p>This score is a review aid, not proof that the legal answer is correct.</p>
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
    </>
  )
}


