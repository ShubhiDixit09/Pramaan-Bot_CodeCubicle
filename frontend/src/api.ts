import { changes, evidence, events, missions, records, reviews, sources } from './demo'
import type { Change, Evidence, Mission, RecordRow, Review, RunEvent, Source } from './types'

const request = async <T,>(path: string, fallback: T, init?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(`/api${path}`, init)
    if (!response.ok) throw new Error(String(response.status))
    return await response.json() as T
  } catch {
    return fallback
  }
}

export const api = {
  overview: () => request<{ metrics: Record<string, number>; missions: Mission[]; events: RunEvent[] }>('/overview', {
    metrics: { active_missions: 12, sources_monitored: 183, changes_today: 27, open_conflicts: 4, coverage: 93 }, missions, events,
  }),
  missions: () => request<Mission[]>('/missions', missions),
  records: () => request<{ dataset: string; version: number; published: string; coverage: number; total: number; records: RecordRow[] }>('/datasets/opportunities/records', {
    dataset: 'India AI Opportunity Radar', version: 18, published: '26 Sep 2026, 21:04 IST', coverage: 89, total: records.length, records,
  }),
  evidence: (recordId: string) => request<Evidence | null>(`/records/${recordId}/evidence`, evidence[recordId] || evidence['rec-001']),
  changes: () => request<Change[]>('/changes', changes),
  reviews: () => request<Review[]>('/reviews', reviews),
  sources: () => request<Source[]>('/sources', sources),
  legalSearch: (query: string) => request<{ query: string; source: string; live: boolean; results: Array<Record<string, string | number>>; error?: string }>(`/intelligence/legal/search?q=${encodeURIComponent(query)}`, { query, source: 'India Code', live: false, results: [] }),
}

