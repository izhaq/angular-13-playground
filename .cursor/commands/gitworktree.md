# Git Worktree Command

This is a Cursor AI command for managing git worktrees.

## Command Name
`gitworktree`

## Description
Setup a fresh branch from master in an existing git worktree, work on changes, and optionally clean up when done.

## Workflow
# Following the gitworktree.md workflow EXACTLY as written
### Step 1: Setup Branch in Existing Worktree
```bash
# Assumption: User has already created a worktree and is working in it


# Check current branch
CURRENT_BRANCH=$(git branch --show-current)

# If not on master, stash changes and checkout to master
if [ "$CURRENT_BRANCH" != "master" ]; then
  echo "Currently on branch: $CURRENT_BRANCH"
  echo "Stashing local changes and switching to master..."
  
  # Stash any local changes (including untracked files)
  git stash push -u -m "Auto-stash before switching to master from $CURRENT_BRANCH"
  
  # Checkout to master
  git checkout master
fi

# Fetch latest changes to ensure we have the most recent master
git fetch origin
git reset --hard origin/master

# Ask user for branch name or generate one
echo "Enter branch name (or press Enter for auto-generated name):"
read BRANCH_NAME

# If no branch name provided, generate one
if [ -z "$BRANCH_NAME" ]; then
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  BRANCH_NAME="feature/cursor-ai-${TIMESTAMP}"
fi

# Create and checkout new branch from master
git checkout -b "$BRANCH_NAME"

echo "Created and switched to new branch: $BRANCH_NAME"
echo "Ready to start working on your changes!"
```

### Step 2: Agent Instructions
After setting up the branch in the existing worktree, the AI agent should:
1. Confirm the branch was created successfully and master is up to date
2. Ask the user what they want to work on
3. Help with the requested task
4. Keep track of the current branch name for future reference

### Step 3: Branch Cleanup (After User Completes Work)
When the user indicates they're done:
1. Ask: "Would you like me to clean up this branch and switch back to master?"
2. If user confirms (yes/agree/cleanup):
   ```bash
   # Get current branch name
   CURRENT_BRANCH=$(git branch --show-current)
   
   # Switch back to master
   git checkout master
   
   # Ask if they want to delete the feature branch
   echo "Delete branch '$CURRENT_BRANCH'? (y/N):"
   read DELETE_BRANCH
   
   if [[ "$DELETE_BRANCH" =~ ^[Yy]$ ]]; then
     # Delete the branch (force if needed)
     git branch -D "$CURRENT_BRANCH"
     echo "Branch '$CURRENT_BRANCH' deleted successfully"
   else
     echo "Branch '$CURRENT_BRANCH' kept for future use"
   fi
   
   # Ask if they want to delete the current worktree
   CURRENT_WORKTREE=$(pwd)
   MAIN_WORKTREE=$(git worktree list | head -n 1 | awk '{print $1}')
   
   echo "⚠️  WARNING: This will permanently delete the current worktree!"
   echo "Current worktree path: $CURRENT_WORKTREE"
   echo "You will be switched back to: $MAIN_WORKTREE"
   echo ""
   echo "Do you want to delete the current worktree? (y/N):"
   read DELETE_WORKTREE
   
   if [[ "$DELETE_WORKTREE" =~ ^[Yy]$ ]]; then
     echo "Confirming worktree deletion..."
     
     # Double check we're not in the main worktree
     if [ "$CURRENT_WORKTREE" = "$MAIN_WORKTREE" ]; then
       echo "❌ Error: Cannot delete the main worktree!"
       echo "You are currently in the main repository worktree."
       return 1
     fi
     
     # Switch to main worktree first
     echo "Switching to main worktree: $MAIN_WORKTREE"
     cd "$MAIN_WORKTREE"
     
     # Verify we successfully switched
     if [ "$(pwd)" != "$MAIN_WORKTREE" ]; then
       echo "❌ Error: Failed to switch to main worktree!"
       return 1
     fi
     
     # Remove the worktree with force flag
     echo "Removing worktree: $CURRENT_WORKTREE"
     if git worktree remove --force "$CURRENT_WORKTREE"; then
       echo "✅ Worktree '$CURRENT_WORKTREE' deleted successfully"
       echo "✅ Switched back to main worktree: $MAIN_WORKTREE"
       
       # Verify the worktree was actually removed
       if git worktree list | grep -q "$CURRENT_WORKTREE"; then
         echo "⚠️  Warning: Worktree may still be listed in git worktree list"
         echo "You may need to run: git worktree prune"
       else
         echo "✅ Worktree removal confirmed"
       fi
     else
       echo "❌ Error: Failed to remove worktree '$CURRENT_WORKTREE'"
       echo "You may need to manually remove it or check for uncommitted changes"
       return 1
     fi
   else
     echo "Worktree kept for future use"
     echo "Switched back to master in current worktree"
   fi
   ```

## Usage
User types: `@gitworktree` or invokes this command, then the AI agent follows the workflow above.

## Notes
- Assumes user is already working in a git worktree
- Branches are created from latest `origin/master`
- Auto-generated branch format: `feature/cursor-ai-{YYYYMMDD-HHMMSS}`
- Branch cleanup requires user confirmation
- Worktree deletion is optional and requires separate user confirmation
- If worktree is deleted, user is switched back to the main worktree

--- End Command ---
