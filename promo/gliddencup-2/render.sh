#!/bin/sh
# Rendert index.html als PNG: sh render.sh <ausgabe.png> [skalierung]
# Chrome braucht Windows-Pfade; das Profil liegt im Temp-Ordner, damit hier nichts liegen bleibt.
DIR=$(cd "$(dirname "$0")" && pwd -W)
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --hide-scrollbars --disable-gpu \
  --allow-file-access-from-files --user-data-dir="$(cygpath -w "$TEMP")/werbebild-chrome" --window-size=1920,1080 \
  --force-device-scale-factor="${2:-1}" --virtual-time-budget=5000 \
  --screenshot="$DIR/$1" "file:///$DIR/index.html" 2>/dev/null
