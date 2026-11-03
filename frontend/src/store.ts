import { getSavedAnalysis, isVaultUnlocked, saveAnalysis } from './secureVault'
import type { Analysis } from './types'

const ACTIVE_CASE_KEY = 'pramaan.activeCaseId'
const ANALYSIS_KEY = 'pramaan.latestAnalysis'

export const localStore = {
  getCaseId: () => localStorage.getItem(ACTIVE_CASE_KEY),
  setCaseId: (id: string) => localStorage.setItem(ACTIVE_CASE_KEY, id),
  getAnalysis: (caseId: string | null): Analysis | null => {
    if (!caseId) return null
    // Production NEVER writes legal questions or analysis in plaintext
    // localStorage. Those are encrypted inside the IndexedDB vault instead.
    if (import.meta.env.PROD) {
      return isVaultUnlocked() ? getSavedAnalysis(caseId) : null
    }
    const value = localStorage.getItem(ANALYSIS_KEY)
    if (!value) return null
    try {
      const saved = JSON.parse(value)
      return saved.caseId === caseId ? saved.analysis : null
    } catch { return null }
  },
  setAnalysis: (caseId: string, analysis: unknown) => {
    if (import.meta.env.PROD) {
      void saveAnalysis(caseId, analysis as Analysis)
    } else {
      localStorage.setItem(ANALYSIS_KEY, JSON.stringify({ caseId, analysis }))
    }
  },
  clearAnalysis: () => {
    // The corresponding vault mutation already invalidates the encrypted
    // analysis in production. Do not write decrypted content to localStorage.
    localStorage.removeItem(ANALYSIS_KEY)
  },
}
