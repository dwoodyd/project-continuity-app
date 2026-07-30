# Swapping `@soul/capture` stub for the real package

When `@soul/capture` 1.0.0 is cut at Milestone 3, follow these steps to replace
the stub with the real package. The swap is a one-line import change — all
consumer code stays the same.

---

## Pre-conditions

- `@soul/capture` is published to npm (or the internal registry) and its
  exported interface matches the stub (`CaptureRecorder`, `renderSortPrompt`,
  `parseSortResponse`, `Atom`, `AtomKind`, `Correction`).
- You have confirmed the package version with the Soul Engineering team.

---

## Steps

### 1. Install the real package

```bash
cd /home/ubuntu/project-continuity-app
pnpm add @soul/capture@^1.0.0
```

### 2. Remove the Vite alias

Open `vite.config.ts` and delete the `@soul/capture` alias entry:

```diff
 resolve: {
   alias: {
     "@": path.resolve(__dirname, "./client/src"),
-    "@soul/capture": path.resolve(__dirname, "./packages/capture-stub/src/index.ts"),
   },
 },
```

### 3. Remove the tsconfig path

Open `tsconfig.json` and delete the `@soul/capture` path entry:

```diff
 "paths": {
-  "@soul/capture": ["./packages/capture-stub/src/index.ts"]
 }
```

If `paths` is now empty, remove the entire `paths` key.

### 4. Delete the stub package

```bash
rm -rf /home/ubuntu/project-continuity-app/packages/capture-stub
```

If `packages/` is now empty:

```bash
rmdir /home/ubuntu/project-continuity-app/packages
```

### 5. Delete the server-side sort utilities

The `server/captureSort.ts` file mirrors the stub's server-side utilities.
Once the real package is installed, the capture router can import directly:

```diff
-import { renderSortPrompt, parseSortResponse, type Atom, type Correction } from "../captureSort";
+import { renderSortPrompt, parseSortResponse, type Atom, type Correction } from "@soul/capture/server";
```

Then delete the file:

```bash
rm /home/ubuntu/project-continuity-app/server/captureSort.ts
```

> **Note:** If `@soul/capture` does not export a `/server` subpath, keep
> `captureSort.ts` and only delete the stub package. The server utilities are
> intentionally separate from the browser recorder code.

### 6. Verify

```bash
cd /home/ubuntu/project-continuity-app
npx tsc --noEmit   # must show 0 errors
pnpm test          # all tests must pass
```

Open the app and run a voice capture end-to-end to confirm the real recorder
works in the browser.

---

## Rollback

If the real package has a breaking interface change, restore the stub:

```bash
git checkout packages/capture-stub/
git checkout vite.config.ts tsconfig.json server/captureSort.ts
pnpm remove @soul/capture
```

---

## Files touched by this swap

| File | Action |
|---|---|
| `vite.config.ts` | Remove `@soul/capture` alias |
| `tsconfig.json` | Remove `@soul/capture` path |
| `packages/capture-stub/` | Delete entire directory |
| `server/captureSort.ts` | Delete (or update import) |
| `package.json` | Add `@soul/capture` dependency |
