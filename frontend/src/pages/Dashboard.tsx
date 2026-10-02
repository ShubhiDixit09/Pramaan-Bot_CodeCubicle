import { ArrowRight, ArrowUpRight, FilePlus2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ErrorBanner, Loading, PageHeader } from '../components'
import { localStore } from '../store'
import type { CaseRecord } from '../types'

export default function Dashboard() {
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .cases()
      .then(setCases)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const active = cases.filter((item) => item.status !== 'resolved').length
  const high = cases.filter((item) => item.urgency === 'high').length
  const statusTitle = loading ? 'Checking case files' : error ? 'Case status unavailable' : active === 0 ? 'No open matters' : `${active} open ${active === 1 ? 'matter' : 'matters'}`
  const statusDescription = error
    ? 'The case service is offline. Stored case counts cannot be confirmed right now.'
    : active === 0
      ? 'When you begin a case, its progress and next steps will appear here.'
      : 'Open a case file below to continue your work.'

  return (
    <>
      <PageHeader
        eyebrow="Your private legal workspace"
        title="Your legal workspace"
        description="Manage your cases, consult legal sources and prepare your next action."
        action={<Link className="button primary" to="/cases/new"><FilePlus2 size={20} /> Start a new case</Link>}
      />
      {error && <ErrorBanner message="The local case service is unavailable. Saved case files cannot be displayed until it is running." />}
      <section className="service-ledger" aria-label="Case status">
        <div className="service-ledger-primary">
          <span className="service-ledger-label">Case status</span>
          <strong>{statusTitle}</strong>
          <p>{statusDescription}</p>
        </div>
        <dl className="service-ledger-details">
          <div><dt>High-priority cases</dt><dd>{loading || error ? '—' : high}</dd></div>
          <div><dt>Storage</dt><dd>On this device</dd></div>
        </dl>
      </section>
      <div className="dashboard-workbench">
        <section className="case-register-surface">
          <header className="register-heading">
            <div><span className="eyebrow">Case register</span><h2>Your case files</h2><p>Each matter has its own record, evidence and activity history.</p></div>
            <div className="register-total"><strong>{loading || error ? '—' : cases.length}</strong><span>Total files</span></div>
          </header>
          {loading ? (
            <Loading />
          ) : error ? (
            <div className="register-empty">
              <div className="register-empty-copy"><div><strong>Case register unavailable</strong><span>Start the local case service to view your saved files.</span></div></div>
            </div>
          ) : cases.length === 0 ? (
            <div className="register-empty">
              <div className="register-empty-copy">
                <div><strong>Start with your first matter</strong><span>Describe what happened in your own words. Your case record stays on this device.</span></div>
              </div>
              <Link className="register-action" to="/cases/new">Create a case file <ArrowRight size={18} /></Link>
            </div>
          ) : (
            <div className="case-list">
              {cases.map((item) => (
                <Link
                  to={`/workspace/${item.id}`}
                  className="case-row"
                  key={item.id}
                  onClick={() => localStore.setCaseId(item.id)}
                >
                  <div className="case-monogram">{item.title.slice(0, 2).toUpperCase()}</div>
                  <div className="case-main">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                  <div className="case-meta">
                    <span className={`urgency ${item.urgency}`}>{item.urgency}</span>
                    <small>{item.jurisdiction}</small>
                  </div>
                  <ArrowRight size={18} />
                </Link>
              ))}
            </div>
          )}
        </section>
        <aside className="service-directory" aria-labelledby="service-directory-title">
          <header><span className="eyebrow">Explore services</span><h2 id="service-directory-title">What you can do here</h2></header>
          <nav aria-label="Legal service shortcuts">
            <Link to="/research"><span className="directory-number">01</span><span><strong>Find the applicable law</strong><small>Search provisions in the local legal corpus.</small></span><ArrowUpRight size={20} /></Link>
            <Link to="/procedures"><span className="directory-number">02</span><span><strong>Follow an action guide</strong><small>Review practical steps for your issue.</small></span><ArrowUpRight size={20} /></Link>
            <Link to="/drafts"><span className="directory-number">03</span><span><strong>Prepare a document</strong><small>Build a draft using your case record.</small></span><ArrowUpRight size={20} /></Link>
            <Link to="/trust"><span className="directory-number">04</span><span><strong>Review verification</strong><small>Inspect citations and limitations.</small></span><ArrowUpRight size={20} /></Link>
          </nav>
        </aside>
      </div>
    </>
  )
}
