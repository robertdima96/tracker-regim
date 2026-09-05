<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan, Conflict } from '../domain/types'
  import { getDailyEventsForDate, type DisplayableEvent } from '../database/repositories/scheduleRepository'
  import { recalculateAndPersist, logAdministration } from '../app/scheduleService'
  import { minutesToLocalTime, todayLocalDate } from '../scheduler/time'

  let { driver, plan }: { driver: SqlDriver; plan: TreatmentPlan } = $props()

  // `plan` is fixed for this screen's lifetime (App.svelte only mounts
  // Today once a plan is active) — capturing today's date once
  // deliberately, not re-deriving it if the prop object identity changes.
  const date = untrack(() => todayLocalDate(plan.timezone))
  let events = $state<DisplayableEvent[]>([])
  let conflicts = $state<Conflict[]>([])
  let loading = $state(true)
  let busyEventId = $state<string | undefined>(undefined)

  async function load() {
    let loaded = await getDailyEventsForDate(driver, plan.id, date)
    if (loaded.length === 0) {
      const result = await recalculateAndPersist(driver, plan, date, 'plan_activated')
      conflicts = result.conflicts
      loaded = await getDailyEventsForDate(driver, plan.id, date)
    }
    events = loaded
    loading = false
  }
  onMount(load)

  function formatWindow(w: { earliest: string; latest: string }): string {
    const from = minutesToLocalTime(w.earliest, plan.timezone)
    const to = minutesToLocalTime(w.latest, plan.timezone)
    return from === to ? from : `${from}–${to}`
  }

  async function act(event: DisplayableEvent, action: 'taken' | 'skipped') {
    busyEventId = event.id
    try {
      const actualAt = action === 'taken' ? new Date().toISOString() : undefined
      const result = await logAdministration(driver, plan, date, event.templateId, action, actualAt, 'user')
      conflicts = result.conflicts
      events = await getDailyEventsForDate(driver, plan.id, date)
    } finally {
      busyEventId = undefined
    }
  }

  const sorted = $derived([...events].sort((a, b) => a.currentWindow.earliest.localeCompare(b.currentWindow.earliest)))
</script>

<div class="screen">
  <h1>Today</h1>
  <p class="screen-subtitle">{plan.name}</p>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else}
    {#if conflicts.length > 0}
      <div class="card" style="border-color: var(--warn);">
        <strong class="badge badge-warn">Schedule conflict</strong>
        {#each conflicts as c}<p class="muted">{c.message}</p>{/each}
      </div>
    {/if}

    {#if sorted.length === 0}
      <p class="muted">Nothing scheduled right now.</p>
    {/if}

    <div class="card-list">
      {#each sorted as event (event.id)}
        <div class="card">
          <div class="row">
            <span class="event-label"><span class="kind-dot {event.kind}"></span>{event.label}</span>
            <span class="badge {event.kind === 'medication' ? 'badge-sage' : 'badge-terracotta'}">{formatWindow(event.currentWindow)}</span>
          </div>
          {#if event.status === 'taken'}
            <span class="muted">Taken at {event.actualAt ? minutesToLocalTime(event.actualAt, plan.timezone) : ''}</span>
          {:else if event.status === 'skipped'}
            <span class="muted">Skipped</span>
          {:else if event.kind === 'medication'}
            <div class="field-row">
              <button class="btn btn-primary" disabled={busyEventId === event.id} onclick={() => act(event, 'taken')}>Taken now</button>
              <button class="btn btn-danger" disabled={busyEventId === event.id} onclick={() => act(event, 'skipped')}>Skip</button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
