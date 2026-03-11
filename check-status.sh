#!/bin/bash
echo "=== Checking Vibe Wheel Status ==="
TOKEN=$(curl -s -X POST http://localhost:3000/api/login -H 'Content-Type: application/json' -d '{"fio":"Дибров Дмитрий Алексеевич"}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))')
echo "Token length: ${#TOKEN}"
curl -s "http://localhost:3000/api/admin/users" -H "Cookie: auth-token=$TOKEN" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("Total users:", len(d.get("users",[])))'
curl -s "http://localhost:3000/api/admin/employees" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("Total employees:", d.get("totalEmployees",0))'
