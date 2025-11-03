// Wizard flow configurations for different deed types
// Each flow defines the step-by-step questions users answer

export type StepType = "text" | "email" | "dropdown" | "textarea" | "radio" | "checkbox"

export type Step = {
  key: string // State key for this answer
  question: string // Main question text
  title?: string // Optional: Shorter title for display
  why?: string // Optional: Explanation text
  type: StepType // Input type
  options?: string[] // For dropdown/radio/checkbox
  prefill?: boolean // If true, use PrefillCombo (Google autocomplete)
  placeholder?: string // Input placeholder
  required?: boolean // If true, user must answer before proceeding
}

export type PromptFlow = {
  docType: string
  steps: Step[]
}

// Grant Deed Flow
const grantDeedFlow: PromptFlow = {
  docType: "grant-deed",
  steps: [
    {
      key: "grantorName",
      question: "Who is transferring the property?",
      title: "Grantor Information",
      why: "This is the current owner(s) listed on the deed.",
      type: "text",
      placeholder: "e.g., John Doe; Jane Doe",
      required: true,
    },
    {
      key: "granteeName",
      question: "Who is receiving the property?",
      title: "Grantee Information",
      why: "This is the new owner(s) who will receive title.",
      type: "text",
      placeholder: "e.g., John Smith; Jane Smith",
      required: true,
    },
    {
      key: "vesting",
      question: "How should the grantee take title?",
      title: "Vesting Type",
      why: "Vesting determines ownership rights and how the property can be transferred.",
      type: "dropdown",
      options: ["Joint Tenants", "Tenants in Common", "Community Property", "Sole Ownership"],
      required: true,
    },
    {
      key: "requestedBy",
      question: "Who is requesting this deed?",
      title: "Requested By",
      why: "This helps us track who initiated the deed preparation.",
      type: "text",
      placeholder: "Your name or company name",
      required: false,
    },
    {
      key: "legalDescription",
      question: "What is the legal description of the property?",
      title: "Legal Description",
      why: "This is the official description from the county records. You can find this on the current deed.",
      type: "textarea",
      placeholder: "LOT 42, TRACT 5432, as per map recorded in Book 123, Page 45...",
      required: true,
    },
  ],
}

// Quitclaim Deed Flow
const quitclaimDeedFlow: PromptFlow = {
  docType: "quitclaim-deed",
  steps: [
    {
      key: "grantorName",
      question: "Who is transferring their interest in the property?",
      title: "Grantor Information",
      why: "This is the person giving up their claim to the property.",
      type: "text",
      placeholder: "e.g., John Doe",
      required: true,
    },
    {
      key: "granteeName",
      question: "Who is receiving the interest in the property?",
      title: "Grantee Information",
      why: "This is the person receiving the property interest.",
      type: "text",
      placeholder: "e.g., Jane Smith",
      required: true,
    },
    {
      key: "vesting",
      question: "How should the grantee take title?",
      title: "Vesting Type",
      why: "Vesting determines ownership rights.",
      type: "dropdown",
      options: ["Joint Tenants", "Tenants in Common", "Community Property", "Sole Ownership"],
      required: true,
    },
    {
      key: "legalDescription",
      question: "What is the legal description of the property?",
      title: "Legal Description",
      why: "This is the official description from the county records.",
      type: "textarea",
      placeholder: "LOT 42, TRACT 5432...",
      required: true,
    },
  ],
}

// Export all flows
export const promptFlows: Record<string, PromptFlow> = {
  "grant-deed": grantDeedFlow,
  "quitclaim-deed": quitclaimDeedFlow,
}
