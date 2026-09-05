<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan, Conflict } from '../domain/types'
  import { getDailyEventsForDate, type DisplayableEvent } from '../database/repositories/scheduleRepository'
  import { recalculateAndPersist, logAdministration } from '../app/scheduleService'
  import { localTimeToInstant, minutesToLocalTime, todayLocalDate } from '../scheduler/time'
  import EventIcon from '../components/EventIcon.svelte'
  import TimeField from '../components/TimeField.svelte'

  let { driver, plan, onOpenPlan }: { driver: SqlDriver; plan: TreatmentPlan; onOpenPlan: () => void } = $props()

  // `plan` is fixed for this screen's lifetime (App.svelte only mounts
  // Today once a plan is active) — capturing today's date once
  // deliberately, not re-deriving it if the prop object identity changes.
  const date = untrack(() => todayLocalDate(plan.timezone))
  let events = $state<DisplayableEvent[]>([])
  let conflicts = $state<Conflict[]>([])
  let loading = $state(true)
  let busyEventId = $state<string | undefined>(undefined)
  let loggingAtEventId = $state<string | undefined>(undefined)
  let loggingAtTime = $state('00:00')

  async function load() {
    // Always recalculate on load, not just when today has no schedule
    // yet: the plan may have just been edited (meals/medications changed
    // via the Plan hub), and that must be reflected the moment Today is
    // reopened, not only after the next dose-logging action triggers a
    // recalculation. calculateSchedule is idempotent, so this is a no-op
    // in the common case where nothing changed.
    const hadScheduleAlready = (await getDailyEventsForDate(driver, plan.id, date)).length > 0
    const result = await recalculateAndPersist(driver, plan, date, hadScheduleAlready ? 'plan_changed' : 'plan_activated')
    conflicts = result.conflicts
    events = await getDailyEventsForDate(driver, plan.id, date)
    loading = false
  }
  onMount(load)

  function formatWindow(w: { earliest: string; latest: string }): string {
    const from = minutesToLocalTime(w.earliest, plan.timezone)
    const to = minutesToLocalTime(w.latest, plan.timezone)
    return from === to ? from : `${from}–${to}`
  }

  function nowLocalTime(): string {
    return minutesToLocalTime(new Date().toISOString(), plan.timezone)
  }

  async function act(event: DisplayableEvent, action: 'taken' | 'skipped', actualAt?: string) {
    busyEventId = event.id
    try {
      const result = await logAdministration(driver, plan, date, event.templateId, action, actualAt, 'user')
      conflicts = result.conflicts
      events = await getDailyEventsForDate(driver, plan.id, date)
    } finally {
      busyEventId = undefined
      loggingAtEventId = undefined
    }
  }

  function startLogAt(event: DisplayableEvent) {
    loggingAtEventId = event.id
    loggingAtTime = nowLocalTime()
  }

  function confirmLogAt(event: DisplayableEvent) {
    act(event, 'taken', localTimeToInstant(date, loggingAtTime, plan.timezone))
  }

  const pending = $derived(
    [...events].filter((e) => e.kind === 'medication' && e.status === 'upcoming').sort((a, b) => a.currentWindow.earliest.localeCompare(b.currentWindow.earliest)),
  )
  const nextAction = $derived(pending[0])
  const rest = $derived(
    [...events].filter((e) => e.id !== nextAction?.id).sort((a, b) => a.currentWindow.earliest.localeCompare(b.currentWindow.earliest)),
  )
</script>

<div class="screen">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
    <div style="min-width: 0;">
      <h1>Today</h1>
      <p class="screen-subtitle">{plan.name}</p>
    </div>
    <button class="back-btn" onclick={onOpenPlan} aria-label="Edit your plan" title="Edit your plan">✎</button>
  </div>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else}
    {#if conflicts.length > 0}
      <div class="card" style="border-color: var(--warn);">
        <strong class="badge badge-warn">Schedule conflict</strong>
        {#each conflicts as c}<p class="muted">{c.message}</p>{/each}
      </div>
    {/if}

    {#if events.length === 0}
      <p class="muted">Nothing scheduled right now.</p>
    {/if}

    {#if nextAction}
      <div class="card hero-card">
        <span class="hero-label">Next up</span>
        <div class="event-row">
          <EventIcon kind={nextAction.kind} />
          <div style="min-width:0;">
            <div class="event-label" style="font-size: 1.3rem;">{nextAction.label}</div>
            <div class="muted">{formatWindow(nextAction.currentWindow)}</div>
          </div>
        </div>

        {#if loggingAtEventId === nextAction.id}
          <div class="card" style="background: var(--paper); box-shadow: none;">
            <div class="chip-row">
              <button type="button" class="chip" onclick={() => (loggingAtTime = minutesToLocalTime(localTimeToInstant(date, nowLocalTime(), plan.timezone), plan.timezone))}>Now</button>
            </div>
            <TimeField id="log-at-time" label="Taken at" bind:value={loggingAtTime} />
            <div class="field-row">
              <button class="btn btn-secondary" onclick={() => (loggingAtEventId = undefined)}>Cancel</button>
              <button class="btn btn-primary" disabled={busyEventId === nextAction.id} onclick={() => confirmLogAt(nextAction)}>Confirm</button>
            </div>
          </div>
        {:else}
          <div class="field-row">
            <button class="btn btn-primary" disabled={busyEventId === nextAction.id} onclick={() => act(nextAction, 'taken')}>Taken now</button>
            <button class="btn btn-secondary" disabled={busyEventId === nextAction.id} onclick={() => startLogAt(nextAction)}>Taken at…</button>
          </div>
          <button class="btn btn-danger" disabled={busyEventId === nextAction.id} onclick={() => act(nextAction, 'skipped')}>Skip</button>
        {/if}
      </div>
    {/if}

    <div class="card-list">
      {#each rest as event (event.id)}
        <div class="card">
          <div class="row">
            <div class="event-row">
              <EventIcon kind={event.kind} />
              <span class="event-label">{event.label}</span>
            </div>
            <span class="badge {event.kind === 'medication' ? 'badge-sage' : 'badge-terracotta'}">{formatWindow(event.currentWindow)}</span>
          </div>
          {#if event.status === 'taken'}
            <span class="muted">Taken at {event.actualAt ? minutesToLocalTime(event.actualAt, plan.timezone) : ''}</span>
          {:else if event.status === 'skipped'}
            <span class="muted">Skipped</span>
          {:else if event.kind === 'medication'}
            {#if loggingAtEventId === event.id}
              <TimeField id="log-at-time-{event.id}" label="Taken at" bind:value={loggingAtTime} />
              <div class="field-row">
                <button class="btn btn-secondary" onclick={() => (loggingAtEventId = undefined)}>Cancel</button>
                <button class="btn btn-primary" disabled={busyEventId === event.id} onclick={() => confirmLogAt(event)}>Confirm</button>
              </div>
            {:else}
              <div class="field-row">
                <button class="btn btn-primary" disabled={busyEventId === event.id} onclick={() => act(event, 'taken')}>Taken now</button>
                <button class="btn btn-secondary" disabled={busyEventId === event.id} onclick={() => startLogAt(event)}>Taken at…</button>
                <button class="btn btn-danger" disabled={busyEventId === event.id} onclick={() => act(event, 'skipped')}>Skip</button>
              </div>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
