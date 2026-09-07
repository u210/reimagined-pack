"""Authorized, bounded live smoke test; controller must be stopped first."""
import os
import runpy
import signal
import threading
import time

m = runpy.run_path('/usr/local/lib/reimagined/chunky-idle.py')
g = m['main'].__globals__
if m['players']():
    raise SystemExit('Players connected; refusing live generation test')
real_players = m['players']
begin = time.monotonic()
g['WAIT'] = 2
g['RUN'] = 8
g['REST'] = 5
def test_players():
    actual = real_players()
    # Actual players always override the test; simulate a join after resume.
    return actual or (1 if time.monotonic() - begin >= 20 else 0)
g['players'] = test_players
timer = threading.Timer(26, lambda: os.kill(os.getpid(), signal.SIGTERM))
timer.start()
try:
    m['main']()
finally:
    timer.cancel()
    print(m['command']('chunky progress'))
    print(m['command']('neoforge tps'))
