<script lang="ts">
  import { onMount } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan } from '../domain/types'
  import { listEventTemplatesActiveOn } from '../database/repositories/eventTemplateRepository'
  import { listConstraintsByPlan } from '../database/repositories/constraintRepository'
  import { calculateSchedule, type CalculateScheduleResult } from '../scheduler/schedule'
  import { minutesToLocalTime, todayLocalDate } from '../scheduler/time'
  import { activatePlan } from '../app/planService'
  import { newId } from '../domain/id'

  let {
    driver,
    plan,
    onActivated,
    onBack,
  }: { driver: SqlDriver; plan: TreatmentPlan; onActivated: (plan: TreatmentPlan) => void; onBack: () => void } = $props()

  let preview = $state<CalculateScheduleResult | undefined>(undefined)
  let labelByTemplateId = $state<Record<string, string>>({})
  let activating = $state(false)
  let error = $state('')

  onMount(async () => {
    const date = todayLocalDate(plan.timezone)
    const [templates, constraints] = await Promise.all([
      listEventTemplatesActiveOn(driver, plan.id, date),
      listConstraintsByPlan(driver, plan.id),
    ])
    labelByTemplateId = Object.fromEntries(templates.map((t) => [t.id, t.label]))
    preview = calculateSchedule({
      templates,
      constraints,
      date,
      timezone: plan.timezone,
      actualEvents: [],
      engineVersion: 'v0',
      revisionId: newId(),
    })
  })

  function formatWindow(w: { earliest: string; latest: string }): string {
    const from = minutesToLocalTime(w.earliest, plan.timezone)
    const to = minutesToLocalTime(w.latest, plan.timezone)
    return from === to ? from : `${from}–${to}`
  }

  async function activate() {
    activating = true
    error = ''
    try {
      const activated = await activatePlan(driver, plan)
      onActivated(activated)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      activating = false
    }
  }
</script>

<div class="screen">
  <div class="screen-header">
    <button class="back-btn" onclick={onBack} aria-label="Back">←</button>
    <div>
      <h1>Review your plan</h1>
      <p class="screen-subtitle" style="margin-top: 2px;">Times will adapt when linked events change.</p>
    </div>
  </div>

  {#if !preview}
    <p class="muted">Calculating…</p>
  {:else}
    {#if preview.conflicts.length > 0}
      <div class="card" style="border-color: var(--warn);">
        <strong class="badge badge-warn">Schedule conflict</strong>
        {#each preview.conflicts as c}
          <p class="muted">{c.message}</p>
        {/each}
      </div>
    {/if}

    <div class="card-list">
      {#each [...preview.events].sort((a, b) => a.currentWindow.earliest.localeCompare(b.currentWindow.earliest)) as event}
        <div class="card row">
          <span class="event-label"><span class="kind-dot {event.kind}"></span>{labelByTemplateId[event.templateId] ?? event.templateId}</span>
          <span class="badge {event.kind === 'medication' ? 'badge-sage' : 'badge-terracotta'}">{formatWindow(event.currentWindow)}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if error}<p class="error-text">{error}</p>{/if}

  <button class="btn btn-primary" disabled={activating || !preview} onclick={activate}>Activate treatment</button>
</div>
