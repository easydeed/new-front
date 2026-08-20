/**
 * ═══ GUIDE1 — THIS FILE NOW HAS NO CALLERS, AND THAT IS ON PURPOSE ═══
 *
 * Its two callers — `AIHelpButton` and `VestingInput` — were deleted by
 * GUIDE1 because they had no render sites. They lost those on 2026-04-28
 * in the legacy-wizard removal, which means **`/api/ai/chat` has had no
 * reachable caller since April**. RED-H1.3 hardened that endpoint on
 * 2026-08-04 and Doctrine B rewrote its prompts on 2026-08-10 — three and
 * four months after it went dark — and neither noticed.
 *
 * That also explains Doctrine B's empty log. It recorded "two days of an
 * empty table" and deferred the usage evidence pending accumulation. Two
 * days was true and irrelevant: nothing could write to that table, so
 * waiting would have produced the same zero forever. **A query returning
 * zero cannot distinguish "nobody asked" from "nobody could ask."**
 *
 * THIS FILE IS KEPT DELIBERATELY. GUIDE3 rules whether the assistant is
 * WIRED to a real surface or RETIRED, and deleting the client now would
 * make "wire" mean "rebuild". It is held, not overlooked — which is the
 * distinction §14.5 exists to force, and the reason this paragraph is
 * here rather than in a ticket nobody will open.
 *
 * Until GUIDE3 rules, nothing in the product reaches this. Do not add a
 * caller without reading Doctrine B first: this is the surface where an
 * officer can type the one question the boundary forbids answering.
 */
/**
 * AI Assistant Service
 * 
 * Provides AI-powered guidance for deed creation.
 * Offers contextual help for vesting, deed type EXPLANATION, and validation.
 *
 * DOCTRINE B (docs/DOCTRINE_CONFORMANCE.md §12) — explain yes, select no.
 * The system prompts live on the server (RED-H1.3) but the USER MESSAGES
 * are composed here, and a message that asks the model to recommend will
 * get a recommendation whatever the system prompt says. So no prompt in
 * this file asks which instrument to use, and no display gate is keyed on
 * recommendation language. Pinned in `__tests__/aiBoundaryClient.test.ts`.
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
   * DOCTRINE B — explain how the deed types differ. Do not choose.
   *
   * This method was `suggestDeedType`, and it was the boundary's problem
   * from the other end. RED-H1.3 moved the SYSTEM prompt to the server
   * so the client could no longer define the assistant's role — but the
   * USER MESSAGE is still composed here, and this one asked, verbatim:
   *
   *     Is ${currentDeedType} the best choice? If not, what would you
   *     recommend and why?
   *
   * A server-side instruction saying "you may not select" and a user
   * message saying "what would you recommend" are an argument, and the
   * boundary does not win every round of it. The reliable fix is to stop
   * asking the forbidden question, not to out-shout it.
   *
   * THE SHARPER HALF was the display gate. It read:
   *
   *     if (response.includes("recommend") || includes("suggest")
   *         || includes("consider")) { show it } else { return null }
   *
   * — the UI surfaced the answer ONLY when it contained recommendation
   * language, and silently discarded every compliant explanation. So
   * Doctrine B's prompt rewrite, shipped alone, would have made this
   * feature look broken: the model would start explaining instead of
   * recommending, the filter would drop every answer, and nothing would
   * appear on screen. A display gate keyed on the forbidden word does
   * not enforce the boundary — it inverts it.
   *
   * Renamed rather than kept: a method called `suggestDeedType` that
   * returns an explanation is §11's defect in a function name — the
   * taxonomy drawn by label rather than by content. Nothing imported it,
   * so the rename costs nothing; leaving the old name would have cost
   * the next reader their assumption.
   */
  async explainDeedTypeOptions(context: {
    relationship: string
    hasConsideration: boolean
    currentDeedType: string
    grantorName: string
    granteeName: string
  }): Promise<AIGuidance | null> {
    const prompt = `User is preparing a ${context.currentDeedType}.

Grantor: ${context.grantorName}
Grantee: ${context.granteeName}
Relationship between parties: ${context.relationship}
Is consideration being exchanged: ${context.hasConsideration ? "Yes" : "No/Gift"}

Explain how ${context.currentDeedType} differs from the other California \
deed types that could carry this transfer — warranties, transfer tax \
treatment, reassessment exposure. Do not tell the user which to use; the \
choice is theirs.`

    try {
      const response = await this.makeRequest(
        PROMPT_KEYS.deedTypeAdvisor,
        prompt,
        300
      )

      if (!response.trim()) return null

      // Shown as an EXPLANATION, unfiltered. No keyword gate: the old
      // one displayed only the answers that crossed the line.
      return {
        type: "info",
        title: "How these deed types differ",
        message: response,
      }
    } catch (error) {
      console.error("AI deed type explanation error:", error)
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

