<script lang="ts">
  import { onMount } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan } from '../domain/types'
  import {
    createEventTemplate,
    listEventTemplatesActiveOn,
    updateEventTemplate,
    type StoredEventTemplate,
  } from '../database/repositories/eventTemplateRepository'
  import { localTimeToInstant, minutesToLocalTime } from '../scheduler/time'
  import { newId } from '../domain/id'
  import TimeField from '../components/TimeField.svelte'

  let { driver, plan, onDone }: { driver: SqlDriver; plan: TreatmentPlan; onDone: () => void } = $props()

  let breakfastEnabled = $state(true)
  let breakfastEarliest = $state('08:00')
  let breakfastLatest = $state('10:00')

  let lunchEnabled = $state(true)
  let lunchEarliest = $state('12:30')
  let lunchLatest = $state('14:00')

  let dinnerEnabled = $state(true)
  let dinnerEarliest = $state('19:00')
  let dinnerLatest = $state('21:00')

  let wakeTime = $state('07:30')
  let sleepTime = $state('23:30')

  // Populated on mount if this plan already has anchors (e.g. the user
  // went back to edit after continuing past this screen) — save() then
  // updates these rows in place instead of inserting duplicates.
  let existingIdByLabel = $state<Record<string, string>>({})
  let loading = $state(true)
  let saving = $state(false)
  let error = $state('')

  onMount(async () => {
    const templates = await listEventTemplatesActiveOn(driver, plan.id, plan.startDate)
    const byLabel: Record<string, StoredEventTemplate> = {}
    for (const t of templates) {
      if (t.kind === 'meal' || t.kind === 'wake' || t.kind === 'sleep') byLabel[t.label] = t
    }
    existingIdByLabel = Object.fromEntries(Object.entries(byLabel).map(([label, t]) => [label, t.id]))

    // Wake/Bedtime are always created (no on/off toggle), so their presence
    // is a reliable "this screen has been saved before" signal. Only then
    // does a missing meal mean "the user turned it off" rather than
    // "they haven't gotten here yet" — otherwise a first-time visit would
    // start every meal toggled off before the user touched anything.
    const isRevisit = byLabel['Wake'] !== undefined || byLabel['Bedtime'] !== undefined

    if (byLabel['Breakfast']?.preferredWindow) {
      breakfastEnabled = true
      breakfastEarliest = minutesToLocalTime(byLabel['Breakfast'].preferredWindow!.earliest, plan.timezone)
      breakfastLatest = minutesToLocalTime(byLabel['Breakfast'].preferredWindow!.latest, plan.timezone)
    } else if (isRevisit) {
      breakfastEnabled = false
    }
    if (byLabel['Lunch']?.preferredWindow) {
      lunchEnabled = true
      lunchEarliest = minutesToLocalTime(byLabel['Lunch'].preferredWindow!.earliest, plan.timezone)
      lunchLatest = minutesToLocalTime(byLabel['Lunch'].preferredWindow!.latest, plan.timezone)
    } else if (isRevisit) {
      lunchEnabled = false
    }
    if (byLabel['Dinner']?.preferredWindow) {
      dinnerEnabled = true
      dinnerEarliest = minutesToLocalTime(byLabel['Dinner'].preferredWindow!.earliest, plan.timezone)
      dinnerLatest = minutesToLocalTime(byLabel['Dinner'].preferredWindow!.latest, plan.timezone)
    } else if (isRevisit) {
      dinnerEnabled = false
    }
    if (byLabel['Wake']?.preferredWindow) wakeTime = minutesToLocalTime(byLabel['Wake'].preferredWindow!.earliest, plan.timezone)
    if (byLabel['Bedtime']?.preferredWindow) sleepTime = minutesToLocalTime(byLabel['Bedtime'].preferredWindow!.earliest, plan.timezone)

    loading = false
  })

  async function saveMeal(label: string, enabled: boolean, earliest: string, latest: string) {
    if (!enabled) return
    const preferredWindow = {
      earliest: localTimeToInstant(plan.startDate, earliest, plan.timezone),
      latest: localTimeToInstant(plan.startDate, latest, plan.timezone),
    }
    const existingId = existingIdByLabel[label]
    if (existingId) {
      await updateEventTemplate(driver, { id: existingId, planId: plan.id, kind: 'meal', label, recurrence: { type: 'daily' }, preferredWindow, activeFrom: plan.startDate })
    } else {
      await createEventTemplate(driver, { id: newId(), planId: plan.id, kind: 'meal', label, recurrence: { type: 'daily' }, preferredWindow, activeFrom: plan.startDate })
    }
  }

  async function savePoint(label: string, kind: 'wake' | 'sleep', time: string) {
    const instant = localTimeToInstant(plan.startDate, time, plan.timezone)
    const preferredWindow = { earliest: instant, latest: instant }
    const existingId = existingIdByLabel[label]
    if (existingId) {
      await updateEventTemplate(driver, { id: existingId, planId: plan.id, kind, label, recurrence: { type: 'daily' }, preferredWindow, activeFrom: plan.startDate })
    } else {
      await createEventTemplate(driver, { id: newId(), planId: plan.id, kind, label, recurrence: { type: 'daily' }, preferredWindow, activeFrom: plan.startDate })
    }
  }

  async function saveContinue() {
    saving = true
    error = ''
    try {
      await saveMeal('Breakfast', breakfastEnabled, breakfastEarliest, breakfastLatest)
      await saveMeal('Lunch', lunchEnabled, lunchEarliest, lunchLatest)
      await saveMeal('Dinner', dinnerEnabled, dinnerEarliest, dinnerLatest)
      await savePoint('Wake', 'wake', wakeTime)
      await savePoint('Bedtime', 'sleep', sleepTime)
      onDone()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      saving = false
    }
  }
</script>

<div class="screen">
  <h1>Meals &amp; routine</h1>
  <p class="screen-subtitle">These are lifestyle anchors. Medication rules can move around them when needed.</p>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else}
    <div class="card">
      <div class="row">
        <span class="event-label"><span class="kind-dot meal"></span>Breakfast</span>
        <input type="checkbox" bind:checked={breakfastEnabled} />
      </div>
      {#if breakfastEnabled}
        <div class="field-row">
          <TimeField id="breakfast-earliest" label="From" bind:value={breakfastEarliest} />
          <TimeField id="breakfast-latest" label="To" bind:value={breakfastLatest} />
        </div>
      {/if}
    </div>

    <div class="card">
      <div class="row">
        <span class="event-label"><span class="kind-dot meal"></span>Lunch</span>
        <input type="checkbox" bind:checked={lunchEnabled} />
      </div>
      {#if lunchEnabled}
        <div class="field-row">
          <TimeField id="lunch-earliest" label="From" bind:value={lunchEarliest} />
          <TimeField id="lunch-latest" label="To" bind:value={lunchLatest} />
        </div>
      {/if}
    </div>

    <div class="card">
      <div class="row">
        <span class="event-label"><span class="kind-dot meal"></span>Dinner</span>
        <input type="checkbox" bind:checked={dinnerEnabled} />
      </div>
      {#if dinnerEnabled}
        <div class="field-row">
          <TimeField id="dinner-earliest" label="From" bind:value={dinnerEarliest} />
          <TimeField id="dinner-latest" label="To" bind:value={dinnerLatest} />
        </div>
      {/if}
    </div>

    <div class="card">
      <div class="field-row">
        <TimeField id="wake-time" label="Wake time" bind:value={wakeTime} />
        <TimeField id="sleep-time" label="Bedtime" bind:value={sleepTime} />
      </div>
    </div>

    {#if error}<p class="error-text">{error}</p>{/if}

    <button class="btn btn-primary" disabled={saving} onclick={saveContinue}>Continue</button>
  {/if}
</div>
