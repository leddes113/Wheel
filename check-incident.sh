#!/bin/bash
echo "=== Network spike analysis ==="
echo ""
echo "Top IPs during incident (Feb 11, 19:00-20:00):"
sudo grep '11/Feb/2026:19:' /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
echo ""
echo "Top URLs requested:"
sudo grep '11/Feb/2026:19:' /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -10
echo ""
echo "User agents:"
sudo grep '11/Feb/2026:19:' /var/log/nginx/access.log | awk -F'"' '{print $6}' | sort | uniq -c | sort -rn | head -5
echo ""
echo "Total requests per minute:"
sudo grep '11/Feb/2026:19:' /var/log/nginx/access.log | awk '{print $4}' | cut -d: -f1,2,3 | uniq -c
echo ""
echo "Status codes:"
sudo grep '11/Feb/2026:19:' /var/log/nginx/access.log | awk '{print $9}' | sort | uniq -c | sort -rn
