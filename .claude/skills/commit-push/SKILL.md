---
name: commit-push
description: Commit the working tree and push to BOTH remotes (origin=GitHub, gitlab=GitLab). Use whenever the user asks to commit and push in any wording, e.g. "커밋/푸시해", "커밋 푸시해", "커밋하고 푸시해", "commit and push".
---

# Commit and push to both remotes

1. Stage the intended files and commit (follow the usual commit message rules; end with the Co-Authored-By line).
2. Push to each remote separately, never with a combined push URL:

```bash
branch=$(git branch --show-current)
git push origin "$branch"
git push gitlab "$branch"
```

3. Run both pushes even if the first one fails, then report the result of each remote separately (commit hash, old..new range, or the error text).

Remotes:
- `origin` → git@github.com:juseok1729/ooci.git
- `gitlab` → git@gitlab.com:ooci/ooci.git
