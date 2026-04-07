---
name: open-pr
description: Create a pull request for staged changes only. Analyzes code diff to generate meaningful descriptions. Never stages unstaged changes. Use when creating PRs.
---

# Open Pull Request

Create a pull request for staged changes. Analyze changes and generate all required parameters.

## Process

### Step 1: Verify Staged Changes

**CRITICAL: Only works with staged changes. NEVER stage unstaged changes.**

1. Run `git status` to check for staged changes
2. If NO staged changes: STOP and inform user to `git add <files>` first
3. If unstaged changes exist: warn they will NOT be included

### Step 2: Analyze Changes

1. Run `git diff --cached --stat` for summary
2. Run `git diff --cached` for actual code changes
3. Generate:
   - **Branch name**: meaningful kebab-case (e.g., `feature/add-task-creation`)
   - **Title**: conventional commit format (e.g., `feat(tasks): add task creation form`)
   - **Commit message**: same as title or more detailed
   - **Description**: 2-3 sentence summary + bullet points of key changes

### Step 3: Create Branch (if on default branch)

If currently on `main` or `master`:
```bash
git checkout -b <generated-branch-name>
```

### Step 4: Commit and Push

```bash
git commit -m "<generated-commit-message>"
git push -u origin HEAD
```

### Step 5: Create PR

```bash
gh pr create \
  --title "<generated-title>" \
  --body "<generated-description>"
```

### Step 6: Present Result

Present the PR URL as a clickable markdown link: `[PR URL](PR URL)`

## Important Rules

1. **NEVER stage unstaged changes** -- Only commit what the user has explicitly staged
2. **Generate meaningful descriptions** -- Analyze the actual code changes
3. **Follow conventional commits** -- `type(scope): description`
4. **Check for user branch naming conventions** -- Follow any existing patterns

## Dependencies

- `gh` (GitHub CLI): Must be installed and authenticated
- `git`: Standard git CLI
