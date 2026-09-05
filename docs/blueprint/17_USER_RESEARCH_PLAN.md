# User Research Plan

## 1. Research goals

Validate:

1. Is medication timing math a repeated pain?
2. Which users feel it most?
3. What workarounds exist?
4. Do users trust dynamic recalculation?
5. Can users configure rules correctly?
6. Which language is understandable?
7. What would users pay for?

## 2. Interview sample

First wave:
12–20 people.

Quota suggestion:
- 5 temporary complex treatment;
- 5 chronic multi-medication;
- 3 irregular schedule;
- 2 caregiver;
- 2 simpler reminder users as contrast.

## 3. Screener

Questions:
1. How many medications/supplements do you currently take?
2. How many times per day?
3. Are any tied to meals?
4. Are any separated from another medication?
5. Do your meal/wake times change?
6. What do you use to remember?
7. Have you manually calculated medication times in the past month?
8. Would you be willing to show your current reminder setup with private details hidden?

## 4. Interview rule

Do not pitch the product in the first half.

Ask about actual behavior.

Avoid:
> “Would a smart scheduler be useful?”

Prefer:
> “Tell me about the last time your medication schedule got complicated.”

## 5. Interview script

### Context
- Walk me through yesterday.
- What did you take?
- How did you know when?
- Where are the instructions stored?

### Last incident
- When did you last take something later than planned?
- What did you do next?
- Did any meal or later dose change?
- How did you calculate it?

### Workaround
- Show me alarms/notes if comfortable.
- What is annoying about them?
- What happens if you miss one?

### Trust
- Would you let an app move later reminders automatically?
- What would you need to see before trusting it?
- Would you want an explanation every time?

### Money
- Do you pay for any health/productivity apps?
- Which DoseFlow-like capabilities feel worth paying for?

## 6. Prototype tasks

### Task 1
Add a medication 60m before breakfast.

Measure:
- completion;
- errors;
- questions.

### Task 2
Add another 20–30m before breakfast.

### Task 3
Interpret timeline.

Ask:
> When can you eat?

### Task 4
Log first medication 17m late.

Ask:
> What changed?

### Task 5
Set desired dinner time.

### Task 6
Resolve a conflict.

## 7. Comprehension tests

Copy:
> “Earliest breakfast: 09:17”

Ask:
“What does this sentence mean?”

Copy:
> “Based on your configured timing rule…”

Ask:
“Does this sound like medical advice?”

## 8. Research artifacts

For each participant:
- persona/segment;
- treatment complexity;
- workaround;
- top pain;
- trust concern;
- setup difficulty;
- desired feature;
- willingness to pay;
- quote;
- severity.

## 9. Synthesis

Create opportunity map:

```text
Problem
  → Frequency
  → Severity
  → Current workaround
  → Satisfaction
  → Product opportunity
```

Example:
“Late dose makes meal timing unclear”
- frequency: weekly;
- severity: high;
- workaround: calculator;
- satisfaction: low;
- opportunity: high.

## 10. Beta diary study

For 2 weeks, ask beta users to log:
- moments app helped;
- moments app was ignored;
- moments they manually checked timing;
- incorrect/untrusted output;
- notification annoyance.

Weekly 15-minute interview.

## 11. Trust metric

Ask after schedule change:

> “How confident are you that you understand why the new time changed?”

1–5.

And:

> “Did you independently recalculate the time?”

The second may be one of the strongest dogfood metrics.

## 12. Research repository

Store:
- consent;
- anonymized notes;
- findings;
- clips only if permitted;
- issue links;
- feature hypotheses.

Do not store more health detail than research requires.

## 13. Stop conditions

Reconsider product if:
- target users rarely have dependency rules;
- manual math is low pain;
- dynamic changes reduce rather than increase trust;
- setup complexity outweighs ongoing benefit.

## 14. Strong validation signal

Multiple users independently say a version of:

> “I currently do this with alarms + calculator/notes and would rather the app figure it out.”

Behavioral usage must then confirm it.
