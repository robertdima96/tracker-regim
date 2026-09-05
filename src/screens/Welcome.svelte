<script lang="ts">
  let { onGetStarted }: { onGetStarted: () => void } = $props()
</script>

<div class="screen" style="justify-content: center; text-align: center; align-items: center;">
  <h1>DoseFlow</h1>
  <p class="muted">
    Add the treatment instructions you already have. DoseFlow turns them into a live daily schedule
    that adapts when linked events change.
  </p>
  <button class="btn btn-primary" style="width: 100%;" onclick={onGetStarted}>Get started</button>
  <p class="muted">No account required.</p>
</div>
