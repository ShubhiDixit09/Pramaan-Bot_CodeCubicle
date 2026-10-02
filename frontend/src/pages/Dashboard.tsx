import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Loading } from '../components'
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
  return (
    <>
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div className="dashboard-hero-copy">
          <div className="dashboard-hero-topline"><span>PRAMAANBOT / CITIZEN WORKSPACE</span><span>RECORD · REVIEW · ACT</span></div>
          <h1 id="dashboard-title">Legal guidance<br />with a <em>paper trail.</em></h1>
          <p>Describe your situation in English, Hindi or Hinglish. Keep the facts, legal sources and next steps together in one private case file.</p>
          <div className="dashboard-hero-actions">
            <Link className="hero-start" to="/cases/new">Start a case <ArrowRight size={20} /></Link>
            <Link className="hero-research" to="/research">Explore legal sources <ArrowUpRight size={18} /></Link>
          </div>
        </div>
        <div className="dashboard-hero-process">
          <div className="process-heading"><span>HOW A MATTER MOVES</span><span>01 / 03</span></div>
          <ol>
            <li><Link to="/cases/new"><span>01</span><strong>Record your account</strong><small>Start with the facts in your own words.</small><ArrowUpRight size={18} /></Link></li>
            <li><Link to="/research"><span>02</span><strong>Review the sources</strong><small>Inspect the provisions behind guidance.</small><ArrowUpRight size={18} /></Link></li>
            <li><Link to="/drafts"><span>03</span><strong>Prepare an action</strong><small>Draft a document for your review.</small><ArrowUpRight size={18} /></Link></li>
          </ol>
          <div className="process-foot"><ShieldCheck size={18} /><span>Case records remain on this device.</span></div>
        </div>
      </section>
      <div className={`dashboard-connection ${error ? 'offline' : ''}`} role="status">
        <span className="connection-indicator" />
        <strong>{loading ? 'Checking local case service' : error ? 'Local case service unavailable' : 'Local case service ready'}</strong>
        <span>{error ? 'Saved case files cannot be loaded right now.' : loading ? 'One moment while your case register loads.' : `${active} open ${active === 1 ? 'matter' : 'matters'} · ${high} high priority`}</span>
      </div>
      <div className="dashboard-workbench">
        <section className="case-register-surface">
          <header className="register-heading">
            <div><span className="eyebrow">Your case register</span><h2>Case files</h2><p>Return to a matter, inspect evidence and continue where you left off.</p></div>
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
                <div><strong>No case file yet</strong><span>Your first record begins with a plain-language account of what happened.</span></div>
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
          <header><span className="eyebrow">Available services</span><h2 id="service-directory-title">Continue your work</h2></header>
          <nav aria-label="Legal service shortcuts">
            <Link to="/procedures"><span className="directory-number">01</span><span><strong>Follow an action guide</strong><small>Review practical steps for your issue.</small></span><ArrowUpRight size={20} /></Link>
            <Link to="/drafts"><span className="directory-number">02</span><span><strong>Prepare a document</strong><small>Build a draft using your case record.</small></span><ArrowUpRight size={20} /></Link>
            <Link to="/trust"><span className="directory-number">03</span><span><strong>Review verification</strong><small>Inspect citations and limitations.</small></span><ArrowUpRight size={20} /></Link>
          </nav>
        </aside>
      </div>
    </>
  )
}


