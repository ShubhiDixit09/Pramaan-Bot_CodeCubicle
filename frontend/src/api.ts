import type { Analysis, CaseRecord, Citation, Procedure } from './types'
import {
  listCases, readCase, addCase, editCase, saveEvidence, downloadEvidence,
  addDraft, downloadDraftPdf, localAnalysis, templates, startGuide,
  markGuideStep, getSavedGuide, searchLocalLaws, saveAnalysis
} from './secureVault'

// Production keeps private data encrypted in the user's browser, while only
// public legal source search and explicit-consent Gemini questions reach API.
export const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : '/api')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_URL + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(typeof body.detail === 'string' ? body.detail : 'The request could not be completed.')
  }
  return response.json() as Promise<T>
}

export const idempotencyKey = (prefix: string) =>
  prefix + '-' + Date.now() + '-' + crypto.randomUUID()

export const api = {
  health: () =>
    request<{
      status: string; privacy_mode: string; corpus_documents: number
      ai_assist_configured?: boolean
      ollama: { available: boolean; configured_model: string; models: string[] }
    }>('/health'),
  cases: () => import.meta.env.PROD ? listCases() : request<CaseRecord[]>('/cases'),
  case: (id: string) => import.meta.env.PROD ? readCase(id) : request<CaseRecord>('/cases/' + id),
  createCase: (payload: Omit<CaseRecord, 'id' | 'status' | 'revision' | 'created_at' | 'updated_at'>) =>
    import.meta.env.PROD ? addCase(payload) :
      request<CaseRecord>('/cases', { method: 'POST', body: JSON.stringify(payload) }),
  updateCase: (id: string, payload: { title: string; description: string; jurisdiction: string; expected_revision: number }) =>
    import.meta.env.PROD ? editCase(id, payload) :
      request<CaseRecord>('/cases/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey('case-update') }),
      }),
  analyze: (id: string, message: string, language: string) =>
    import.meta.env.PROD ? localAnalysis(id, message) :
      request<Analysis>('/cases/' + id + '/analyze', {
        method: 'POST',
        body: JSON.stringify({message,language,idempotency_key:idempotencyKey('analyze')}),
      }),
  uploadEvidence: async (caseId: string, file: File) => {
    if (import.meta.env.PROD) return saveEvidence(caseId, file)
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(API_URL + '/cases/' + caseId + '/evidence', {
      method: 'POST', body: form,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(body.detail || 'The file could not be saved locally.')
    }
    return response.json() as Promise<{ id: string; filename: string; stored_locally: boolean; vision_status: string }>
  },
  evidenceFileUrl: (caseId: string, evidenceId: string) =>
    API_URL + '/cases/' + caseId + '/evidence/' + evidenceId + '/file',
  downloadEvidence: (caseId: string, evidenceId: string) => downloadEvidence(caseId, evidenceId),
  research: (query: string) =>
    request<{ results: Citation[]; guardrails: Analysis['guardrails'] }>(
      '/research?query=' + encodeURIComponent(query),
    ),
  procedures: () => import.meta.env.PROD ? Promise.resolve(templates) : request<Procedure[]>('/procedures'),
  savedGuide: (caseId: string) => import.meta.env.PROD ? getSavedGuide(caseId) : Promise.resolve(null as Procedure | null),
  startProcedure: (caseId: string, procedureId: string) =>
    import.meta.env.PROD ? startGuide(caseId, procedureId) :
      request<Procedure>('/cases/' + caseId + '/procedures', {
        method: 'POST',
        body: JSON.stringify({procedure_id:procedureId,idempotency_key:idempotencyKey('procedure')}),
      }),
  updateStep: (runId: string, stepId: string, completed: boolean) =>
    import.meta.env.PROD ? markGuideStep(runId, stepId, completed) :
      request<Procedure>('/procedure-runs/' + runId + '/steps/' + stepId, {
        method: 'PATCH',
        body: JSON.stringify({completed,idempotency_key:idempotencyKey('step')}),
      }),
  createDraft: (caseId: string,payload:{document_type:string;recipient:string;requested_relief:string}) =>
    import.meta.env.PROD ? addDraft(caseId,payload) :
      request<{id:string;title:string;content:string}>('/cases/' + caseId + '/drafts',{
        method:'POST', body:JSON.stringify({...payload,idempotency_key:idempotencyKey('draft')})
      }),
  downloadDraftPdf: (draftId: string) => downloadDraftPdf(draftId),

  // This is the ONLY hosted generative endpoint. Callers must explicitly
  // collect consent; no case context or evidence is submitted.
  assist: async (caseId: string, question: string, language: string): Promise<Analysis> => {
    const response = await request<{
      answer: string; citations: Citation[]; model_mode: string; disclaimer: string
    }>('/assist', {
      method:'POST',body:JSON.stringify({question,language,consent:true})
    })
    const result:Analysis = {
      intent:{domain:'general',issue:'consented_generic_question',confidence:0},
      answer:response.answer + '\n\n' + response.disclaimer,
      next_steps:[
        'Confirm the current official text of any cited law.',
        'Do not treat generated text as legal advice or a verified case outcome.',
        'Consult a qualified legal professional about specific facts or deadlines.'
      ],
      citations:response.citations,
      guardrails:{
        allowed:true,legal_topic:true,injection_detected:false,
        masked_text:'[Generic external question; no case record transmitted]',
        pii_types:[],findings:['Only this generic question was sent to Gemini with consent.']
      },
      trust_report:{
        score:0,citation_coverage:0,grounding_score:0,
        pii_safe:true,disclaimer_present:true,
        findings:[
          'Generative answer is not independently verified.',
          'Returned citations are from a small curated corpus, not live statutory verification.',
          'Case descriptions and evidence were not transmitted to Gemini.'
        ]
      },
      model_mode:'consented-gemini-' + response.model_mode
    }
    await saveAnalysis(caseId,result)
    return result
  },
  localSources: (query: string) => searchLocalLaws(query),
}
