const ACTIVE_CASE_KEY = 'pramaan.activeCaseId'
const ANALYSIS_KEY = 'pramaan.latestAnalysis'

export const localStore = {
  getCaseId: () => localStorage.getItem(ACTIVE_CASE_KEY),
  setCaseId: (id: string) => localStorage.setItem(ACTIVE_CASE_KEY, id),
  getAnalysis: () => {
    const value = localStorage.getItem(ANALYSIS_KEY)
    return value ? JSON.parse(value) : null
  },
  setAnalysis: (value: unknown) =>
    localStorage.setItem(ANALYSIS_KEY, JSON.stringify(value)),
}


