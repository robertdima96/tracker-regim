<script lang="ts">
  import { onMount } from 'svelte'
  import { createCapacitorSqliteDriver } from './database/drivers/capacitorSqliteDriver'
  import { getWizardState, type WizardState } from './app/planService'
  import Welcome from './screens/Welcome.svelte'
  import CreatePlan from './screens/CreatePlan.svelte'
  import MealSetup from './screens/MealSetup.svelte'
  import MedicationList from './screens/MedicationList.svelte'
  import PlanReview from './screens/PlanReview.svelte'
  import Today from './screens/Today.svelte'

  const driver = createCapacitorSqliteDriver()

  type Screen = WizardState | { screen: 'createPlan' } | { screen: 'loading' }
  let state = $state<Screen>({ screen: 'loading' })

  async function refresh() {
    state = await getWizardState(driver)
  }

  onMount(refresh)
</script>

{#if state.screen === 'loading'}
  <div id="placeholder"><p>Loading…</p></div>
{:else if state.screen === 'welcome'}
  <Welcome onGetStarted={() => (state = { screen: 'createPlan' })} />
{:else if state.screen === 'createPlan'}
  <CreatePlan {driver} onCreated={refresh} />
{:else if state.screen === 'mealSetup'}
  <MealSetup {driver} plan={state.plan} onDone={refresh} />
{:else if state.screen === 'medicationList'}
  <MedicationList {driver} plan={state.plan} onDone={refresh} />
{:else if state.screen === 'planReview'}
  <PlanReview {driver} plan={state.plan} onActivated={refresh} />
{:else if state.screen === 'today'}
  <Today {driver} plan={state.plan} />
{/if}
