<script lang="ts">
  import { onMount } from 'svelte'
  import { createCapacitorSqliteDriver } from './database/drivers/capacitorSqliteDriver'
  import { getWizardState, type WizardState } from './app/planService'
  import type { TreatmentPlan } from './domain/types'
  import Welcome from './screens/Welcome.svelte'
  import CreatePlan from './screens/CreatePlan.svelte'
  import MealSetup from './screens/MealSetup.svelte'
  import MedicationList from './screens/MedicationList.svelte'
  import PlanReview from './screens/PlanReview.svelte'
  import Today from './screens/Today.svelte'
  import PlanHub from './screens/PlanHub.svelte'

  const driver = createCapacitorSqliteDriver()

  // getWizardState only runs once, on load, to resume wherever a draft
  // plan was left off. After that, navigation is explicit (goTo) so the
  // user can go back to an earlier step without the data-derived state
  // machine immediately bouncing them forward again because the data for
  // later steps already exists.
  type Screen =
    | WizardState
    | { screen: 'createPlan' }
    | { screen: 'loading' }
    | { screen: 'planHub'; plan: TreatmentPlan }
    | { screen: 'editMealSetup'; plan: TreatmentPlan }
    | { screen: 'editMedications'; plan: TreatmentPlan }
  let state = $state<Screen>({ screen: 'loading' })

  onMount(async () => {
    state = await getWizardState(driver)
  })

  function goTo(next: Screen) {
    state = next
  }
</script>

{#if state.screen === 'loading'}
  <div id="placeholder"><p>Loading…</p></div>
{:else if state.screen === 'welcome'}
  <Welcome onGetStarted={() => goTo({ screen: 'createPlan' })} />
{:else if state.screen === 'createPlan'}
  <CreatePlan {driver} onCreated={(plan) => goTo({ screen: 'mealSetup', plan })} />
{:else if state.screen === 'mealSetup'}
  {@const plan = state.plan}
  <MealSetup {driver} {plan} onDone={() => goTo({ screen: 'medicationList', plan })} />
{:else if state.screen === 'medicationList'}
  {@const plan = state.plan}
  <MedicationList
    {driver}
    {plan}
    onDone={() => goTo({ screen: 'planReview', plan })}
    onBack={() => goTo({ screen: 'mealSetup', plan })}
  />
{:else if state.screen === 'planReview'}
  {@const plan = state.plan}
  <PlanReview
    {driver}
    {plan}
    onActivated={(activated) => goTo({ screen: 'today', plan: activated })}
    onBack={() => goTo({ screen: 'medicationList', plan })}
  />
{:else if state.screen === 'today'}
  {@const plan = state.plan}
  <Today {driver} {plan} onOpenPlan={() => goTo({ screen: 'planHub', plan })} />
{:else if state.screen === 'planHub'}
  {@const plan = state.plan}
  <PlanHub
    {plan}
    onEditMeals={() => goTo({ screen: 'editMealSetup', plan })}
    onEditMedications={() => goTo({ screen: 'editMedications', plan })}
    onBack={() => goTo({ screen: 'today', plan })}
  />
{:else if state.screen === 'editMealSetup'}
  {@const plan = state.plan}
  <MealSetup {driver} {plan} onDone={() => goTo({ screen: 'planHub', plan })} onBack={() => goTo({ screen: 'planHub', plan })} continueLabel="Done" />
{:else if state.screen === 'editMedications'}
  {@const plan = state.plan}
  <MedicationList
    {driver}
    {plan}
    onDone={() => goTo({ screen: 'planHub', plan })}
    onBack={() => goTo({ screen: 'planHub', plan })}
    continueLabel="Done"
    requireAtLeastOne={false}
  />
{/if}
