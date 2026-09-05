import type { DisplayableEvent } from '../database/repositories/scheduleRepository'
import { diffMinutes, minutesToLocalTime } from '../scheduler/time'

/**
 * Pure planning logic — no plugin import here. Per
 * docs/blueprint/09_NOTIFICATIONS_AND_BACKGROUND.md §2, notificationService.ts
 * is the only module allowed to import @capacitor/local-notifications; this
 * file only decides *what* should be reminded, not how the OS delivers it.
 */
export type NotificationUrgency = 'normal' | 'important'

export type DesiredNotification = {
  eventId: string
  templateId: string
  fireAt: string
  title: string
  body: string
  urgency: NotificationUrgency
}

// A window this narrow is effectively a fixed time (or close to it) — worth
// the exact-alarm cost. A wide window is a soft reminder; scheduling it
// inexactly avoids unnecessary permission friction and battery cost (see
// blueprint §7 — "product should not call everything exact by default").
const NARROW_WINDOW_MINUTES = 15

/** Only medications get reminders — meals/wake/sleep are lifestyle anchors the user already knows about, not doses that need a nudge. */
export function planNotifications(events: DisplayableEvent[], nowInstant: string, timezone: string): DesiredNotification[] {
  return events
    .filter((e) => e.kind === 'medication' && e.status === 'upcoming' && e.currentWindow.earliest > nowInstant)
    .map((e) => {
      const width = diffMinutes(e.currentWindow.latest, e.currentWindow.earliest)
      const urgency: NotificationUrgency = width <= NARROW_WINDOW_MINUTES ? 'important' : 'normal'
      const from = minutesToLocalTime(e.currentWindow.earliest, timezone)
      const to = minutesToLocalTime(e.currentWindow.latest, timezone)
      const body = from === to ? `Scheduled for ${from}` : `Scheduled window: ${from}–${to}`
      return { eventId: e.id, templateId: e.templateId, fireAt: e.currentWindow.earliest, title: e.label, body, urgency }
    })
}

/**
 * Android notification ids must be 32-bit ints. Deriving one deterministically
 * from the (already date-qualified) event id means the same dose on the same
 * day always maps to the same platform id, which keeps cancel/schedule calls
 * targeted correctly across separate recalculations without needing an
 * in-memory id table.
 */
export function hashEventIdToNotificationId(eventId: string): number {
  let hash = 2166136261
  for (let i = 0; i < eventId.length; i++) {
    hash ^= eventId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash & 0x7fffffff
}
