#!/bin/bash
set -e
cd /home/user1/vibe-wheel

python3 << 'PYEOF'
import json, os
with open("data/state.json","r") as f:
    state = json.load(f)
print("Before: currentWave =", state.get("currentWave"))
state["currentWave"] = 2
with open("data/state.json.tmp","w") as f:
    json.dump(state, f, ensure_ascii=False, indent=2)
os.rename("data/state.json.tmp", "data/state.json")
print("After: currentWave = 2")
PYEOF

sed -i 's/THEME_SELECTION_ENABLED=false/THEME_SELECTION_ENABLED=true/' .env
echo "Updated .env:"
cat .env

echo "Building..."
rm -rf .next
npm run build

echo "Restarting..."
PID=$(ss -tlnp | grep :3000 | grep -oP 'pid=\K[0-9]+')
if [ -n "$PID" ]; then
    kill "$PID" 2>/dev/null || true
    sleep 2
fi
nohup npm start > /tmp/vibe-wheel.log 2>&1 &
echo "Started new PID: $!"
sleep 5
curl -s http://localhost:3000/api/health
echo ""
echo "Wave 2 is live!"
