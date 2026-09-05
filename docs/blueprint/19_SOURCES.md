# External Sources & Research References

**Research snapshot:** 2026-09-04

These sources support competitor, platform, and regulatory research. Product decisions in the other documents remain hypotheses until validated.

## Competitors

### Medisafe
- Company/careers page with public platform metrics:
  https://medisafe.com/company/careers

Publicly states 13M+ patients and users across 190+ countries at the time of research.

### Pillo
- Google Play:
  https://play.google.com/store/apps/details?id=xyz.rtrvr.pillo

At the time of research the listing showed 500K+ downloads and described:
- persistent medication alarms;
- medication history;
- refill tracking;
- caregiver alerts;
- meal status;
- snooze until after meal;
- flexible schedules;
- tapering;
- health tracking.

### Doz
- Official site:
  https://getdoz.app/

At the time of research it described:
- medication tied to meal time;
- moving dinner moves linked medication;
- cycles;
- timezone behavior;
- refill reminders;
- offline use;
- iCloud sync;
- Critical Alerts.

## Android platform

### Schedule alarms
https://developer.android.com/develop/background-work/services/alarms

### Android 14 exact-alarm permission changes
https://developer.android.com/about/versions/14/changes/schedule-exact-alarms

### AlarmManager API
https://developer.android.com/reference/android/app/AlarmManager.html

Key engineering implication:
Exact alarms on modern Android have permission/policy constraints and must be designed deliberately.

## Apple platform

### Critical Alerts entitlement
https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.usernotifications.critical-alerts

Key implication:
Critical Alerts require the relevant entitlement/request and should not be assumed available to the MVP.

## EU medical-device software guidance

### MDCG 2019-11 rev.1 update page
https://health.ec.europa.eu/latest-updates/update-mdcg-2019-11-rev1-qualification-and-classification-software-regulation-eu-2017745-and-2025-06-17_en

### Guidance PDF
https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf

The guidance emphasizes software qualification/classification based on intended purpose and applies to apps/mobile/cloud software.

## Research still required

Before external launch, separately verify:

- latest Apple App Store Review Guidelines health sections;
- latest Google Play Health apps / health data policies;
- GDPR legal basis and DPIA requirements for actual implemented data flows;
- national requirements in launch markets;
- medication/reference-data licensing;
- accessibility requirements;
- subscription/store pricing rules;
- exact alarm eligibility for the final Android feature design;
- any MDR implications of the final claimed intended purpose.

## Evidence policy

For public marketing:
- re-check competitor claims on publication date;
- do not publish a feature-comparison claim from this internal document without current verification;
- use primary sources wherever possible.
