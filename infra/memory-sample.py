#!/usr/bin/env python3
"""One low-impact JVM/OS sample, with bounded local JSONL history. No forced GC."""
import datetime
import json
import logging
from logging.handlers import RotatingFileHandler
import pathlib
import re
import subprocess

ROOT = pathlib.Path('/opt/reimagined')

def heap_values(answer):
    match = re.search(r'heap\s+total (\d+)K, used (\d+)K', answer)
    if not match:
        raise ValueError('Unrecognized G1 heap response')
    result = dict(heap_committed_mib=int(match[1])/1024, heap_used_mib=int(match[2])/1024)
    meta = re.search(r'Metaspace\s+used (\d+)K, committed (\d+)K', answer)
    if meta:
        result.update(metaspace_used_mib=int(meta[1])/1024, metaspace_committed_mib=int(meta[2])/1024)
    return result

def main():
    sample = dict(time=datetime.datetime.now(datetime.timezone.utc).isoformat())
    mem = dict(re.findall(r'^(\w+):\s+(\d+)', pathlib.Path('/proc/meminfo').read_text(), re.M))
    sample.update(available_mib=int(mem['MemAvailable'])/1024,
                  swap_used_mib=(int(mem['SwapTotal'])-int(mem['SwapFree']))/1024)
    try:
        pid = int(subprocess.check_output(['systemctl','show','reimagined.service','-p','MainPID','--value'], text=True, timeout=5))
        sample['pid'] = pid
        if pid:
            status = dict(re.findall(r'^(VmRSS|VmSwap):\s+(\d+)', pathlib.Path(f'/proc/{pid}/status').read_text(), re.M))
            sample.update(rss_mib=int(status['VmRSS'])/1024, java_swap_mib=int(status.get('VmSwap',0))/1024)
            answer = subprocess.check_output(['/usr/bin/java','-Xms16m','-Xmx64m','-m',
                'jdk.jcmd/sun.tools.jcmd.JCmd',str(pid),'GC.heap_info'], text=True, stderr=subprocess.STDOUT, timeout=15)
            sample.update(heap_values(answer))
        if (ROOT/'chunky-idle-status.json').exists():
            sample['chunky'] = json.loads((ROOT/'chunky-idle-status.json').read_text())
    except Exception as exc:
        sample['error'] = type(exc).__name__ + ': ' + str(exc)
    logger = logging.getLogger('memory')
    logger.setLevel(logging.INFO)
    handler = RotatingFileHandler(ROOT/'logs/memory-metrics.jsonl', maxBytes=5*1024**2, backupCount=4)
    logger.addHandler(handler)
    logger.info(json.dumps(sample))
    print(json.dumps(sample))
    handler.close()

if __name__ == '__main__':
    main()
