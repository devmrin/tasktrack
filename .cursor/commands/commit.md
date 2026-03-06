Stage all changes and create a concise commit in this repo's style.

Rules:
- Use `git add .`
- Commit format must be: `<type>: <short message>`
- Allowed `<type>`: `feat` or `fix` (default to `fix` if unclear)
- Keep message lowercase, concise, and no trailing period
- Match recent style like: `feat: add ticket history`, `fix: sync issue for ticket`

Flow:
1) Run `git status --short` and `git diff --staged --stat` (after staging) to verify what is included.
2) Run `git add .`
3) Generate a concise message from the staged changes using the format above.
4) Run `git commit -m "<generated-message>"`
5) Run `git status --short` and show a brief result summary.
