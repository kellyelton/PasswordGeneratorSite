# Auto-Deployment Configuration

This document explains the changes made to enable automatic deployment without admin approval.

## Problem
The build/deploy workflow was requiring admin approval before running, preventing automatic deployment on merge to master.

## Solution
The workflow has been updated with the following changes:

### 1. Explicit Permissions
Added comprehensive permissions to ensure the workflow can execute automatically:
```yaml
permissions:
  contents: read        # Read repository contents
  actions: read         # Read workflow artifacts  
  security-events: write # Write security events
  deployments: write    # Create deployment statuses
  statuses: write       # Update commit statuses
```

### 2. Concurrency Control
Added concurrency management to prevent deployment conflicts:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false
```

This ensures:
- Only one deployment runs at a time per branch
- Deployments don't get cancelled if multiple triggers occur
- Prevents resource conflicts that might require manual intervention

### 3. Enhanced Logging
Added explicit logging to track automatic deployment execution:
- Logs when auto-deployment starts
- Shows trigger information (commit, actor, etc.)
- Confirms successful completion without admin approval

## How It Works

1. **Trigger**: When code is merged to master branch (push event)
2. **Automatic Execution**: Workflow runs immediately without approval
3. **Build & Test**: Code is built and tested first
4. **Conditional Deployment**: Only deploys if on master branch and push event
5. **Maintenance Mode**: Safely handles deployment with app_offline.htm
6. **Verification**: Confirms deployment completed successfully

## Expected Behavior

- ✅ Workflow runs automatically on merge to master
- ✅ No admin approval required
- ✅ Clear logging of automatic execution
- ✅ Safe deployment process with maintenance mode
- ✅ Verification of successful deployment

The workflow will now run completely automatically when PRs are merged to master, without requiring any manual intervention or admin approval.