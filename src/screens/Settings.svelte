<script lang="ts">
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan } from '../domain/types'
  import { listMedicationsByPlan } from '../database/repositories/medicationRepository'
  import { listAllEventTemplatesForPlan } from '../database/repositories/eventTemplateRepository'
  import { listConstraintsByPlan } from '../database/repositories/constraintRepository'
  import { listHistoryForPlan } from '../database/repositories/administrationRepository'
  import { resetAllData } from '../database/migrate'

  let { driver, plan, onReset }: { driver: SqlDriver; plan: TreatmentPlan; onReset: () => void } = $props()

  let exporting = $state(false)
  let resetting = $state(false)

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
