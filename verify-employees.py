#!/usr/bin/env python3
import json
with open('/home/user1/vibe-wheel/data/employees.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    print(f"Total employees: {data['totalEmployees']}")
    print(f"Actual count: {len(data['employees'])}")
    removed = ["Бут Карина Асгатовна", "Бруева Анна Викторовна", "Титов Илья Евгеньевич", "Данилов Константин", "Грачев Илья Сергеевич"]
    for name in removed:
        if name in data['employees']:
            print(f"ERROR: {name} should be removed but still present!")
    kept = ["Шевелева Марта Петровна", "Красноштанов Виталий Олегович"]
    for name in kept:
        if name in data['employees']:
            print(f"OK: {name} is present")
        else:
            print(f"ERROR: {name} should be present but missing!")
