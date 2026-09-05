<script lang="ts">
  import { onMount } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan } from '../domain/types'
  import { listEventTemplatesActiveOn, type StoredEventTemplate } from '../database/repositories/eventTemplateRepository'
  import AddMedicationForm from './AddMedicationForm.svelte'

  let { driver, plan, onDone }: { driver: SqlDriver; plan: TreatmentPlan; onDone: () => void } = $props()

  let templates = $state<StoredEventTemplate[]>([])
  let showAddForm = $state(false)

  async function refresh() {
    templates = await listEventTemplatesActiveOn(driver, plan.id, plan.startDate)
  }
  onMount(refresh)

  const medications = $derived(templates.filter((t) => t.kind === 'medication'))
  const anchors = $derived(templates.filter((t) => t.kind === 'meal' || t.kind === 'wake' || t.kind === 'sleep'))

  function ruleSummary(t: StoredEventTemplate): string {
    if (t.fixedLocalTime) return `Fixed time ${t.fixedLocalTime}`
    return 'Relative to an event'
  }
</script>

<div class="screen">
  <h1>Medications</h1>
  <p class="screen-subtitle">{plan.name}</p>

  {#if medications.length === 0 && !showAddForm}
    <p class="muted">Add your treatment instructions and DoseFlow will build today's schedule.</p>
  {/if}

  {#if medications.length > 0}
    <div class="card-list">
      {#each medications as med}
        <div class="card">
          <strong>{med.label}</strong>
          <span class="muted">{ruleSummary(med)}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if showAddForm}
    <AddMedicationForm
      {driver}
      {plan}
      anchors={anchors}
      onAdded={() => {
        showAddForm = false
        refresh()
      }}
      onCancel={() => (showAddForm = false)}
    />
  {:else}
    <button class="btn btn-secondary" onclick={() => (showAddForm = true)}>+ Add medication</button>
  {/if}

  {#if medications.length > 0 && !showAddForm}
    <button class="btn btn-primary" onclick={onDone}>Continue to plan review</button>
  {/if}
</div>
