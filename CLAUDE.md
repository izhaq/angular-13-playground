# Project Instructions

## Explain Simply

When explaining, summarizing, or analyzing something for the user, use short,
simple words — as if talking to a junior developer.

- Keep it brief. Prefer a few short sentences or bullets over long paragraphs.
- Avoid jargon. If a technical term is needed, give a one-line plain meaning.
- Lead with the main point first, then the "why" if it helps.
- This applies to explanations only — not to code, commit messages, or PR text.

## Agentic Workflow

This project has a full agentic workflow under `.claude/`:

- `.claude/skills/` — process skills organized by development phase (spec-driven
  development, planning, TDD, code review, security, performance, shipping,
  etc.). See `.claude/skills/using-agent-skills/SKILL.md` for the routing map.
- `.claude/agents/` — specialist subagent personas (`code-reviewer`,
  `security-auditor`, `test-engineer`) usable via the Task tool.
- `.claude/commands/` — slash commands (`/iz-spec`, `/iz-plan`, `/iz-build`,
  `/iz-test`, `/iz-review`, `/iz-code-simplify`, `/iz-ship`) that chain the
  skills and agents above into end-to-end workflows.
