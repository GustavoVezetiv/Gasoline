from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1] / "public"
root.mkdir(exist_ok=True)
font_path = "C:/Windows/Fonts/arialbd.ttf"

for size in (192, 512):
    image = Image.new("RGB", (size, size), "#111111")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(font_path, round(size * 0.57))
    bounds = draw.textbbox((0, 0), "G", font=font)
    x = (size - (bounds[2] - bounds[0])) / 2 - bounds[0]
    y = (size - (bounds[3] - bounds[1])) / 2 - bounds[1] - size * 0.015
    draw.text((x, y), "G", font=font, fill="white")
    image.save(root / f"icon-{size}.png")
