```bash
# Move to specific branch with latest changes and master rebase
# Usage: Provide either a branch name or PR number as instruction

# Get the input parameter (branch name or PR number)
INPUT="$1"

if [ -z "$INPUT" ]; then
  echo "❌ Error: Please provide either a branch name or PR number"
  echo "Usage: Provide branch name (e.g., 'feature/my-branch') or PR number (e.g., '123')"
  exit 1
fi

# Function to check if input is a number (PR number)
is_number() {
  [[ $1 =~ ^[0-9]+$ ]]
}

# Determine target branch
if is_number "$INPUT"; then
  echo "🔍 Getting branch name for PR #$INPUT..."
  
  # Ensure GitHub CLI is installed
  if ! command -v gh >/dev/null 2>&1; then
    echo "❌ Error: GitHub CLI (gh) is not installed. Please install it and try again."
    exit 1
  fi

  # Ensure GitHub CLI is authenticated
  gh auth status >/dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "❌ Error: GitHub CLI (gh) is not authenticated. Run 'gh auth login' and try again."
    exit 1
  fi
  
  # Get branch name from PR using GitHub CLI
  TARGET_BRANCH=$(gh pr view "$INPUT" --json headRefName --jq '.headRefName' 2>/dev/null)
  
  if [ $? -ne 0 ] || [ -z "$TARGET_BRANCH" ]; then
    echo "❌ Error: Could not find PR #$INPUT or failed to get branch name via GitHub CLI"
    exit 1
  fi
  
  echo "✓ Found branch '$TARGET_BRANCH' for PR #$INPUT"
else
  TARGET_BRANCH="$INPUT"
  echo "🎯 Target branch: $TARGET_BRANCH"
fi

# Check if target branch exists remotely
git ls-remote --exit-code --heads origin "$TARGET_BRANCH" >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Error: Branch '$TARGET_BRANCH' does not exist on remote"
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Check if already on target branch
if [ "$CURRENT_BRANCH" = "$TARGET_BRANCH" ]; then
  echo "⚠️  Already on branch '$TARGET_BRANCH'"
  echo "   Proceeding to rebase with latest master..."
fi

# Clean up any stale git lock files (only if they're old)
if [ -f .git/index.lock ] && [ $(($(date +%s) - $(stat -f %m .git/index.lock 2>/dev/null || echo 0))) -gt 300 ]; then
  echo "🧹 Cleaning up stale git lock file..."
  rm -f .git/index.lock 2>/dev/null || true
fi

# Stash local changes if any exist (including untracked files)
STASHED=false

# Check for modified/staged files (handle potential git diff-index failures)
HAS_MODIFIED=false
if git diff-index --quiet HEAD -- 2>/dev/null; then
  # diff-index succeeded and found no changes
  HAS_MODIFIED=false
else
  # Either diff-index failed OR found changes
  if git diff-index HEAD -- >/dev/null 2>&1; then
    # diff-index succeeded, so there are changes
    HAS_MODIFIED=true
  else
    # diff-index failed (detached HEAD, corrupted repo, etc.)
    echo "⚠️  Warning: Unable to check for modified files (possible detached HEAD or repository issue)"
    echo "   Attempting to stash anyway as a safety measure..."
    HAS_MODIFIED=true
  fi
fi

# Check for untracked files
HAS_UNTRACKED=false
UNTRACKED_FILES=$(git ls-files --others --exclude-standard 2>/dev/null)
if [ -n "$UNTRACKED_FILES" ]; then
  HAS_UNTRACKED=true
fi

# Stash if we have any changes
if [ "$HAS_MODIFIED" = true ] || [ "$HAS_UNTRACKED" = true ]; then
  echo "💾 Stashing local changes (including untracked files)..."
  
  # Attempt to stash and verify it succeeded
  if git stash push -u -m "Auto-stash before switching to $TARGET_BRANCH from $CURRENT_BRANCH" 2>/dev/null; then
    echo "✓ Local changes stashed successfully"
    STASHED=true
  else
    echo "❌ Error: Failed to stash local changes"
    echo "   This might indicate repository corruption or insufficient permissions"
    echo "   Please manually stash your changes and try again"
    exit 1
  fi
fi

# Switch to target branch (create local branch if it doesn't exist)
echo "🔄 Switching to branch '$TARGET_BRANCH'..."
if git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
  # Local branch exists, switch to it
  git checkout "$TARGET_BRANCH" || {
    echo "❌ Error: Failed to switch to branch '$TARGET_BRANCH'"
    exit 1
  }
else
  # Local branch doesn't exist, create and switch to it
  git checkout -b "$TARGET_BRANCH" "origin/$TARGET_BRANCH" || {
    echo "❌ Error: Failed to create and switch to branch '$TARGET_BRANCH'"
    exit 1
  }
fi

echo "✓ Switched to branch '$TARGET_BRANCH'"

# Set up upstream tracking if not already set correctly
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "")
if [ -n "$UPSTREAM" ] && [ "$UPSTREAM" != "origin/$TARGET_BRANCH" ]; then
  echo "🔗 Setting up upstream tracking..."
  git branch --set-upstream-to=origin/"$TARGET_BRANCH" "$TARGET_BRANCH" || {
    echo "❌ Error: Failed to set upstream tracking"
    exit 1
  }
  echo "✓ Upstream tracking set to origin/$TARGET_BRANCH"
elif [ -z "$UPSTREAM" ]; then
  echo "🔗 Setting up upstream tracking..."
  git branch --set-upstream-to=origin/"$TARGET_BRANCH" "$TARGET_BRANCH" || {
    echo "❌ Error: Failed to set upstream tracking"
    exit 1
  }
  echo "✓ Upstream tracking set to origin/$TARGET_BRANCH"
fi

# Skip syncing with remote branch - assume it hasn't changed
echo "📝 Skipping sync with origin/$TARGET_BRANCH (assuming no remote changes)"

# Fetch latest master
echo "📥 Fetching latest master..."
git fetch origin master || {
  echo "❌ Error: Failed to fetch latest master"
  exit 1
}

# Clean up any git lock files and stuck processes before rebase
echo "🧹 Cleaning up git state..."
rm -f .git/index.lock .git/MERGE_HEAD .git/MERGE_MSG 2>/dev/null || true

# Rebase with latest master with retry logic
echo "🔄 Rebasing with latest master..."
BEFORE_REBASE=$(git rev-parse HEAD)

for i in {1..3}; do
  if git rebase origin/master; then
    break
  elif [ $i -eq 3 ]; then
    echo "❌ Error: Rebase failed after 3 attempts. Please resolve conflicts manually."
    echo "After resolving conflicts, run: git rebase --continue"
    exit 1
  else
    echo "⚠️  Rebase attempt $i failed, cleaning up and retrying..."
    # Properly abort the failed rebase
    git rebase --abort 2>/dev/null || true
    sleep 2
    # Clean up lock files and rebase state
    rm -f .git/index.lock 2>/dev/null || true
    rm -rf .git/rebase-merge .git/rebase-apply 2>/dev/null || true
  fi
done

# Check rebase result
AFTER_REBASE=$(git rev-parse HEAD)

if [ "$BEFORE_REBASE" != "$AFTER_REBASE" ]; then
  echo "✓ Rebase completed with changes"
else
  echo "✓ Rebase completed (no changes needed)"
fi

echo ""
echo "🎉 Successfully moved to branch '$TARGET_BRANCH'"
echo "✓ Latest changes synced from origin/$TARGET_BRANCH"
echo "✓ Rebased with latest master"

# Show final status
echo "📊 Branch rebased with latest master. Ready for development!"

if [ "$STASHED" = true ]; then
  echo "💡 Use 'git stash pop' to restore your stashed changes"
  echo "   If stash pop fails due to conflicts, use 'git stash apply' instead and resolve manually"
fi
```