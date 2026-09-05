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
Platform Adapter
  ├─ iOS
  └─ Android
```

The scheduler does not call OS APIs.

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

Apple offers Critical Alerts that can bypass mute/Focus, but apps require the relevant entitlement and approval.

Do not assume approval.

MVP:
- standard notifications;
- optional Time Sensitive notification behavior if platform policy/use case supports it and is reviewed.

## 6. Android

Precise timing is more complex.

Modern Android restricts exact alarms. Apps targeting recent Android versions may need special exact-alarm access for APIs such as `setExact()` / `setExactAndAllowWhileIdle()` depending on the chosen permission model and use case.

Engineering tasks:
- determine whether product qualifies for exact-alarm policy;
- implement capability detection;
- guide user to settings only when justified;
- test Doze/battery modes;
- reboot receiver;
- reschedule after permission changes.

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

Android:
- device reboot can remove scheduled alarms depending on mechanism;
- rehydrate desired reminders after boot using native receiver/process.

iOS:
- verify pending local-notification behavior and resync at launch.

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
