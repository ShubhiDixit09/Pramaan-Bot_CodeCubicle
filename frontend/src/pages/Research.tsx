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
        eyebrow={import.meta.env.PROD ? "Curated public legal corpus" : "Offline statutory corpus"}
        title="Research the applicable law."
        description={import.meta.env.PROD ? "Browse a small curated reference corpus using TF-IDF source ranking. This is not live law verification or AI-generated legal advice. Enter only generic questions, without personal information." : "Search by meaning. PRAMAAN BOT ranks matching Acts and then the most relevant provisions."}
      />
      {error && <ErrorBanner message={error} />}
      <form className="search-bar" onSubmit={submit}>
        <Search size={20} />
        <input required minLength={2} placeholder="e.g. seller refused refund for defective product" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="button primary" disabled={busy}>{busy ? 'Searching…' : (import.meta.env.PROD ? 'Search sources' : 'Search locally')}</button>
      </form>
      <div className="research-list">
        {results.map((item) => (
          <article className="panel research-card" key={item.id}>
            <div className="law-icon"><BookMarked size={21} /></div>
            <div>
              <div className="law-heading"><span>{item.act}</span><strong>{item.section}</strong></div>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
              <div className="law-meta"><span>{item.jurisdiction}</span><span>{item.relevance}% relevance</span><span>{import.meta.env.PROD ? "Curated public corpus" : "Local corpus"}</span></div>
              {item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer">Read source document</a>}
            </div>
          </article>
        ))}
        {!results.length && <div className="search-placeholder"><BookMarked size={28} /><span>Relevant provisions will appear here with their source and retrieval score.</span></div>}
      </div>
    </>
  )
}


