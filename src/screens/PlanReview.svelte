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

  let { driver, plan, onActivated }: { driver: SqlDriver; plan: TreatmentPlan; onActivated: () => void } = $props()

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
      await activatePlan(driver, plan)
      onActivated()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      activating = false
    }
  }
</script>

<div class="screen">
  <h1>Review your plan</h1>
  <p class="screen-subtitle">Times will adapt when linked events change.</p>

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
        <div class="card" style="flex-direction: row; justify-content: space-between; align-items: center;">
          <span>{event.kind === 'medication' ? '💊' : event.kind === 'meal' ? '🍽️' : '⏰'} {labelByTemplateId[event.templateId] ?? event.templateId}</span>
          <strong>{formatWindow(event.currentWindow)}</strong>
        </div>
      {/each}
    </div>
  {/if}

  {#if error}<p class="error-text">{error}</p>{/if}

  <button class="btn btn-primary" disabled={activating || !preview} onclick={activate}>Activate treatment</button>
</div>
