# Continuary Security Checklist — Builder Attestation

**Date:** September 21, 2026  
**Scope:** The current Continuary repository and its application server. This is a code and configuration review that supplements the supplied black-box checklist; it does not make claims about LifeWoven or Inner Wake.

## Conclusion

The reported Continuary validation gap has been corrected. Check-in procedures now reject unrecognized payload fields instead of silently discarding them, and no-payload check-in reads accept only `undefined`. The regression suite proves that the previously accepted `timezone: 12345` payload is rejected before any data helper runs.

The remaining builder questions need differentiated answers. The application uses strong route-level ownership checks, but the TiDB/MySQL database does **not** have native row-level security (RLS) enabled. The Git-history review found no common live-key signatures, but a tracked historical `.env.test` path means an unconditional “no secret was ever committed” attestation would be too strong without a separately approved review of that fixture.

## Resolution of the reported input-validation finding

Zod object schemas strip unknown keys by default. A strict schema instead raises an error when an unrecognized key is present. [1] The check-in router previously had both shaped inputs that silently stripped extra fields and no-input reads that accepted an arbitrary payload. It now uses a strict-object helper for every shaped check-in input and an explicit `z.undefined()` schema for each no-payload read.

The following server assertions were added without reading or changing production member data. They invoke the router with a test context only.

| Assertion | Result |
| --- | --- |
| `checkIns.getWeek({ timezone: 12345 })` | Rejects with `BAD_REQUEST` before a database helper is called. |
| `checkIns.getToday({ timezone: 12345 })` | Rejects with `BAD_REQUEST`. |
| `checkIns.getById({ id, timezone: 12345 })` | Rejects with `BAD_REQUEST` before ownership lookup. |
| Check-in shapes | Every shaped check-in input is strict; the test also verifies the explicit no-payload schemas. |

## Builder answers

### 1. Row-level security

**Answer: No — native database RLS is not enabled for any current Continuary table category.** The project is configured for TiDB through Drizzle’s MySQL dialect. TiDB does not natively provide conventional row-level security; its documented alternatives are views, user-defined functions, and carefully managed privileges. [2]

| Table category | Native RLS | Current isolation control |
| --- | --- | --- |
| Accounts and profiles | No | Authenticated tRPC context and server-side owner predicates. |
| Plans, projects, tasks, check-ins, and focus sessions | No | Server routes obtain the member ID from `ctx.user`; read and write helpers receive that ID as an ownership predicate. |
| Captures, vault/source content, reflections, and AI-derived records | No | Server-side member ownership predicates; private vault routes do not expose cross-origin access. |
| Notifications, calendars, subscriptions, and payment references | No | Authenticated procedures and server-side member IDs; payment status derives from server-side provider handling. |
| Admin, application, invite, and operational records | No | Explicit admin procedures and server role checks. |

This is **not equivalent** to database-enforced RLS. The black-box two-account tests and the server ownership tests establish route-level isolation, but a compromised application database credential would not gain a second database-layer ownership policy. The compensating control is that the TiDB connection string is server-only and the application does not expose direct database access to clients. This remains an architectural risk to revisit if Continuary moves to a database with native RLS or adds a distinct least-privilege database access layer.

### 2. Secrets in Git history

**Answer: Not conclusively attested.** A scan of the current tree and reachable Git history found no common live-key signatures for Stripe secret keys, AWS access keys, GitHub personal tokens, Slack tokens, or private-key PEM headers. The current `.gitignore` excludes ordinary local and production `.env` files.

However, Git history includes a tracked `.env.test` path. The platform correctly prevented reading that environment-named file during this review. It may be a harmless test fixture, but its presence prevents a categorical claim that no sensitive value was ever committed. The correct closeout is to review that fixture under the project’s approved secrets workflow. If it contains any real or formerly real credential, rotate the credential and remove the value from all reachable history; deleting it only from the current branch is not enough.

### 3. CORS

**Answer: Authenticated application and tRPC routes are not configured with `Access-Control-Allow-Origin: *`.** The server applies no blanket permissive CORS middleware. Two intentionally public, cookie-free responses use `*`: the founding-seat aggregate endpoint and non-vault Wren media. The first exposes only aggregate capacity; the latter is public media needed by the app. Private vault files are marked private and do not receive the permissive media CORS header.

This is narrower than a wildcard policy on the authenticated API. Any new public endpoint should be reviewed for the same conditions: no user data, no cookie-based session use, and no state-changing behavior.

### 4. Injection and user-supplied content

**Query construction: yes for the reviewed application source.** Database operations use Drizzle’s query builder and `sql` template interpolation. Drizzle binds dynamic values as parameters rather than interpolating them into raw SQL text. [3] The source review found no `sql.raw()` use and no string-built SQL that incorporates user values. Raw SQL statements are static operational statements; dynamic values in the reviewed templates remain parameterized.

**Text rendering: raw member reflections are retained rather than universally sanitized before storage.** This is deliberate for fidelity of personal notes. The client does not render member text through a member-controlled `dangerouslySetInnerHTML` or `innerHTML` sink; React’s normal text interpolation escapes it. The one detected `dangerouslySetInnerHTML` use generates static chart theme CSS from application constants, not member content. If a future feature converts member text to HTML or passes it to a rich HTML renderer, sanitization must be added at that rendering boundary.

### 5. Server-side validation on every mutation

**Answer: Yes for schema validation of every current mutation that accepts client data, with one qualification on unknown-key strictness.** A static audit found **166** mutations. **163** declare an explicit `.input(...)` schema. The remaining three accept no client payload: logout, founding-seat claim, and pattern detection. The project uses Zod for the typed input schemas.

Before this repair, default Zod-object behavior silently stripped unknown keys. That was the cause of the reported check-in behavior. Check-in inputs now use strict schemas, which reject those keys. [1] Other routers still use normal Zod object schemas unless they independently opt into strictness, so their known fields are type- and constraint-validated but unknown fields may be stripped. Extending strict-object behavior router by router is a worthwhile future hardening pass, not a claim made by this checkpoint.

## Implementation and verification

The change is server-only. It does not alter protected Focus/PiP behavior, Wren playback or rotation, standalone PWA behavior, device-local date handling, or persisted member data. The security tests include the previous forged check-in amendment regression: a foreign ID is looked up with the caller’s member ID and no write helper runs when ownership cannot be established.

The final validation run must include TypeScript and the complete Vitest suite before the checkpoint is published.

## Scope boundary for the supplied three-app checklist

No LifeWoven or Inner Wake source was edited from the Continuary workspace. The reported Inner Wake header gap requires work in its own project or hosting configuration. LifeWoven’s two-account isolation and all cross-project builder attestations remain separate from this Continuary review.

## References

[1]: https://zod.dev/api "Zod API — object schemas and strict objects"
[2]: https://www.pingcap.com/article/ensuring-tidb-security-best-practices-and-key-features/ "Ensuring TiDB Security: Best Practices and Key Features"
[3]: https://orm.drizzle.team/docs/sql "Drizzle ORM — Magical sql operator"
