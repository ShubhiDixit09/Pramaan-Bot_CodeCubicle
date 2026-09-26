import type { Change, Evidence, Mission, RecordRow, Review, RunEvent, Source } from './types'

const request = async <T,>(path: string, unavailable: T, init?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(`/api${path}`, init)
    if (!response.ok) throw new Error(String(response.status))
    return await response.json() as T
  } catch {
    return unavailable
  }
}

export const api = {
  overview: () => request<{ metrics: Record<string, number>; missions: Mission[]; events: RunEvent[] }>('/overview', {
    metrics: { active_missions: 0, sources_monitored: 0, changes_today: 0, open_conflicts: 0, coverage: 0 }, missions: [], events: [],
  }),
  missions: () => request<Mission[]>('/missions', []),
  records: () => request<{ dataset: string; version: number; published: string; coverage: number; total: number; records: RecordRow[] }>('/datasets/opportunities/records', {
    dataset: 'India AI Opportunity Radar', version: 0, published: '', coverage: 0, total: 0, records: [],
  }),
  evidence: (recordId: string) => request<Evidence | null>(`/records/${recordId}/evidence`, null),
  changes: () => request<Change[]>('/changes', []),
  reviews: () => request<Review[]>('/reviews', []),
  sources: () => request<Source[]>('/sources', []),
  legalSearch: (query: string) => request<{ query: string; source: string; live: boolean; results: Array<Record<string, string | number>>; error?: string }>(`/intelligence/legal/search?q=${encodeURIComponent(query)}`, { query, source: 'India Code', live: false, results: [] }),
}
