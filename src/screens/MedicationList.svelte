<script lang="ts">
  import { onMount } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan } from '../domain/types'
  import { listEventTemplatesActiveOn, type StoredEventTemplate } from '../database/repositories/eventTemplateRepository'
  import { listConstraintsByPlan, type StoredConstraint } from '../database/repositories/constraintRepository'
  import AddMedicationForm from './AddMedicationForm.svelte'

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
      {#each groupedByName as [name, doses]}
        <div class="card">
          <span class="event-label"><span class="kind-dot medication"></span>{name}</span>
          {#each doses as dose}
            <span class="muted">{ruleSummary(dose)}</span>
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
