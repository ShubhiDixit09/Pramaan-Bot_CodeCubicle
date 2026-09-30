import { ArrowRight, LockKeyhole, MessageSquareText } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ErrorBanner, PageHeader } from '../components'
import { localStore } from '../store'

export default function NewCase() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    jurisdiction: 'Delhi',
    language: 'Hinglish' as const,
    urgency: 'medium' as const,
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const created = await api.createCase(form)
      localStore.setCaseId(created.id)
      navigate(`/workspace/${created.id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="New matter"
        title="Tell us what happened."
        description="Use your own words—in English, Hindi, or Hinglish. You do not need to know legal terms."
      />
      {error && <ErrorBanner message={error} />}
      <form className="form-layout" onSubmit={submit}>
        <div className="panel form-panel">
          <div className="field">
            <label htmlFor="title">Short case title</label>
            <input
              id="title"
              required
              minLength={3}
              maxLength={160}
              placeholder="e.g. Landlord kept my security deposit"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="description">What happened?</label>
            <textarea
              id="description"
              required
              minLength={10}
              rows={8}
              placeholder="Dates, people involved, what you have already tried, and what outcome you need…"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            <small>{form.description.length}/10,000 characters</small>
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="jurisdiction">State / jurisdiction</label>
              <select
                id="jurisdiction"
                value={form.jurisdiction}
                onChange={(event) => setForm({ ...form, jurisdiction: event.target.value })}
              >
                {['Delhi', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Other / not sure'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="language">Preferred language</label>
              <select
                id="language"
                value={form.language}
                onChange={(event) =>
                  setForm({ ...form, language: event.target.value as typeof form.language })
                }
              >
                <option>Hinglish</option><option>English</option><option>Hindi</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="urgency">Urgency</label>
              <select
                id="urgency"
                value={form.urgency}
                onChange={(event) =>
                  setForm({ ...form, urgency: event.target.value as typeof form.urgency })
                }
              >
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
          </div>
          <button className="button primary wide" disabled={busy}>
            {busy ? 'Creating private workspace…' : 'Create case workspace'} <ArrowRight size={18} />
          </button>
        </div>
        <aside className="form-aside">
          <div className="aside-card"><LockKeyhole size={21} /><div><strong>Stored locally</strong><span>Your facts are written to the SQLite database on this machine.</span></div></div>
          <div className="aside-card"><MessageSquareText size={21} /><div><strong>Plain language works</strong><span>“Landlord deposit nahi de raha” is enough to begin.</span></div></div>
        </aside>
      </form>
    </>
  )
}


