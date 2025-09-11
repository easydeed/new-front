import { create } from 'zustand'

type WizardState = {
  docType: string
  currentStep: number
  data: Record<string, unknown>
  setDocType: (t: string) => void
  setCurrentStep: (s: number) => void
  setData: (k: string, v: unknown) => void
  reset: () => void
}

export const useWizardStore = create<WizardState>((set, get) => ({
  docType: 'grant_deed',
  currentStep: 1,
  data: {},
  setDocType: (t) => set({ docType: t }),
  setCurrentStep: (s) => set({ currentStep: s }),
  setData: (k, v) => set({ data: { ...get().data, [k]: v } }),
  reset: () => set({ docType: 'grant_deed', currentStep: 1, data: {} })
}))


