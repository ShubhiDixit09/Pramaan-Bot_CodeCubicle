import { ArrowRight, FilePlus2, FolderOpen, Scale, ShieldCheck } from 'lucide-react'
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

  return (
    <>
      <PageHeader
        eyebrow="Your local legal workspace"
        title="Good to have you here."
        description="Organise a legal issue, retrieve relevant law, and turn it into a clear next action."
        action={<Link className="button primary" to="/cases/new"><FilePlus2 size={18} /> Start a case</Link>}
      />
      {error && <ErrorBanner message={`${error} Start the backend with .\\.venv\\Scripts\\python.exe backend\\run.py.`} />}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><FolderOpen size={21} /></div>
          <div><span>Active cases</span><strong>{active}</strong><small>Saved on this device</small></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Scale size={21} /></div>
          <div><span>Needs attention</span><strong>{high}</strong><small>High-urgency cases</small></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><ShieldCheck size={21} /></div>
          <div><span>Privacy mode</span><strong className="word">Local</strong><small>No cloud case storage</small></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Case register</span><h2>Recent cases</h2></div>
          <span className="count-pill">{cases.length} total</span>
        </div>
        {loading ? (
          <Loading />
        ) : cases.length === 0 ? (
          <div className="empty-row">
            <span>No cases yet. Create one or load the landlord deposit example.</span>
            <Link to="/cases/new">Create a case <ArrowRight size={16} /></Link>
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
    </>
  )
}


