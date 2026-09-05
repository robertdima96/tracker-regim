<script lang="ts">
  let { id, label, value = $bindable() }: { id: string; label: string; value: string } = $props()

  function adjust(deltaMinutes: number) {
    const [h, m] = value.split(':').map(Number)
    const total = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440
    value = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }
</script>

<div class="field">
  <label for={id}>{label}</label>
  <div class="time-field-row">
    <button type="button" class="time-step" onclick={() => adjust(-15)} aria-label="15 minutes earlier">−15</button>
    <input {id} type="time" bind:value />
    <button type="button" class="time-step" onclick={() => adjust(15)} aria-label="15 minutes later">+15</button>
  </div>
</div>
