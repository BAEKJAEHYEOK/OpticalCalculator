# PNG 아이콘 생성. APK 패키징 도구는 SVG 를 받지 않으므로 PNG 가 따로 필요하다.
#   python pwa/make_icons.py
# icon.svg 를 고쳤다면 여기 도형도 같이 맞춰야 한다. 렌더러를 붙이지 않고 직접 그린다.

from PIL import Image, ImageDraw
from pathlib import Path

OUT = Path(__file__).parent
BG = (24, 95, 165)
FG = (255, 255, 255)
RAY = (133, 183, 235)

# 4배로 그린 뒤 축소해 계단 현상을 없앤다.
SS = 4


def draw(size: int) -> Image.Image:
    s = size * SS
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = s / 512  # 512 기준 좌표를 그대로 쓰기 위한 배율

    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=96 * u, fill=BG)

    # 광선 두 줄이 렌즈에서 교차한다.
    for y0, y1 in ((150, 362), (362, 150)):
        d.line([96 * u, y0 * u, 416 * u, y1 * u], fill=RAY, width=int(14 * u))

    # 광축
    for x in range(60, 452, 46):
        d.line([x * u, 256 * u, min(x + 26, 452) * u, 256 * u], fill=FG, width=int(14 * u))

    # 렌즈
    d.ellipse([(256 - 70) * u, (256 - 150) * u, (256 + 70) * u, (256 + 150) * u],
              outline=FG, width=int(22 * u))

    return img.resize((size, size), Image.LANCZOS)


for size in (192, 512):
    path = OUT / f'icon-{size}.png'
    draw(size).save(path)
    print(f'wrote {path.name}  {size}x{size}')

# maskable 은 안전 영역(가운데 80%) 안에 도형이 들어와야 잘리지 않는다.
base = draw(512)
masked = Image.new('RGBA', (512, 512), BG)
inner = base.resize((410, 410), Image.LANCZOS)
masked.paste(inner, (51, 51), inner)
masked.save(OUT / 'icon-512-maskable.png')
print('wrote icon-512-maskable.png  512x512')
