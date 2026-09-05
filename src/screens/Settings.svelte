<script lang="ts">
  import { onMount } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan } from '../domain/types'
  import { listMedicationsByPlan } from '../database/repositories/medicationRepository'
  import { listAllEventTemplatesForPlan } from '../database/repositories/eventTemplateRepository'
  import { listConstraintsByPlan } from '../database/repositories/constraintRepository'
  import { listHistoryForPlan } from '../database/repositories/administrationRepository'
  import { resetAllData } from '../database/migrate'
  import { getNotificationHealth, requestNotificationPermission, type NotificationHealth } from '../notifications/notificationService'
  import { todayLocalDate, minutesToLocalTime } from '../scheduler/time'

  let { driver, plan, onReset }: { driver: SqlDriver; plan: TreatmentPlan; onReset: () => void } = $props()

  let exporting = $state(false)
  let resetting = $state(false)
  let health = $state<NotificationHealth | undefined>(undefined)
  let requestingPermission = $state(false)

  async function loadHealth() {
    health = await getNotificationHealth(driver, plan.id, todayLocalDate(plan.timezone))
  }
  onMount(loadHealth)

  async function enableReminders() {
    requestingPermission = true
    try {
      await requestNotificationPermission()
      await loadHealth()
    } finally {
      requestingPermission = false
    }
  }

  function permissionLabel(state: string): string {
    switch (state) {
      case 'granted':
        return 'Enabled'
      case 'denied':
        return 'Denied — enable in device settings'
      case 'prompt':
      case 'prompt-with-rationale':
        return 'Needs permission'
      default:
        return state
    }
  }

  async function exportBackup() {
    exporting = true
    try {
      const [medications, templates, constraints, history] = await Promise.all([
        listMedicationsByPlan(driver, plan.id),
        listAllEventTemplatesForPlan(driver, plan.id),
        listConstraintsByPlan(driver, plan.id),
        listHistoryForPlan(driver, plan.id, plan.startDate),
      ])
      const backup = { exportedAt: new Date().toISOString(), plan, medications, templates, constraints, history }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `doseflow-backup-${plan.startDate}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      exporting = false
    }
  }

  async function resetApp() {
    if (!confirm('This permanently deletes your plan, medications, and history from this device. This cannot be undone. Continue?')) return
    if (!confirm('Are you sure? Type OK to permanently erase everything.')) return
    resetting = true
    try {
      await resetAllData(driver)
      onReset()
    } finally {
      resetting = false
    }
  }
</script>

<div class="screen screen-with-nav">
  <h1>You</h1>
  <p class="screen-subtitle">Data and settings</p>

  <div class="card">
    <span class="event-label">{plan.name}</span>
    <span class="muted">Started {plan.startDate} · {plan.timezone}</span>
  </div>

  <div class="card">
    <span class="event-label">Reminders</span>
    {#if health}
      {#if health.permission === 'unsupported'}
        <p class="muted">Reminders need the native app — the web version can't reliably deliver background notifications.</p>
      {:else}
        <div class="row"><span class="muted">Notifications</span><span>{permissionLabel(health.permission)}</span></div>
        {#if health.exactAlarm !== 'unsupported'}
          <div class="row"><span class="muted">Precise alarms</span><span>{permissionLabel(health.exactAlarm)}</span></div>
        {/if}
        <div class="row"><span class="muted">Scheduled today</span><span>{health.scheduledCount}</span></div>
        {#if health.nextReminderAt}
          <div class="row"><span class="muted">Next reminder</span><span>{minutesToLocalTime(health.nextReminderAt, plan.timezone)}</span></div>
        {/if}
        {#if health.permission !== 'granted'}
          <button class="btn btn-secondary" disabled={requestingPermission} onclick={enableReminders}>Enable reminders</button>
        {/if}
      {/if}
    {/if}
  </div>

  <div class="card">
    <span class="event-label">Data</span>
    <p class="muted">
      All data stays on this device only — nothing is sent anywhere. Export a backup periodically in case you lose
      access to this device.
    </p>
    <button class="btn btn-secondary" disabled={exporting} onclick={exportBackup}>Export backup (JSON)</button>
  </div>

  <div class="card" style="border-color: var(--warn);">
    <span class="event-label" style="color: var(--warn);">Danger zone</span>
    <p class="muted">Permanently erase your plan, medications, and history from this device.</p>
    <button class="btn btn-danger" disabled={resetting} onclick={resetApp}>Reset app</button>
  </div>
</div>
