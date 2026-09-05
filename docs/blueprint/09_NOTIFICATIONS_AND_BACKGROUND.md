# Notifications & Background Scheduling

## 1. Why this deserves its own subsystem

For DoseFlow, notifications are not a convenience. They are a core delivery mechanism.

The system must handle:

- future local reminders;
- dynamic rescheduling;
- device restart;
- permission changes;
- timezone changes;
- battery restrictions;
- notification actions;
- app not running.

## 2. Architecture

```text
Scheduler
  ↓
Notification Planner
  ↓
Desired Notification Set
  ↓
@capacitor/local-notifications
  ├─ iOS (UNUserNotificationCenter under the hood)
  └─ Android (AlarmManager under the hood)
```

The scheduler does not call OS APIs. The Notification Planner is the only
module that imports `@capacitor/local-notifications` (see
`08_ENGINEERING_ARCHITECTURE.md` §3, `/src/notifications`).

## 3. Desired notification record

```ts
type DesiredNotification = {
  id: string
  eventId: string
  fireAt: Instant
  titleKey: string
  bodyKey: string
  urgency: 'normal' | 'important'
  revisionId: string
}
```

## 4. Diff algorithm

After recalculation:

1. obtain previous scheduled notification set;
2. obtain desired set;
3. cancel removed/changed notifications;
4. schedule new/changed notifications;
5. verify success;
6. persist platform identifiers.

Idempotent behavior required.

## 5. iOS

Use local user notifications for scheduled reminders.

Core considerations:
- notification permission;
- action categories;
- scheduled notifications delivered by the OS;
- app can cancel/replace pending notifications.

### Critical Alerts

Apple offers Critical Alerts that can bypass mute/Focus, but apps require
the relevant entitlement and approval. `@capacitor/local-notifications`
does not expose Critical Alerts — using them would require writing a
custom native iOS plugin. Not planned for Phase A.

MVP:
- standard notifications via `@capacitor/local-notifications`;
- optional Time Sensitive notification behavior if platform policy/use case supports it and is reviewed.

## 6. Android

Precise timing is more complex.

Modern Android restricts exact alarms. Apps targeting recent Android
versions may need special exact-alarm access for APIs such as
`setExact()` / `setExactAndAllowWhileIdle()` depending on the chosen
permission model and use case.

**Correction (implemented against `@capacitor/local-notifications` 8.3.1):**
this section originally assumed the plugin had no way to detect or request
the Android 12+ `SCHEDULE_EXACT_ALARM` permission, requiring a custom native
Kotlin shim. As of 8.3.0 the plugin exposes this directly —
`checkExactNotificationSetting()` / `changeExactNotificationSetting()`
(Android-only; iOS/web report `'unsupported'`) — and `schedule()` itself
auto-prompts for the exact-alarm setting the first time a notification with
`isExactNotification: true` (the default) is scheduled on API 31+. No native
shim was written or is currently needed. `src/notifications/notificationService.ts`
uses these directly.

Engineering tasks:
- implement capability detection using the plugin's own methods above (done);
- guide user to settings only when justified (the plugin's own prompt-on-schedule covers the common case; a manual "Enable reminders" Settings entry point exists for the rest);
- test Doze/battery modes (not verifiable in this environment — needs a real device);
- reconcile pending notifications on every app launch (see §12 — Capacitor apps get no automatic reboot receiver) — done via re-running the diff algorithm on every recalculation, which Today already triggers on every load;
- reschedule after permission changes (not yet handled explicitly — falls out of the next recalculation, but there's no listener that reacts to a permission change immediately).

## 7. Precision tiers

Define explicit reminder modes:

### Exact-required
User instruction has a narrow clinically configured window.

### Flexible
Reminder can be delivered within a broader acceptable period.

Product should not call everything “exact” by default because:
- platform restrictions;
- battery cost;
- policy scrutiny.

## 8. Notification copy

Good:

> Gastrofait  
> Scheduled window: 08:47–08:57

Avoid:

> You MUST take this immediately

unless that wording is explicitly justified.

## 9. Actions

Potential notification actions:

- Taken now
- Snooze
- Open

Skip may be safer to require app context rather than a single accidental tap.

## 10. Taken from notification

When supported:

1. capture action timestamp;
2. persist administration;
3. run schedule recalculation;
4. reschedule affected notifications.

If background execution is constrained:
- persist action reliably;
- process rescheduling at earliest allowed moment;
- design platform-specific native handler if needed.

## 11. Snooze semantics

Snooze changes the reminder, not the historical actual event.

Store:
- original schedule;
- snoozed reminder time.

Do not assume the medication was taken at snooze time.

## 12. Reboot

Capacitor apps do not get an automatic `BOOT_COMPLETED` broadcast receiver
the way a native Android app can register one — `@capacitor/local-
notifications` does not add this for you. Rather than building a custom
native receiver for Phase A, rely on the same reconciliation this spec
already needs after any recalculation (§4 Diff algorithm):

- on every app launch/resume, read the desired notification set from the
  database and compare it against what the plugin reports as currently
  scheduled (`LocalNotifications.getPending()`);
- reschedule anything missing.

This has a known gap: a device that reboots and is not reopened before a
reminder's fire time will miss that reminder. Acceptable for Phase A;
revisit with a native receiver if dogfooding shows this happening often.

iOS:
- verify pending local-notification behavior and resync at launch using the same `getPending()`-based reconciliation.

## 13. Timezone changes

Policy options:

### Home-time medication
Keep original home-zone schedule.

### Local-time medication
Adapt to current local time.

### Ask user
On timezone jump:
> You changed from Europe/Bucharest to Asia/Tokyo. How should this treatment be handled?

MVP can support a conservative plan-level policy and warn.

Do not automatically transform interval-sensitive treatment across large timezone jumps without a clearly configured rule.

## 14. Device clock manual change

On app resume:
- compare stored timezone/clock context;
- recalculate future events;
- show “schedule updated after device time change.”

## 15. Permission health

Settings screen:

```text
Notifications       Enabled
Precise alarms      Enabled / Not available / Needs permission
Battery restriction Normal / Restricted
Next reminder       08:47
```

Read via `LocalNotifications.checkPermissions()` (notification permission)
and the native exact-alarm shim from §6 (Android precise-alarm capability).

Exact Android fields depend on implementation/API.

## 16. Failure behavior

If scheduling fails:

- persist error;
- show visible health warning;
- do not imply reminder is active;
- retry when appropriate.

## 17. Notification test matrix

At minimum:
- screen on;
- screen off;
- app foreground;
- app background;
- app force-closed;
- reboot;
- Doze;
- battery saver;
- Focus/DND;
- permission revoked;
- timezone change;
- 1-minute reschedule;
- 10 simultaneous future reminders;
- daylight-saving transition;
- OS upgrade where practical.

## 18. External references

- Android exact alarms: https://developer.android.com/develop/background-work/services/alarms
- Android exact-alarm permission changes: https://developer.android.com/about/versions/14/changes/schedule-exact-alarms
- Apple Critical Alerts: https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.usernotifications.critical-alerts
