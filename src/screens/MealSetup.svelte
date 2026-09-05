<script lang="ts">
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan } from '../domain/types'
  import { createEventTemplate } from '../database/repositories/eventTemplateRepository'
  import { localTimeToInstant } from '../scheduler/time'
  import { newId } from '../domain/id'

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

  let saving = $state(false)
  let error = $state('')

  async function saveMeal(label: string, enabled: boolean, earliest: string, latest: string) {
    if (!enabled) return
    await createEventTemplate(driver, {
      id: newId(),
      planId: plan.id,
      kind: 'meal',
      label,
      recurrence: { type: 'daily' },
      preferredWindow: {
        earliest: localTimeToInstant(plan.startDate, earliest, plan.timezone),
        latest: localTimeToInstant(plan.startDate, latest, plan.timezone),
      },
      activeFrom: plan.startDate,
    })
  }

  async function saveContinue() {
    saving = true
    error = ''
    try {
      await saveMeal('Breakfast', breakfastEnabled, breakfastEarliest, breakfastLatest)
      await saveMeal('Lunch', lunchEnabled, lunchEarliest, lunchLatest)
      await saveMeal('Dinner', dinnerEnabled, dinnerEarliest, dinnerLatest)

      const wakeInstant = localTimeToInstant(plan.startDate, wakeTime, plan.timezone)
      await createEventTemplate(driver, {
        id: newId(), planId: plan.id, kind: 'wake', label: 'Wake', recurrence: { type: 'daily' },
        preferredWindow: { earliest: wakeInstant, latest: wakeInstant }, activeFrom: plan.startDate,
      })

      const sleepInstant = localTimeToInstant(plan.startDate, sleepTime, plan.timezone)
      await createEventTemplate(driver, {
        id: newId(), planId: plan.id, kind: 'sleep', label: 'Bedtime', recurrence: { type: 'daily' },
        preferredWindow: { earliest: sleepInstant, latest: sleepInstant }, activeFrom: plan.startDate,
      })

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

  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <strong>Breakfast</strong>
      <input type="checkbox" bind:checked={breakfastEnabled} />
    </div>
    {#if breakfastEnabled}
      <div class="field-row">
        <div class="field">
          <label for="breakfast-earliest">From</label>
          <input id="breakfast-earliest" type="time" bind:value={breakfastEarliest} />
        </div>
        <div class="field">
          <label for="breakfast-latest">To</label>
          <input id="breakfast-latest" type="time" bind:value={breakfastLatest} />
        </div>
      </div>
    {/if}
  </div>

  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <strong>Lunch</strong>
      <input type="checkbox" bind:checked={lunchEnabled} />
    </div>
    {#if lunchEnabled}
      <div class="field-row">
        <div class="field">
          <label for="lunch-earliest">From</label>
          <input id="lunch-earliest" type="time" bind:value={lunchEarliest} />
        </div>
        <div class="field">
          <label for="lunch-latest">To</label>
          <input id="lunch-latest" type="time" bind:value={lunchLatest} />
        </div>
      </div>
    {/if}
  </div>

  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <strong>Dinner</strong>
      <input type="checkbox" bind:checked={dinnerEnabled} />
    </div>
    {#if dinnerEnabled}
      <div class="field-row">
        <div class="field">
          <label for="dinner-earliest">From</label>
          <input id="dinner-earliest" type="time" bind:value={dinnerEarliest} />
        </div>
        <div class="field">
          <label for="dinner-latest">To</label>
          <input id="dinner-latest" type="time" bind:value={dinnerLatest} />
        </div>
      </div>
    {/if}
  </div>

  <div class="field-row">
    <div class="field">
      <label for="wake-time">Wake time</label>
      <input id="wake-time" type="time" bind:value={wakeTime} />
    </div>
    <div class="field">
      <label for="sleep-time">Bedtime</label>
      <input id="sleep-time" type="time" bind:value={sleepTime} />
    </div>
  </div>

  {#if error}<p class="error-text">{error}</p>{/if}

  <button class="btn btn-primary" disabled={saving} onclick={saveContinue}>Continue</button>
</div>
