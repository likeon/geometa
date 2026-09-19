# Legacy userscript snapshots

Keep `dist/geometa.user.js` and `userscript/dist/geometa.user.js` available for old installs.
Migration release `0.96` moves updates to Pages. Publish Pages before merging snapshots.
After migration, both files stay frozen. No deletion deadline.

Normal builds write ignored `userscript/build/`.
For explicit local rebuild, run `pnpm build-legacy` from `userscript/`.
Command overwrites both tracked bundles.
