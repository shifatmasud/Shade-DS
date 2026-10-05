---
name: "git"
description: |
  Manage version control and coordinate with remote repositories using the standard pre-installed Git command. This skill covers repository initialization, remote management, branching strategies, and handling authentication in a headless environment.

  Use this skill in the following scenarios:
  * Repository Setup: When initializing new repositories or connecting to existing remotes.
  * Version Control Workflow: For staging changes, committing, and pushing/pulling from remote origins.
  * Remote Management: Configuring and verifying remote URLs.
  * Headless Automation: Performing Git operations within automated scripts and pipelines.
---

# Git Integration Skill

This skill provides guidelines and executable patterns for managing version control using the standard `git` command.

---

## 1. Using Git

### Executing Commands
Call the git command directly:

```bash
git status
```

---

## 2. Repository Initialization & Remotes

### Initializing a Repository
If the project is not yet a Git repository:

```bash
git init
```

### Managing Remotes
Connect your local repository to a remote server (e.g., GitHub):

```bash
# Add a remote origin
git remote add origin https://github.com/username/repo.git

# Verify remotes
git remote -v

# Change remote URL
git remote set-url origin https://github.com/username/new-repo.git
```

---

## 3. Basic Workflow

### Staging and Committing
Prepare changes for versioning:

```bash
# Stage all changes
git add .

# Commit with a message
git commit -m "feat: implement core architecture"
```

### Branching
Manage different lines of development:

```bash
# Create and switch to a new branch
git checkout -b feature/new-task

# Switch back to the main branch
git checkout main

# Merge a branch
git merge feature/new-task
```

---

## 4. Interaction with GitHub

When using GitHub as a remote, leverage the `github-cli` skill for authentication and metadata management.

### Pushing Changes
Push your local commits to the remote repository:

```bash
# Push for the first time (set upstream)
git push -u origin main

# Subsequent pushes
git push
```

### Pulling Updates
Synchronize your local repository with the remote:

```bash
git pull origin main
```

---

## 5. Configuration and Identity

Before performing commits, ensure the local environment has an identity configured:

```bash
git config --global user.email "user@example.com"
git config --global user.name "Your Name"
```
