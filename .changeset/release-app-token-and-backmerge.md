---
'@_linked/cli': patch
---

`setup-publish` now generates publish workflows that author the changesets "Version Packages"
PR (and, for dual-branch, the post-release sync) via an org **GitHub App token**
(`actions/create-github-app-token`, org secrets `RELEASE_APP_ID` / `RELEASE_APP_PRIVATE_KEY`)
instead of the default `GITHUB_TOKEN` — so those PRs' checks run without a manual "Approve and
run" gate. The dual-branch template's version-only `sync-version-to-dev` job is replaced by a full
**back-merge `main -> dev`** (carrying the version bump, CHANGELOG, and changeset deletions, so dev
never re-releases consumed changesets). `--configure-github` also enables "Allow auto-merge" so the
back-merge PR self-merges once checks pass.
