import json

with open('C:/Users/HYPE-R/.gemini/antigravity/playground/white-orion/api_response.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Keys in root:", list(data.keys()))

if 'dailyActivity' in data and len(data['dailyActivity']) > 0:
    print("Keys in dailyActivity[0]:", list(data['dailyActivity'][0].keys()))
    print("Sample dailyActivity[0]:", json.dumps(data['dailyActivity'][0], indent=2))
else:
    print("dailyActivity is empty or missing")

if 'template' in data and len(data['template']) > 0:
    print("Keys in template[0]:", list(data['template'][0].keys()))
    print("Sample template[0]:", json.dumps(data['template'][0], indent=2))
