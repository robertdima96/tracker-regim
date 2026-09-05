<script lang="ts">
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan } from '../domain/types'
  import { createDraftPlan } from '../app/planService'

  let { driver, onCreated }: { driver: SqlDriver; onCreated: (plan: TreatmentPlan) => void } = $props()

  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  let name = $state('')
  let timezone = $state(detectedTimezone)
  let saving = $state(false)
  let error = $state('')

  async function save() {
    if (!name.trim()) {
      error = 'Give the plan a name.'
      return
    }
    saving = true
    error = ''
    try {
      const plan = await createDraftPlan(driver, name.trim(), timezone)
      onCreated(plan)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      saving = false
    }
  }
</script>

<div class="screen">
  <h1>New treatment</h1>
  <p class="screen-subtitle">Create the plan first. You'll add meals and medications next.</p>

  <div class="field">
    <label for="plan-name">Plan name</label>
    <input id="plan-name" type="text" bind:value={name} placeholder="e.g. Gastric treatment" />
  </div>

  <div class="field">
    <label for="plan-timezone">Timezone</label>
    <input id="plan-timezone" type="text" bind:value={timezone} />
  </div>

  {#if error}<p class="error-text">{error}</p>{/if}

  <button class="btn btn-primary" disabled={saving} onclick={save}>Save</button>
</div>
