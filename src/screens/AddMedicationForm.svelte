<script lang="ts">
  import { untrack } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan, InstructionSource } from '../domain/types'
  import type { StoredEventTemplate } from '../database/repositories/eventTemplateRepository'
  import { createMedication } from '../database/repositories/medicationRepository'
  import { createEventTemplate } from '../database/repositories/eventTemplateRepository'
  import { createConstraint } from '../database/repositories/constraintRepository'
  import { newId } from '../domain/id'

  let {
    driver,
    plan,
    anchors,
    onAdded,
    onCancel,
  }: { driver: SqlDriver; plan: TreatmentPlan; anchors: StoredEventTemplate[]; onAdded: () => void; onCancel: () => void } = $props()

  let displayName = $state('')
  let strengthValue = $state('')
  let strengthUnit = $state('mg')
  let instructionSource = $state<InstructionSource>('clinician')

  type TimingType = 'fixed' | 'relative'
  let timingType = $state<TimingType>('relative')
  let fixedTime = $state('08:00')
  // Anchors are fixed for this form's lifetime (set before it's shown) —
  // capturing just the initial default deliberately, not tracking changes.
  let anchorId = $state(untrack(() => anchors[0]?.id ?? ''))
  let relation = $state<'before' | 'after'>('before')
  type RuleType = 'exact' | 'minimum' | 'range'
  let ruleType = $state<RuleType>('minimum')
  let minMinutes = $state(60)
  let maxMinutes = $state(90)

  let saving = $state(false)
  let error = $state('')

  const instructionSources: Array<{ value: InstructionSource; label: string }> = [
    { value: 'clinician', label: 'Doctor' },
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'package', label: 'Package' },
    { value: 'user_routine', label: 'My routine' },
    { value: 'other', label: 'Other' },
  ]

  async function save() {
    if (!displayName.trim()) {
      error = 'Give the medication a name.'
      return
    }
    if (timingType === 'relative' && !anchorId) {
      error = 'Add a meal, wake, or bedtime anchor first (Meal & Routine Setup).'
      return
    }
    saving = true
    error = ''
    try {
      const medicationId = newId()
      await createMedication(driver, {
        id: medicationId,
        planId: plan.id,
        displayName: displayName.trim(),
        strengthValue: strengthValue ? Number(strengthValue) : undefined,
        strengthUnit: strengthValue ? strengthUnit : undefined,
        activeFrom: plan.startDate,
      })

      const templateId = newId()
      await createEventTemplate(driver, {
        id: templateId,
        planId: plan.id,
        medicationId,
        kind: 'medication',
        label: displayName.trim(),
        recurrence: { type: 'daily' },
        fixedLocalTime: timingType === 'fixed' ? fixedTime : undefined,
        activeFrom: plan.startDate,
      })

      if (timingType === 'relative') {
        const min = ruleType === 'range' ? Math.min(minMinutes, maxMinutes) : minMinutes
        const max = ruleType === 'exact' ? min : ruleType === 'range' ? Math.max(minMinutes, maxMinutes) : undefined
        await createConstraint(driver, {
          id: newId(),
          planId: plan.id,
          sourceTemplateId: templateId,
          targetTemplateId: anchorId,
          relation,
          minOffsetMinutes: min,
          maxOffsetMinutes: max,
          hardness: 'hard',
          source: instructionSource,
          createdAt: new Date().toISOString(),
        })
      }

      onAdded()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      saving = false
    }
  }
</script>

<div class="card" style="gap: 14px;">
  <div class="field">
    <label for="med-name">Display name</label>
    <input id="med-name" type="text" bind:value={displayName} placeholder="e.g. Gastrofait" />
  </div>

  <div class="field-row">
    <div class="field">
      <label for="med-strength">Strength</label>
      <input id="med-strength" type="number" bind:value={strengthValue} placeholder="optional" />
    </div>
    <div class="field">
      <label for="med-unit">Unit</label>
      <input id="med-unit" type="text" bind:value={strengthUnit} />
    </div>
  </div>

  <div class="field">
    <span>Where does this instruction come from?</span>
    <div class="chip-row">
      {#each instructionSources as opt}
        <button type="button" class="chip" class:selected={instructionSource === opt.value} onclick={() => (instructionSource = opt.value)}>
          {opt.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="field">
    <span>When should you take this?</span>
    <div class="chip-row">
      <button type="button" class="chip" class:selected={timingType === 'fixed'} onclick={() => (timingType = 'fixed')}>Fixed time</button>
      <button type="button" class="chip" class:selected={timingType === 'relative'} onclick={() => (timingType = 'relative')}>Relative to an event</button>
    </div>
  </div>

  {#if timingType === 'fixed'}
    <div class="field">
      <label for="fixed-time">Time</label>
      <input id="fixed-time" type="time" bind:value={fixedTime} />
    </div>
  {:else}
    {#if anchors.length === 0}
      <p class="error-text">No meal/wake/bedtime anchors yet — set those up in Meal &amp; Routine Setup first.</p>
    {:else}
      <div class="field-row">
        <div class="field">
          <label for="rel-minutes">Minutes</label>
          <input id="rel-minutes" type="number" min="0" bind:value={minMinutes} />
        </div>
        <div class="field">
          <label for="rel-relation">Relation</label>
          <select id="rel-relation" bind:value={relation}>
            <option value="before">before</option>
            <option value="after">after</option>
          </select>
        </div>
        <div class="field">
          <label for="rel-anchor">Event</label>
          <select id="rel-anchor" bind:value={anchorId}>
            {#each anchors as a}
              <option value={a.id}>{a.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="field">
        <span>How strict?</span>
        <div class="chip-row">
          <button type="button" class="chip" class:selected={ruleType === 'exact'} onclick={() => (ruleType = 'exact')}>Exactly</button>
          <button type="button" class="chip" class:selected={ruleType === 'minimum'} onclick={() => (ruleType = 'minimum')}>At least</button>
          <button type="button" class="chip" class:selected={ruleType === 'range'} onclick={() => (ruleType = 'range')}>A range</button>
        </div>
      </div>

      {#if ruleType === 'range'}
        <div class="field">
          <label for="rel-max-minutes">Up to (minutes)</label>
          <input id="rel-max-minutes" type="number" min="0" bind:value={maxMinutes} />
        </div>
      {/if}
    {/if}
  {/if}

  {#if error}<p class="error-text">{error}</p>{/if}

  <div class="field-row">
    <button class="btn btn-secondary" onclick={onCancel}>Cancel</button>
    <button class="btn btn-primary" disabled={saving} onclick={save}>Save medication</button>
  </div>
</div>
