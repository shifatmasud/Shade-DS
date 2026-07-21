# Plan: R2 Upload Upgrade for Screenshot Scripts

## PRD (Overview & Objectives)
Modify `scripts/screenshot.ts` and `scripts/screenshot.mjs` to upload screenshot buffers directly to Cloudflare R2 using the `wrangler` CLI instead of saving them to the local filesystem.

## OKR (Success Criteria)
- Successful screenshot capture (as a buffer).
- Successful upload to R2 via `wrangler r2 object put` using `child_process` to pipe stdin.
- No local file creation (`fs` module usage removed).

## ADR (Architectural Design)
We will use Node's `child_process.spawn` to invoke `npx wrangler r2 object put <bucket_name>/<object_key> --stdin`. The buffer from the screenshot operation will be written to the child process's `stdin`.

## TODO
1.  [ ] Create this plan file.
2.  [ ] Update `scripts/screenshot.ts` to implement pipe-to-wrangler.
3.  [ ] Update `scripts/screenshot.mjs` to implement pipe-to-wrangler.
4.  [ ] Verify functionality (requires user to provide bucket name).
