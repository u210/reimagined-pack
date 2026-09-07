# Unloaded Activity

Selected release: `0.7.2+mc1.21-1.21.1` (beta), Modrinth version `op8NMoDl`.
Official project: https://modrinth.com/mod/unloaded-activity

- Minecraft 1.21.1 and NeoForge are supported by both the official version
  metadata and the JAR's `META-INF/neoforge.mods.toml`.
- Classified `server` in the metafile and distribution registry. No client
  installation is needed; the administrator Prism instance stays unchanged.
- No additional external dependencies are declared. The source JAR's
  SHA-512 was verified against official Modrinth metadata before patching.
- It catches up supported blocks/entities when they are loaded again.
  This does not keep chunks loaded or continuously simulate all machines.
  Upstream documents crop support for Farmer's Delight and flax support for
  Supplementaries; unsupported machines and redstone are not simulated.
- Use upstream default settings initially. Production startup and protected
  configuration checks are recorded in `setup/validation.md`; actual crop
  catch-up behavior in this pack still needs an in-game acceptance check.

The local checkout had not incorporated published Chappy/Exposure commit
`9e5d39e` and its validation commit `1c7d28d`. Those releases are now included.
The server count is 222 (previous published count 221 plus this mod).
The pack validator permits a reviewed server-only mod to be absent from
Prism while still requiring client/both mods and auditing active Prism JARs.

## NeoForge packaging correction (reimagined-1)

The official JAR emits three missing-target warnings on NeoForge 21.1.244:
`class_2609`, `class_1296`, and `class_1472`. Its NeoForge mixin list incorrectly
references the Fabric versions of the furnace, ageable-mob, and sheep mixins.
The correct `_neoforge.class` implementations already exist in the same JAR.

`scripts/patch-unloaded-activity.ps1` checks the exact upstream SHA-512 and
changes only those three names in `unloadedactivity.mixins_neoforge.json`.
It verifies every other ZIP entry is byte-identical, including all class
files and license notices. No Java code or assets are changed. The patched
JAR is server-only, retains its upstream installation filename, and has
automatic upstream updates disabled so they cannot silently revert the fix.

- Upstream source: https://github.com/KeMoonoDev/Unloaded-Activity
- Source artifact: https://cdn.modrinth.com/data/Oo4rJCDP/versions/op8NMoDl/unloadedactivity-0.7.2%2Bmc1.21-1.21.1.jar
- Output: `dist/files/unloadedactivity-0.7.2+mc1.21-1.21.1-reimagined-1.jar`
- SHA-256: `46a55e01fa9ea8e221955c6a5830facb44d20e80e89c585efe66993d98e04120`
- Reproduce with `scripts/patch-unloaded-activity.ps1 -SourceJar <official.jar> -OutputJar <new-output.jar>`.

When updating upstream, check whether this packaging defect is fixed before
restoring normal upstream metadata. See `setup/validation.md` for startup
validation and backup records.
