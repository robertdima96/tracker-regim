<script lang="ts">
  import { onMount } from 'svelte'
  import type { SqlDriver } from '../database/driver'
  import type { TreatmentPlan } from '../domain/types'
  import { listHistoryForPlan, type HistoryEntry } from '../database/repositories/administrationRepository'
  import { addDaysToLocalDate, minutesToLocalTime, todayLocalDate } from '../scheduler/time'
  import EventIcon from '../components/EventIcon.svelte'

  let { driver, plan }: { driver: SqlDriver; plan: TreatmentPlan } = $props()

  let entries = $state<HistoryEntry[]>([])
  let loading = $state(true)

  onMount(async () => {
    const since = addDaysToLocalDate(todayLocalDate(plan.timezone), -13)
    entries = await listHistoryForPlan(driver, plan.id, since)
    loading = false
  })

  const byDate = $derived.by(() => {
    const groups = new Map<string, HistoryEntry[]>()
    for (const e of entries) {
      const group = groups.get(e.date) ?? []
      group.push(e)
      groups.set(e.date, group)
    }
    return [...groups.entries()]
  })

  function statusLabel(e: HistoryEntry): string {
    if (e.actualAt) return `Taken at ${minutesToLocalTime(e.actualAt, plan.timezone)}`
    if (e.status === 'skipped') return 'Skipped'
    return `Planned ${minutesToLocalTime(e.plannedEarliest, plan.timezone)}`
  }
</script>

<div class="screen screen-with-nav">
  <h1>History</h1>
  <p class="screen-subtitle">Last two weeks</p>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else if byDate.length === 0}
    <p class="muted">Nothing logged yet.</p>
  {:else}
    {#each byDate as [date, dayEntries] (date)}
      <div>
        <p class="muted" style="font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.04em;">{date}</p>
        <div class="card-list">
          {#each dayEntries as entry}
            <div class="card row">
              <div class="event-row">
                <EventIcon kind={entry.kind} />
                <span class="event-label">{entry.label}</span>
              </div>
              <span class="muted">{statusLabel(entry)}</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
