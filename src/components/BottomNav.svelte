<script lang="ts">
  let {
    active,
    onToday,
    onPlan,
    onHistory,
    onYou,
  }: {
    active: 'today' | 'plan' | 'history' | 'you'
    onToday: () => void
    onPlan: () => void
    onHistory: () => void
    onYou: () => void
  } = $props()
</script>

<nav class="bottom-nav">
  <button class:active={active === 'today'} onclick={onToday}>Today</button>
  <button class:active={active === 'plan'} onclick={onPlan}>Plan</button>
  <button class:active={active === 'history'} onclick={onHistory}>History</button>
  <button class:active={active === 'you'} onclick={onYou}>You</button>
</nav>
