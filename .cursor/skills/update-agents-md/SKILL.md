---
name: update-agents-md
description: Update existing AGENTS.md files after code changes. Identifies changed files, finds affected AGENTS.md files, classifies changes, then launches parallel code-documentation subagents -- one per affected file so they never interfere with each other. Skips silently when no updates are needed.
---

# Update AGENTS.md

You are following the update-agents-md skill. Your job is to identify which existing AGENTS.md files need updates based on code changes, then launch `code-documentation` subagents to perform the actual edits. You do NOT edit AGENTS.md files yourself -- you delegate that to the worker subagents.

**Core principle**: Only update existing AGENTS.md files. Never create new ones. Skip silently when no updates are needed.

---

## Workflow

### Step 1: Identify Changed Files

Check all changes on the current branch compared to the base branch:

```bash
# Get base branch (usually main or master)
BASE=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD origin/master 2>/dev/null)

# List all changed files on this branch
git diff --name-only $BASE...HEAD
```

Also check for any uncommitted changes:

```bash
git diff --name-only
git diff --cached --name-only
```

### Step 2: Find Relevant AGENTS.md Files

Search for AGENTS.md files in the changed directories and their ancestors:

```bash
# Using NUL-delimited output for robustness with paths containing spaces/newlines
git diff --name-only -z $BASE...HEAD | while IFS= read -r -d '' file; do
  d=$(dirname "$file")
  while [ "$d" != "." ] && [ "$d" != "/" ]; do
    [ -f "$d/AGENTS.md" ] && printf '%s\n' "$d/AGENTS.md"
    d=$(dirname "$d")
  done
done | sort -u

# Also check for root AGENTS.md (the loop above stops before checking ".")
[ -f "./AGENTS.md" ] && echo "./AGENTS.md"
```

**If no AGENTS.md files are found near the changes, STOP IMMEDIATELY.** Do not create new files. End silently.

### Step 3: Classify Changes

For each affected AGENTS.md file, determine whether the nearby code changes warrant an update.

#### Changes That Warrant Updates

| Change type | What to update |
|---|---|
| Build/dev/test commands changed | Setup or testing sections |
| New dependencies or tooling | Setup or dependencies sections |
| File/folder structure reorganized | Structure or module descriptions |
| New coding patterns adopted | Code style or conventions sections |
| API contracts changed | API or integration sections |
| New env vars or config required | Setup or configuration sections |
| CI/CD pipeline changes | Deployment or CI sections |
| New testing utilities or patterns | Testing sections |
| Module boundaries changed | Architecture or module sections |
| New or renamed scripts/commands | Commands sections |

#### Changes That Do NOT Warrant Updates

- Bug fixes within existing patterns
- Content/copy/string changes
- Minor refactors within existing architecture
- Adding individual test cases (no new patterns)
- Version bumps with no behavior change
- Comment or formatting-only changes
- New AGENTS.md files added in this branch (they're already current)

**When in doubt, skip.**

If no AGENTS.md files need updates after classification, STOP silently.

### Step 4: Group Changes by AGENTS.md File

For each AGENTS.md that needs updating, collect:
- The AGENTS.md file path
- The list of relevant changed files near it
- A summary of what changed and which sections are likely affected

#### Nested AGENTS.md Rules
- **Root**: only update if project-wide conventions were affected
- **Nested**: prefer updating the closest AGENTS.md file to the changes
- **No duplication**: don't repeat parent info in child files

### Step 5: Launch Parallel Subagents

For each affected AGENTS.md file, launch a `code-documentation` subagent via the **Task tool** with `subagent_type="code-documentation"`.

Each subagent receives a prompt containing:
1. **Target file**: the specific AGENTS.md file to update
2. **Task**: update the existing AGENTS.md file (do NOT create new ones)
3. **Changed files**: list of code changes relevant to this AGENTS.md
4. **Change summary**: what changed and which sections are likely affected
5. **Update instructions**:
   - Read the full AGENTS.md to understand its structure
   - Map the code changes to specific sections
   - Determine action per section: **Update** (content needs revision), **Extend** (new info to add), **Trim** (references removed code), or **Skip** (still accurate)
   - Edit in place with targeted replacements -- do NOT rewrite entire files
   - Preserve unchanged sections exactly as they are
   - Match existing formatting style
   - Write in imperative, present tense, aimed at AI agents
   - No dates, timestamps, rationale, or history
   - No references to the update process
6. **Anti-patterns to avoid**:
   - Creating new AGENTS.md files
   - Adding changelog/history/timestamps
   - Rewriting unchanged sections
   - Duplicating info between parent and child files
   - Adding aspirational content ("we should...")
   - Touching files outside the assigned AGENTS.md

**Launch all subagents in a single message** so they run in parallel. Each works on a different AGENTS.md file, so they never interfere with each other.

### Step 6: Report Results

After all subagents complete, summarize what was updated (file paths and a one-line description of each change).

---

## Example Subagent Prompt

```
Update the existing AGENTS.md file at `libs/feature-a/AGENTS.md`.

The following files changed near this AGENTS.md:
- libs/feature-a/src/lib/my-service.ts (new service added)
- libs/feature-a/src/lib/my-service.spec.ts (new test)
- libs/feature-a/src/index.ts (updated exports)

These changes likely affect the "Key Services" and "Testing" sections.

Read the full AGENTS.md, then make targeted edits to reflect the current state of the code. Do NOT rewrite unchanged sections. Do NOT create new files. Edit in place, matching existing formatting style.
```
