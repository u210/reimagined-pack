# MPI 2.1 player join fix

`Multiplayer-Isolation-2.1-reimagined-2.jar` builds on the existing debug-log
suppression patch. SHA-256:
`c38eef229818c7be589c7e02781605967865c29188790d3bc17095d486467a8e`.

When a second player joined on 2026-09-06, `Util.ResetHiddenPlayerFor` threw
`NoSuchFieldException: entries` and Minecraft disconnected them with
`Invalid player data`. Connector remaps the class references but not the
reflection string `entries`; the NeoForge field is `itemsById`.

The patch replaces the one name-based lookup with an exact, non-static field
type lookup. Its DataItem-array class literal can be remapped by Connector.
The helper rejects absent or ambiguous fields. The packet sequence, entity
metadata serialization, configuration and other MPI classes are unchanged.
The previous two debug-print removals remain intact.

Build from the repository root with the existing JDK and bundled ASM:

```powershell
New-Item -ItemType Directory -Force .codex-tmp/mpi-patch | Out-Null
javac -cp libraries/org/ow2/asm/asm/9.10.1/asm-9.10.1.jar -d .codex-tmp/mpi-patch setup/mpi-patch/FieldLookup.java setup/mpi-patch/PatchMpi.java setup/mpi-patch/TestFieldLookup.java
java -cp .codex-tmp/mpi-patch TestFieldLookup
java -cp '.codex-tmp/mpi-patch;libraries/org/ow2/asm/asm/9.10.1/asm-9.10.1.jar' PatchMpi dist/files/Multiplayer-Isolation-2.1-reimagined-1.jar dist/files/Multiplayer-Isolation-2.1-reimagined-2.jar .codex-tmp/mpi-patch/me/virusnest/mpi/reimagined/FieldLookup.class
```

Tests cover private-field access under both naming schemes, unrelated/static
fields, and absent/ambiguous targets. Archive comparison verifies that only
`Util.class` changes and one helper is added. Real two-player joining and the
visibility behavior still require an in-game check.

`deploy.py` stages the existing mod set with only this JAR changed, refuses
connected players, pauses the idle world generator under its maintenance lock,
backs up the world before and after a clean stop, and restores the old JAR on
startup failure. Startup detection is scoped to the systemd invocation ID.
It is a one-time hotfix script expecting the exact reimagined-1 input hash.

This is a VPS hotfix, not a Pages publication. The published packwiz metadata
still refers to reimagined-1; before the next normal pack deployment, update
the MPI metadata to reimagined-2, refresh/test the pack, and publish when
authorized. Otherwise the normal deployment would replace this hotfix.

Deployment on 2026-09-06 (JST): the patched server reached `Done` and responded
to a Minecraft status request through an SSH tunnel using `kagoya-minecraft`
(Minecraft 1.21.1 / protocol 767). Connector's generated JAR was inspected:
the new class literal correctly maps to `SynchedEntityData$DataItem[]`.
MPI.json is byte-identical, online-mode remains false, and the protected
Sawmill SHA-256 remains `85eebbec566b9322a4a70223e3b9f53399d606f7a9b763ccced4f7d4a73844f8`.
Backup: `/opt/reimagined-backups/mpi-fix-20260906-105957`.
The first attempt restored the original JAR after a stale-log readiness false
positive; the readiness check was corrected and the original server was
confirmed ready before retrying. Both attempts' world backups were retained.
In-game two-player verification remains pending.
