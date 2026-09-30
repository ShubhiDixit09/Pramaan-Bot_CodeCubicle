import { BookMarked, Search } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { api } from '../api'
import { ErrorBanner, PageHeader } from '../components'
import type { Citation } from '../types'

export default function Research() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Citation[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      setResults((await api.research(query)).results)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Offline statutory corpus"
        title="Research the applicable law."
        description="Search by meaning. PRAMAAN BOT ranks matching Acts and then the most relevant provisions."
      />
      {error && <ErrorBanner message={error} />}
      <form className="search-bar" onSubmit={submit}>
        <Search size={20} />
        <input required minLength={2} placeholder="e.g. seller refused refund for defective product" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="button primary" disabled={busy}>{busy ? 'Searching…' : 'Search locally'}</button>
      </form>
      <div className="research-list">
        {results.map((item) => (
          <article className="panel research-card" key={item.id}>
            <div className="law-icon"><BookMarked size={21} /></div>
            <div>
              <div className="law-heading"><span>{item.act}</span><strong>{item.section}</strong></div>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
              <div className="law-meta"><span>{item.jurisdiction}</span><span>{item.relevance}% relevance</span><span>Local corpus</span></div>
            </div>
          </article>
        ))}
        {!results.length && <div className="search-placeholder"><BookMarked size={28} /><span>Relevant provisions will appear here with their source and retrieval score.</span></div>}
      </div>
    </>
  )
}


