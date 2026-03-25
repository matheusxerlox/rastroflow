import json
import urllib.request
import urllib.parse
import os

API_KEY = os.getenv("API_KEY", "").strip()

req = urllib.request.Request(
    'https://api.17track.net/track/v2.2/getcarriers',
    data=json.dumps({}).encode(),
    headers={
        '17token': API_KEY,
        'Content-Type': 'application/json'
    }
)
response = urllib.request.urlopen(req)
data = json.loads(response.read().decode())
for c in data['data']:
    name = str(c.get('name', '')).lower()
    if 'correio' in name or 'jadlog' in name or 'express' in name or 'j&t' in name:
        print(f"ID: {c.get('_id')}, Name: {c.get('name')}")
