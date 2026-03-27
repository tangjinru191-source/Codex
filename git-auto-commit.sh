#!/bin/bash
cd /Users/bytedance/calorie-tracker
git add -A
git commit -m "auto: $(date '+%Y-%m-%d %H:%M:%S')" || exit 0
git push origin main
