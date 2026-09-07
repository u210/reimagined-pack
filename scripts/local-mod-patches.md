# Reimagined local patches (2026-09-06)

Unloaded Activity 0.7.2 has a server-only NeoForge packaging correction in
`dist/files/unloadedactivity-0.7.2+mc1.21-1.21.1-reimagined-1.jar`.
Only three mixin configuration references change; all Java class files remain
upstream-identical. Reproduction and source are in `setup/unloaded-activity.md`.

MPI VPS hotfix: `dist/files/Multiplayer-Isolation-2.1-reimagined-2.jar` fixes
the second-player `NoSuchFieldException: entries` while retaining the existing
log suppression. Build, verification and publication status are documented in
`setup/mpi-patch/README.md`. Do not overwrite this VPS hotfix with reimagined-1
on the next pack deployment; publish updated metadata first when authorized.

The two versioned JARs in `dist/files` are served by Pages. Their existing
packwiz metafiles retain original installation filenames and side classifications
(Clutter No More: both; Multiplayer Isolation: server). Upstream auto-update
blocks are removed so a routine update cannot silently discard these patches.

- Clutter No More 2.0.6: remove only `recipe.IngredientMixin` from
  `clutternomore.mixins.json`. Keep the recipe-removal/rewrite mixins. SHA256:
  `6dd42a55d04965c3e37c93bb94ed1fa2ceaf63903bb61588b7ee15913c907394`.
- Multiplayer Isolation 2.1: replace the two debug PrintStream.println calls in
  `CommandMixins.removePlayers` with POP2 (same stack effect). All other archive
  entries remain unchanged. SHA256:
  `d75039cbdbae5e24f565822b200d44a43d785087c320cfea3b2c785e00e52149`.

`pack/datapacks/cnm-no-color-aliases.zip` removes cross-color mappings, Quark /
Every Compat chest mappings, raw-wood links, and Decorative Blocks / Every Compat
beam links. Separate log/wood and stem/hyphae pairs are restored at priority 2001.
Beams must not belong to plank shape sets: they are also members of log tags,
which otherwise lets CNM rewrite log-to-four-planks ingredients into plank shapes.
The administrator confirmed this beam exclusion resolves sign-to-four-planks
duplication. Preserve these overrides when updating CNM or cnmtweaks.

Prism sync matches hosted mods by filename; it does not detect a changed JAR
with the same name. Compare SHA256 with these pinned artifacts during future
updates. The private server-only Sawmill patch is separate and still mandatory.
