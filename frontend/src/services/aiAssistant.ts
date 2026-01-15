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
const SYSTEM_PROMPTS = {
  vestingGuidance: `You are an expert California real estate title officer. Your role is to help users understand vesting options when transferring property.

Be concise but thorough. Focus on practical implications:
- Tax consequences
- Estate planning effects
- Rights of survivorship
- Creditor protection

Always recommend consulting with an attorney or tax advisor for complex situations.

Respond in 2-3 sentences maximum unless asked for more detail.`,

  deedTypeAdvisor: `You are an expert California real estate title officer. Your role is to help users select the appropriate deed type for their transaction.

Consider:
- Relationship between parties (spouses, family, unrelated)
- Whether consideration is being exchanged
- Documentary Transfer Tax implications
- Title insurance implications
- Warranties being provided

Respond in 2-3 sentences maximum.`,

  legalDescriptionReview: `You are an expert California real estate title officer reviewing a legal description.

Check for:
- Completeness (does it fully describe the parcel?)
- Common errors (missing tract info, incomplete metes and bounds)
- References to recorded documents (are book/page numbers included?)
- Consistency with APN if provided

Flag any concerns concisely.`,

  preSubmitReview: `You are an expert California real estate title officer doing a final review before a deed is generated.

Check for:
- Consistency between all fields
- Common errors (single grantee with joint tenancy vesting)
- Missing required information
- DTT calculation accuracy
- Proper party naming conventions

List any issues found. If everything looks good, say so briefly.`,

  generalAssistant: `You are an expert California real estate title officer assistant in DeedPro, a deed generation application.

Answer questions about:
- California deed types (Grant, Quitclaim, Interspousal, Warranty, Tax)
- Vesting options and implications
- Documentary Transfer Tax rules and exemptions
- Legal descriptions
- Recording requirements

Be concise, accurate, and helpful. If something requires legal advice, recommend consulting an attorney.`,
}

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
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 400
  ): Promise<string> {
    // If no API key, try the backend proxy
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
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
        SYSTEM_PROMPTS.vestingGuidance,
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
        SYSTEM_PROMPTS.deedTypeAdvisor,
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
        SYSTEM_PROMPTS.legalDescriptionReview,
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
        SYSTEM_PROMPTS.preSubmitReview,
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
    const systemPrompt = `${SYSTEM_PROMPTS.generalAssistant}

Current context:
- Deed Type: ${context.deedType || "Not selected"}
- County: ${context.county || "Not specified"}`

    try {
      const response = await this.makeRequest(systemPrompt, question, 600)
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
        SYSTEM_PROMPTS.generalAssistant,
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

