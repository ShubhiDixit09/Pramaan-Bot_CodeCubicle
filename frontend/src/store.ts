const ACTIVE_CASE_KEY = 'pramaan.activeCaseId'
const ANALYSIS_KEY = 'pramaan.latestAnalysis'

export const localStore = {
  getCaseId: () => localStorage.getItem(ACTIVE_CASE_KEY),
  setCaseId: (id: string) => localStorage.setItem(ACTIVE_CASE_KEY, id),
  getAnalysis: (caseId: string | null) => {
    if (!caseId) return null
    const value = localStorage.getItem(ANALYSIS_KEY)
    if (!value) return null
    try {
      const saved = JSON.parse(value)
      return saved.caseId === caseId ? saved.analysis : null
    } catch {
      return null
    }
  },
  setAnalysis: (caseId: string, analysis: unknown) =>
    localStorage.setItem(ANALYSIS_KEY, JSON.stringify({ caseId, analysis })),
  clearAnalysis: () => localStorage.removeItem(ANALYSIS_KEY),
}


