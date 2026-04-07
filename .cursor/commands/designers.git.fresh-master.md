```bash
# Check current branch
CURRENT_BRANCH=$(git branch --show-current)

# If not on master, switch to master first
if [ "$CURRENT_BRANCH" != "master" ]; then
  echo "⚠️  Warning: Currently on branch '$CURRENT_BRANCH', not master"
  echo "Switching to master before resetting..."
  
  # Stash any local changes before switching
  git stash push -u -m "Auto-stash before switching to master from $CURRENT_BRANCH"
  
  # Checkout to master
  git checkout master || {
    echo "❌ Error: Failed to switch to master branch"
    exit 1
  }
  
  echo "✓ Switched to master branch"
fi

# Stash any local changes on master
git stash push -u -m "Stashed before refreshing master from origin"

# Fetch latest from origin
git fetch origin master

# Reset local master to match origin/master (discarding local commits)
git reset --hard origin/master

echo "✓ Master branch refreshed from origin/master"
echo "✓ Local changes stashed (use 'git stash pop' to restore)"
```
