#!/usr/bin/env python3
"""Local-only RCON idle controller. No third-party dependencies."""
import fcntl
import json
import pathlib
import re
import shutil
import signal
import socket
import struct
import sys
import time

ROOT = pathlib.Path('/opt/reimagined')
WORLD = 'minecraft:overworld'
HOLD = ROOT / 'chunky-idle.hold'
STATUS = ROOT / 'chunky-idle-status.json'
LOCK = ROOT / '.maintenance.lock'
WAIT = 300
RUN = 120
REST = 60
LAST_HEALTH = {}

def health_reasons(tps, mspt, available_mib, disk_gib):
    return [reason for bad, reason in [
        (tps < 18.5, 'low_tps'), (mspt >= 45, 'high_mspt'),
        (available_mib < 768, 'low_memory'), (disk_gib < 100, 'low_disk')
    ] if bad]

def exact(s, n):
    out = b''
    while len(out) < n:
        part = s.recv(n - len(out))
        if not part:
            raise RuntimeError('RCON disconnected')
        out += part
    return out

def receive(s):
    n = struct.unpack('<i', exact(s, 4))[0]
    if not 10 <= n <= 1048576:
        raise RuntimeError('Invalid RCON packet')
    b = exact(s, n)
    return struct.unpack('<ii', b[:8]), b[8:-2].decode('utf-8', errors='replace')

def send(s, ident, kind, value):
    b = struct.pack('<ii', ident, kind) + value.encode() + b'\0\0'
    s.sendall(struct.pack('<i', len(b)) + b)

def command(cmd):
    p = dict(line.split('=', 1) for line in (ROOT / 'server.properties').read_text().splitlines()
             if line and not line.startswith('#') and '=' in line)
    with socket.create_connection(('127.0.0.1', int(p.get('rcon.port', '25575'))), timeout=5) as s:
        send(s, 1, 3, p['rcon.password'])
        for _ in range(3):
            header, _ = receive(s)
            if header[0] == -1:
                raise RuntimeError('RCON authentication failed')
            if header == (1, 2):
                break
        else:
            raise RuntimeError('RCON authentication response missing')
        send(s, 2, 2, cmd)
        header, body = receive(s)
        if header[0] != 2:
            raise RuntimeError('RCON response mismatch')
        return re.sub(r'\u00a7.', '', body).strip()

def players():
    answer = command('list')
    match = re.search(r'There are (\d+) of a max of', answer)
    if not match:
        raise RuntimeError('Unrecognized player count')
    return int(match[1])

def healthy():
    answer = command('neoforge tps')
    match = re.search(r'Overall:\s*([\d.]+) TPS \(([\d.]+) ms/tick\)', answer)
    if not match:
        raise RuntimeError('Unrecognized TPS response')
    mem = dict(re.findall(r'^(\w+):\s+(\d+)', pathlib.Path('/proc/meminfo').read_text(), re.M))
    tps, mspt = float(match[1]), float(match[2])
    available = int(mem['MemAvailable']) / 1024
    disk = shutil.disk_usage(ROOT).free / 1024**3
    reasons = health_reasons(tps, mspt, available, disk)
    LAST_HEALTH.update(tps=tps, mspt=mspt, available_mib=round(available, 1),
                       disk_free_gib=round(disk, 2), reasons=reasons, sampled_at=time.time())
    return not reasons

def decision(now, idle, started, cooldown, count, safe, held):
    if held or count or not safe:
        return 'pause', None, max(cooldown, now + REST)
    if idle is None:
        idle = now
    if started is not None and now - started >= RUN:
        return 'pause', idle, now + REST
    if now - idle >= WAIT and now >= cooldown:
        return 'run', idle, cooldown
    return 'pause', idle, cooldown

def pause():
    return command('chunky pause ' + WORLD)

def main():
    stopping = False
    def stop(*_):
        nonlocal stopping
        stopping = True
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    idle = started = None
    cooldown = 0
    running = None
    previous = None
    last_health = 0
    last_report = 0
    safe = False
    with LOCK.open('a') as lock:
        try:
            while not stopping:
                try:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    idle = started = None
                    running = None
                    time.sleep(1)
                    continue
                try:
                    now = time.monotonic()
                    count = players()
                    if now - last_health >= 10:
                        safe = healthy()
                        last_health = now
                    mode, idle, cooldown = decision(now, idle, started, cooldown, count, safe, HOLD.exists())
                    if mode == 'run' and running is not True:
                        # Recheck immediately before resume, after health requests.
                        if players() or HOLD.exists():
                            idle = None
                            mode = 'pause'
                        else:
                            reply = command('chunky continue ' + WORLD)
                            print(reply, flush=True)
                            if 'No tasks' in reply:
                                idle = None
                                mode = 'pause'
                            elif 'Task continuing for ' + WORLD in reply:
                                running = True
                                started = now
                            else:
                                raise RuntimeError('Chunky resume was not confirmed: ' + reply)
                    if mode == 'pause' and running is not False:
                        print(pause(), flush=True)
                        running = False
                        started = None
                    state = dict(mode=mode, players=count, healthy=safe, hold=HOLD.exists(),
                                 updated=time.time(), idle_seconds=round(now-idle) if idle else 0,
                                 health=LAST_HEALTH.copy())
                    state['pause_reasons'] = (['manual_hold'] if HOLD.exists() else []) + (
                        ['players_online'] if count else []) + LAST_HEALTH.get('reasons', [])
                    if mode == 'pause' and not state['pause_reasons']:
                        state['pause_reasons'] = ['idle_wait' if idle is None or now-idle < WAIT else 'rest']
                    temp = STATUS.with_suffix('.tmp')
                    temp.write_text(json.dumps(state) + '\n')
                    temp.replace(STATUS)
                    summary = (mode, count, safe, HOLD.exists(), tuple(state['pause_reasons']))
                    if summary != previous or now - last_report >= 60:
                        print(json.dumps(state), flush=True)
                        previous = summary
                        last_report = now
                except Exception as exc:
                    idle = started = None
                    running = None
                    print('Controller error: ' + type(exc).__name__ + ': ' + str(exc), flush=True)
                    try:
                        pause()
                    except Exception:
                        pass
                finally:
                    fcntl.flock(lock, fcntl.LOCK_UN)
                time.sleep(1)
        finally:
            # Deployment owns the lock and shutdown when it is held elsewhere.
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                pause()
            except Exception:
                pass

if __name__ == '__main__':
    if len(sys.argv) == 1:
        main()
    elif sys.argv[1] == 'status':
        print(command('list'))
        print(command('chunky progress'))
        print(STATUS.read_text() if STATUS.exists() else 'Controller has not started')
    elif sys.argv[1] == 'hold':
        HOLD.touch()
        with LOCK.open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            print(pause())
    elif sys.argv[1] == 'resume':
        HOLD.unlink(missing_ok=True)
        print('Automatic mode enabled; idle waiting period still applies.')
    else:
        raise SystemExit('Usage: chunky-idle.py [status|hold|resume]')
