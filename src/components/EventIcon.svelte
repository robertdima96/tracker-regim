<script lang="ts">
  let { kind }: { kind: 'medication' | 'meal' | 'wake' | 'sleep' | 'custom' } = $props()

  const emoji: Record<typeof kind, string> = {
    medication: '💊',
    meal: '🍽️',
    wake: '☀️',
    sleep: '🌙',
    custom: '⏰',
  }
</script>

<span class="event-icon event-icon-{kind}">{emoji[kind]}</span>
