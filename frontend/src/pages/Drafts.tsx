import { Download, FileText } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { API_URL, api } from '../api'
import { EmptyState, ErrorBanner, PageHeader } from '../components'
import { localStore } from '../store'

export default function Drafts() {
  const caseId = localStore.getCaseId()
  const [form, setForm] = useState({
    document_type: 'legal_notice',
    recipient: 'The Appropriate Authority',
    requested_relief: 'Appropriate relief under applicable law',
  })
  const [draft, setDraft] = useState<{ id: string; title: string; content: string } | null>(null)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!caseId) return
    try {
      setDraft(await api.createDraft(caseId, form))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Fact-bound drafting"
        title="Prepare a document without invented facts."
        description="The generator uses the saved case description and leaves personal fields for verification."
      />
      {error && <ErrorBanner message={error} />}
      {!caseId ? (
        <EmptyState title="No active case" description="Open a case before creating a legal document." />
      ) : (
        <div className="draft-layout">
          <form className="panel form-panel" onSubmit={submit}>
            <div className="field"><label>Document type</label><select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}><option value="legal_notice">Legal notice</option><option value="fir_complaint">Police complaint</option><option value="rti_application">RTI application</option><option value="consumer_complaint">Consumer complaint</option></select></div>
            <div className="field"><label>Recipient</label><input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} /></div>
            <div className="field"><label>Relief requested</label><textarea rows={4} value={form.requested_relief} onChange={(e) => setForm({ ...form, requested_relief: e.target.value })} /></div>
            <button className="button primary"><FileText size={18} /> Generate local draft</button>
          </form>
          <section className="panel document-preview">
            {draft ? (
              <>
                <div className="preview-header"><div><span className="eyebrow">Draft preview</span><h2>{draft.title}</h2></div><a className="button secondary" href={`${API_URL}/drafts/${draft.id}/pdf`}><Download size={17} /> PDF</a></div>
                <pre>{draft.content}</pre>
              </>
            ) : (
              <EmptyState title="Your draft will appear here" description="Every generated document is saved as a versioned draft in the case record." />
            )}
          </section>
        </div>
      )}
    </>
  )
}


