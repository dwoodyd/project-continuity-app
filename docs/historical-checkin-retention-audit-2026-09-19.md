# Historical Check-in Retention Audit

**Date:** September 19, 2026  
**Account examined:** member record `userId = 1`  
**Scope:** check-in retention for May through August 2026, related focus-session activity, stored recovery evidence, migration/source history, and retained runtime logs.

## Executive finding

There are **no check-in rows for user 1 in May, July, or August 2026**. The current database contains no soft-delete field on `check_ins`, no orphaned check-in-to-plan relation in the examined period, and no migration or application path that deletes only check-ins for an otherwise active account. The missing August writing therefore **cannot be recovered from the current Continuary database**.

The evidence does not support a claim that completed August check-ins were later deleted. It supports the narrower conclusion that no completed August check-in records are present now. Because historical production request logs from those months are not retained in this workspace, the exact cause of the absent writes cannot be proven retrospectively.

## Retained database evidence

| Month | Submitted check-ins | All check-in rows | Focus sessions | Daily plans |
|---|---:|---:|---:|---:|
| March 2026 | 6 | 6 | Not in audit window | Not in audit window |
| April 2026 | 6 | 6 | Not in audit window | Not in audit window |
| May 2026 | 0 | 0 | 6 | 0 |
| June 2026 | 37 | 38 | 20 | 20 |
| July 2026 | 0 | 0 | 0 | 0 |
| August 2026 | 0 | 0 | 4 | 0 |
| September 2026 (to audit date) | 2 | 2 | Outside question | Outside question |

The May and August focus sessions establish that the account was active in those months. They do not create corresponding check-in rows, and there are no hidden or soft-deleted check-ins for those months.

## Row integrity and deletion checks

The `check_ins` table has no `deletedAt`, `deleted_at`, `isDeleted`, or equivalent soft-delete column. The May–August check-in query found **38 rows total** (all in June), **one unsubmitted June row**, and **zero check-ins with a non-null `dailyPlanId` that points to a missing member-owned daily plan**.

The one incomplete row is real and recoverable: **check-in `870001`**, an evening close dated June 19, contains 233 characters of member input but has `completedAt = NULL`. It was created at 13:35:38 UTC and last updated at 13:41:56 UTC. It is not a missing August record. The archive now deliberately exposes records like this as **Needs review before it is marked saved**, so the member can open it and finish the confirmation rather than lose access to the preserved text.

A source and migration scan found no `DELETE FROM check_ins`, `TRUNCATE check_ins`, `DROP TABLE check_ins`, or migration that removes check-in rows. The sole current application deletion path is `deleteAllUserData(userId)`, which deletes the **entire account and all related data**—including focus sessions, projects, and the user record—not isolated check-ins. There is no evidence that this path was applied to user 1.

## Check-in ID interpretation

The cited IDs are **not valid evidence of three user-1 deletions** because check-in IDs are global rather than account-specific:

| Cited ID | Current result |
|---:|---|
| `330001` | Exists, but belongs to user `1770006`, not user 1 |
| `870001` | Exists for user 1 as the incomplete June 19 evening record described above |
| `1200001` | Does not currently exist |

Global auto-increment allocation also cannot establish a contiguous sequence of attempts for one member. It should not be used to infer user-specific write loss.

## Timezone-loop assessment

The `captureTimezone` mutation was introduced on **August 27, 2026**, not before. Its original effect had an unstable dependency and could repeatedly retry before the September repairs. Therefore:

> The loop is a credible contributor to failures from August 27 through September 19, but it cannot explain the May gap, July gap, or the first 26 days of August.

The loop was corrected in two layers on September 19: it is now one attempt per authenticated member per browser session, only runs when the device zone differs from the stored zone, has no mutation retry, uses a separate non-batched transport, and is exempt from shared request quota. The client also has bounded `Retry-After` aware 429 handling.

## Log-retention assessment

The available project runtime logs begin on September 17, 2026. They do not contain May, June, July, or August production request traffic. Consequently, there is **no retained server-log evidence** that can confirm or refute 429 responses or failed `submitMorning`, `submitMidday`, or `submitEvening` calls in those months.

This is an observability limitation, not evidence that requests succeeded. The application now prevents the observed settings-sync starvation path, but it cannot reconstruct discarded historical HTTP failures.

## Member-facing conclusion

August check-ins were **not saved in the current database**, and no soft-deleted or orphaned August rows exist to restore. The most accurate statement is: the missing August check-ins are not recoverable from Continuary’s present data store; their exact failure mechanism cannot be proved from the retained logs. The timezone-loop bug is a plausible cause only for the late-August period after its August 27 introduction, not for the broader May/July gaps.

## Product follow-through in this release

The archive is now visibly reachable from the **Reflect** navigation group as **Check-in Archive**, from the **Weekly Review** header, and from each recent Weekly Review check-in through **Open & edit**. The archive shows dated records, opens every field, and exposes the appropriate morning, midday, or evening amendment control. It also surfaces recoverable unfinished rows instead of filtering them out.
