# Support & Operations

## 1. Support philosophy

Users may contact support because:
- UI is confusing;
- notifications failed;
- schedule looks wrong;
- they need medical advice.

These categories must be separated.

## 2. Support categories

### A. Account/billing
Later.

### B. Setup
“How do I configure 30 minutes before dinner?”

### C. Notification
“Alarm did not fire.”

### D. Scheduling
“The time shown is not what I expected.”

### E. Data
“History is missing.”

### F. Feature request

### G. Medical question
“Should I take another pill?”

### H. Safety incident
“App told me X and I was harmed / nearly harmed.”

## 3. Medical support boundary

Support must not answer treatment questions as a clinician.

Template direction:

> DoseFlow support can help explain how the app interpreted the schedule you configured, but we cannot advise how you should take or change medication. Please confirm treatment questions with your doctor or pharmacist.

## 4. Scheduling issue intake

In-app:
**Report schedule problem**

Collect:
- affected event;
- expected behavior in user’s words;
- actual behavior;
- consent to include sanitized plan graph;
- app version;
- engine version;
- timezone;
- OS.

Optional:
- screenshot.

## 5. Diagnostic bundle

Generate locally:
- rule IDs/types;
- times;
- event states;
- schedule revisions;
- notification state;
- app/OS version.

Allow user to review before send if sensitive details included.

## 6. Support severity

### P4 — question
General how-to.

### P3 — product defect
Non-critical bug.

### P2 — reminder/schedule defect
Potential adherence impact.

### P1 — safety-sensitive incident
Potential harmful behavior.

Final SLA requires actual team capacity.

## 7. Incident process

For P1:

1. acknowledge;
2. preserve relevant logs/data with permission/legal basis;
3. stop speculative support responses;
4. engineering triage;
5. product/safety lead;
6. legal/regulatory review where required;
7. determine affected versions;
8. feature flag/rollback if possible;
9. user communication;
10. postmortem.

## 8. Status communication

If a broad reminder outage/bug occurs:
- in-app banner;
- status page later;
- release notes;
- direct communication if users are materially affected and legally appropriate.

Do not hide safety-relevant defects.

## 9. Knowledge base

Initial articles:
- Add medication
- Before/after meal rules
- What “Taken now” changes
- Difference between snooze and taken
- Why a meal time changed
- Schedule conflicts
- Notifications not working
- Android precise alarm permission
- Changing timezone
- Editing history
- Deleting a plan
- Privacy
- What DoseFlow cannot advise

## 10. Feedback loop

Every support issue tagged:
- feature;
- confusion;
- defect;
- scheduling;
- notification;
- safety.

Weekly review:
- top confusion;
- repeated rule request;
- bug trend;
- high-risk incidents.

## 11. Release operations

### Internal
Founder device(s).

### Alpha
Small testers.

### Beta
TestFlight / Play closed testing.

### Production
Staged rollout.

Recommended:
- 5%;
- 25%;
- 50%;
- 100%;

where store tooling allows, especially after scheduling-engine changes.

## 12. Rollback

Mobile rollback is slower than web.

Mitigations:
- feature flags;
- engine-version flags;
- disable newly introduced rule type remotely if backend exists;
- conservative staged release.

Never make core schedule depend on remote config availability.

## 13. Changelog

For every scheduler change:
- describe behavior;
- list affected rule types;
- link tests;
- increment engine version if semantics changed.

## 14. Postmortem template

- incident;
- date;
- severity;
- affected versions;
- user impact;
- detection;
- root cause;
- why tests missed it;
- containment;
- correction;
- prevention;
- regulatory/legal follow-up.

## 15. Support scaling

### 0–500 users
Founder handles support.

### 500–5k
Structured help center + tagging.

### 5k+
Dedicated support capacity depending on ticket volume.

If schedule complexity drives tickets, improving product explanation is often cheaper and safer than adding agents.

## 16. Operational metrics

- tickets / 100 active users;
- scheduling tickets;
- notification tickets;
- first response;
- resolution;
- reopened;
- P1/P2 count;
- bug escape rate;
- top issue category.

## 17. Trust

Support tone should be:
- factual;
- fast;
- transparent;
- non-defensive.

If the app is wrong, say it is wrong.
