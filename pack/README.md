# Reimagined packwiz pack

This directory is the distributable packwiz source for Minecraft 1.21.1 / NeoForge 21.1.244.

Do not edit it by copying the whole Prism `minecraft` directory. From the repository root, use:

```powershell
.\scripts\sync-from-prism.ps1
```

The script copies only selected shared pack directories, keeps CurseForge metafiles, ignores personal/runtime data, imports active local JARs, and refreshes `index.toml`.

When a newly added JAR is hosted on CurseForge, this optional detection pass can convert it to a `.pw.toml` metafile:

```powershell
.\scripts\sync-from-prism.ps1 -DetectCurseForge
```

Review side classification and `git diff` after every sync. Publishing URL and the Prism pre-launch command are intentionally not configured until a hosting repository/URL is chosen.

Published pack entry point:

```text
https://u210.github.io/reimagined-pack/pack.toml
```

Prism/MultiMC pre-launch command:

```text
"$INST_JAVA" -jar packwiz-installer-bootstrap.jar https://u210.github.io/reimagined-pack/pack.toml
```

Validate the pack and its coverage of the administrator instance with:

```powershell
.\scripts\test-pack.ps1
```
