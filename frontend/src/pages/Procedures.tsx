import { Check, ClipboardCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api'
import { EmptyState, ErrorBanner, Loading, PageHeader } from '../components'
import { localStore } from '../store'
import type { Procedure } from '../types'

export default function Procedures() {
  const caseId = localStore.getCaseId()
  const [templates, setTemplates] = useState<Procedure[]>([])
  const [run, setRun] = useState<Procedure | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.procedures().then(setTemplates).catch((err: Error) => setError(err.message))
  }, [])

  const start = async (id: string) => {
    if (!caseId) return
    try {
      setRun(await api.startProcedure(caseId, id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const toggle = async (stepId: string, completed: boolean) => {
    if (!run?.run_id) return
    try {
      setRun(await api.updateStep(run.run_id, stepId, completed))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Deterministic workflow"
        title="Turn legal text into a checklist."
        description="Start a procedure, mark completed steps, and return later without losing progress."
      />
      {error && <ErrorBanner message={error} />}
      {!caseId ? (
        <EmptyState title="No active case" description="Open or create a case before starting an action guide." />
      ) : !templates.length ? (
        <Loading />
      ) : (
        <div className="procedure-layout">
          <aside className="panel procedure-menu">
            <span className="eyebrow">Available guides</span>
            {templates.map((item) => (
              <button key={item.id} className={run?.id === item.id ? 'selected' : ''} onClick={() => start(item.id)}>
                <ClipboardCheck size={18} /><span><strong>{item.title}</strong><small>{item.authority}</small></span>
              </button>
            ))}
          </aside>
          <section className="panel procedure-detail">
            {run ? (
              <>
                <div className="progress-header">
                  <div><span className="eyebrow">Active procedure</span><h2>{run.title}</h2></div>
                  <strong>{run.progress}%</strong>
                </div>
                <div className="progress-track"><span style={{ width: `${run.progress}%` }} /></div>
                <div className="procedure-info"><span><small>Authority</small>{run.authority}</span><span><small>Fee</small>{run.fee}</span><span><small>Timing</small>{run.deadline}</span></div>
                <div className="steps">
                  {run.steps.map((step) => (
                    <button key={step.id} className={step.completed ? 'done' : ''} onClick={() => toggle(step.id, !step.completed)}>
                      <span className="check-box">{step.completed && <Check size={16} />}</span>
                      <span>{step.title}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState title="Choose an action guide" description="PRAMAAN BOT will create a resumable checklist linked to your active case." />
            )}
          </section>
        </div>
      )}
    </>
  )
}


