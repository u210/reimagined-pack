"""Run on kagoya-minecraft only; deploy the single reviewed MPI hotfix."""
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
NAME = 'Multiplayer-Isolation-2.1.jar'
EXPECTED = 'c38eef229818c7be589c7e02781605967865c29188790d3bc17095d486467a8e'
OLD = 'd75039cbdbae5e24f565822b200d44a43d785087c320cfea3b2c785e00e52149'

def run(*args):
    return subprocess.check_output(args, text=True).strip()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def no_players():
    assert not run('ss', '-Htn', 'state', 'established', 'sport', '=', ':25565'), 'Players connected; refusing shutdown'

def ready():
    invocation = run('systemctl', 'show', 'reimagined.service', '-p', 'InvocationID', '--value')
    for _ in range(80):
        log = run('journalctl', '_SYSTEMD_INVOCATION_ID='+invocation, '--no-pager')
        if 'Done (' in log:
            try:
                with socket.create_connection(('127.0.0.1', 25565), timeout=5):
                    return
            except OSError:
                pass
        time.sleep(3)
    raise RuntimeError('Startup timed out')

lock = (ROOT/'.maintenance.lock').open('a')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
no_players()
source = Path('/opt/reimagined-deploy/Multiplayer-Isolation-2.1-reimagined-2.jar')
assert sha(source) == EXPECTED
assert sha(ROOT/'mods'/NAME) == OLD
stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
candidate = Path('/opt/reimagined-deploy')/('mpi-candidate-'+stamp)
candidate.mkdir()
shutil.copytree(ROOT/'mods', candidate/'mods', ignore=shutil.ignore_patterns('.connector'))
shutil.copy2(source, candidate/'mods'/NAME)
live = {p.name: sha(p) for p in (ROOT/'mods').glob('*.jar')}
staged = {p.name: sha(p) for p in (candidate/'mods').glob('*.jar')}
assert live.keys() == staged.keys()
assert [name for name in live if live[name] != staged[name]] == [NAME]
with zipfile.ZipFile(candidate/'mods'/NAME) as jar:
    assert jar.testzip() is None
    assert 'me/virusnest/mpi/reimagined/FieldLookup.class' in jar.namelist()
config = (ROOT/'config/MPI.json').read_bytes()
props = (ROOT/'server.properties').read_bytes()
backup = Path('/opt/reimagined-backups')/('mpi-fix-'+stamp)
backup.mkdir()
shutil.copy2(ROOT/'mods'/NAME, backup/NAME)
shutil.copy2(ROOT/'config/MPI.json', backup/'MPI.json')
shutil.copy2(ROOT/'server.properties', backup/'server.properties')
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
        shutil.copyfile(candidate/'mods'/NAME, ROOT/'mods'/NAME)
        subprocess.run(['systemctl', 'start', 'reimagined.service'], check=True)
        print('Started patched server; backup='+str(backup), flush=True)
        ready()
        assert (ROOT/'config/MPI.json').read_bytes() == config
        assert b'online-mode=false' in (ROOT/'server.properties').read_bytes()
        assert sha(ROOT/'mods'/NAME) == EXPECTED
        print('SUCCESS: current startup Done and TCP 25565 ready; MPI settings preserved', flush=True)
    except BaseException:
        subprocess.run(['systemctl', 'stop', 'reimagined.service'], check=True)
        shutil.copyfile(backup/NAME, ROOT/'mods'/NAME)
        subprocess.run(['systemctl', 'start', 'reimagined.service'], check=True)
        ready()
        print('ROLLED BACK to previous MPI JAR', flush=True)
        raise
finally:
    if idle:
        subprocess.run(['systemctl', 'start', 'chunky-idle.service'], check=True)
