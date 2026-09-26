export type Mission = {
  id: string
  name: string
  prompt: string
  status: string
  coverage: number
  record_count: number
  change_count: number
  last_run: string
  next_run: string
  cadence: string
}

export type RunEvent = {
  time: string
  type: string
  message: string
  detail: string
}

export type RecordRow = {
  id: string
  organisation: string
  opportunity: string
  deadline: string
  eligibility: string
  value: string
  location: string
  status: string
  confidence: number
  sources: number
  changed: boolean
}

export type Evidence = {
  field: string
  value: string
  confidence: number
  components: Record<string, number>
  resolution: string
  observations: Array<{
    relation: string
    source: string
    url: string
    locator: string
    excerpt: string
    fetched: string
    authority: number
  }>
}

export type Change = {
  id: string
  record_id: string
  kind: string
  impact: string
  title: string
  entity: string
  before: string | null
  after: string
  source: string
  time: string
  confidence: number
}

export type Review = {
  id: string
  priority: string
  title: string
  record: string
  field: string
  recommended: string
  reason: string
  confidence: number
  sources: string[]
}

export type Source = {
  id: string
  name: string
  owner: string
  type: string
  url: string
  authority: number
  freshness: string
  status: string
  records: number
  last_checked: string
}

