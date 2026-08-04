/**
 * AI Assistant Service
 * 
 * Provides AI-powered guidance for deed creation using Anthropic Claude.
 * Offers contextual help for vesting, deed type selection, and validation.
 * 
 * Part 2.1 of DeedPro Wizard Integration
 */

// Types
export interface AIContext {
  deedType: string
  grantorName: string
  granteeName: string
  vesting: string
  county: string
  legalDescription: string
  dttAmount?: string
  dttExempt?: boolean
  dttExemptReason?: string
  propertyData?: any
}

export interface AIGuidance {
  type: "info" | "warning" | "suggestion" | "error"
  field?: string
  title: string
  message: string
  learnMoreUrl?: string
  action?: {
    label: string
    handler: () => void
  }
}

export interface AIValidation {
  isValid: boolean
  issues: AIGuidance[]
}

// System prompts for different AI tasks
/**
 * RED-H1.3 — the prompt TEXT moved to the server.
 *
 * These were full system prompts sent in the request body. The endpoint
 * used whatever the client supplied, which meant any authenticated user
 * could POST an arbitrary system prompt and an arbitrary max_tokens
 * against the company's OpenAI key.
 *
 * What travels now is a KEY. The server owns the text
 * (backend/services/ai_prompts.py), owns the token ceiling, meters per
 * user, and logs every exchange. An unknown key is refused, not
 * defaulted.
 */
const PROMPT_KEYS = {
  vestingGuidance: 'vesting_guidance',
  deedTypeAdvisor: 'deed_type_advisor',
  legalDescriptionReview: 'legal_description_review',
  preSubmitReview: 'pre_submit_review',
  generalAssistant: 'general_assistant',
} as const

type PromptKey = (typeof PROMPT_KEYS)[keyof typeof PROMPT_KEYS]

class AIAssistantService {
  private apiKey: string | null = null
  private baseUrl = "/api/ai/chat"

  constructor() {
    // Check for API key in environment
    if (typeof window !== "undefined") {
      this.apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || null
    }
  }

  /**
   * Check if AI service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Make an AI request through the backend proxy
   */
  private async makeRequest(
    promptKey: PromptKey,
    userPrompt: string,
    maxTokens: number = 400
  ): Promise<string> {
    // If no API key, try the backend proxy
    try {
      // AI assist is logged-in-only (doctrine sweep ruling): send the
      // session token so the proxy can forward it to the backend.
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token") || localStorage.getItem("token")
          : null
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt_key: promptKey,
          message: userPrompt,
          max_tokens: maxTokens,
        }),
      })

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.response || data.message || ""
    } catch (error) {
      console.error("AI request error:", error)
      throw error
    }
  }

  /**
   * Get guidance on vesting selection
   */
  async getVestingGuidance(
    vestingType: string,
    granteeCount: number,
    context: Partial<AIContext>
  ): Promise<AIGuidance | null> {
    const prompt = `The user is creating a ${context.deedType || "Grant Deed"} in ${context.county || "California"} County.

They have ${granteeCount} grantee(s) and selected vesting: "${vestingType}"

Briefly explain what this vesting means and flag any concerns (e.g., if joint tenancy is selected but there's only one grantee).`

    try {
      const response = await this.makeRequest(
        PROMPT_KEYS.vestingGuidance,
        prompt,
        300
      )

      // Determine if this is a warning or info based on content
      const isWarning =
        response.toLowerCase().includes("concern") ||
        response.toLowerCase().includes("issue") ||
        response.toLowerCase().includes("error") ||
        response.toLowerCase().includes("incorrect") ||
        response.toLowerCase().includes("problem")

      return {
        type: isWarning ? "warning" : "info",
        field: "vesting",
        title: isWarning ? "Vesting Concern" : "About This Vesting",
        message: response,
      }
    } catch (error) {
      console.error("AI vesting guidance error:", error)
      return null
    }
  }

  /**
   * Suggest the best deed type based on context
   */
  async suggestDeedType(context: {
    relationship: string
    hasConsideration: boolean
    currentDeedType: string
    grantorName: string
    granteeName: string
  }): Promise<AIGuidance | null> {
    const prompt = `User is creating a ${context.currentDeedType}.

Grantor: ${context.grantorName}
Grantee: ${context.granteeName}
Relationship between parties: ${context.relationship}
Is consideration being exchanged: ${context.hasConsideration ? "Yes" : "No/Gift"}

Is ${context.currentDeedType} the best choice? If not, what would you recommend and why?`

    try {
      const response = await this.makeRequest(
        PROMPT_KEYS.deedTypeAdvisor,
        prompt,
        300
      )

      // Only show if suggesting a different deed type
      if (
        response.toLowerCase().includes("recommend") ||
        response.toLowerCase().includes("suggest") ||
        response.toLowerCase().includes("consider")
      ) {
        return {
          type: "suggestion",
          title: "Deed Type Suggestion",
          message: response,
        }
      }

      return null
    } catch (error) {
      console.error("AI deed type suggestion error:", error)
      return null
    }
  }

  /**
   * Review legal description for issues
   */
  async reviewLegalDescription(
    legalDescription: string,
    apn: string,
    county: string
  ): Promise<AIGuidance | null> {
    if (!legalDescription || legalDescription.length < 20) return null

    const prompt = `Review this legal description for a property in ${county} County, California:

Legal Description:
${legalDescription.slice(0, 1000)}

APN: ${apn || "Not provided"}

Flag any concerns about completeness or accuracy.`

    try {
      const response = await this.makeRequest(
        PROMPT_KEYS.legalDescriptionReview,
        prompt,
        400
      )

      // Only show if there are concerns
      const hasConcerns =
        response.toLowerCase().includes("concern") ||
        response.toLowerCase().includes("missing") ||
        response.toLowerCase().includes("incomplete") ||
        response.toLowerCase().includes("error") ||
        response.toLowerCase().includes("issue") ||
        response.toLowerCase().includes("verify")

      if (hasConcerns) {
        return {
          type: "warning",
          field: "legalDescription",
          title: "Legal Description Review",
          message: response,
        }
      }

      return null
    } catch (error) {
      console.error("AI legal description review error:", error)
      return null
    }
  }

  /**
   * Pre-submit validation of entire deed
   */
  async validateBeforeSubmit(context: AIContext): Promise<AIValidation> {
    const prompt = `Review this deed before generation:

Deed Type: ${context.deedType}
County: ${context.county}

GRANTOR: ${context.grantorName}
GRANTEE: ${context.granteeName}
VESTING: ${context.vesting || "Not specified"}

Legal Description: ${context.legalDescription?.slice(0, 500) || "Not provided"}...

DTT Amount: $${context.dttAmount || "0.00"}
DTT Exempt: ${context.dttExempt ? "Yes - " + (context.dttExemptReason || "No reason given") : "No"}

List any issues or concerns. If everything looks correct, say "No issues found."`

    try {
      const response = await this.makeRequest(
        PROMPT_KEYS.preSubmitReview,
        prompt,
        500
      )

      if (
        response.toLowerCase().includes("no issues found") ||
        response.toLowerCase().includes("everything looks correct") ||
        response.toLowerCase().includes("looks good") ||
        response.toLowerCase().includes("appears complete")
      ) {
        return { isValid: true, issues: [] }
      }

      // Parse issues from response
      const issues: AIGuidance[] = [
        {
          type: "warning",
          title: "Pre-Submit Review",
          message: response,
        },
      ]

      return { isValid: false, issues }
    } catch (error) {
      console.error("AI validation error:", error)
      // Don't block submission on AI errors
      return { isValid: true, issues: [] }
    }
  }

  /**
   * Answer a user question about deeds/title
   */
  async askQuestion(question: string, context: Partial<AIContext>): Promise<string> {
    // RED-H1.3: the file context used to be appended to the SYSTEM
    // prompt. It belongs in the user message — context is data the
    // officer is working with, not an instruction about how the model
    // should behave, and the system prompt is no longer the client's to
    // write in any case.
    const withContext = `${question}

Current context:
- Deed Type: ${context.deedType || "Not selected"}
- County: ${context.county || "Not specified"}`

    try {
      const response = await this.makeRequest(PROMPT_KEYS.generalAssistant, withContext, 600)
      return response
    } catch (error) {
      console.error("AI question error:", error)
      return "Sorry, I encountered an error processing your question. Please try again."
    }
  }

  /**
   * Get DTT exemption guidance
   */
  async getDTTExemptionGuidance(
    exemptionReason: string,
    context: Partial<AIContext>
  ): Promise<AIGuidance | null> {
    const prompt = `The user claims DTT exemption for: "${exemptionReason}"

Deed Type: ${context.deedType || "Grant Deed"}
Relationship context: Grantor is "${context.grantorName}", Grantee is "${context.granteeName}"

Is this exemption likely valid? What documentation might they need?`

    try {
      const response = await this.makeRequest(
        PROMPT_KEYS.generalAssistant,
        prompt,
        300
      )

      return {
        type: "info",
        field: "dttExemption",
        title: "DTT Exemption Info",
        message: response,
      }
    } catch (error) {
      console.error("AI DTT exemption guidance error:", error)
      return null
    }
  }
}

// Export singleton instance
export const aiAssistant = new AIAssistantService()

// Export types
export type { AIContext, AIGuidance, AIValidation }

