#!/usr/bin/env python3
"""
Migrate all direct `import { toast } from "sonner"` to `import notify from "@/lib/notify"`.
Also rewrites the call sites:
  toast.success(...)  → notify.saved(...)
  toast.error(...)    → notify.error(...)
  toast.loading(...)  → notify.loading(...)
  toast(...)          → notify.info(...)
  toast.dismiss(...)  → notify.dismiss(...)

Special case: ComponentShowcase.tsx uses `toast as sonnerToast` — leave it alone.
"""

import re
import sys
import os

SRC = "/home/ubuntu/project-continuity-app/client/src"

# Files to skip (the wrapper itself and the component showcase which uses the raw API for demo)
SKIP = {
    "components/ui/sonner.tsx",
    "lib/notify.ts",
    "pages/ComponentShowcase.tsx",  # uses sonnerToast alias intentionally
}

def migrate_file(path: str) -> tuple[bool, str]:
    rel = os.path.relpath(path, SRC)
    if rel in SKIP:
        return False, "skipped"

    with open(path, "r") as f:
        original = f.read()

    content = original

    # 1. Replace the import line
    # Match: import { toast } from "sonner"  OR  import { toast } from 'sonner'
    content = re.sub(
        r'import\s*\{\s*toast\s*\}\s*from\s*["\']sonner["\'];?',
        'import notify from "@/lib/notify";',
        content
    )

    # 2. Replace call sites — order matters: more specific patterns first
    # toast.success(  →  notify.saved(
    content = content.replace("toast.success(", "notify.saved(")
    # toast.error(  →  notify.error(
    content = content.replace("toast.error(", "notify.error(")
    # toast.loading(  →  notify.loading(
    content = content.replace("toast.loading(", "notify.loading(")
    # toast.dismiss(  →  notify.dismiss(
    content = content.replace("toast.dismiss(", "notify.dismiss(")
    # toast.info(  →  notify.info(
    content = content.replace("toast.info(", "notify.info(")
    # toast.warning(  →  notify.info(  (we don't have a warning variant, use info)
    content = content.replace("toast.warning(", "notify.info(")
    # toast.promise(  →  leave as-is (rare, complex, handle manually if needed)
    # bare toast(  →  notify.info(  — careful: only match `toast(` not `toast.` or `toastId`
    content = re.sub(r'\btoast\(', 'notify.info(', content)

    if content == original:
        return False, "no changes"

    with open(path, "w") as f:
        f.write(content)

    return True, "migrated"


def main():
    changed = []
    skipped = []
    unchanged = []

    for root, dirs, files in os.walk(SRC):
        # Skip node_modules etc.
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist")]
        for fname in files:
            if not fname.endswith(".tsx") and not fname.endswith(".ts"):
                continue
            path = os.path.join(root, fname)
            ok, reason = migrate_file(path)
            if ok:
                changed.append(os.path.relpath(path, SRC))
            elif reason == "skipped":
                skipped.append(os.path.relpath(path, SRC))
            else:
                unchanged.append(os.path.relpath(path, SRC))

    print(f"\n✅ Migrated ({len(changed)}):")
    for f in sorted(changed):
        print(f"  {f}")
    print(f"\n⏭  Skipped ({len(skipped)}):")
    for f in sorted(skipped):
        print(f"  {f}")
    print(f"\n— Unchanged ({len(unchanged)} files had no toast calls)")


if __name__ == "__main__":
    main()
