# Reimagined pack operations

## Fixed locations

- Administrator Prism instance: `C:\Users\emb20\AppData\Roaming\PrismLauncher\instances\Reimagined`
- Instance game directory: `<instance>\minecraft`
- Packwiz source of truth: `<repo>\pack`
- VPS SSH alias: `kagoya-minecraft`
- VPS server directory: `/opt/reimagined`

## Safety rules

- Treat the Prism instance as administrator input. Do not delete or rewrite files in it.
- Run `scripts/sync-from-prism.ps1` to copy selected pack content into `pack`.
- Do not publish worlds, logs, screenshots, caches, player data, `options.txt`, `servers.dat`, or authentication data.
- Preserve the server-only Sawmill patch documented in `setup/sawmill-fix.md`; a client sync must not replace the patched server JAR.
- New mod side classifications must be reviewed before VPS deployment. Record them in `distribution.toml` and in each `.pw.toml` metafile.
- Back up the VPS world and verify a candidate server installation before stopping the production service.
- Do not push, publish, restart the VPS, or deploy unless the user requests that action.

## Routine update sequence

1. Inspect the Prism instance and run the sync script.
2. Review added, removed, and changed files plus unresolved local JARs.
3. Confirm/update client/server side classifications.
4. Run `packwiz refresh` and validate the index.
5. Commit/publish only when requested.
6. Back up, stage, validate, and then deploy to the VPS only when requested.
