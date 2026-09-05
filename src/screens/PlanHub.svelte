<script lang="ts">
  import type { TreatmentPlan } from '../domain/types'

  let {
    plan,
    onEditMeals,
    onEditMedications,
    onBack,
  }: {
    plan: TreatmentPlan
    onEditMeals: () => void
    onEditMedications: () => void
    onBack: () => void
  } = $props()
</script>

<div class="screen">
  <div class="screen-header">
    <button class="back-btn" onclick={onBack} aria-label="Back to Today">←</button>
    <div>
      <h1>Your plan</h1>
      <p class="screen-subtitle" style="margin-top: 2px;">{plan.name}</p>
    </div>
  </div>

  <button class="card card-button" onclick={onEditMeals}>
    <span class="event-label">Meals &amp; routine</span>
    <span class="muted">Breakfast, lunch, dinner, wake and bedtime windows</span>
  </button>

  <button class="card card-button" onclick={onEditMedications}>
    <span class="event-label">Medications</span>
    <span class="muted">Add, review, or adjust doses and timing rules</span>
  </button>
</div>
