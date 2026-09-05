<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan, Conflict, Explanation } from '../domain/types'
  import { getDailyEventsForDate, type DisplayableEvent } from '../database/repositories/scheduleRepository'
  import { recalculateAndPersist, logAdministration } from '../app/scheduleService'
  import { renderExplanationFact } from '../app/explainEvent'
  import { syncNotifications } from '../notifications/notificationService'
  import { localTimeToInstant, minutesToLocalTime, addMinutes, todayLocalDate } from '../scheduler/time'
  import EventIcon from '../components/EventIcon.svelte'
  import TimeField from '../components/TimeField.svelte'

  let { driver, plan, onOpenPlan }: { driver: SqlDriver; plan: TreatmentPlan; onOpenPlan: () => void } = $props()

  // `plan` is fixed for this screen's lifetime (App.svelte only mounts
  // Today once a plan is active) — capturing today's date once
  // deliberately, not re-deriving it if the prop object identity changes.
  const date = untrack(() => todayLocalDate(plan.timezone))
  let events = $state<DisplayableEvent[]>([])
  let conflicts = $state<Conflict[]>([])
  let explanations = $state<Record<string, Explanation>>({})
  let expandedWhy = $state<Record<string, boolean>>({})
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
    explanations = Object.fromEntries(result.explanations.map((e) => [e.eventId, e]))
    events = await getDailyEventsForDate(driver, plan.id, date)
    if (events[0]) await syncNotifications(driver, plan, date, events, events[0].revisionId)
    loading = false
  }
  onMount(load)

  function toggleWhy(eventId: string) {
    expandedWhy = { ...expandedWhy, [eventId]: !expandedWhy[eventId] }
  }

  // Only medication events had loggable actions until now — meals/wake/
  // sleep were display-only, which meant "actually ate breakfast late"
  // could never happen and the reverse-scheduling behavior it triggers
  // (later meds pushed later) was unreachable from the UI. Every kind is
  // loggable via the same generic action() call; only the button wording
  // changes, and "Skip" is omitted for wake/sleep since skipping waking
  // up isn't a meaningful action.
  function actionLabels(kind: DisplayableEvent['kind']): { now: string; at: string; skip?: string } {
    switch (kind) {
      case 'medication':
        return { now: 'Taken now', at: 'Taken at…', skip: 'Skip' }
      case 'meal':
        return { now: 'Ate now', at: 'Ate at…', skip: 'Skip' }
      case 'wake':
        return { now: "I'm up", at: 'Woke at…' }
      case 'sleep':
        return { now: 'Going to bed', at: 'Went to bed at…' }
      default:
        return { now: 'Log now', at: 'Log at…', skip: 'Skip' }
    }
  }

  function formatWindow(w: { earliest: string; latest: string }): string {
    const from = minutesToLocalTime(w.earliest, plan.timezone)
    const to = minutesToLocalTime(w.latest, plan.timezone)
    return from === to ? from : `${from}–${to}`
  }

  function nowLocalTime(): string {
    return minutesToLocalTime(new Date().toISOString(), plan.timezone)
  }

  async function act(event: DisplayableEvent, action: 'taken' | 'skipped' | 'undone', actualAt?: string) {
    busyEventId = event.id
    try {
      // "Taken now" (the one-tap path, as opposed to "Taken at…") calls
      // act() with no actualAt at all — it must default to the current
      // instant here, since recordAdministration stores exactly what it's
      // given and getEffectiveActualEvents filters out rows with no
      // actual_at. Without this, a plain "taken" tap silently never
      // registers as an actual event: the status never flips and nothing
      // downstream (window collapse, explanations, later constraints)
      // ever sees it.
      const resolvedActualAt = action === 'taken' ? (actualAt ?? new Date().toISOString()) : actualAt
      const result = await logAdministration(driver, plan, date, event.templateId, action, resolvedActualAt, 'user')
      conflicts = result.conflicts
      explanations = Object.fromEntries(result.explanations.map((e) => [e.eventId, e]))
      events = await getDailyEventsForDate(driver, plan.id, date)
      if (events[0]) await syncNotifications(driver, plan, date, events, events[0].revisionId)
    } finally {
      busyEventId = undefined
      loggingAtEventId = undefined
    }
  }

  function startLogAt(event: DisplayableEvent) {
    loggingAtEventId = event.id
    loggingAtTime = nowLocalTime()
  }

  function setLoggingAtMinutesAgo(minutesAgo: number) {
    loggingAtTime = minutesToLocalTime(addMinutes(new Date().toISOString(), -minutesAgo), plan.timezone)
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

<div class="screen screen-with-nav">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
    <div style="min-width: 0;">
      <h1>Today</h1>
      <p class="screen-subtitle">{plan.name}</p>
    </div>
    <button class="back-btn" onclick={onOpenPlan} aria-label="Edit your plan" title="Edit your plan">✎</button>
  </div>

  {#snippet whyBlock(eventId: string)}
    {#if explanations[eventId]}
      <button type="button" class="chip" onclick={() => toggleWhy(eventId)}>
        {expandedWhy[eventId] ? 'Hide why' : 'Why this time?'}
      </button>
      {#if expandedWhy[eventId]}
        <ul class="why-list">
          {#each explanations[eventId].facts as fact}
            <li>{renderExplanationFact(fact, plan.timezone)}</li>
          {/each}
        </ul>
      {/if}
    {/if}
  {/snippet}

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
              <button type="button" class="chip" onclick={() => (loggingAtTime = nowLocalTime())}>Now</button>
              <button type="button" class="chip" onclick={() => setLoggingAtMinutesAgo(5)}>5 min ago</button>
              <button type="button" class="chip" onclick={() => setLoggingAtMinutesAgo(15)}>15 min ago</button>
              <button type="button" class="chip" onclick={() => setLoggingAtMinutesAgo(30)}>30 min ago</button>
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
        {@render whyBlock(nextAction.id)}
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
            <div class="row">
              <span class="muted">Taken at {event.actualAt ? minutesToLocalTime(event.actualAt, plan.timezone) : ''}</span>
              <button type="button" class="chip" disabled={busyEventId === event.id} onclick={() => act(event, 'undone')}>Undo</button>
            </div>
          {:else if event.status === 'skipped'}
            <div class="row">
              <span class="muted">Skipped</span>
              <button type="button" class="chip" disabled={busyEventId === event.id} onclick={() => act(event, 'undone')}>Undo</button>
            </div>
          {:else}
            {@const labels = actionLabels(event.kind)}
            {#if loggingAtEventId === event.id}
              <div class="chip-row">
                <button type="button" class="chip" onclick={() => (loggingAtTime = nowLocalTime())}>Now</button>
                <button type="button" class="chip" onclick={() => setLoggingAtMinutesAgo(5)}>5 min ago</button>
                <button type="button" class="chip" onclick={() => setLoggingAtMinutesAgo(15)}>15 min ago</button>
                <button type="button" class="chip" onclick={() => setLoggingAtMinutesAgo(30)}>30 min ago</button>
              </div>
              <TimeField id="log-at-time-{event.id}" label={labels.at.slice(0, -1)} bind:value={loggingAtTime} />
              <div class="field-row">
                <button class="btn btn-secondary" onclick={() => (loggingAtEventId = undefined)}>Cancel</button>
                <button class="btn btn-primary" disabled={busyEventId === event.id} onclick={() => confirmLogAt(event)}>Confirm</button>
              </div>
            {:else}
              <div class="field-row">
                <button class="btn btn-primary" disabled={busyEventId === event.id} onclick={() => act(event, 'taken')}>{labels.now}</button>
                <button class="btn btn-secondary" disabled={busyEventId === event.id} onclick={() => startLogAt(event)}>{labels.at}</button>
                {#if labels.skip}
                  <button class="btn btn-danger" disabled={busyEventId === event.id} onclick={() => act(event, 'skipped')}>{labels.skip}</button>
                {/if}
              </div>
            {/if}
          {/if}
          {@render whyBlock(event.id)}
        </div>
      {/each}
    </div>
  {/if}
</div>
