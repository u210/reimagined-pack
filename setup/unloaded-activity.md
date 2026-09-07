# Unloaded Activity

Selected release: `0.7.2+mc1.21-1.21.1` (beta), Modrinth version `op8NMoDl`.
Official project: https://modrinth.com/mod/unloaded-activity

- Minecraft 1.21.1 and NeoForge are supported by both the official version
  metadata and the JAR's `META-INF/neoforge.mods.toml`.
- Classified `server` in the metafile and distribution registry. No client
  installation is needed; the administrator Prism instance stays unchanged.
- No additional external dependencies are declared. The downloaded JAR's
  SHA-512 matches the official metadata and the packwiz metafile.
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
