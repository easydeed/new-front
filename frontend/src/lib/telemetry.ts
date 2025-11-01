/**
 * 📊 PHASE 24-C STEP 8: TELEMETRY SYSTEM
 * 
 * Tracks wizard events for baseline metrics and A/B testing.
 * 
 * Events tracked:
 * - Wizard lifecycle (started, completed, abandoned)
 * - Property search (searched, enriched)
 * - Step transitions (shown, completed)
 * - Errors (validation, API failures)
 * - Drafts (saved, resumed)
 * - PDF generation
 * 
 * Storage: localStorage (for MVP), can be upgraded to backend API later
 */

export type WizardEventName =
  | 'Wizard.Started'
  | 'Wizard.PropertySearched'
  | 'Wizard.PropertyEnriched'
  | 'Wizard.StepShown'
  | 'Wizard.StepCompleted'
  | 'Wizard.DraftSaved'
  | 'Wizard.DraftResumed'
  | 'Wizard.Error'
  | 'Wizard.Abandoned'
  | 'Wizard.Completed'
  | 'Wizard.PDFGenerated';

export interface WizardEventData {
  // Common fields
  timestamp?: string;
  sessionId?: string;
  userId?: string;
  mode?: 'modern'; // Always modern now!
  deedType?: string;

  // Property search fields
  address?: string;
  apn?: string;
  county?: string;
  hasLegal?: boolean;

  // Step fields
  step?: number;
  stepName?: string;
  duration?: number; // in seconds

  // Error fields
  error?: string;
  field?: string;

  // Completion fields
  stepsCompleted?: number;
  totalDuration?: number; // in seconds
  timeSpent?: number; // in seconds

  // PDF fields
  fileSize?: number;
}

interface WizardEvent {
  eventName: WizardEventName;
  data: WizardEventData;
  timestamp: string;
  sessionId: string;
}

const TELEMETRY_STORAGE_KEY = 'deedpro_telemetry_events';
const SESSION_ID_KEY = 'deedpro_session_id';
const MAX_EVENTS = 1000; // Prevent unbounded growth

/**
 * Get or create a session ID for this user session
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Get user ID from localStorage (if logged in)
 */
function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.id || user.email || undefined;
    }
  } catch (error) {
    // Ignore parsing errors
  }
  return undefined;
}

/**
 * Load existing events from localStorage
 */
function loadEvents(): WizardEvent[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[Telemetry] Failed to load events:', error);
  }
  return [];
}

/**
 * Save events to localStorage
 */
function saveEvents(events: WizardEvent[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Keep only the most recent MAX_EVENTS
    const trimmedEvents = events.slice(-MAX_EVENTS);
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(trimmedEvents));
  } catch (error) {
    console.error('[Telemetry] Failed to save events:', error);
  }
}

/**
 * Track a wizard event
 * 
 * @param eventName - Name of the event (e.g., 'Wizard.Started')
 * @param data - Event data (deed type, step, error, etc.)
 * 
 * @example
 * trackWizardEvent('Wizard.Started', { mode: 'modern', deedType: 'grant_deed' });
 * trackWizardEvent('Wizard.StepCompleted', { step: 1, duration: 45 });
 * trackWizardEvent('Wizard.Error', { step: 2, error: 'Invalid input', field: 'granteeName' });
 */
export function trackWizardEvent(
  eventName: WizardEventName,
  data: WizardEventData = {}
): void {
  if (typeof window === 'undefined') return;

  try {
    const event: WizardEvent = {
      eventName,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
        userId: getUserId(),
        mode: 'modern', // Always modern now!
      },
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
    };

    const events = loadEvents();
    events.push(event);
    saveEvents(events);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Telemetry]', eventName, data);
    }
  } catch (error) {
    console.error('[Telemetry] Failed to track event:', error);
  }
}

/**
 * Get all tracked events (for debugging or export)
 */
export function getAllEvents(): WizardEvent[] {
  return loadEvents();
}

/**
 * Clear all tracked events (for testing or privacy)
 */
export function clearAllEvents(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TELEMETRY_STORAGE_KEY);
}

/**
 * Export events as JSON (for sending to backend later)
 */
export function exportEventsAsJSON(): string {
  const events = loadEvents();
  return JSON.stringify(events, null, 2);
}

/**
 * Get analytics summary (for admin dashboard)
 */
export interface AnalyticsSummary {
  totalEvents: number;
  totalSessions: number;
  completionRate: number;
  averageDuration: number;
  errorCount: number;
  abandonmentRate: number;
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const events = loadEvents();

  const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
  const startedCount = events.filter(e => e.eventName === 'Wizard.Started').length;
  const completedCount = events.filter(e => e.eventName === 'Wizard.Completed').length;
  const abandonedCount = events.filter(e => e.eventName === 'Wizard.Abandoned').length;
  const errorCount = events.filter(e => e.eventName === 'Wizard.Error').length;

  const completedEvents = events.filter(e => e.eventName === 'Wizard.Completed');
  const totalDuration = completedEvents.reduce((sum, e) => sum + (e.data.totalDuration || 0), 0);
  const averageDuration = completedEvents.length > 0 ? totalDuration / completedEvents.length : 0;

  return {
    totalEvents: events.length,
    totalSessions: uniqueSessions,
    completionRate: startedCount > 0 ? (completedCount / startedCount) * 100 : 0,
    averageDuration,
    errorCount,
    abandonmentRate: startedCount > 0 ? (abandonedCount / startedCount) * 100 : 0,
  };
}

