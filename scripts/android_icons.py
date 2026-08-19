# 안드로이드 런처 아이콘 생성.
#   python scripts/android_icons.py
#
# android/ 는 .gitignore 대상이라 프로젝트를 다시 만들면 기본 아이콘으로 돌아간다.
# 그때 이 스크립트를 다시 돌리면 된다. pwa/make_icons.py 와 같은 도형을 쓴다.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'pwa'))
from PIL import Image, ImageDraw

ROOT = Path(__file__).parent.parent
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'

BG = (24, 95, 165)
FG = (255, 255, 255)
RAY = (133, 183, 235)
SS = 4

# 밀도별 런처 아이콘 한 변(px)
DENSITIES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}


def shapes(d: ImageDraw.ImageDraw, s: int, with_bg: bool, radius_ratio: float = 0.1875):
    u = s / 512
    if with_bg:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius_ratio * s, fill=BG)
    for y0, y1 in ((150, 362), (362, 150)):
        d.line([96 * u, y0 * u, 416 * u, y1 * u], fill=RAY, width=int(14 * u))
    for x in range(60, 452, 46):
        d.line([x * u, 256 * u, min(x + 26, 452) * u, 256 * u], fill=FG, width=int(14 * u))
    d.ellipse([(256 - 70) * u, (256 - 150) * u, (256 + 70) * u, (256 + 150) * u],
              outline=FG, width=int(22 * u))


def square(size: int) -> Image.Image:
    s = size * SS
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    shapes(ImageDraw.Draw(img), s, with_bg=True)
    return img.resize((size, size), Image.LANCZOS)


def round_icon(size: int) -> Image.Image:
    s = size * SS
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, s - 1, s - 1], fill=BG)
    shapes(d, s, with_bg=False)
    mask = Image.new('L', (s, s), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, s - 1, s - 1], fill=255)
    img.putalpha(mask)
    return img.resize((size, size), Image.LANCZOS)


def foreground(size: int) -> Image.Image:
    # 적응형 아이콘의 전경 레이어. 바깥 1/3 은 기기별로 잘려나가므로
    # 도형을 가운데 안전 영역(약 66%) 안으로 축소해 넣는다.
    s = size * SS
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    inner_size = int(s * 0.62)
    inner = Image.new('RGBA', (inner_size, inner_size), (0, 0, 0, 0))
    shapes(ImageDraw.Draw(inner), inner_size, with_bg=False)
    off = (s - inner_size) // 2
    img.paste(inner, (off, off), inner)
    return img.resize((size, size), Image.LANCZOS)


written = 0
for density, px in DENSITIES.items():
    out = RES / f'mipmap-{density}'
    out.mkdir(parents=True, exist_ok=True)
    square(px).save(out / 'ic_launcher.png')
    round_icon(px).save(out / 'ic_launcher_round.png')
    # 전경 레이어는 108dp 기준이라 런처 아이콘보다 크게 잡는다.
    foreground(int(px * 108 / 48)).save(out / 'ic_launcher_foreground.png')
    written += 3
    print(f'mipmap-{density}  {px}px')

# 기본 흰 배경을 앱 색으로 바꾼다. 안 바꾸면 적응형 아이콘 배경이 흰색으로 남는다.
(RES / 'values' / 'ic_launcher_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<resources>\n'
    '    <color name="ic_launcher_background">#185FA5</color>\n'
    '</resources>\n',
    encoding='utf-8')

# Capacitor 가 넣어둔 벡터 전경은 우리가 만든 PNG 와 충돌하므로 지운다.
vector = RES / 'drawable-v24' / 'ic_launcher_foreground.xml'
if vector.exists():
    vector.unlink()
    print('removed drawable-v24/ic_launcher_foreground.xml')

print(f'{written} icons written')
