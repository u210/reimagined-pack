"""Scoped glass fix deployment; invoke only through kagoya-minecraft."""
from pathlib import Path
import datetime, fcntl, hashlib, json, runpy, shutil, socket, subprocess, time

ROOT = Path('/opt/reimagined')
INPUT = Path('/opt/reimagined-deploy/glass-input')
REL = Path('kubejs/data/reimagined/shape_map/glass_validation.json')
PROBE = Path('kubejs/server_scripts/glass_deploy_probe.js')
EXPECTED = 'd428a8a5ab4175cb79e6c2a8ca5a589aabb727dd77dede3db2fc538ba0a3499f'
def run(*args):
    return subprocess.check_output(args, text=True).strip()
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def property_settings(path):
    # Minecraft rewrites the timestamp comment on every startup.
    return b'\n'.join(line for line in path.read_bytes().splitlines() if not line.startswith(b'#'))
def no_players():
    assert not run('ss','-Htn','state','established','sport','=',':25565'), 'Players connected; refusing shutdown'
def mods(folder):
    return {p.name:sha(p) for p in folder.glob('*.jar')}
def ready():
    invocation=run('systemctl','show','reimagined.service','-p','InvocationID','--value')
    for _ in range(100):
        if run('systemctl','is-active','reimagined.service') != 'active':
            raise RuntimeError('Service stopped during startup')
        log=run('journalctl','_SYSTEMD_INVOCATION_ID='+invocation,'--no-pager','-o','cat')
        if 'Done (' in log:
            try:
                with socket.create_connection(('127.0.0.1',25565),timeout=3):
                    return log
            except OSError:
                pass
        time.sleep(3)
    raise RuntimeError('Startup timed out')

lock=(ROOT/'.maintenance.lock').open('a')
fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
no_players()
assert not (ROOT/REL).exists() and not (ROOT/PROBE).exists()
assert sha(INPUT/'glass_validation.json') == EXPECTED
assert json.loads((INPUT/'glass_validation.json').read_text()) == {'priority':3000,'remove':{'minecraft:glass':['/.*/'],'/.*/':['minecraft:glass']}}
expected_mods={line.split('  mods/',1)[1]:line.split('  mods/',1)[0] for line in (INPUT/'server-mods.sha256').read_text(encoding='utf-8-sig').splitlines()}
live_mods=mods(ROOT/'mods')
assert live_mods == expected_mods, 'Production mods differ from tested configuration'
assert 'sort_recipes = false' in (ROOT/'config/sawmill-common.toml').read_text()
assert any('sawmill' in name.lower() and digest=='85eebbec566b9322a4a70223e3b9f53399d606f7a9b763ccced4f7d4a73844f8' for name,digest in live_mods.items())
protected={p:sha(ROOT/p) for p in ['config/sawmill-common.toml','config/plasmovoice/server/config.toml','config/MPI.json']}
properties=property_settings(ROOT/'server.properties')
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
candidate=Path('/opt/reimagined-deploy')/('glass-candidate-'+stamp)
candidate.mkdir()
shutil.copytree(ROOT/'kubejs',candidate/'kubejs')
shutil.copytree(ROOT/'mods',candidate/'mods')
(candidate/REL).parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(INPUT/'glass_validation.json',candidate/REL)
assert mods(candidate/'mods') == live_mods
assert sha(candidate/REL) == EXPECTED
print('CANDIDATE_VALIDATED '+str(candidate),flush=True)
backup=Path('/opt/reimagined-backups')/('glass-fix-'+stamp)
backup.mkdir()
shutil.copytree(ROOT/'kubejs',backup/'kubejs')
shutil.copy2(ROOT/'server.properties',backup/'server.properties')
(backup/'mods.sha256.json').write_text(json.dumps(live_mods,indent=2))
(backup/'protected.sha256.json').write_text(json.dumps(protected,indent=2))
idle=subprocess.run(['systemctl','is-active','--quiet','chunky-idle.service']).returncode==0
maintenance=runpy.run_path('/usr/local/lib/reimagined/chunky-idle.py')
stopped=False
try:
    if idle:
        subprocess.run(['systemctl','stop','chunky-idle.service'],check=True)
    print(maintenance['pause'](),flush=True)
    print(maintenance['command']('save-all flush'),flush=True)
    (backup/'world-live').mkdir()
    subprocess.run(['rsync','-a',str(ROOT/'world')+'/',str(backup/'world-live')+'/'],check=True)
    assert (backup/'world-live/level.dat').stat().st_size > 0
    print('LIVE_WORLD_BACKUP_COMPLETE '+str(backup),flush=True)
    no_players()
    subprocess.run(['systemctl','stop','reimagined.service'],check=True)
    stopped=True
    try:
        (backup/'world').mkdir()
        subprocess.run(['rsync','-a',str(ROOT/'world')+'/',str(backup/'world')+'/'],check=True)
        assert sha(ROOT/'world/level.dat') == sha(backup/'world/level.dat')
        (backup/'world-level-dat.sha256').write_text(sha(backup/'world/level.dat')+'\n')
        print('STOPPED_WORLD_BACKUP_VERIFIED',flush=True)
        (ROOT/REL).parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(candidate/REL,ROOT/REL)
        shutil.copy2(INPUT/'glass_probe.js',ROOT/PROBE)
        subprocess.run(['chown','-R','minecraft:minecraft',str(ROOT/'kubejs/data/reimagined')],check=True)
        subprocess.run(['chown','minecraft:minecraft',str(ROOT/PROBE)],check=True)
        subprocess.run(['systemctl','start','reimagined.service'],check=True)
        print('STARTED_WITH_GLASS_FIX',flush=True)
        log=ready()
        # ServerEvents.loaded follows Done; allow the diagnostic a short grace period.
        for _ in range(20):
            if 'GLASS_PROBE red_sand=Optional[minecraft:glass]' in log: break
            time.sleep(2)
            log=ready()
        for marker in ['parent=minecraft:glass','vanilla_recipe=Optional[minecraft:glass]','sand=Optional[minecraft:glass]','red_sand=Optional[minecraft:glass]']:
            assert 'GLASS_PROBE '+marker in log, 'Missing diagnostic: '+marker
        assert 'GLASS_PROBE_ERROR' not in log
        assert mods(ROOT/'mods') == live_mods
        assert all(sha(ROOT/p)==digest for p,digest in protected.items())
        assert property_settings(ROOT/'server.properties') == properties
        assert sha(ROOT/REL) == EXPECTED
        (ROOT/PROBE).unlink()
        (backup/'verified-glass-probe.log').write_text('\n'.join(line for line in log.splitlines() if 'GLASS_PROBE' in line))
        print('SUCCESS '+str(backup),flush=True)
    except BaseException:
        subprocess.run(['systemctl','stop','reimagined.service'],check=True)
        (ROOT/REL).unlink(missing_ok=True)
        (ROOT/PROBE).unlink(missing_ok=True)
        subprocess.run(['systemctl','start','reimagined.service'],check=True)
        ready()
        print('ROLLED_BACK previous configuration is ready',flush=True)
        raise
finally:
    if idle:
        subprocess.run(['systemctl','start','chunky-idle.service'],check=True)
