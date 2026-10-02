import type { Analysis, CaseRecord, Citation, Procedure } from './types'

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(body.detail || 'The local service could not complete the request.')
  }
  return response.json() as Promise<T>
}

export const idempotencyKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${crypto.randomUUID()}`

export const api = {
  health: () =>
    request<{
      status: string
      privacy_mode: string
      corpus_documents: number
      ollama: { available: boolean; configured_model: string; models: string[] }
    }>('/health'),
  cases: () => request<CaseRecord[]>('/cases'),
  case: (id: string) => request<CaseRecord>(`/cases/${id}`),
  createCase: (payload: Omit<CaseRecord, 'id' | 'status' | 'revision' | 'created_at' | 'updated_at'>) =>
    request<CaseRecord>('/cases', { method: 'POST', body: JSON.stringify(payload) }),
  updateCase: (id: string, payload: { title: string; description: string; jurisdiction: string; expected_revision: number }) =>
    request<CaseRecord>(`/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey('case-update') }),
    }),
  analyze: (id: string, message: string, language: string) =>
    request<Analysis>(`/cases/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        language,
        idempotency_key: idempotencyKey('analyze'),
      }),
    }),
  uploadEvidence: async (caseId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(`${API_URL}/cases/${caseId}/evidence`, {
      method: 'POST',
      body: form,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(body.detail || 'The file could not be saved locally.')
    }
    return response.json() as Promise<{ id: string; filename: string; stored_locally: boolean; vision_status: string }>
  },
  evidenceFileUrl: (caseId: string, evidenceId: string) =>
    `${API_URL}/cases/${caseId}/evidence/${evidenceId}/file`,
  research: (query: string) =>
    request<{ results: Citation[]; guardrails: Analysis['guardrails'] }>(
      `/research?query=${encodeURIComponent(query)}`,
    ),
  procedures: () => request<Procedure[]>('/procedures'),
  startProcedure: (caseId: string, procedureId: string) =>
    request<Procedure>(`/cases/${caseId}/procedures`, {
      method: 'POST',
      body: JSON.stringify({
        procedure_id: procedureId,
        idempotency_key: idempotencyKey('procedure'),
      }),
    }),
  updateStep: (runId: string, stepId: string, completed: boolean) =>
    request<Procedure>(`/procedure-runs/${runId}/steps/${stepId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        completed,
        idempotency_key: idempotencyKey('step'),
      }),
    }),
  createDraft: (
    caseId: string,
    payload: { document_type: string; recipient: string; requested_relief: string },
  ) =>
    request<{ id: string; title: string; content: string }>(`/cases/${caseId}/drafts`, {
      method: 'POST',
      body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey('draft') }),
    }),
}
