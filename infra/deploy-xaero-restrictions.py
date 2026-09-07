"""Scoped Xaero server installation; run only through kagoya-minecraft SSH."""
from pathlib import Path
import datetime
import fcntl
import hashlib
import json
import shutil
import socket
import subprocess
import time
import zipfile

ROOT = Path('/opt/reimagined')
STAGE = Path('/opt/reimagined-deploy/xaero-restrictions')
MODS = {
    'xaerominimap-neoforge-1.21.1-26.4.2.jar': '21b3232e62dabcbb5bf28866481e8de2c0ccb780',
    'xaeroworldmap-neoforge-1.21.1-1.44.2.jar': 'beea95c1a2ca78e1a6ca0a0ddc7770672101fb60',
}
CONFIGS = [
    'config/xaero/minimap/server_profiles/default.cfg',
    'config/xaero/minimap/server_profiles/entity_radar_categories/default.cfg.json',
    'config/xaero/world-map/server_profiles/default.cfg',
]

def run(*args):
    return subprocess.check_output(args, text=True).strip()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def no_players():
    assert not run('ss', '-Htn', 'state', 'established', 'sport', '=', ':25565'), 'Players connected; refusing shutdown'

def ready():
    invocation = run('systemctl', 'show', 'reimagined.service', '-p', 'InvocationID', '--value')
    for _ in range(100):
        log = run('journalctl', '_SYSTEMD_INVOCATION_ID='+invocation, '--no-pager')
        if 'Done (' in log:
            try:
                with socket.create_connection(('127.0.0.1', 25565), timeout=5):
                    return log
            except OSError:
                pass
        time.sleep(3)
    raise RuntimeError('Startup timed out')

lock = (ROOT/'.maintenance.lock').open('a')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
no_players()
live_mods = {p.name: sha(p) for p in (ROOT/'mods').glob('*.jar')}
assert len(live_mods) == 217
assert live_mods['Multiplayer-Isolation-2.1.jar'] == 'c38eef229818c7be589c7e02781605967865c29188790d3bc17095d486467a8e'
for name, digest in MODS.items():
    assert name not in live_mods
    jar_path = STAGE/'mods'/name
    assert hashlib.sha1(jar_path.read_bytes()).hexdigest() == digest
    with zipfile.ZipFile(jar_path) as jar:
        assert jar.testzip() is None
        assert 'META-INF/neoforge.mods.toml' in jar.namelist()
for rel in CONFIGS:
    assert (STAGE/rel).is_file()
categories = json.loads((STAGE/CONFIGS[1]).read_text())
def check_categories(node, player=False):
    player = player or node['hardInclude'] == 'players'
    assert node['settingOverrides'] == ({'displayed': False} if player else {})
    for child in node['subCategories']:
        check_categories(child, player)
check_categories(categories)
assert 'tracked_players_on_minimap = false' in (STAGE/CONFIGS[0]).read_text()
assert 'tracked_players_in_world = false' in (STAGE/CONFIGS[0]).read_text()
assert 'display_tracked_players = false' in (STAGE/CONFIGS[2]).read_text()
for mod in ('minimap', 'world-map'):
    assert 'default_enforced_profile = default' in (ROOT/f'config/xaero/{mod}/common.cfg').read_text()

stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
candidate = STAGE/('candidate-'+stamp)
shutil.copytree(ROOT/'mods', candidate/'mods', ignore=shutil.ignore_patterns('.connector'))
for name in MODS:
    shutil.copy2(STAGE/'mods'/name, candidate/'mods'/name)
assert len(list((candidate/'mods').glob('*.jar'))) == 219
assert all(sha(candidate/'mods'/name) == digest for name, digest in live_mods.items())
backup = Path('/opt/reimagined-backups')/('xaero-restrictions-'+stamp)
backup.mkdir()
changed = CONFIGS + ['mods/'+name for name in MODS] + ['server.properties']
existed = []
for rel in changed:
    if (ROOT/rel).exists():
        target = backup/rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT/rel, target)
        existed.append(rel)
(backup/'manifest.json').write_text(json.dumps({'changed': changed, 'existed': existed}, indent=2))
idle = subprocess.run(['systemctl', 'is-active', '--quiet', 'chunky-idle.service']).returncode == 0
try:
    if idle:
        subprocess.run(['systemctl', 'stop', 'chunky-idle.service'], check=True)
        run('python3', '-c', 'import runpy; print(runpy.run_path("/usr/local/lib/reimagined/chunky-idle.py")["pause"]())')
    subprocess.run(['cp', '-a', str(ROOT/'world'), str(backup/'world-live')], check=True)
    no_players()
    subprocess.run(['systemctl', 'stop', 'reimagined.service'], check=True)
    try:
        subprocess.run(['cp', '-a', str(ROOT/'world'), str(backup/'world')], check=True)
        assert sha(ROOT/'world/level.dat') == sha(backup/'world/level.dat')
        for rel in CONFIGS + ['mods/'+name for name in MODS]:
            (ROOT/rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(STAGE/rel, ROOT/rel)
            shutil.chown(ROOT/rel, user='minecraft', group='minecraft')
        props = ROOT/'server.properties'
        content = props.read_bytes()
        assert content.count(b'online-mode=false') == 1
        props.write_bytes(content.replace(b'online-mode=false', b'online-mode=true'))
        # New category directories must remain writable by the server's config IO.
        shutil.chown(ROOT/'config/xaero/minimap/server_profiles/entity_radar_categories', user='minecraft', group='minecraft')
        subprocess.run(['systemctl', 'start', 'reimagined.service'], check=True)
        print('Started Xaero restriction server; backup='+str(backup), flush=True)
        log = ready()
        assert 'xaerominimap' in log and 'xaeroworldmap' in log
        assert all(sha(ROOT/'mods'/name) == digest for name, digest in live_mods.items())
        for rel in CONFIGS:
            assert (ROOT/rel).is_file()
        assert 'online-mode=true' in props.read_text()
        print('SUCCESS: current startup Done, TCP 25565 ready, all prior mods preserved, online-mode=true', flush=True)
    except BaseException:
        subprocess.run(['systemctl', 'stop', 'reimagined.service'], check=True)
        for rel in changed:
            if rel in existed:
                shutil.copy2(backup/rel, ROOT/rel)
            else:
                (ROOT/rel).unlink(missing_ok=True)
        subprocess.run(['systemctl', 'start', 'reimagined.service'], check=True)
        ready()
        print('ROLLED BACK scoped Xaero installation', flush=True)
        raise
finally:
    if idle:
        subprocess.run(['systemctl', 'start', 'chunky-idle.service'], check=True)
