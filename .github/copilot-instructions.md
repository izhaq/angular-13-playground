# Copilot instructions

## Talking to the owner

Use short, simple words, as if talking to a junior developer. Lead with the main
point; prefer a few bullets or a small table over long paragraphs; explain any
technical term in one line. This applies to explanations only — not to code,
commit messages or PR text. (Same rule as `CLAUDE.md`.)

## Debug-capture (its own repository now)

The debug panel package lives in **[`izhaq/debug-capture`](https://github.com/izhaq/debug-capture)**
(its source, design, specs, tests and releases). Work on the package happens there. This
repo only uses it: `vendor/debug-capture-<version>.tgz`, wired in
`src/app/features/debug-panel/` (the only folder that may import it; `npm run lint:layers`
checks this). How to use, update or remove it: `docs/debug-panel.md`.

Hard rules:

- Work on side branches. Never commit to `main` or directly to
  `claude/air-gapped-debug-logging-zkn1nr`; open a PR into it and let the owner
  merge.
- Merge commits only (no squash or rebase merges).
- Target Chrome 146.0.7680.72+ (the stations), even though the laptop has a newer
  Chrome. No Edge support.
- Ask the owner before anything hard to undo.
- Never put an AI model name in commits or PRs.

## The host app (repo root)

An Angular 16.2 playground (the repo started on Angular 13).
`.claude/` holds Claude Code skills and commands; you may read them as process
guides (`.claude/skills/using-agent-skills/SKILL.md` is the map), but they are not
required.
