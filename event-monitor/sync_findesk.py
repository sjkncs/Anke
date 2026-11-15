"""Synchronize only the free, unauthenticated public capability catalog."""
import json
from datetime import datetime, timezone
from urllib.request import urlopen
from monitor import atomic_json, WAREHOUSE

URL = 'https://ffd.findesk.cn/api/v1/catalog/public-capabilities'
def sync():
    with urlopen(URL, timeout=25) as response:
        data = json.load(response)
    if data.get('schema_version') != '2.0' or not isinstance(data.get('interfaces'), list):
        raise ValueError('Unsupported Findesk catalog')
    with urlopen('https://ffd.findesk.cn/api/v1/catalog/plan-comparison', timeout=25) as response:
        plans = json.load(response)
    if not plans.get('policy_version') or not isinstance(plans.get('plans'), list) or not plans['plans']:
        raise ValueError('Unsupported Findesk plan policy')
    plans['retrieved_at'] = datetime.now(timezone.utc).isoformat()
    atomic_json(WAREHOUSE/'anke-agent-source/apps/desktop/resources/plugins/anke.rents/data/findesk-plans.json', plans)
    atomic_json(WAREHOUSE/'anke-agent-source/apps/desktop/resources/plugins/anke.rents/data/findesk-capabilities.json', data)
    return {'interfaces': len(data['interfaces']), 'authenticatedDataVerified': False,
            'contractVersion': data.get('contract_version'), 'policyVersion': plans['policy_version']}

if __name__ == '__main__': print(json.dumps(sync()))
