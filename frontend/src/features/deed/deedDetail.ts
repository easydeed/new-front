/**
 * The deed page's contract, in the language that renders it.
 *
 * ═══ THE SHAPE IS DECLARED, NOT INFERRED ═══
 *
 * `services/deed_page.py` asserts its key set before the payload leaves.
 * This is the other half: the screen declares the same keys, so the two
 * languages can be compared by a test rather than by whoever notices a
 * blank section.
 *
 * That comparison is not paranoia. The merged tracker declared eleven
 * fields against an endpoint that sent fourteen, and the three it did
 * not declare were the three that mattered — a screen cannot render a
 * field it never named, and nothing failed.
 *
 * ═══ NO SENTENCE IS COMPOSED HERE ═══
 *
 * §13 rule 3. Every string an officer reads about this deed's STATE was
 * written in Python. The functions below decide layout and nothing else:
 * what to show, never what to say.
 */

/** The state vocabulary. Mirrors `deed_page.DEED_STATES` exactly. */
export const DEED_STATES = [
  'draft',
  'ready',
  'in_review',
  'changes_requested',
  'approved',
  'signing',
  'ready_to_record',
  'recorded',
] as const;
export type DeedState = (typeof DEED_STATES)[number];

/**
 * Mirrors `deed_page.ACTION_KINDS`.
 *
 * VERBS, deliberately. The first draft called one of these `signing`,
 * which is also a STATE — one word carrying two vocabularies in a
 * payload whose job is telling a state from an action. A pin caught it.
 */
export const ACTION_KINDS = [
  'resume', 'share_for_review', 'request_signing', 'open_signing',
  'download', 'none'] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

export interface DeedAction {
  kind: ActionKind;
  label: string;
}

export interface DeedStateBlock {
  state: DeedState;
  headline: string;
  sentence: string;
  next_action: DeedAction | null;
  /**
   * The one deliberate exception to "one state, one obvious action"
   * (owner-ruled): `ready` offers review AND signing, ranked rather than
   * equal.
   *
   * SINGULAR by construction, in both languages. A list would grow, and
   * a wall of equal choices is what the one-action rule exists to
   * prevent — the ruling was "do not hide the second most common move",
   * not "offer everything".
   */
  secondary_action: DeedAction | null;
  asserted_at: string | null;
  /** Present on `signing`: WHICH signing, so "open the signing" opens
   *  the one that exists rather than starting a second. */
  signing_request_id: number | null;
}

export interface Disqualification {
  kind: 'superseded' | 'deleted';
  headline: string;
  sentence: string;
  go_to_deed_id: number | null;
}

/** An activity entry. `kind` is the epistemic claim — see deed_activity.py. */
export interface ActivityEntry {
  at: string;
  kind: 'event' | 'derived';
  what: string;
  sentence: string;
  source: string;
}

export interface DocumentParty {
  role: string;
  name: string;
}

export interface WorkingParty {
  role: string;
  name: string;
  state: string;
  sentence: string;
}

export interface MatterDocument {
  id: number;
  deed_type: string;
  status: string;
  property_address?: string | null;
  parties: string[];
}

export interface DeedDetail {
  deed_id: number;
  disqualified: Disqualification | null;
  state: DeedStateBlock;
  activity: ActivityEntry[];
  matter: {
    key: { kind: string; value: string };
    documents: MatterDocument[];
    carry_forward?: { not_carried?: string[] };
  } | null;
  instrument: {
    deed_type?: string | null;
    property_address?: string | null;
    county?: string | null;
    apn?: string | null;
    completed_at: string | null;
    available: boolean;
  };
  on_the_document: DocumentParty[];
  working_on_it: WorkingParty[];
}

/** Every key the screen declares. Compared against Python's set. */
export const DEED_DETAIL_KEYS = [
  'deed_id', 'disqualified', 'state', 'activity', 'matter',
  'instrument', 'on_the_document', 'working_on_it',
] as const;

/**
 * May the page render its normal content?
 *
 * The owner's ruling, as one callable question: a fact that invalidates
 * the page cannot be rendered as an item ON the page. A superseded deed
 * is one she should not be working on, and a "next action" offered
 * beside the warning is an invitation to work on the wrong document.
 *
 * So this is not "should we show a banner". It is "is there a page".
 */
export function renders(detail: Pick<DeedDetail, 'disqualified'> | null): boolean {
  return !!detail && !detail.disqualified;
}

/**
 * The activity entries, newest first, with the epistemic split kept.
 *
 * EVENTS and DERIVED timestamps are not merged and not re-sorted
 * together into one indistinguishable list — the API went to the trouble
 * of separating them in the payload precisely so a screen could not
 * flatten the distinction back out.
 *
 * They still render in one chronological column, because that is the
 * question ("what changed since I was here"). What differs is that a
 * derived entry is never given the visual weight of a recorded act.
 */
export function isRecordedAct(entry: Pick<ActivityEntry, 'kind'>): boolean {
  return entry.kind === 'event';
}

/**
 * Does this payload carry a state the screen can render?
 *
 * A state the screen has never heard of is the failure mode that shipped
 * blank sections before: the server adds a value, the screen's switch
 * has no arm for it, and the officer gets an empty box where the answer
 * to her question should be. Answered honestly rather than defaulted —
 * a wrong state rendered confidently is worse than a visible gap.
 */
export function knownState(state: string): state is DeedState {
  return (DEED_STATES as readonly string[]).includes(state);
}
