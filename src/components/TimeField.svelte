<script lang="ts">
  // Wraps Ionic's <ion-datetime> (a real, well-tested native-style wheel
  // picker) instead of hand-rolled <select> elements or <input type="time">.
  // The whole pill is one click target that opens the wheel inline — no
  // separate icon to discover, and the wheel always shows hour/minute/AM-PM
  // in full since it's Ionic's own layout, not something we're squeezing
  // into custom CSS.
  let { id, label, value = $bindable() }: { id: string; label: string; value: string } = $props()

  let expanded = $state(false)
  let datetimeEl: HTMLElement | undefined = $state()

  // ion-datetime wants an ISO datetime string even in time-only
  // presentation; the date part is irrelevant and fixed here so only the
  // time-of-day round-trips.
  const ionValue = $derived(`2000-01-01T${value}:00`)

  function formatDisplay(v: string): string {
    const [h24, m] = v.split(':').map(Number)
    const meridiem = h24 >= 12 ? 'PM' : 'AM'
    const hour12 = h24 % 12 === 0 ? 12 : h24 % 12
    return `${hour12}:${String(m).padStart(2, '0')} ${meridiem}`
  }

  function adjust(deltaMinutes: number) {
    const [h, m] = value.split(':').map(Number)
    const total = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440
    value = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  $effect(() => {
    const el = datetimeEl
    if (!el) return
    const handler = (e: Event) => {
      const detailValue = (e as CustomEvent).detail?.value as string | undefined
      if (!detailValue) return
      value = detailValue.slice(11, 16)
    }
    el.addEventListener('ionChange', handler)
    return () => el.removeEventListener('ionChange', handler)
  })
</script>

<div class="field time-field">
  <label for="{id}-pill">{label}</label>
  <div class="time-field-row">
    <button type="button" class="time-step" onclick={() => adjust(-15)} aria-label="15 minutes earlier">−15</button>
    <button id="{id}-pill" type="button" class="time-pill" aria-expanded={expanded} onclick={() => (expanded = !expanded)}>
      {formatDisplay(value)}
    </button>
    <button type="button" class="time-step" onclick={() => adjust(15)} aria-label="15 minutes later">+15</button>
  </div>
  {#if expanded}
    <div class="time-wheel">
      <ion-datetime bind:this={datetimeEl} presentation="time" hourCycle="h12" value={ionValue}></ion-datetime>
      <button type="button" class="btn btn-secondary time-done" onclick={() => (expanded = false)}>Done</button>
    </div>
  {/if}
</div>
