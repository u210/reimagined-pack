"""Run as administrator over SSH on the VPS; never prints authentication data."""
import json
from pathlib import Path
import time
import urllib.request
import uuid

env = dict(line.split('=', 1) for line in Path('/etc/chappy/gateway.env').read_text().splitlines() if '=' in line)
snapshot = json.loads(Path('/opt/reimagined/chappy-knowledge.json').read_text())
headers = {'Authorization': 'Bearer ' + env['CHAPPY_GATEWAY_TOKEN'], 'Content-Type': 'application/json'}


def call(path, body):
    request = urllib.request.Request('http://127.0.0.1:18765' + path, data=json.dumps(body).encode(), headers=headers)
    return json.load(urllib.request.urlopen(request, timeout=90))


print('Production snapshot:', snapshot['snapshotId'], 'items:', len(snapshot['items']), 'recipes:', len(snapshot['recipes']), flush=True)
for question, expected in [
    ('俺の持ってるGlobeってアイテム、どうやって使うものなの？', ('Globe', 'globe', '地球儀')),
    ('この世界で作業台を作る材料と配置を、実際のレシピを調べて教えて。参照したレシピIDも書いて。', ('minecraft:crafting_table',)),
]:
    identity = {'playerId': str(uuid.uuid4()), 'sessionId': str(uuid.uuid4())}
    started = time.monotonic()
    try:
        result = call('/v1/ask', dict(identity, npcId=str(uuid.uuid4()), knowledgeId=snapshot['snapshotId'],
                                     question=question, items=[], inventory={'selectedSlot': 0, 'items': [
                                         {'slot': 0, 'id': 'supplementaries:globe', 'name': 'Globe', 'count': 1}]}))
        assert any(term in result['answer'] for term in expected), result['answer']
        print(json.dumps({'seconds': round(time.monotonic() - started, 1), 'answer': result['answer']}, ensure_ascii=False), flush=True)
    finally:
        call('/v1/session/close', identity)
