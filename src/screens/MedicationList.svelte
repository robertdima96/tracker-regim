<script lang="ts">
  import { onMount } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan } from '../domain/types'
  import { listEventTemplatesActiveOn, type StoredEventTemplate } from '../database/repositories/eventTemplateRepository'
  import { listConstraintsByPlan, type StoredConstraint } from '../database/repositories/constraintRepository'
  import { removeDose, removeMedication } from '../app/medicationService'
  import { todayLocalDate } from '../scheduler/time'
  import AddMedicationForm from './AddMedicationForm.svelte'
  import EventIcon from '../components/EventIcon.svelte'

  let {
    driver,
    plan,
    onDone,
    onBack,
    continueLabel = 'Continue to plan review',
    requireAtLeastOne = true,
  }: {
    driver: SqlDriver
    plan: TreatmentPlan
    onDone: () => void
    onBack: () => void
    continueLabel?: string
    requireAtLeastOne?: boolean
  } = $props()

  let templates = $state<StoredEventTemplate[]>([])
  let constraints = $state<StoredConstraint[]>([])
  let showAddForm = $state(false)
  let removingKey = $state<string | undefined>(undefined)

  async function refresh() {
    ;[templates, constraints] = await Promise.all([
      listEventTemplatesActiveOn(driver, plan.id, plan.startDate),
      listConstraintsByPlan(driver, plan.id),
    ])
  }
  onMount(refresh)

  const anchors = $derived(templates.filter((t) => t.kind === 'meal' || t.kind === 'wake' || t.kind === 'sleep'))
  const medications = $derived(templates.filter((t) => t.kind === 'medication'))
  const groupedByName = $derived.by(() => {
    const groups = new Map<string, StoredEventTemplate[]>()
    for (const med of medications) {
      const group = groups.get(med.label) ?? []
      group.push(med)
      groups.set(med.label, group)
    }
    return [...groups.entries()]
  })

  function anchorLabel(id: string): string {
    return anchors.find((a) => a.id === id)?.label ?? id
  }

  function ruleSummary(t: StoredEventTemplate): string {
    if (t.fixedLocalTime) return `Fixed time ${t.fixedLocalTime}`
    const c = constraints.find((c) => c.sourceTemplateId === t.id)
    if (!c) return 'No timing rule set'
    const anchor = anchorLabel(c.targetTemplateId)
    if (c.maxOffsetMinutes === undefined) return `At least ${c.minOffsetMinutes} min ${c.relation} ${anchor}`
    if (c.maxOffsetMinutes === c.minOffsetMinutes) return `Exactly ${c.minOffsetMinutes} min ${c.relation} ${anchor}`
    return `${c.minOffsetMinutes}–${c.maxOffsetMinutes} min ${c.relation} ${anchor}`
  }

  async function handleRemoveDose(dose: StoredEventTemplate) {
    if (!confirm('Remove this dose? It will no longer appear on Today from now on.')) return
    removingKey = dose.id
    try {
      await removeDose(driver, dose.id, todayLocalDate(plan.timezone))
      await refresh()
    } finally {
      removingKey = undefined
    }
  }

  async function handleRemoveMedication(name: string, doses: StoredEventTemplate[]) {
    if (!confirm(`Delete ${name} and all ${doses.length} of its doses? It will no longer appear on Today from now on.`)) return
    removingKey = name
    try {
      await removeMedication(driver, doses.map((d) => d.id), todayLocalDate(plan.timezone))
      await refresh()
    } finally {
      removingKey = undefined
    }
  }
</script>

<div class="screen">
  <div class="screen-header">
    <button class="back-btn" onclick={onBack} aria-label="Back">←</button>
    <div>
      <h1>Medications</h1>
      <p class="screen-subtitle" style="margin-top: 2px;">{plan.name}</p>
    </div>
  </div>

  {#if medications.length === 0 && !showAddForm}
    <p class="muted">Add your treatment instructions and DoseFlow will build today's schedule.</p>
  {/if}

  {#if groupedByName.length > 0}
    <div class="card-list">
      {#each groupedByName as [name, doses] (name)}
        <div class="card">
          <div class="row">
            <div class="event-row">
              <EventIcon kind="medication" />
              <span class="event-label">{name}</span>
            </div>
            <button
              type="button"
              class="btn btn-danger"
              style="padding:4px 10px;"
              disabled={removingKey === name}
              onclick={() => handleRemoveMedication(name, doses)}
            >
              Delete
            </button>
          </div>
          {#each doses as dose (dose.id)}
            <div class="dose-row">
              <span>{ruleSummary(dose)}</span>
              <button type="button" class="btn btn-secondary" style="padding:4px 10px;" disabled={removingKey === dose.id} onclick={() => handleRemoveDose(dose)}>
                Remove dose
              </button>
            </div>
          {/each}
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

  {#if (medications.length > 0 || !requireAtLeastOne) && !showAddForm}
    <button class="btn btn-primary" onclick={onDone}>{continueLabel}</button>
  {/if}
</div>
