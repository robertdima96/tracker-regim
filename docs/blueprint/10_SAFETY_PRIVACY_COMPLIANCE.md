# Safety, Privacy & Compliance

> This file is a product risk framework, not legal or regulatory advice.

## 1. Safety posture

DoseFlow should initially be positioned as software that:

- records treatment instructions entered by the user;
- organizes them;
- calculates schedule times from those instructions;
- reminds the user;
- logs user actions.

It should avoid claims that it:

- diagnoses;
- recommends treatment;
- optimizes therapy;
- determines safe dose changes;
- determines missed-dose recovery;
- interprets contraindications.

## 2. Why wording matters

In the EU, software qualification/classification under medical-device rules depends heavily on **intended purpose**, including how the manufacturer describes and promotes the software.

Therefore:
- product copy;
- App Store description;
- website;
- onboarding;
- feature behavior;

all matter.

Do not rely on a disclaimer to undo medical claims elsewhere.

## 3. Regulatory review trigger

Before public commercial launch in the EU, obtain qualified regulatory advice specifically on:
- MDR qualification;
- Rule 11 implications if applicable;
- intended-purpose wording;
- whether dynamic schedule computation changes classification;
- obligations if the app moves from reminder/organization into treatment recommendation;
- clinical evidence requirements if it qualifies as MDSW.

Key reference:
MDCG 2019-11 rev.1 (June 2025).

## 4. Safety boundary matrix

| User asks / event | App may do | App should not do |
|---|---|---|
| “I took this at 08:17” | log time, recalc configured dependencies | decide new dose amount |
| “When can I eat?” | derive from user-configured timing rules | claim medical safety beyond those rules |
| Missed dose | log skip, show configured missed-dose instruction if explicitly provided | invent “take double” / “take now” |
| Conflict | show conflicting rules | choose which treatment instruction to ignore |
| Drug interaction question | link to appropriate external professional guidance / future vetted tool | generate interaction advice from scheduler |
| User changes doctor instruction | record change and source | validate that the instruction is medically correct |

## 5. Source hierarchy

Do not automatically encode a clinical truth hierarchy.

Instead store source and show it.

Possible source:
- clinician;
- pharmacist;
- official medication information;
- user-established routine;
- other.

If two sources conflict, the app should not decide medically which is correct.

## 6. “Standard information” feature

If added later:
- use licensed/authoritative data;
- show jurisdiction;
- version/date;
- source;
- never silently overwrite user-entered instructions.

## 7. Missed-dose design

Default product behavior:

> “This dose was marked as skipped. DoseFlow will not determine a replacement dose unless explicit instructions have been configured.”

If user has configured:

> “If missed by <2h, take when remembered”

that is still sensitive. Decide with regulatory/legal advice whether executing conditional missed-dose instructions entered by user changes risk profile.

For MVP, exclude conditional clinical recovery rules.

## 8. Safety incident classes

### S0 — normal product bug
Visual issue with no schedule consequence.

### S1 — schedule display defect
Incorrect time shown but no notification delivered yet.

### S2 — reminder defect
Reminder at wrong time / duplicate / missing.

### S3 — potential harmful schedule behavior
System violates or appears to violate a configured hard treatment rule.

### S4 — confirmed user harm
Requires immediate escalation, preservation of records, legal/regulatory response.

Final taxonomy should be reviewed professionally.

## 9. Safety case / hazard log

Maintain a living hazard register.

Example hazards:

| Hazard | Cause | Mitigation |
|---|---|---|
| Wrong reminder time | DST bug | timezone test suite, engine versioning |
| Duplicate administration | duplicate notification / caregiver race | unique event IDs, idempotent actions |
| User believes meal is medically safe | copy overclaims | “based on configured rule” language |
| Wrong schedule after edited actual time | stale notifications | atomic recalculation + notification diff |
| Silent failure of reminders | permission revoked | health status, visible warning |
| Rule mis-entry | confusing onboarding | previews, confirmation, source display |

## 10. Privacy classification

Medication schedules and adherence history are highly sensitive personal data.

Treat privacy as a product feature.

### Default principles

- collect minimum necessary;
- local-first;
- no raw medication names in analytics;
- no ad-tech SDKs touching health data;
- no sale of health data;
- transparent privacy policy;
- account optional where possible.

## 11. GDPR workstreams

Before launch:
- identify controller/processor roles;
- data inventory;
- lawful basis;
- special-category data analysis;
- consent where required;
- privacy notice;
- data subject rights;
- deletion/export;
- retention;
- processor agreements;
- cross-border transfer assessment;
- breach response.

A DPIA may be appropriate depending on scale and processing; obtain privacy counsel/DPO advice.

## 12. Data minimization

Analytics should prefer:
- count of active rules;
- rule categories;
- schedule change count;
- anonymous app performance.

Avoid:
- drug name;
- diagnosis;
- free text;
- doctor name;
- detailed notes.

## 13. Cloud encryption

If cloud sync is introduced:

Ideal product direction:
- encrypt health payloads client-side where practical;
- server metadata minimized;
- separate authentication identity from treatment payload.

True end-to-end encryption complicates caregiver sharing and recovery; design deliberately.

## 14. Accountless mode

Advantages:
- lower privacy exposure;
- lower onboarding friction;
- easier MVP;
- core app still works during outages.

Trade-off:
- backup/device loss.

Offer explicit local export before cloud account exists.

## 15. Third-party SDK review

Every SDK must be reviewed for:
- data collected;
- advertising ID;
- device fingerprint;
- health-data clauses;
- sub-processors;
- retention;
- regional transfer.

Avoid casual “free analytics” SDK proliferation.

## 16. Security basics

- dependency scanning;
- secure key storage;
- least privilege;
- no secrets in app binary;
- signed builds;
- secure update channel;
- lockscreen privacy option;
- optional app lock later;
- sanitized logs;
- incident response.

## 17. Lock-screen privacy

Notification content modes:

- Full: “Take Gastrofait”
- Private: “Medication reminder”
- Hidden: generic alert

User chooses.

## 18. Export

Future PDF/CSV exports may contain sensitive medical data.

Requirements:
- explicit action;
- clear warning;
- no automatic email;
- temporary files cleaned where feasible.

## 19. Marketing safety

Avoid claims such as:
- “prevents medication errors”;
- “guarantees safe timing”;
- “optimizes your treatment”;
- “doctor in your pocket”.

Prefer:
- “organizes the instructions you enter”;
- “keeps linked schedule events updated”;
- “helps you track what comes next.”

## 20. Pre-launch checklist

- regulatory review;
- privacy review;
- terms;
- privacy policy;
- App Store health-data disclosures;
- Google Play health-data declarations/policies;
- support process;
- incident escalation contact;
- hazard log;
- security review;
- notification reliability testing.

## 21. References

- EU MDCG software guidance: https://health.ec.europa.eu/latest-updates/update-mdcg-2019-11-rev1-qualification-and-classification-software-regulation-eu-2017745-and-2025-06-17_en
- MDCG 2019-11 rev.1 document: https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf
