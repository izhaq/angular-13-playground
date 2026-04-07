---
name: fix-pr-comments
description: Fix PR review comments by checking out the PR branch, addressing feedback, running tests, and pushing changes. Creates new branch if PR is closed/merged. Use when fixing PR review comments.
---

# Fix PR Comments

Fix PR review comments by checking out the branch, addressing feedback, running tests, and pushing changes.

## Usage

```
/fix-pr-comments <PR_NUMBER> [--comments <COMMENT_IDS>]
```

## Process

### Step 1: Parse Input
Extract PR number from user input. Accept PR number or full URL.

### Step 2: Fetch PR Information
```bash
PR_DATA=$(gh pr view <PR_NUMBER> --json number,headRefName,headRefOid,baseRefName,url,state)
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
REVIEW_COMMENTS=$(gh api repos/$REPO/pulls/<PR_NUMBER>/comments --paginate)
GENERAL_COMMENTS=$(gh api repos/$REPO/issues/<PR_NUMBER>/comments --paginate)
```

### Step 3: Analyze Comments
- Skip bot comments and resolved threads
- Focus on actionable feedback requesting changes
- If `--comments` provided, only process those IDs

### Step 4: Stash Local Changes
```bash
if ! git diff-index --quiet HEAD --; then
  git stash push -u -m "Stashed before fixing PR #<PR_NUMBER> comments"
fi
```

### Step 5: Checkout Branch
- **PR is OPEN**: checkout head branch, pull latest
- **PR is CLOSED**: create `fix/pr-<NUMBER>-review-comments` from head commit
- **PR is MERGED**: create `fix/pr-<NUMBER>-review-comments` from base branch

### Step 6: Fix Comments
For each actionable comment:
1. Read the file mentioned
2. Understand the feedback
3. Make the fix
4. Verify it addresses the comment

### Step 7: Run Tests
```bash
ng test --no-watch --browsers=ChromeHeadless
ng build
```

### Step 8: Handle Test Failures
If tests fail: analyze, fix, re-run until all pass. Do NOT push broken code.

### Step 9: Commit and Push
```bash
git add .
git commit -m "fix: address PR review comments from #<PR_NUMBER>"
git push origin <BRANCH_NAME>
```
If PR was closed/merged, create new PR:
```bash
gh pr create --base <BASE_BRANCH> --head <BRANCH_NAME> \
  --title "fix: address review comments from #<PR_NUMBER>" \
  --body "Addresses review feedback from #<PR_NUMBER>"
```

### Step 10: Restore Stash (if applicable)

## Important Rules
1. Always stash local changes first
2. Always run tests before pushing
3. Fix tests if they fail
4. Only fix actionable comments
5. Use descriptive commit messages referencing the PR number

## Dependencies
- `gh` (GitHub CLI), `git`, `jq`
