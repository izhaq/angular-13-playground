---
name: create-agents-md
description: Create AGENTS.md files for target directories/modules. Analyzes targets, then launches parallel code-documentation subagents -- one per target so they never interfere with each other.
---

# Create AGENTS.md

You are following the create-agents-md skill. Your job is to analyze target directories and launch `code-documentation` subagents to create AGENTS.md files. You do NOT write AGENTS.md files yourself -- you delegate that to the worker subagents.

**Important**: When the user specifies a directory, automatically include all its subdirectories as targets too. Use the scan script (Step 1) to determine which ones need AGENTS.md files.

---

## Workflow

### Step 1: Scan for AGENTS.md Coverage

Run the scan script bundled with this skill to get a deterministic report of which directories already have AGENTS.md files and which don't:

```bash
bash .cursor/skills/create-agents-md/scan-agents-md.sh <target-dir>
```

The script outputs per subdirectory:
- `HAS     <path>` — AGENTS.md already exists, skip it (use update-agents-md skill instead)
- `MISSING <path> (N files)` followed by indented file list — No AGENTS.md, has enough substance → **create one**
- `SKIP    <path> (N files)` — No AGENTS.md, too few files to warrant one → skip it

For `MISSING` entries, the script lists the actual source files (non-test `.ts` files) under each directory. Pass this file list directly into the subagent prompt so it doesn't need to explore the filesystem to discover files.

Use `--min-files N` to adjust the substance threshold (default: 2).

**Collect all `MISSING` paths** — these are your targets.

### Step 2: Gather Context Per Target

For each `MISSING` target directory, collect:
- The directory path and the **file list** from the scan output (already provided — no need to list the directory again)
- A brief summary of its contents (purpose, relationships) based on the file names
- Whether a parent AGENTS.md exists (the child must not duplicate parent info)

To find the nearest parent AGENTS.md, walk up from the target directory. The scan output also shows `HAS` entries for ancestor directories that already have one.

### Step 3: Launch Parallel Subagents

For each target, launch a `code-documentation` subagent via the **Task tool** with `subagent_type="code-documentation"`.

Each subagent receives a prompt containing:
1. **Target path**: the specific directory to document
2. **Task**: create a new AGENTS.md file at `{target_path}/AGENTS.md`
3. **Context**: brief summary of the directory's purpose and contents
4. **Parent AGENTS.md path** (if one exists): so the subagent avoids duplicating parent info
5. **Creation instructions**:
   - Follow the structure template from `.ai-context/guidelines/repository/agents-documentation-guidelines.md`
   - Explore the target directory to understand file organization, patterns, and workflows
   - Apply the 45% Rule for minimal, focused code examples (10-15 lines per example)
   - Write in imperative, present tense, aimed at AI agents
   - Include: module purpose, file structure, key patterns, testing, dependencies

**Launch up to 4 subagents at a time** so they run in parallel. Each works on a different directory, so they never interfere with each other. If there are more than 4 targets, batch them in groups of 4.

### Step 4: Report Results

After all subagents complete, summarize what was created (file paths and a one-line description of each).

---

## Example Usage

### Full run for a module and all its subdirectories

```bash
# 1. Scan
bash .cursor/skills/create-agents-md/scan-agents-md.sh libs/features/wfp/services/src/lib

# Output:
# HAS     libs/features/wfp/services/src/lib/actions
# MISSING libs/features/wfp/services/src/lib/budget (2 files)
#   - budget.service.ts
#   - position-cost-settings-actions-data.service.ts
# MISSING libs/features/wfp/services/src/lib/hooks (4 files)
#   - injectBulkActionsDialog.ts
#   - injectBulkActionsPartition.ts
#   - injectPositionManagementActionsUpdate.ts
#   - useRightPanelParams.ts
# SKIP    libs/features/wfp/services/src/lib/resolvers (1 files)
# ...

# 2. Targets = all MISSING lines → budget/, hooks/, ...
# 3. Launch subagents for each target
# 4. Report results
```

### Example Subagent Prompt

```
Create a new AGENTS.md file at `libs/feature-a/AGENTS.md`.

This directory contains the following source files:
- my-service.ts
- my-helper.service.ts
- my-facade.service.ts

This module handles [brief description].
A parent AGENTS.md exists at `libs/AGENTS.md` -- do not duplicate its content.

Explore these files and create comprehensive AGENTS.md documentation following the structure template in `.ai-context/guidelines/repository/agents-documentation-guidelines.md`. Apply the 45% Rule for code examples.
```
