$ErrorActionPreference = 'Stop'
$source = 'C:\Users\emb20\AppData\Roaming\PrismLauncher\instances\Reimagined\minecraft'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
if (Test-Path 'setup\mod-manifest.csv') { throw 'Initial preparation already completed. Do not overwrite a configured server with this script.' }
# Client rendering, UI, audio, input and single-player hosting integrations.
$clientPattern = '^(AmbientSounds|AsyncParticles|auto_third_person|BadOptimizations|blur-|cherishedworlds|chloride-|colorwheel-|continuity-|controllable-|Controlling-|entity_model_features|entity_texture_features|entityculling-|EuphoriaPatcher-|extrasounds-|ExtremeSoundMuffler-|fancymenu_|fancytoasts-|fast-ip-ping-|ImmediatelyFast-|ImmersiveUI-|iris-|item_descriptions-|ItemPhysicLite_|Ixeris-|lambdynamiclights-|localmodtranslator-|melody_|modtabs-|moreculling-|MouseTweaks-|music-and-melody-|nomusicpause-|Not Enough Recipe Book|notenoughanimations-|nowheel-|OverflowingBars-|particle_core-|particular-|punchy-|pv-addon-soundphysics-|sodium-|sound-physics-remastered-|super_resolution-|Too Many Entities |tooltipoverhaul-|world-host-|xaerominimap-|xaeroworldmap-|hidetab-)'
New-Item -ItemType Directory mods -Force | Out-Null
$report = foreach ($file in Get-ChildItem -LiteralPath "$source\mods" -File) {
    if ($file.Extension -ne '.jar') { $action = 'excluded-disabled' }
    elseif ($file.Name -match $clientPattern) { $action = 'excluded-client' }
    else { Copy-Item -LiteralPath $file.FullName -Destination mods; $action = 'included' }
    [pscustomobject]@{File=$file.Name; Action=$action; SHA256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash}
}
$report | Export-Csv setup\mod-manifest.csv -NoTypeInformation -Encoding utf8
foreach ($dir in @('config','defaultconfigs','kubejs','datapacks','moonlight-global-datapacks','coremods','tlm_custom_pack')) {
    if (Test-Path -LiteralPath "$source\$dir") { Copy-Item -LiteralPath "$source\$dir" -Destination $root -Recurse }
}
$report | Group-Object Action | Select-Object Name,Count

