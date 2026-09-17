# Continuary Library Ingestion, Retrieval, and Quota Proposal

**Decision requested:** approve the architecture and the tier limits below before implementation. This is a proposal only; it does **not** add a provider key, migration, background worker, ingestion endpoint, or billing behavior.

## Recommendation

Build a **member-private Library** on top of the existing Vault/source-item pattern. It should ingest text a member deliberately adds to their own library, break the normalized text into small cited chunks, and use semantic retrieval only to surface that member's own material in context. It is a search and continuity aid—not an autonomous publishing, training, or cross-member discovery system.

Use OpenAI's `text-embedding-3-small` with an explicit `dimensions: 768` request. The model's documented input limit is 8,192 tokens and its standard output is 1,536 dimensions; OpenAI explicitly supports shortening v3 embeddings with the `dimensions` parameter.[^openai-guide] Its documented list price is **$0.02 per million input tokens**.[^openai-model] The 768-dimensional setting retains a good semantic-search footprint while roughly halving vector payload size versus the default.

Store original uploaded bytes in the existing private object-storage path and all normalized metadata, chunks, checksums, access state, and vectors in the application's TiDB database. Use a fixed `VECTOR(768)` column only after a production capability probe confirms the supplied TiDB cluster supports TiDB Vector. TiDB documents fixed-dimension vector columns and HNSW cosine indexes, but labels the feature beta and notes the index requires TiFlash replicas.[^tidb-vector][^tidb-index] The implementation must have a safe fallback: store the 768-float vector text/JSON in the Library chunk record and perform bounded per-member cosine scoring until the capability probe and index are explicitly enabled. No second vector vendor is needed for v1.

## What is ingested

| Content | v1 treatment | Stored form | Not included in v1 |
|---|---|---|---|
| Typed Library note, pasted text, Markdown, plain text | Ingest on explicit save | Original text, normalized text, chunk rows, citation offsets, content hash, embeddings | Automatic scraping or silent import |
| PDF, DOCX, and exported notes | Upload, extract text, show member a preview, then ingest only after confirmation | Original private file plus normalized extracted text and chunks | Image-only / handwritten OCR without a separate extraction approval |
| Existing member-owned Vault / Scratch entries | **Opt-in backfill only** from a Library settings control | References to the existing source, normalized chunks and embeddings | Automatically embedding all historical content |
| URLs | Store a member-provided note and source URL in v1; do not fetch remote pages | User text and URL metadata | Crawling private links, authenticated pages, or arbitrary web ingestion |
| Audio / video | Deferred | None | Transcription or media embedding in the Library pipeline |
| Other members' content | Never eligible | None | Shared/global retrieval or model training |

The ingestion pipeline should normalize Unicode and whitespace, preserve the source and position for every chunk, remove exact duplicate chunks by checksum, and chunk prose at approximately **850 tokens with 100-token overlap**. It should cap a single source at **200,000 extracted tokens** and surface a plain-language “too large to ingest” message rather than silently truncating. Every chunk keeps a citation such as source title, page/section when available, and character range so Wren can point back to material rather than present it as untraceable memory.

## Data model and lifecycle

| Record | Storage | Purpose | Lifecycle |
|---|---|---|---|
| `library_sources` | TiDB | Owner, title, MIME type, checksum, source state, byte count, normalized token count, source URL, timestamps | Member can delete at any time; deletion cascades to chunks/vectors and schedules object deletion |
| `library_chunks` | TiDB | Source ID, ordinal, text, token count, citation fields, checksum, embedding version/status | Recreate only when source checksum or embedding configuration changes |
| Private original upload | Existing object storage | Member-downloadable original (when a file was uploaded) | Private; signed access only; delete with source |
| Vector index (when supported) | TiDB `VECTOR(768)` + HNSW cosine index | Top-K candidate retrieval for one member | Capability-gated; never used for cross-member search |

An ingestion job should be idempotent on `(member, source checksum, embedding model, dimensions, chunking version)`. A later edit produces a new checksum, reuses unchanged chunk embeddings when checksums match, and re-embeds only changed chunks. Background execution should be queued and observable, with states `queued`, `extracting`, `needs_confirmation`, `embedding`, `ready`, `failed`, and `deleted`. No source should be shown in Wren retrieval until its status is `ready`.

## Retrieval policy

A member query is embedded with the same `text-embedding-3-small` / 768 configuration. Retrieval returns the closest **12** candidate chunks, filters strictly to `user_id`, deduplicates by source, and passes at most **6** cited excerpts (approximately 4,000 aggregate tokens) to a Wren response. The response UI must name the source and offer an open-source action. If the search confidence is weak, the system says so rather than inventing a connection.

For the first release, retrieval is only available in explicit Library search and in an opt-in “Use my Library for this answer” Wren control. It should **not** silently influence daily check-ins, crisis-support surfaces, or the Focus session experience. This keeps the member's choice clear and protects the previously validated Focus/PiP behavior.

## Quota and abuse policy

Quotas use normalized extracted tokens and source bytes separately, because they control different costs. They count an initial ingest or a changed re-ingest; retrieval-query embeddings are platform operational cost and are not exposed as a member quota in v1. A member can always delete sources to free capacity immediately.

| Tier | Sources | Private file storage | Embedded tokens per rolling 30 days | Per-source limit | Retrieval | Product behavior at limit |
|---|---:|---:|---:|---:|---:|---|
| Free | 10 | 25 MB | 50,000 | 25,000 | Search only | Keep existing Library content readable; disable new ingestion until the window rolls or the member deletes material |
| Pro | 100 | 1 GB | 500,000 | 200,000 | Search + explicit Wren opt-in | Same graceful hold; no deletion or surprise upgrade wall |
| Keeper | 500 | 5 GB | 1,500,000 | 200,000 | Search + explicit Wren opt-in | Same graceful hold; show current usage and the next reset date |

For protection against accidental or abusive bulk loading, enforce 20 source submissions per hour, 100 MB per file, PDF/DOCX/TXT/MD only in v1, and a maximum of 96,000 embedding tokens per queued batch. Reject password-protected or malformed documents clearly; do not route them to an unreviewed third party.

## Cost estimate

The estimates below use the documented **$0.02 / 1M input tokens** for `text-embedding-3-small`.[^openai-model] They exclude the existing web-app database, object-storage, and application-hosting baseline. Storage uses the common S3 Standard planning rate of **$0.023 per GB-month**; the exact platform storage price must be substituted before a pricing commitment.[^s3]

| Unit | Embedding input | Embedding API cost | Vector payload at 768 float32 dimensions | Raw private-file storage cost |
|---|---:|---:|---:|---:|
| 50k-token Free monthly allowance | 50,000 tokens | $0.001 | ~0.17 MB at ~59 chunks | Up to 25 MB: ~$0.0006/month |
| 500k-token Pro monthly allowance | 500,000 tokens | $0.010 | ~1.72 MB at ~588 chunks | 1 GB: ~$0.023/month |
| 1.5M-token Keeper monthly allowance | 1,500,000 tokens | $0.030 | ~5.17 MB at ~1,765 chunks | 5 GB: ~$0.115/month |
| 100 Pro members at full monthly allowance | 50M tokens | $1.00 | ~172 MB | 100 GB: ~$2.30/month |
| 100 Keeper members at full monthly allowance | 150M tokens | $3.00 | ~517 MB | 500 GB: ~$11.50/month |

These are deliberately conservative maximums. In normal use, source embeddings are one-time costs because unchanged content is deduplicated by checksum; a retrieval query is a few hundred tokens and is materially below the initial source-ingestion cost. The budget guardrail should be a **$25/month embedding spend alert** at launch, a hard pause at **$50/month** pending owner review, and a per-member query rate limit independent of the ingestion allowance.

## Implementation sequence after approval

1. Confirm that the production TiDB cluster supports `VECTOR(768)` and can provision the required TiFlash replica. Document the result; retain the member-scoped fallback if not.
2. Add the Library tables and an additive migration, plus object-storage metadata. Do not alter existing Vault records.
3. Add explicit member ingestion, preview, delete, usage, and opt-in backfill controls.
4. Add a bounded background ingestion queue and the OpenAI embedding adapter. Store the provider key only as a server-side secret; never expose it to the client.
5. Add citation-first search, test source isolation, quota boundaries, deletion cascade, checksum idempotency, provider failure recovery, and no-implicit-Wren-use behavior.
6. Pilot with owner and a small named cohort before any broad enablement. Review real extraction quality, per-user token use, latency, and first-month spend before adjusting quotas.

## Approval text

> Approve Library v1: member-private opt-in ingestion of text/PDF/DOCX/Markdown, `text-embedding-3-small` at 768 dimensions, TiDB-first storage with a safe fallback if Vector/TiFlash is unavailable, the Free/Pro/Keeper quotas in this proposal, and the $25 alert / $50 pause guardrails. Do not enable shared retrieval, automatic historical backfill, web crawling, audio/video ingestion, or automatic Wren use.

[^openai-guide]: [OpenAI, “Vector embeddings”](https://developers.openai.com/api/docs/guides/embeddings) (accessed 2026-09-17). Documents default dimensions, the `dimensions` parameter, and the 8,192-token maximum input.
[^openai-model]: [OpenAI, “text-embedding-3-small”](https://developers.openai.com/api/docs/models/text-embedding-3-small) (accessed 2026-09-17). Documents the model ID and $0.02 per 1M input tokens.
[^tidb-vector]: [TiDB, “Vector Data Types”](https://docs.pingcap.com/tidb/stable/vector-search-data-types/) (accessed 2026-09-17). Documents `VECTOR(D)`, fixed-dimension enforcement, and beta status.
[^tidb-index]: [TiDB, “Vector Search Index”](https://docs.pingcap.com/tidb/stable/vector-search-index/) (accessed 2026-09-17). Documents HNSW cosine/L2 indexing and TiFlash requirements.
[^s3]: [AWS, “Amazon S3 pricing”](https://aws.amazon.com/s3/pricing/) (accessed 2026-09-17). Planning baseline only; platform-specific storage pricing must be confirmed before a customer promise.
