---
name: publish-preview
description: Put a saved rig page on a public HTTPS link with GitHub Pages, and later upload over it without the lane marker (ADR 0003). Use for a plan's "Preview for review" and "Clean up" steps.
---

# publish-preview

A preview is one HTML file on a public host we can upload over (ADR 0003). This lane uses GitHub
Pages from a separate, preview-only repo: never the rig repo, because a preview there stays in its
history with the marker. Needs `gh`, signed in. Ask the human before each upload: it is public.

## Save the page

With a command, not a browser's "save as". Use a second port so the running rig and `.env` stay
as they are; keep the file outside this repo.

```sh
PORT=8788 pnpm start &                     # with marker, from .env
curl -s localhost:8788/digest/<night> -o <tmp>/index.html
```

For the clean copy, start it with `LANE_MARKER=` (empty wins over `.env`): the banner reads
"no marker set". Check: `grep -c <marker> index.html` is 0.

## First upload

```sh
cd <tmp> && git init -q -b main && git add index.html && git commit -qm "preview: <page>"
gh repo create <owner>/<repo>-preview --public --source . --push
gh api -X POST repos/<owner>/<repo>-preview/pages -f 'source[branch]=main' -f 'source[path]=/'
```

The link is `https://<owner>.github.io/<repo>-preview/`. The first build takes about a minute:
poll with `curl -s -o /dev/null -w '%{http_code}'` until 200, then check the page shows the
marker, signed out, before you send it. Keep the preview issue open until the reviewer has looked.

## Upload over it (clean-up)

Replace the file as one orphan commit and force-push, so the repo keeps only the clean version:

```sh
cp <clean>/index.html index.html
git checkout -q --orphan clean && git add index.html && git commit -qm "preview: no lane marker"
git branch -D main && git branch -m main && git push -f origin main
```

Poll the link until the marker count is 0 and "no marker set" shows (Pages' cache clears in about
2 minutes). Then close the clean-up issue. To take the preview down entirely:
`gh repo delete <owner>/<repo>-preview` (the human runs or approves it).
