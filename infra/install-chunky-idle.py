"""Run as root on the VPS after uploading the four controller/deploy files."""
import datetime
import hashlib
import json
import pathlib
import runpy
import shutil
import subprocess
import tarfile

SOURCE = pathlib.Path(__file__).parent
ROOT = pathlib.Path('/opt/reimagined')
if subprocess.run(['systemctl', 'is-active', '--quiet', 'chunky-idle.service']).returncode == 0:
    raise SystemExit('Stop the existing idle controller before installing an update.')
m = runpy.run_path(str(SOURCE / 'chunky-idle.py'))
cmd = m['command']
if m['players']():
    raise SystemExit('Players connected; retry when empty.')
stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backup = pathlib.Path('/opt/reimagined-backups') / ('chunky-idle-' + stamp)
backup.mkdir()
for src in [ROOT / 'config/chunky', pathlib.Path('/usr/local/sbin/reimagined-deploy'),
            pathlib.Path('/etc/systemd/system/chunky-idle.service'),
            pathlib.Path('/usr/local/lib/reimagined/chunky-idle.py')]:
    if src.exists():
        if src.is_dir():
            shutil.copytree(src, backup / src.name)
        else:
            shutil.copy2(src, backup / src.name)
print(cmd('chunky pause minecraft:overworld'), flush=True)
try:
    print(cmd('save-off'), flush=True)
    reply = cmd('save-all flush')
    print(reply, flush=True)
    if 'Saved the game' not in reply:
        raise RuntimeError('World flush not confirmed')
    with tarfile.open(backup / 'world.tar', 'w') as tar:
        tar.add(ROOT / 'world', arcname='world')
    with tarfile.open(backup / 'world.tar') as tar:
        saved = tar.extractfile('world/level.dat').read()
    digest = hashlib.sha256(saved).hexdigest()
    if digest != hashlib.sha256((ROOT / 'world/level.dat').read_bytes()).hexdigest():
        raise RuntimeError('Backup verification failed')
    (backup / 'world-level-dat.sha256').write_text(digest + '\n')
finally:
    print(cmd('save-on'), flush=True)

config = ROOT / 'config/chunky/config.json'
p = json.loads(config.read_text())
p['continueOnRestart'] = False
p['updateInterval'] = 30
config.write_text(json.dumps(p, indent=2) + '\n')
print(cmd('chunky reload'), flush=True)
dest = pathlib.Path('/usr/local/lib/reimagined')
dest.mkdir(exist_ok=True, parents=True)
shutil.copy2(SOURCE / 'chunky-idle.py', dest / 'chunky-idle.py')
shutil.copy2(SOURCE / 'chunky-idle.service', '/etc/systemd/system/chunky-idle.service')
shutil.copy2(SOURCE / 'deploy-vps.sh', '/usr/local/sbin/reimagined-deploy')
pathlib.Path('/usr/local/sbin/reimagined-deploy').chmod(0o755)
subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemctl', 'enable', '--now', 'chunky-idle.service'], check=True)
print('Verified backup: ' + str(backup), flush=True)
