# Xaero server restrictions (2026-09-06)

The administrator requested server-enforced hiding of other players on Xaero
maps, permitted scoped Prism edits, and authorized restoring online-mode=true
at the next server start. MPI's player-join fix was confirmed in-game by the
administrator before this change.

Xaero Minimap 26.4.2 and World Map 1.44.2 are now classified `both`, rather
than `client`. The existing NeoForge 1.21.1 JAR SHA-1 values match their
packwiz metadata. XaeroLib is embedded in the JARs; no separate dependency
download is needed. The expected VPS mod count increases from 217 to 219.
Official server configuration documentation:
https://www.curseforge.com/minecraft/mc-mods/xaeros-minimap

Both common.cfg files already select `default_enforced_profile = default`.
The following three server-profile files are copied from administrator Prism
to pack and VPS:

- `config/xaero/minimap/server_profiles/default.cfg`: disable
  `tracked_players_on_minimap` and `tracked_players_in_world`; load the
  `entity_radar_categories` value from its JSON companion.
- `config/xaero/minimap/server_profiles/entity_radar_categories/default.cfg.json`:
  `displayed=false` for Players and its Friend, Tracked, Same Team and Other
  Teams subcategories. All non-player categories retain their original values.
- `config/xaero/world-map/server_profiles/default.cfg`: disable
  `display_tracked_players`. The normal minimap radar remains available to
  display mobs, subject to the enforced player-category restriction.

These are server profile overrides, not client UI defaults. Clients receive
the enforced profile from the server. This controls the supported Xaero mods;
it does not remove entity positions from the Minecraft protocol.

The installed JARs were inspected to confirm option IDs, the `displayed`
Boolean category value and the companion JSON path. On VPS startup both mods
reported loading server profiles without config parsing errors; the saved
profile files retained the restriction values and all five player categories
retained `displayed=false`.

Prism affected files were backed up before editing to
`.codex-tmp/xaero-prism-backup-20260906-111019` (the companion JSON did not
previously exist). The sync script's new `-ConfigPaths` mode copies only the
selected Xaero config files and refreshes the index, avoiding unrelated Prism
changes. No client preferences or Prism JARs were changed.

`infra/deploy-xaero-restrictions.py` stages and checks a 219-JAR candidate,
preserves every pre-existing JAR byte-for-byte, backs up the world before and
after shutdown, observes the player and idle-generator guards, and restores
the changed files on startup failure. The successful backup directory is
`/opt/reimagined-backups/xaero-restrictions-20260906-111223`.
The server starts with `online-mode=true`; the original server.properties is
included in the backup. MPI reimagined-2 and the Sawmill patch are preserved.

Pack validation passed: 269 active mods covered, 287 metadata files,
2931 indexed files, no raw local JARs; sides 217 both / 68 client / 2 server.
In-game confirmation of map visibility remains pending.

The initial scoped installation did not publish the pack. Commit `9e5d39e`
subsequently published these Xaero settings and MPI reimagined-2 metadata
on 2026-09-07 alongside Chappy. They are now part of the public pack.
The one-time 219-JAR installation script is historical; use the current
guarded deployment wrapper for future updates.
