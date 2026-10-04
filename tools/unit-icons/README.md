# Einheiten-Icons der Teilnehmerkarten

`make_unit_icons.py` erzeugt die Icons der Lieblingseinheiten auf den Gliddencup-Teilnehmerkarten aus den
Spieldateien von AoE2:DE. Jede Einheit entsteht in allen 8 Spielerfarben als
`public/gliddencup/units/<name>-p<N>.webp` (96 × 96 px, freigestellt). Die Karte zeigt die Farbe aus
`color` in `src/assets/players.json`, ohne gültige Farbe Blau (`-p1`).

## Ausführen

Voraussetzung: Python 3.9+ und eine installierte Version von AoE2:DE.

```shell
pip install -r tools/unit-icons/requirements.txt   # einmalig
python tools/unit-icons/make_unit_icons.py
python tools/unit-icons/make_unit_icons.py --game "D:\Steam\steamapps\common\AoE2DE"   # anderer Installationsort
```

Bestehende Icons werden überschrieben.

## Neue Einheit hinzufügen

1. Icon-ID der Einheit herausfinden. Die Portraits liegen im Spiel unter
   `widgetui/textures/ingame/units/<ID>_50730.dds`; die ID ist die dreistellige Zahl vorn.
2. In `make_unit_icons.py` unter `UNITS` eintragen (`'dateiname': ID`), für zwei gekippte Einheiten in
   einem Bild unter `COMPOSITES` (`'dateiname': (links, rechts)`).
3. Skript ausführen.
4. In `src/components/gliddencup/public/playerCards.js` unter `UNIT_ICONS` den Text aus `players.json`
   dem Dateinamen zuordnen (ohne `-p<N>`).

## Wie die Icons entstehen

- **Spielerfarbe:** Der Alphakanal des Portraits markiert die einzufärbenden Stellen. Sie bekommen
  (Rot + 0.2) × Spielerfarbe, wie im Spiel-UI. Die Farben stammen aus
  `resources/_common/palettes/spritecolors.json`.
- **Freistellen:** Schwarze Flächen, die mit dem Bildrand verbunden sind, werden transparent. Schwarz
  innerhalb der Einheit bleibt erhalten. Wird an einer Einheit zu viel oder zu wenig entfernt, hilft
  `BG_MAX` im Skript.
- **Composite:** Beide Einheiten werden um `TILT` Grad nach links bzw. rechts gekippt und überlappen
  sich um `OVERLAP`; die linke liegt vorn. Weil das Ergebnis breit ist, wird es um `ZOOM` größer als
  eingepasst gezeichnet und links und rechts beschnitten; Waffenspitzen am Rand fallen dabei weg.
