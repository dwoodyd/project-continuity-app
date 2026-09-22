# Continuary Launch Hardening and Load-Test Status

**Date:** September 22, 2026  
**Author:** Manus AI

## Conclusion

The two requested application changes are complete and validated. Capture audio is now private, and the two Focus read paths now use bounded, indexed queries. The live TiDB database selects the new composite indexes in `EXPLAIN`.

A legitimate staging load-test result is **not available yet**. No isolated staging database or staging project can be created with the credentials and project controls available to this session. I did not run traffic against production as a substitute. Therefore, there is no defensible concurrency threshold, latency result, or error rate to report.

## Completed application work

### Capture-audio privacy

Capture audio is no longer exposed through a browser-visible provider URL. The client receives only a storage key. When transcription is requested, the server first checks that the key belongs to the authenticated member, then creates a temporary provider download URL internally for Deepgram.

New recordings use the private key form `vault/{userId}/captures/{captureId}/chunk-{chunkIndex}.{ext}`. The authorization check also recognizes the old `captures/{userId}/...` layout so existing recordings remain protected rather than becoming inaccessible. Requests to `/api/media/captures/...` without a session now return **401 Unauthorized**. Requests for public Wren media do not emit a permissive cross-origin response header.

### Bounded Focus queries

`focusSessions.getArtifact` now requests at most 120 completed sessions per page and returns an opaque cursor for the next page. It selects the small set of fields required by the woven artifact, rather than materializing a member's full session history.

`focusSessions.getTodayStats` now executes database aggregates for lifetime count, today count, and today minutes. It no longer loads all matching rows into Node.js and calculates the totals in application memory.

Migration `0056_pink_fallen_one.sql` declares and the managed database now contains these indexes:

| Index | Access pattern | Live verification |
|---|---|---|
| `focus_sessions_user_completed_started_idx` | Completed-session history ordered by `startedAt, id` | `EXPLAIN` uses a descending `IndexRangeScan` for the cursor-paginated artifact query. |
| `focus_sessions_user_completed_at_idx` | Completed-session aggregate statistics by member and completion date | `EXPLAIN` uses an `IndexRangeScan` for the aggregate statistics query. |

### Wren media and Focus companion correction

The screenshot-confirmed watermarked mappings have been replaced. The Focus-hours onboarding step now uses the audited `hoversThread` scene instead of `bouncingFun`. The post-onboarding Wren moment now uses `luminousFloats` instead of `blobFlyingFun`, while retaining its play-once behavior and visible skip control.

The active Focus session keeps its established activity clips and PiP mechanics. Its left companion stage now explicitly fills the stage with the protected activity video (`objectFit="cover"`), eagerly preloads it, and does not introduce a poster holder. This change is isolated to the active in-session stage; the verified Focus landing remains untouched.

## Capacity facts that are confirmed

The database reports **TiDB v8.5.3-serverless, Community edition**. The runtime value of `@@max_connections` is `0`, which does not expose a concrete connection ceiling. The server code uses the application's Drizzle/MySQL connection path directly; no application-side PgBouncer or separate connection pool service is configured.

The exact TiDB Cloud plan and monthly spending limit are **not exposed** through the project database connection or the available WebDev controls. That distinction matters: TiDB Cloud documents a 400-concurrent-connection limit for Starter and 5,000 when a spending limit is set, but the database version string alone cannot establish which condition applies here. TiDB also documents that long-lived serverless connections can be terminated and recommends a finite connection lifetime. [1]

The current managed hosting instance count, concurrency ceiling, and autoscaling policy are also **not exposed** by the project repository, development status tool, or the available project controls. These must be confirmed in the managed hosting console or through Manus support before a launch-readiness claim is made.

## Staging load-test status

An isolated schema named `continuary_staging_load_20260922` was requested. The database rejected `CREATE DATABASE` with `ERROR 1044: Access denied`, so the project database credentials are scoped to the existing application schema. A separate WebDev project could not be initialized from this attached-project session. No production data, production check-in writes, live payments, or live AI capacity was used for load testing.

The test should run only after an isolated staging environment has all of the following:

1. A staging database URL with an independently migratable schema.
2. A staging application URL with a non-production session secret and a dedicated test account.
3. Payment endpoints disabled or pointed at a non-production PayPal environment.
4. A fixed test data set representing dashboard activity, check-ins, and Focus sessions.
5. An explicit AI test budget so the test exercises the authenticated path without creating an uncontrolled inference bill.

The load harness should use Autocannon with fixed-rate phases at 1, 5, 10, 25, 50, and 100 concurrent connections. It should separately record authenticated dashboard reads, check-in writes with unique tagged values and read-back verification, and a deliberately rate-limited AI path. For every phase, it should record p50, p95, and p99 latency; requests per second; HTTP status counts; timeouts; and connection errors. Autocannon provides these latency, throughput, error, timeout, and non-2xx metrics directly. [2]

A test phase should be treated as the first capacity warning when either p95 latency rises materially over the prior steady phase, non-2xx responses exceed the expected intentional AI-rate-limit responses, or any timeout occurs. The exact concurrency at which that happens remains **unmeasured** until the isolated staging environment exists.

## Validation

`npx tsc --noEmit` completed successfully. The full Vitest suite completed successfully: **57 test files and 575 tests**. New regression coverage checks private capture-key ownership, media authorization behavior, bounded Focus queries and index declarations, watermark-safe onboarding mappings, and the active Focus companion stage.

## References

[1]: https://docs.pingcap.com/tidbcloud/serverless-limitations/ "Limitations and Quotas of TiDB Cloud Starter and Essential"
[2]: https://github.com/mcollina/autocannon "autocannon"
