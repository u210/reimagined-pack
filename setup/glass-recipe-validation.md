# Glass recipe validation — 2026-09-06

Status: verified locally, published in d00b3e1, and deployed on 2026-09-06 at 13:21 JST.

The production CNM shape map treats `minecraft:glass` as a shape of
`create:framed_glass`. CNM 2.0.6's `RecipeRemover.removeShapeRecipes` discards
recipes whose output is a shape. This removes `minecraft:glass`, including
the vanilla sand-smelting recipe.

## Comparison

| Check | Original configuration | Glass removed from CNM mapping |
| --- | --- | --- |
| Glass parent | `create:framed_glass` | `minecraft:glass` |
| `minecraft:glass` recipe | Absent | Present |
| Sand smelting match | None | `minecraft:glass` |
| Red sand smelting match | None | `minecraft:glass` |
| Furnace result | Sand and coal remain; no burning | Glass x1 in output; recipe used once |

The original group also contains Create tiled/horizontal/vertical framed glass,
Clayworks glass doors/trapdoors, and Create framed glass doors/trapdoors.

## Method and evidence

- All production Mod JARs were copied/read through `kagoya-minecraft`; every
  SHA-256 matched the captured production manifest.
- Copied server configuration, datapacks, KubeJS scripts, and protected Sawmill
  JAR were used in a separate local server with a new test world. No production
  world or player data was used.
- Minecraft bound to localhost port 25675; voice bound to localhost port 25676.
- Final furnace tests used `item replace` to insert sand and coal via the
  container API, then `tick sprint 400` after insertion confirmation. Output NBT
  was read 25 seconds after insertion. Both final runs exited normally.
- Direct NBT inventory injection and tests timed from the initial Done message
  were discarded as invalid test methods (initialization/time ordering issues).
- Final positive result at 13:05:30 JST: slot 2 `minecraft:glass` x1,
  `RecipesUsed: {"minecraft:glass": 1}`, cooking duration 200 ticks.
- Final negative result after restoring the original mapping at 13:08:45 JST:
  sand x1 and coal x1 remain, BurnTime 0, no recipe used.
- Diagnostic output confirms both sand variants match the restored recipe;
  only ordinary sand was tested through actual furnace processing.

Local evidence and reproducer: `.codex-tmp/glass-validation/`
(`server-mods.sha256`, `run-test.cjs`, `kubejs/server_scripts/glass_probe.js`,
`baseline-verified.log`, `no-glass-mapping.log`).

## Tested candidate

Load this as `data/reimagined/shape_map/glass_validation.json` in a datapack:

```json
{
  "priority": 3000,
  "remove": {
    "minecraft:glass": ["/.*/"],
    "/.*/": ["minecraft:glass"]
  }
}
```

This detaches ordinary glass from CNM shape conversion while retaining CNM for
other blocks. It is a targeted workaround, not a general fix for CNM's choice
of canonical parents. No client JEI UI test or exhaustive other-recipe audit
was performed.

The production service remained active with PID 9018 before and after testing.
No Prism edits, pack updates, commits, publication, production reload, or
production restart were performed. Local test JVMs stopped; remote temporary
input archive was removed.


## Production deployment

See the 2026-09-06 glass entry in validation.md. Backup: /opt/reimagined-backups/glass-fix-20260906-131958. Production recipe checks passed for sand and red sand; Minecraft status returned 1.21.1 / protocol 767. Local testing above preceded the authorized production deployment. The scoped deployment script is glass-recipe-deploy.py.
