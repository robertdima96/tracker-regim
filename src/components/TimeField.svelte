<script lang="ts">
  // A fully custom time picker — not <input type="time">, which has real,
  // unfixable UX problems: the numeric text and the picker icon are two
  // separate click targets (clicking the number lets you type/scrub it,
  // only the tiny icon opens the actual picker), there's no visual cue
  // that the icon does something different, the rendered value can get
  // truncated (AM/PM clipped) depending on the input's width, and the
  // picker UI itself is native browser chrome with zero styling control
  // and wildly inconsistent quality across browsers/OSes.
  //
  // Three plain <select> elements sidestep all of that: each one opens
  // its dropdown on a single click anywhere on it (no dual interaction
  // modes), the selected value is always shown in full (no truncation —
  // widths are explicit and generous), and the picker itself is the
  // platform's native <select> UI, which is well-tested and accessible
  // without any styling work from us.
  let { id, label, value = $bindable() }: { id: string; label: string; value: string } = $props()

  type Meridiem = 'AM' | 'PM'

  function parse(v: string): { hour12: number; minute: number; meridiem: Meridiem } {
    const [h24, m] = v.split(':').map(Number)
    const meridiem: Meridiem = h24 >= 12 ? 'PM' : 'AM'
    const hour12 = h24 % 12 === 0 ? 12 : h24 % 12
    return { hour12, minute: m, meridiem }
  }

  function toValue(hour12: number, minute: number, meridiem: Meridiem): string {
    const h24 = meridiem === 'PM' ? (hour12 % 12) + 12 : hour12 % 12
    return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  const parsed = $derived(parse(value))

  function setHour(e: Event) {
    value = toValue(Number((e.currentTarget as HTMLSelectElement).value), parsed.minute, parsed.meridiem)
  }
  function setMinute(e: Event) {
    value = toValue(parsed.hour12, Number((e.currentTarget as HTMLSelectElement).value), parsed.meridiem)
  }
  function setMeridiem(e: Event) {
    value = toValue(parsed.hour12, parsed.minute, (e.currentTarget as HTMLSelectElement).value as Meridiem)
  }

  function adjust(deltaMinutes: number) {
    const [h, m] = value.split(':').map(Number)
    const total = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440
    value = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 60 }, (_, i) => i)
</script>

<div class="field time-field">
  <label for="{id}-hour">{label}</label>
  <div class="time-field-row">
    <button type="button" class="time-step" onclick={() => adjust(-15)} aria-label="15 minutes earlier">−15</button>
    <div class="time-picker">
      <select id="{id}-hour" class="time-select" value={parsed.hour12} onchange={setHour} aria-label="Hour">
        {#each hours as h}<option value={h}>{h}</option>{/each}
      </select>
      <span class="time-colon">:</span>
      <select class="time-select" value={parsed.minute} onchange={setMinute} aria-label="Minute">
        {#each minutes as m}<option value={m}>{String(m).padStart(2, '0')}</option>{/each}
      </select>
      <select class="time-select time-meridiem" value={parsed.meridiem} onchange={setMeridiem} aria-label="AM or PM">
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
    <button type="button" class="time-step" onclick={() => adjust(15)} aria-label="15 minutes later">+15</button>
  </div>
</div>
