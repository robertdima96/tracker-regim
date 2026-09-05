<script lang="ts">
  import { untrack } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan, InstructionSource } from '../domain/types'
  import type { StoredEventTemplate } from '../database/repositories/eventTemplateRepository'
  import { createMedication } from '../database/repositories/medicationRepository'
  import { createEventTemplate } from '../database/repositories/eventTemplateRepository'
  import { createConstraint } from '../database/repositories/constraintRepository'
  import { newId } from '../domain/id'
  import TimeField from '../components/TimeField.svelte'

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
  type RuleType = 'exact' | 'minimum' | 'range'
  type DoseDraft = {
    id: string
    timingType: TimingType
    fixedTime: string
    anchorId: string
    relation: 'before' | 'after'
    ruleType: RuleType
    minMinutes: number
    maxMinutes: number
  }

  function defaultAnchorId() {
    return anchors[0]?.id ?? ''
  }

  function newDoseDraft(): DoseDraft {
    return {
      id: newId(),
      timingType: 'relative',
      fixedTime: '08:00',
      anchorId: untrack(defaultAnchorId),
      relation: 'before',
      ruleType: 'minimum',
      minMinutes: 60,
      maxMinutes: 90,
    }
  }

  // One medication can have several doses per day, each on its own timing
  // rule (e.g. Gastrofait: before breakfast, before lunch, before dinner,
  // before bed — four different anchors, not one repeated rule). Each
  // confirmed dose becomes its own EventTemplate (+ RelativeConstraint if
  // relative) sharing the same underlying Medication.
  let doses = $state<DoseDraft[]>([])
  let showDoseForm = $state(false)
  let draft = $state<DoseDraft>(untrack(newDoseDraft))

  let saving = $state(false)
  let error = $state('')

  const instructionSources: Array<{ value: InstructionSource; label: string }> = [
    { value: 'clinician', label: 'Doctor' },
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'package', label: 'Package' },
    { value: 'user_routine', label: 'My routine' },
    { value: 'other', label: 'Other' },
  ]

  function anchorLabel(id: string): string {
    return anchors.find((a) => a.id === id)?.label ?? id
  }

  function doseSummary(d: DoseDraft): string {
    if (d.timingType === 'fixed') return `Fixed time ${d.fixedTime}`
    const rel = d.relation
    if (d.ruleType === 'exact') return `Exactly ${d.minMinutes} min ${rel} ${anchorLabel(d.anchorId)}`
    if (d.ruleType === 'range') return `${d.minMinutes}–${d.maxMinutes} min ${rel} ${anchorLabel(d.anchorId)}`
    return `At least ${d.minMinutes} min ${rel} ${anchorLabel(d.anchorId)}`
  }

  function startAddDose() {
    draft = newDoseDraft()
    showDoseForm = true
  }

  function confirmAddDose() {
    if (draft.timingType === 'relative' && !draft.anchorId) {
      error = 'Add a meal, wake, or bedtime anchor first (Meal & Routine Setup).'
      return
    }
    error = ''
    doses = [...doses, draft]
    showDoseForm = false
  }

  function removeDose(id: string) {
    doses = doses.filter((d) => d.id !== id)
  }

  async function save() {
    if (!displayName.trim()) {
      error = 'Give the medication a name.'
      return
    }
    if (doses.length === 0) {
      error = 'Add at least one dose.'
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

      for (const dose of doses) {
        const templateId = newId()
        await createEventTemplate(driver, {
          id: templateId,
          planId: plan.id,
          medicationId,
          kind: 'medication',
          label: displayName.trim(),
          recurrence: { type: 'daily' },
          fixedLocalTime: dose.timingType === 'fixed' ? dose.fixedTime : undefined,
          activeFrom: plan.startDate,
        })

        if (dose.timingType === 'relative') {
          const min = dose.ruleType === 'range' ? Math.min(dose.minMinutes, dose.maxMinutes) : dose.minMinutes
          const max = dose.ruleType === 'exact' ? min : dose.ruleType === 'range' ? Math.max(dose.minMinutes, dose.maxMinutes) : undefined
          await createConstraint(driver, {
            id: newId(),
            planId: plan.id,
            sourceTemplateId: templateId,
            targetTemplateId: dose.anchorId,
            relation: dose.relation,
            minOffsetMinutes: min,
            maxOffsetMinutes: max,
            hardness: 'hard',
            source: instructionSource,
            createdAt: new Date().toISOString(),
          })
        }
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
    <span>Doses per day</span>
    {#if doses.length > 0}
      <div class="card-list">
        {#each doses as dose (dose.id)}
          <div class="dose-row">
            <span>{doseSummary(dose)}</span>
            <button type="button" class="btn btn-danger" style="padding:4px 10px;" onclick={() => removeDose(dose.id)}>Remove</button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="muted">No doses added yet — add at least one below.</p>
    {/if}
  </div>

  {#if showDoseForm}
    <div class="card" style="gap: 12px;">
      <div class="field">
        <span>When should you take this dose?</span>
        <div class="chip-row">
          <button type="button" class="chip" class:selected={draft.timingType === 'fixed'} onclick={() => (draft.timingType = 'fixed')}>Fixed time</button>
          <button type="button" class="chip" class:selected={draft.timingType === 'relative'} onclick={() => (draft.timingType = 'relative')}>Relative to an event</button>
        </div>
      </div>

      {#if draft.timingType === 'fixed'}
        <TimeField id="dose-fixed-time" label="Time" bind:value={draft.fixedTime} />
      {:else if anchors.length === 0}
        <p class="error-text">No meal/wake/bedtime anchors yet — set those up in Meal &amp; Routine Setup first.</p>
      {:else}
        <div class="field-row">
          <div class="field">
            <label for="dose-minutes">Minutes</label>
            <input id="dose-minutes" type="number" min="0" bind:value={draft.minMinutes} />
          </div>
          <div class="field">
            <label for="dose-relation">Relation</label>
            <select id="dose-relation" bind:value={draft.relation}>
              <option value="before">before</option>
              <option value="after">after</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="dose-anchor">Event</label>
          <select id="dose-anchor" bind:value={draft.anchorId}>
            {#each anchors as a}
              <option value={a.id}>{a.label}</option>
            {/each}
          </select>
        </div>

        <div class="field">
          <span>How strict?</span>
          <div class="chip-row">
            <button type="button" class="chip" class:selected={draft.ruleType === 'exact'} onclick={() => (draft.ruleType = 'exact')}>Exactly</button>
            <button type="button" class="chip" class:selected={draft.ruleType === 'minimum'} onclick={() => (draft.ruleType = 'minimum')}>At least</button>
            <button type="button" class="chip" class:selected={draft.ruleType === 'range'} onclick={() => (draft.ruleType = 'range')}>A range</button>
          </div>
        </div>

        {#if draft.ruleType === 'range'}
          <div class="field">
            <label for="dose-max-minutes">Up to (minutes)</label>
            <input id="dose-max-minutes" type="number" min="0" bind:value={draft.maxMinutes} />
          </div>
        {/if}
      {/if}

      <div class="field-row">
        <button class="btn btn-secondary" onclick={() => (showDoseForm = false)}>Cancel</button>
        <button class="btn btn-primary" onclick={confirmAddDose}>Add this dose</button>
      </div>
    </div>
  {:else}
    <button class="btn btn-secondary" onclick={startAddDose}>+ Add dose</button>
  {/if}

  {#if error}<p class="error-text">{error}</p>{/if}

  <div class="field-row">
    <button class="btn btn-secondary" onclick={onCancel}>Cancel</button>
    <button class="btn btn-primary" disabled={saving} onclick={save}>Save medication</button>
  </div>
</div>
