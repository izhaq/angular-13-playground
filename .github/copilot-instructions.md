# Copilot instructions

## Talking to the owner

Use short, simple words, as if talking to a junior developer. Lead with the main
point; prefer a few bullets or a small table over long paragraphs; explain any
technical term in one line. This applies to explanations only — not to code,
commit messages or PR text. (Same rule as `CLAUDE.md`.)

## Debug-capture v2 (`packages/debug-capture/`)

Most work in this repo is the debug-capture v2 package. Before any work there:

1. Read `packages/debug-capture/docs/specs/HANDOFF.md` — current state, the next
   wave's plan, risks, working rules and Windows setup.
2. Follow `packages/debug-capture/AGENTS.md` — the coding, layer, isolation, test,
   git and review rules. Its rules win over general habits.
3. The design source of truth is `packages/debug-capture/docs/design/HLD.md`.
   Read it by section (the handoff has a map), not whole.

Hard rules:

- Work on side branches. Never commit to `main` or directly to
  `claude/air-gapped-debug-logging-zkn1nr`; open a PR into it and let the owner
  merge.
- Merge commits only (no squash or rebase merges).
- Run `npm run check` in `packages/debug-capture` before every merge, and report
  the numbers (tests, sizes) in the PR.
- Target Chrome 146.0.7680.72+ (the stations), even though the laptop has a newer
  Chrome. No Edge support.
- Ask the owner before anything hard to undo; ask for a "go" before each step.
- Never put an AI model name in commits or PRs.

## The host app (repo root)

An Angular 13 playground. Changes to `packages/debug-capture/` must not affect it.
`.claude/` holds Claude Code skills and commands; you may read them as process
guides (`.claude/skills/using-agent-skills/SKILL.md` is the map), but they are not
required.
