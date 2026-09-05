# Analytics, Metrics & Experiments

## 1. Measurement philosophy

Do not optimize for:
- downloads;
- notification count;
- raw daily opens.

Optimize for:
- users successfully executing treatment plans;
- reduced scheduling friction;
- trusted use of dynamic features.

## 2. North Star candidate

**Successful Treatment Days**

Definition candidate:

A day on which:
- active treatment schedule was generated;
- user handled all required events or explicitly resolved them;
- no unresolved schedule conflict remained.

Do not equate “successful” with perfect adherence if that becomes judgmental or clinically misleading. The metric is a product metric, not a medical outcome.

## 3. Activation metric

Candidate activation:

> User creates an active plan with at least one dependency rule and logs one administration that triggers a recalculation.

This captures the unique product value better than “added first medication.”

## 4. Funnel

```text
Install
→ Start onboarding
→ Create plan
→ Add first medication
→ Add dependency rule
→ Activate plan
→ Receive first reminder
→ Log first dose
→ Experience first recalculation
→ Return next day
→ Complete week
```

## 5. Retention cohorts

Segment by:
- plan complexity;
- treatment duration;
- rule type;
- temporary vs chronic;
- accountless vs synced later.

Important:
A 7-day antibiotic user naturally churns after treatment. “Churn” may equal success.

Therefore also measure:
- plan completion;
- reuse on second plan;
- recommendation/referral.

## 6. Feature metrics

### Dynamic recalculation
- recalculations/user/week;
- events affected per recalculation;
- percent accepted without manual edit.

### When can I eat?
- opens;
- answer-to-action conversion;
- repeat usage.

### Reverse scheduling
- desired meal requests;
- apply rate;
- conflict rate.

### Explanations
- “Why?” opens;
- support tickets after explanation;
- confusion survey.

## 7. Reliability metrics

- notification scheduling errors;
- duplicate reminders;
- missed expected reminder diagnostics;
- schedule conflicts;
- engine exceptions;
- crash-free sessions.

These may be more important than growth metrics during beta.

## 8. Safe analytics taxonomy

Example events:

```text
onboarding_started
plan_created
medication_added
rule_added
plan_activated
dose_logged
dose_skipped
meal_moved
schedule_recalculated
schedule_conflict_shown
schedule_explanation_opened
notification_permission_changed
notification_scheduling_failed
```

Properties:
- rule type;
- count bucket;
- affected count;
- platform;
- app version;
- engine version.

Avoid raw medication names.

## 9. Analytics privacy

Do not use generic automatic screen/session capture tools without health-data review.

Disable:
- keystroke capture;
- free-text capture;
- medication-name capture;
- screenshots/session replay on sensitive screens.

Prefer purpose-built explicit events.

## 10. Product experiments

### EXP-01 Positioning
A:
“Stop doing medication math.”

B:
“Your treatment schedule adapts to your day.”

Measure:
- landing conversion;
- comprehension.

### EXP-02 Onboarding
A:
configure full treatment first.

B:
add one medication → preview value → continue.

Measure:
- completion;
- time-to-activation.

### EXP-03 Today hierarchy
A:
timeline first.

B:
next-action card first.

Measure:
- task completion;
- error rate;
- qualitative preference.

### EXP-04 Explanation
A:
automatic small explanation after schedule change.

B:
only “Why?” link.

Measure:
- perceived trust;
- clutter;
- support questions.

### EXP-05 Meal CTA
A:
“When can I eat?”

B:
“Plan my next meal.”

Measure comprehension.

## 11. Research metrics

At beta:
- SUS or equivalent usability score;
- “How disappointed would you be if this disappeared?”;
- self-reported manual calculation before/after;
- trust rating;
- perceived schedule correctness.

## 12. Guardrail metrics

Never optimize engagement in a way that encourages compulsive checking.

Guardrails:
- notification dismiss rate;
- notification disabling;
- perceived annoyance;
- incorrect-plan report rate;
- support safety incidents.

## 13. Dashboard

### Product
- active treatment plans;
- activated users;
- dynamic-feature usage;
- plan completion.

### Reliability
- engine errors;
- notification failures;
- conflicts;
- crash-free.

### Growth
- installs;
- activation;
- referral;
- organic keyword acquisition.

### Commercial later
- free→paid;
- trial conversion;
- monthly/annual churn;
- revenue per active treatment user.

## 14. Decision gates

### Continue MVP
Users understand and repeatedly use dynamic schedule.

### Iterate UX
Value is high after setup but setup abandonment is high.

### Pivot positioning
Users use reminders but not dynamic constraints.

### Stop/pause
Complex-plan users consistently prefer manual routines and do not trust recalculation despite correctness.
