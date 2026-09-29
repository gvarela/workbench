# Releasing wb

How changes reach installers, and the process that keeps that deliberate. Context: the plugin has multiple installers; this repo is also the marketplace.

## The channel model

| Channel | Who | What they get | When |
| --- | --- | --- | --- |
| Dev | Maintainer, canaries | The working tree, live | `claude --plugin-dir <repo>/plugin` — always serves current files, shadows any installed version (even an equal one), no bump needed |
| Integration | Maintainer | `dev`: every merged PR, unreleased | Through `--plugin-dir` on a `dev` checkout; installers never see it |
| Release | Installers | The `plugin/` subtree at the manifest version on `main` | Only when the version bumps AND they run `claude plugin update wb@gvarela-workbench` |

Two facts shape everything else (verified 2026-06-11):

1. **A session without `--plugin-dir` serves the installed cache.** Working-tree changes are invisible to it, including to its `/reload-skills`. If edits "aren't taking effect," check the flag before suspecting the version.
2. **`main` is effectively the install channel even between bumps.** Existing installers only receive bumped versions, but a *fresh* `claude plugin install` copies whatever `main` currently holds under the current version label. Therefore: **main must always be releasable, so `main` moves only when a release is cut** (a `dev` → `main` PR that carries the version bump). All other work lands on `dev`.

## Semver for a prompt library

- **Patch** (x.y.Z): prompt bugfixes, typo/clarity edits, doc fixes. No behavior contract changes.
- **Minor** (x.Y.0): new skills/agents/hooks, additive behavior, new supporting files.
- **Major** (X.0.0): removed/renamed commands, changed workflow contracts, changed invocation behavior, or new environment requirements (bd version, Claude Code feature dependencies).

Bump `version` in **both** `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` — they must match.

## Process

1. **One concern per branch/PR**, phase-sized. Branch from `dev` and open the PR against `dev`, never `main`. Merged work waits on `dev` without a version bump and is listed under `## [Unreleased]` in CHANGELOG.md.
2. **When to cut**: when the plan completes, or earlier only when wb sessions in other repositories need a shipped phase — this repository's own sessions run `--plugin-dir` and never wait. Breaking changes can land on `dev` at any point, because `main` only moves at a cut; the cut that ships them is a major bump. Dogfood `dev` through `--plugin-dir` before cutting.
3. **Cutting a release**: on `dev`, move Unreleased → version + date in CHANGELOG.md (write Migration notes if anything breaks) and bump both manifests; open a `dev` → `main` PR, merge it, then tag the commit main carries the bump on: `git tag vX.Y.Z <sha> && git push origin vX.Y.Z`. Every cut is tagged; the tag is the rollback anchor.
4. **Verification before any bump**: `./plugin/scripts/lint <file>` on every touched file with a zero delta against HEAD (`lint --all` exits 1 on the pre-existing backlog until that backlog is cleared, so it is not the gate), the grep audits, and a `--plugin-dir` smoke session (`/wb:` menu correct, `/wb:help` renders, one workflow skill's intake flow works). Help drift check: every user-invocable stage under `plugin/skills/` (a `SKILL.md` without `user-invocable: false` and without `disable-model-invocation: true`) has a ``### `/wb:<name>`` heading under Command Details and a row in the "What each stage needs from you" table in `plugin/skills/help/SKILL.md`, and each stage's "This stage needs from you" sentence matches its table row; running `grep -L "needs from you" plugin/skills/*/SKILL.md` lists only background skills and deprecated aliases. As the eval harness lands, this becomes: Tier 0 on every PR, Tier 2 golden runs before any bump, Tier 3 before anything behavior-shaping.
5. **Canary for majors**: the maintainer runs at least three real sessions on the release branch through `--plugin-dir` before the bump; one volunteer installer updates first; announce to the rest after a quiet interval.
6. **Announce**: tell installers the version, the one-line summary, and any migration steps (link the changelog entry). Updates are pull-based — the changelog is their entire decision input.

## Rollback

There is no downgrade mechanism. Rollback = revert commit(s) + new **patch** version + `claude plugin update`. Roll forward, always.

## Maintenance branches

- **`1.x`** holds the final pre-modernization release (v1.1.0: `commands/` layout, root-level `.claude-plugin/`, pre-embedded-Dolt beads). Created 2026-07-31 from the last pre-2.0 main tip, tagged `v1.1.0`.
- Policy: **critical fixes only, no new features.** Fixes land directly on `1.x` (cherry-pick from main when applicable), bump the patch version in the branch's own manifests, tag `v1.1.x`.
- `main` carries the current major forward and is the install channel (it moves only at release cuts; day-to-day work lands on `dev`); users on 1.x install by pointing at the branch (`--plugin-dir` on a `1.x` checkout, or a marketplace registration targeting that branch).

## Update mechanics (for reference)

- The cache is keyed by version: `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
- `/reload-plugins` re-reads the existing cache only; it never pulls.
- Pushing to GitHub alone delivers nothing; the marketplace clone doesn't auto-pull.
- Bumping without users running `claude plugin update` delivers nothing.
