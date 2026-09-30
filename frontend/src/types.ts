export type CaseRecord = {
  id: string
  title: string
  description: string
  jurisdiction: string
  language: 'English' | 'Hindi' | 'Hinglish'
  urgency: 'low' | 'medium' | 'high'
  status: string
  revision: number
  created_at: string
  updated_at: string
  related?: Record<string, Array<Record<string, unknown>>>
}

export type Citation = {
  id: string
  act: string
  section: string
  title: string
  text: string
  jurisdiction: string
  relevance: number
  source_url?: string
}

export type Analysis = {
  intent: { domain: string; issue: string; confidence: number }
  answer: string
  next_steps: string[]
  citations: Citation[]
  guardrails: {
    allowed: boolean
    legal_topic: boolean
    injection_detected: boolean
    masked_text: string
    pii_types: string[]
    findings: string[]
  }
  trust_report: TrustReport
  model_mode: string
}

export type TrustReport = {
  score: number
  citation_coverage: number
  grounding_score: number
  pii_safe: boolean
  disclaimer_present: boolean
  findings: string[]
}

export type Procedure = {
  id: string
  title: string
  authority: string
  fee: string
  deadline: string
  progress?: number
  run_id?: string
  steps: { id: string; title: string; completed?: boolean }[]
}
