import { Capacitor } from '@capacitor/core'
import type { PermissionState } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { SqlDriver } from '../database/driver'
import type { LocalDate, TreatmentPlan } from '../domain/types'
import type { DisplayableEvent } from '../database/repositories/scheduleRepository'
import {
  countScheduled,
  insertScheduledNotification,
  listScheduledNotifications,
  markNotificationCancelled,
  nextScheduledFireAt,
} from '../database/repositories/notificationRepository'
import { newId } from '../domain/id'
import { getPlan } from '../database/repositories/planRepository'
import { logAdministration } from '../app/scheduleService'
import { hashEventIdToNotificationId, planNotifications } from './notificationPlanner'

// This is the only module in the app allowed to import @capacitor/local-
// notifications (docs/blueprint/09_NOTIFICATIONS_AND_BACKGROUND.md §2) — the
// planner above stays pure/testable, and every other caller goes through the
// functions here.

const TAKEN_ACTION_TYPE = 'DOSE_REMINDER'

type NotificationExtra = { templateId: string; planId: string; date: LocalDate }

let actionListenerRegistered = false

/**
 * Registers the "Taken now" / "Open" actions and wires the tap handler.
 * Call once at app bootstrap. No-op on web — the plugin has no reliable
 * background delivery there and DECISIONS.md scopes notifications to native
 * builds only.
 */
export async function initNotifications(driver: SqlDriver): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: TAKEN_ACTION_TYPE,
        actions: [
          { id: 'taken', title: 'Taken now' },
          { id: 'open', title: 'Open', foreground: true },
        ],
      },
    ],
  })

  if (actionListenerRegistered) return
  actionListenerRegistered = true
  await LocalNotifications.addListener('localNotificationActionPerformed', async (performed) => {
    if (performed.actionId !== 'taken') return
    const extra = performed.notification.extra as NotificationExtra | undefined
    if (!extra) return
    const plan = await getPlan(driver, extra.planId)
    if (!plan) return
    await logAdministration(driver, plan, extra.date, extra.templateId, 'taken', new Date().toISOString(), 'notification')
  })
}

export async function checkNotificationPermission(): Promise<PermissionState> {
  if (!Capacitor.isNativePlatform()) return 'denied'
  const status = await LocalNotifications.checkPermissions()
  return status.display
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!Capacitor.isNativePlatform()) return 'denied'
  const status = await LocalNotifications.requestPermissions()
  return status.display
}

export type NotificationHealth = {
  permission: PermissionState | 'unsupported'
  exactAlarm: PermissionState | 'unsupported'
  scheduledCount: number
  nextReminderAt?: string
}

/** Drives the Settings "Notification health" block (blueprint §15). */
export async function getNotificationHealth(driver: SqlDriver, planId: string, date: LocalDate): Promise<NotificationHealth> {
  if (!Capacitor.isNativePlatform()) {
    return { permission: 'unsupported', exactAlarm: 'unsupported', scheduledCount: 0 }
  }
  const permission = (await LocalNotifications.checkPermissions()).display
  const exactAlarm = Capacitor.getPlatform() === 'android' ? (await LocalNotifications.checkExactNotificationSetting()).exact_alarm : 'unsupported'
  const scheduledCount = await countScheduled(driver, planId, date)
  const nextReminderAt = await nextScheduledFireAt(driver, planId, date)
  return { permission, exactAlarm, scheduledCount, nextReminderAt }
}

/**
 * Reconciles scheduled reminders against the latest recalculated schedule:
 * cancels anything no longer desired or whose fire time moved, schedules
 * everything new. Safe to call on every recalculation — Today already
 * recalculates on every load (see scheduleService.ts), which doubles as the
 * launch/resume reconciliation blueprint §12 asks for (no reboot receiver
 * needed for Phase A: whenever the user reopens the app, this runs).
 */
export async function syncNotifications(driver: SqlDriver, plan: TreatmentPlan, date: LocalDate, events: DisplayableEvent[], revisionId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const now = new Date().toISOString()
  const desired = planNotifications(events, now, plan.timezone)
  const desiredByEvent = new Map(desired.map((d) => [d.eventId, d]))

  const existing = await listScheduledNotifications(driver, plan.id, date)
  const existingByEvent = new Map(existing.map((r) => [r.dailyEventId, r]))

  const toCancel = existing.filter((r) => desiredByEvent.get(r.dailyEventId)?.fireAt !== r.fireAt)
  const toSchedule = desired.filter((d) => existingByEvent.get(d.eventId)?.fireAt !== d.fireAt)

  if (toCancel.length > 0) {
    await LocalNotifications.cancel({ notifications: toCancel.map((r) => ({ id: Number(r.platformId) })) })
    for (const r of toCancel) await markNotificationCancelled(driver, r.recordId)
  }

  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({
      notifications: toSchedule.map((d) => ({
        id: hashEventIdToNotificationId(d.eventId),
        title: d.title,
        body: d.body,
        schedule: { at: new Date(d.fireAt), allowWhileIdle: true },
        isExactNotification: d.urgency === 'important',
        actionTypeId: TAKEN_ACTION_TYPE,
        extra: { templateId: d.templateId, planId: plan.id, date } satisfies NotificationExtra,
      })),
    })
    for (const d of toSchedule) {
      await insertScheduledNotification(driver, {
        id: newId(),
        dailyEventId: d.eventId,
        platformId: String(hashEventIdToNotificationId(d.eventId)),
        fireAt: d.fireAt,
        revisionId,
      })
    }
  }
}
