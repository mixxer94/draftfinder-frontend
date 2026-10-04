"""Erzeugt die Einheiten-Icons der Gliddencup-Teilnehmerkarten aus den Spieldateien von AoE2:DE.

Jede Einheit wird in allen 8 Spielerfarben als `<name>-p<N>.webp` nach
public/gliddencup/units geschrieben. Aufruf und Pflege: siehe README.md daneben.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'gliddencup' / 'units'
DEFAULT_GAME = Path(r'C:\Program Files (x86)\Steam\steamapps\common\AoE2DE')

# Dateiname -> Icon-ID im Spiel (Portrait `widgetui/textures/ingame/units/<ID>_50730.dds`)
UNITS = {
    'arbalester': 90,
    'conquistador': 106,
    'fire-galley': 203,
    'ginete': 201,  # Genitour, im deutschen Spiel „Ginete“
    'knight': 1,
    'samurai': 44,
    'shotel-warrior': 195,
    'skirmisher': 20,
    'villager': 15,
}

# Dateiname -> (linke Einheit, rechte Einheit); beide gekippt und überlappend
COMPOSITES = {
    'halberdier-skirmisher': (104, 21),  # Hellebardier, Elite-Plänkler
}

SIZE = 96          # Kantenlänge der Icons; die Karten zeigen sie mit 48–64 px, also scharf auf HiDPI
BG_MAX = 8         # hellster Kanal, der noch als Hintergrund gilt (Hintergrund ist reines Schwarz)
TILT = 15          # Grad, um die die Einheiten eines Composites gekippt werden
OVERLAP = 0.65     # Anteil der linken Einheit, den die rechte überlappt
ZOOM = 1.35        # Composites sind breit; so viel größer als eingepasst, Waffenspitzen am Rand fallen weg


def player_colors(game):
    colors = json.loads((game / 'resources' / '_common' / 'palettes' / 'spritecolors.json').read_text())['TeamColors']
    return {n: tuple(colors[f'Player {n}']['FloatRGBA'][c] for c in 'rgb') for n in range(1, 9)}


def tinted_portrait(game, icon_id, color):
    """Portrait in Spielerfarbe, eingefärbt wie im Spiel-UI (Shader widgetui_ps).

    Der Alphakanal der DDS ist eine Maske: Texel mit Alpha < 0.8 bekommen die Farbe
    (Rot + 0.2) * Spielerfarbe, alle anderen behalten ihre Farbe.
    """
    image = Image.open(game / 'widgetui' / 'textures' / 'ingame' / 'units' / f'{icon_id:03d}_50730.dds').convert('RGBA')
    r, _, _, a = image.split()
    tinted = Image.merge('RGB', [r.point(lambda v, c=c: min(255, round((v + 51) * c))) for c in color])
    mask = a.point(lambda v: 255 if v < 204 else 0)  # 204 = 0.8 * 255
    return Image.composite(tinted, image.convert('RGB'), mask)


def cut_out(image):
    """Stellt die Einheit frei: schwarze Flächen, die mit dem Rand verbunden sind, werden transparent.

    Nur randverbundene Flächen, damit dunkle Rüstung oder Schatten in der Einheit erhalten bleiben.
    """
    image = image.crop((1, 1, image.width - 1, image.height - 1))  # 1 px heller Rahmen der Textur
    rgb = np.asarray(image.convert('RGB'))
    labels, _ = ndimage.label(rgb.max(axis=2) < BG_MAX)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, edge[edge > 0])
    alpha = Image.fromarray(np.where(background, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1))  # weiche Kante ohne dunklen Saum
    image = image.convert('RGBA')
    image.putalpha(alpha)
    return image.crop(alpha.getbbox())


def fit(image, zoom=1):
    """Auf SIZE × SIZE einpassen, unten mittig; Seitenverhältnis bleibt, Rest transparent.

    Mit zoom > 1 wird über die Breite hinaus vergrößert (höchstens bis zur vollen Höhe) und
    links und rechts gleichmäßig abgeschnitten.
    """
    scale = min(SIZE / image.height, SIZE / image.width * zoom, 1)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    x = (SIZE - image.width) // 2
    canvas.alpha_composite(image, (max(x, 0), SIZE - image.height), (max(-x, 0), 0))
    return canvas


def composite(left, right):
    """Linke Einheit nach links, rechte nach rechts gekippt und um OVERLAP überlappend; die linke liegt vorn."""
    a = left.rotate(TILT, Image.BICUBIC, expand=True)
    b = right.rotate(-TILT, Image.BICUBIC, expand=True)
    height = max(a.height, b.height)
    canvas = Image.new('RGBA', (a.width + b.width - round(a.width * OVERLAP), height), (0, 0, 0, 0))
    canvas.alpha_composite(b, (canvas.width - b.width, height - b.height))
    canvas.alpha_composite(a, (0, height - a.height))
    return canvas.crop(canvas.getbbox())


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--game', type=Path, default=DEFAULT_GAME, help=f'Installationsordner von AoE2:DE (Standard: {DEFAULT_GAME})')
    game = parser.parse_args().game

    OUT.mkdir(parents=True, exist_ok=True)
    for n, color in player_colors(game).items():
        portrait = lambda icon_id: cut_out(tinted_portrait(game, icon_id, color))
        images = {name: portrait(icon_id) for name, icon_id in UNITS.items()}
        images |= {name: composite(portrait(l), portrait(r)) for name, (l, r) in COMPOSITES.items()}
        for name, image in images.items():
            fit(image, ZOOM if name in COMPOSITES else 1).save(OUT / f'{name}-p{n}.webp', 'WEBP', quality=90, method=6)
    print(f'{8 * (len(UNITS) + len(COMPOSITES))} Icons in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
