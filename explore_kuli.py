import json

with open('C:/Users/HYPE-R/.gemini/antigravity/playground/white-orion/api_response.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

if 'kuliBorong' in data:
    print("kuliBorong structure type:", type(data['kuliBorong']))
    if isinstance(data['kuliBorong'], dict):
        print("kuliBorong keys:", list(data['kuliBorong'].keys()))
        if 'rows' in data['kuliBorong'] and len(data['kuliBorong']['rows']) > 0:
             print("Sample kuliBorong.rows[0]:", json.dumps(data['kuliBorong']['rows'][0], indent=2))
    elif isinstance(data['kuliBorong'], list) and len(data['kuliBorong']) > 0:
        print("Sample kuliBorong[0]:", json.dumps(data['kuliBorong'][0], indent=2))

if 'kuliHarian' in data:
    print("\nkuliHarian structure type:", type(data['kuliHarian']))
    if isinstance(data['kuliHarian'], dict):
        print("kuliHarian keys:", list(data['kuliHarian'].keys()))
        if 'rows' in data['kuliHarian'] and len(data['kuliHarian']['rows']) > 0:
             print("Sample kuliHarian.rows[0]:", json.dumps(data['kuliHarian']['rows'][0], indent=2))
    elif isinstance(data['kuliHarian'], list) and len(data['kuliHarian']) > 0:
        print("Sample kuliHarian[0]:", json.dumps(data['kuliHarian'][0], indent=2))
