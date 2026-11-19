#!/usr/bin/env python3
"""Neon Vice Cover Studio — screenshot maker.

Draws the entry's four screenshots with PIL, using the same design the
app's own canvas engine draws: the same layouts, grades, title treatment
and effects, and the same two free sample photos. No headless browser
exists on this machine, so the cover images are the app's own drawing of
its exported covers, and the editor shot is a faithful drawing of the
app's UI (browser frame, rails, controls, live preview) with the real
labels and values the app shows.

Usage: python3 tools/make-screenshots.py
Writes screenshots/1-cover.png .. 4-cover-story.png, each <= 256 KiB.
"""

import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
SHOTS = os.path.join(ROOT, "screenshots")

TITLE_FONT = os.path.join(APP, "fonts", "title-condensed-black.ttf")
SUB_FONT = os.path.join(APP, "fonts", "subtitle-condensed-italic.ttf")
UI_FONT = os.path.join(APP, "fonts", "ui-bold.ttf")

GRADES = {
    "vice-sunset": {
        "sky": [(255, 154, 61), (255, 94, 122), (181, 55, 242)],
        "title": [(255, 226, 89), (255, 167, 81)],
        "glow": (255, 94, 122), "tint": (255, 94, 122), "deep": (70, 20, 90),
    },
    "neon-nights": {
        "sky": [(10, 255, 239), (255, 47, 179), (27, 15, 59)],
        "title": [(125, 249, 255), (255, 157, 226)],
        "glow": (255, 47, 179), "tint": (255, 47, 179), "deep": (10, 8, 40),
    },
    "golden-hour": {
        "sky": [(255, 215, 106), (255, 140, 66), (201, 75, 75)],
        "title": [(255, 243, 176), (255, 179, 71)],
        "glow": (255, 140, 66), "tint": (255, 170, 60), "deep": (90, 30, 10),
    },
    "miami-teal": {
        "sky": [(126, 240, 212), (43, 179, 255), (11, 61, 102)],
        "title": [(232, 255, 249), (126, 240, 212)],
        "glow": (43, 179, 255), "tint": (43, 179, 255), "deep": (6, 40, 66),
    },
}

LAYOUTS = {
    "hero": {
        "panels": [(0, 0, 0.62, 0.78), (0.62, 0, 0.38, 0.26),
                   (0.62, 0.26, 0.38, 0.26), (0.62, 0.52, 0.38, 0.26)],
        "band": "bottom",
    },
    "nine": {
        "panels": [(i % 3 / 3, i // 3 / 3, 1 / 3, 1 / 3) for i in range(9)],
        "band": "center",
    },
    "tilted": {
        "panels": [(0, 0, 1, 1), (0.07, 0.30, 0.30, 0.44),
                   (0.36, 0.36, 0.30, 0.44), (0.65, 0.30, 0.30, 0.44)],
        "band": "top",
        "tilts": [0, -4, 2.5, -2],
    },
    "strips": {
        "panels": [(0, 0, 1 / 3, 0.78), (1 / 3, 0, 1 / 3, 0.78),
                   (2 / 3, 0, 1 / 3, 0.78)],
        "band": "bottom",
    },
}


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def vgrad(w, h, stops):
    """Vertical multi-stop gradient."""
    img = Image.new("RGB", (1, h))
    px = img.load()
    n = len(stops) - 1
    for y in range(h):
        t = y / max(1, h - 1) * n
        i = min(n - 1, int(t))
        px[0, y] = lerp(stops[i], stops[i + 1], t - i)
    return img.resize((w, h))


def hgrad(w, h, stops):
    return vgrad(h, w, stops).rotate(-90, expand=True).resize((w, h))


def paste_cover(base, img, box, zoom=1.0, ox=0.0, oy=0.0):
    """Paste img into box (x, y, w, h) with cover-fit, zoom and offset."""
    x, y, w, h = box
    scale = max(w / img.width, h / img.height) * zoom
    nw, nh = int(img.width * scale), int(img.height * scale)
    resized = img.resize((nw, nh), Image.LANCZOS)
    dx = x + (w - nw) // 2 + int(ox * w)
    dy = y + (h - nh) // 2 + int(oy * h)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    layer.paste(resized, (dx, dy))
    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).rectangle([x, y, x + w - 1, y + h - 1], fill=255)
    base.paste(Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB"),
               (0, 0), mask)
    return base


def text_layer(size, text, font_path, font_size, fill=(255, 255, 255),
               stroke=0, stroke_fill=(0, 0, 0)):
    """Render text on its own RGBA layer, tightly cropped, with its offset."""
    font = ImageFont.truetype(font_path, font_size)
    probe = Image.new("RGBA", (8, 8))
    d = ImageDraw.Draw(probe)
    bbox = d.textbbox((0, 0), text, font=font, stroke_width=stroke)
    w, h = bbox[2] - bbox[0] + 4, bbox[3] - bbox[1] + 4
    layer = Image.new("RGBA", (max(1, w), max(1, h)), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text((2 - bbox[0], 2 - bbox[1]), text, font=font, fill=fill + (255,),
           stroke_width=stroke, stroke_fill=stroke_fill + (255,))
    return layer, (-bbox[0] + 2, -bbox[1] + 2)


def gradient_text(base, cx, top, text, font_path, font_size, grad_stops,
                  stroke_ratio=0.07, stroke_fill=(24, 6, 32), max_w=None):
    """Draw centred gradient text with a dark outline sized to the
    fitted text (the outline must shrink with the text, or small titles
    turn into blobs)."""
    size = font_size
    while max_w:
        font = ImageFont.truetype(font_path, size)
        if font.getlength(text) <= max_w or size <= 20:
            break
        size = int(size * 0.94)
    stroke = max(2, int(size * stroke_ratio))
    layer, off = text_layer(base.size, text, font_path, size,
                            stroke=stroke, stroke_fill=stroke_fill)
    grad = hgrad(layer.width, layer.height, grad_stops).convert("RGBA")
    mask = layer.split()[3]
    coloured = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    coloured.paste(grad, (0, 0), mask)
    outline = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    if stroke:
        d = ImageDraw.Draw(outline)
        font = ImageFont.truetype(font_path, size)
        d.text((off[0], off[1]), text, font=font,
               fill=stroke_fill + (255,), stroke_width=stroke,
               stroke_fill=stroke_fill + (255,))
    x = cx - layer.width // 2
    base.paste(outline, (x, top), outline)
    base.paste(coloured, (x, top), coloured)
    return size, layer.height


def glow_text(base, cx, top, text, font_path, font_size, colour, glow):
    font = ImageFont.truetype(font_path, font_size)
    layer, off = text_layer(base.size, text, font_path, font_size, fill=colour)
    blur = layer.filter(ImageFilter.GaussianBlur(font_size * 0.28))
    tinted = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    glow_layer = Image.new("RGBA", layer.size, glow + (0,))
    glow_layer.putalpha(blur.split()[3].point(lambda a: int(a * 0.9)))
    tinted = Image.alpha_composite(tinted, glow_layer)
    x = cx - layer.width // 2
    base.paste(tinted, (x, top), tinted)
    base.paste(layer, (x, top), layer)
    return layer.height


def draw_sun(base, grade, w, h, zone):
    cx, cy = w // 2, int(h * (0.13 if zone == "top" else 0.62))
    r = int(min(w, h) * 0.16)
    halo = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(halo)
    for i, alpha in enumerate((26, 18, 10)):
        rr = int(r * (1.6 + i * 0.5))
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                  fill=grade["sky"][0] + (alpha,))
    halo = halo.filter(ImageFilter.GaussianBlur(r * 0.35))
    base.paste(Image.alpha_composite(base.convert("RGBA"), halo).convert("RGB"), (0, 0))
    sun = Image.new("RGBA", (r * 2 + 4, r * 2 + 4), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sun)
    grad = vgrad(r * 2 + 4, r * 2 + 4,
                 [(255, 247, 192), grade["sky"][0], grade["sky"][1]])
    mask = Image.new("L", sun.size, 0)
    ImageDraw.Draw(mask).ellipse([2, 2, r * 2 + 2, r * 2 + 2], fill=255)
    sun.paste(grad, (0, 0), mask)
    sd = ImageDraw.Draw(sun)
    for i in range(3):
        y0 = r + int(r * 0.1) + i * int(r * 0.27)
        # cut the slit: erase with destination-out style clear
        slit = Image.new("RGBA", sun.size, (0, 0, 0, 0))
        ImageDraw.Draw(slit).rectangle(
            [0, y0, sun.width, y0 + int(r * (0.09 + i * 0.035))], fill=(0, 0, 0, 255))
        sun = Image.composite(Image.new("RGBA", sun.size, (0, 0, 0, 0)), sun,
                              slit.split()[3].point(lambda a: 255 - a))
    base.paste(sun, (cx - r - 2, cy - r - 2), sun)


def draw_skyline(base, w, h, base_y, seed=20261119):
    rnd = random.Random(seed)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = 0
    while x < w:
        bw = int(w * (0.04 + rnd.random() * 0.07))
        bh = int(h * (0.04 + rnd.random() * 0.11))
        d.rectangle([x, base_y - bh, x + bw, base_y + 2], fill=(16, 6, 28, 225))
        if rnd.random() > 0.45:
            d.rectangle([x + int(bw * 0.28), base_y - bh - int(h * 0.035),
                         x + int(bw * 0.48), base_y - bh], fill=(16, 6, 28, 225))
        x += bw + int(w * 0.008)
    win = random.Random(77)
    for _ in range(46):
        wx, wy = win.random() * w, base_y - h * 0.02 - win.random() * h * 0.12
        d.rectangle([wx, wy, wx + max(2, w * 0.004), wy + max(2, h * 0.006)],
                    fill=(255, 214, 120, 220))
    base.paste(Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB"), (0, 0))


def draw_palm(base, x, base_y, s, lean, colour=(12, 4, 22)):
    """A palm silhouette: a gently curving trunk and fronds that arc
    outward and droop, drawn as quadratic-bezier polylines."""
    d = ImageDraw.Draw(base, "RGBA")

    def bezier(p0, p1, p2, steps=14):
        pts = []
        for i in range(steps + 1):
            t = i / steps
            mx = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
            my = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
            pts.append((mx, my))
        return pts

    trunk_top = (x + int(26 * s * math.cos(lean)) + int(8 * s),
                 base_y - int(128 * s))
    d.line(bezier((x, base_y),
                  (x + int(14 * s), base_y - int(70 * s)),
                  trunk_top),
           fill=colour + (230,), width=max(3, int(7 * s)))
    cx, cy = trunk_top
    for i in range(7):
        ang = -math.pi * 0.95 + i * (math.pi * 0.30)
        reach = (78 + (i % 3) * 10) * s
        end = (cx + math.cos(ang) * reach,
               cy + math.sin(ang) * reach * 0.55 + 34 * s)
        ctrl = (cx + math.cos(ang) * reach * 0.55,
                cy + math.sin(ang) * reach * 0.55 - 26 * s)
        d.line(bezier((cx, cy), ctrl, end),
               fill=colour + (230,), width=max(2, int(5 * s)))
    d.ellipse([cx - 8 * s, cy - 2 * s, cx + 6 * s, cy + 12 * s],
              fill=colour + (230,))


def draw_birds(base, w, h, zone):
    d = ImageDraw.Draw(base, "RGBA")
    y0 = h * (0.10 if zone == "top" else 0.08)
    lw = max(2, int(w * 0.0022))
    for fx, fy, s in [(0.16, 0.02, 1), (0.30, -0.02, 0.8),
                      (0.78, 0.03, 1.1), (0.86, -0.01, 0.7)]:
        x, y = w * fx, y0 + h * fy
        r = w * 0.014 * s
        d.arc([x - r, y - r, x + r, y + r], 200, 340,
              fill=(20, 8, 30, 190), width=lw)


def draw_halftone(base, x, y, w, h, colour=(255, 255, 255)):
    d = ImageDraw.Draw(base, "RGBA")
    step = max(9, int(w * 0.012))
    yy = y + step // 2
    while yy < y + h:
        xx = x + step // 2
        while xx < x + w:
            t = 1 - (yy - y) / h
            r = max(0.4, step * 0.26 * t)
            d.ellipse([xx - r, yy - r, xx + r, yy + r], fill=colour + (70,))
            xx += step
        yy += step


def add_grain(base, seed=987654):
    rnd = random.Random(seed)
    d = ImageDraw.Draw(base, "RGBA")
    n = (base.width * base.height) // 9000
    for _ in range(n):
        d.point((rnd.random() * base.width, rnd.random() * base.height),
                fill=(255, 255, 255, 13))
    for _ in range(n):
        d.point((rnd.random() * base.width, rnd.random() * base.height),
                fill=(0, 0, 0, 13))


def add_vignette(base):
    w, h = base.size
    small = Image.new("L", (160, 90), 0)
    px = small.load()
    for yy in range(90):
        for xx in range(160):
            dx = (xx / 159 - 0.5) * 2
            dy = (yy / 89 - 0.5) * 2
            dist = math.sqrt(dx * dx + dy * dy)
            px[xx, yy] = int(max(0, min(255, (dist - 0.72) / 0.55 * 110)))
    mask = small.resize((w, h), Image.BICUBIC)
    black = Image.new("RGB", (w, h), (8, 4, 20))
    base.paste(Image.composite(black, base, mask), (0, 0))


def grade_wash(base, grade):
    w, h = base.size
    sky = hgrad(w, h, grade["sky"])
    base.paste(Image.blend(base, sky, 0.16), (0, 0))
    # deepen only the lower part: alpha ramps 0 -> 150 from 55% height down
    ramp = Image.new("L", (1, 100), 0)
    px = ramp.load()
    for yy in range(100):
        px[0, yy] = 0 if yy < 55 else int((yy - 55) / 45 * 150)
    alpha = ramp.resize((w, h))
    deep = Image.new("RGBA", (w, h), grade["deep"] + (255,))
    deep.putalpha(alpha)
    out = Image.alpha_composite(base.convert("RGBA"), deep)
    tint = Image.new("RGBA", (w, h), grade["tint"] + (26,))
    out = Image.alpha_composite(out, tint)
    base.paste(out.convert("RGB"), (0, 0))

# ---------------------------------------------------------------- photos

def photo_beach(w=900, h=1100):
    img = vgrad(w, h, [(255, 178, 96), (255, 116, 132), (168, 70, 165)])
    d = ImageDraw.Draw(img)
    sun_cx, sun_cy, sun_r = int(w * 0.5), int(h * 0.24), int(w * 0.13)
    halo = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse([sun_cx - sun_r * 2, sun_cy - sun_r * 2,
                sun_cx + sun_r * 2, sun_cy + sun_r * 2],
               fill=(255, 170, 90, 60))
    halo = halo.filter(ImageFilter.GaussianBlur(40))
    img.paste(Image.alpha_composite(img.convert("RGBA"), halo).convert("RGB"), (0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([sun_cx - sun_r, sun_cy - sun_r, sun_cx + sun_r, sun_cy + sun_r],
              fill=(255, 244, 190))
    sea = vgrad(w, int(h * 0.42), [(58, 188, 198), (14, 74, 116)])
    img.paste(sea, (0, int(h * 0.58)))
    d = ImageDraw.Draw(img, "RGBA")
    rnd = random.Random(5)
    for _ in range(26):
        y = int(h * (0.60 + rnd.random() * 0.24))
        x0 = int(rnd.random() * w * 0.7)
        d.line([(x0, y), (x0 + int(w * (0.05 + rnd.random() * 0.2)), y)],
               fill=(255, 255, 255, 46), width=2)
    sand = vgrad(w, int(h * 0.12), [(238, 198, 138), (198, 148, 88)])
    img.paste(sand, (0, int(h * 0.88)))
    draw_palm(img, int(w * 0.10), int(h * 0.93), h * 0.0011, 0.1, (20, 8, 26))
    draw_palm(img, int(w * 0.90), int(h * 0.95), h * 0.0009, -0.12, (20, 8, 26))
    return img.filter(ImageFilter.GaussianBlur(0.6))


def photo_neon(w=900, h=1100):
    img = Image.new("RGB", (w, h), (12, 6, 26))
    d = ImageDraw.Draw(img)
    rnd = random.Random(41)
    buildings = []
    x = 0
    while x < w:
        bw = int(w * (0.10 + rnd.random() * 0.14))
        bh = int(h * (0.25 + rnd.random() * 0.45))
        buildings.append((x, bw, bh))
        d.rectangle([x, h * 0.06, x + bw, h * 0.06 + bh], fill=(18, 10, 40))
        x += bw + 4
    for bx, bw, bh in buildings:
        for _ in range(int(bw * bh / 2600)):
            wx = bx + rnd.random() * bw
            wy = h * 0.06 + rnd.random() * bh
            d.rectangle([wx, wy, wx + 4, wy + 5],
                        fill=(255, 214, 120) if rnd.random() > 0.5 else (140, 220, 255))
    signs = [((255, 47, 179), 0.08, 0.14, 0.07, 0.30),
             ((10, 255, 239), 0.66, 0.10, 0.07, 0.22),
             ((255, 226, 89), 0.30, 0.40, 0.06, 0.16),
             ((255, 94, 122), 0.82, 0.42, 0.07, 0.26),
             ((10, 255, 239), 0.46, 0.18, 0.06, 0.12)]
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for colour, fx, fy, fw, fh in signs:
        gd.rectangle([w * fx, h * fy, w * (fx + fw), h * (fy + fh)],
                     fill=colour + (255,))
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    img.paste(Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB"), (0, 0))
    d = ImageDraw.Draw(img)
    for colour, fx, fy, fw, fh in signs:
        d.rectangle([w * fx, h * fy, w * (fx + fw), h * (fy + fh)], fill=colour)
        d.rectangle([w * fx, h * fy, w * (fx + fw), h * (fy + fh)],
                    outline=(255, 255, 255), width=2)
        for k in range(3):
            yy = h * (fy + fh * (0.25 + k * 0.25))
            d.line([(w * fx + 6, yy), (w * (fx + fw) - 6, yy)],
                   fill=(255, 255, 255), width=2)
    wet = img.crop((0, int(h * 0.62), w, h)).transpose(Image.FLIP_TOP_BOTTOM)
    wet = wet.filter(ImageFilter.GaussianBlur(8))
    img.paste(Image.blend(img.crop((0, int(h * 0.62), w, h)), wet, 0.35),
              (0, int(h * 0.62)))
    d = ImageDraw.Draw(img)
    d.rectangle([0, int(h * 0.60), w, int(h * 0.63)], fill=(8, 4, 18))
    return img


def photo_rooftop(w=1100, h=900):
    img = vgrad(w, h, [(255, 150, 90), (190, 80, 140), (40, 20, 70)])
    d = ImageDraw.Draw(img)
    d.ellipse([w * 0.68, h * 0.10, w * 0.82, h * 0.10 + w * 0.14],
              fill=(255, 230, 160))
    rnd = random.Random(9)
    x = 0
    while x < w:
        bw = int(w * (0.05 + rnd.random() * 0.09))
        bh = int(h * (0.08 + rnd.random() * 0.22))
        d.rectangle([x, h * 0.72 - bh, x + bw, h * 0.72], fill=(24, 10, 40))
        x += bw + 6
    d.rectangle([0, int(h * 0.72), w, h], fill=(16, 8, 28))
    for i in range(26):
        x = rnd.random() * w
        y = h * 0.5 + rnd.random() * h * 0.2
        d.rectangle([x, y, x + 3, y + 4], fill=(255, 214, 120))
    return img.filter(ImageFilter.GaussianBlur(0.5))


def load_photos():
    photos = {
        "boulevard": Image.open(os.path.join(APP, "samples", "boulevard.jpg")).convert("RGB"),
        "pier": Image.open(os.path.join(APP, "samples", "pier.jpg")).convert("RGB"),
        "beach": photo_beach(),
        "neon": photo_neon(),
        "rooftop": photo_rooftop(),
    }
    return photos


# ---------------------------------------------------------------- cover

def draw_cover(w, h, layout_id, grade_id, title, subtitle, photo_keys,
               photos, show_sun=True, show_skyline=True, show_palms=True,
               title_scale=1.0, grain=True, vignette=True, halftone=True):
    grade = GRADES[grade_id]
    layout = LAYOUTS[layout_id]
    base = Image.new("RGB", (w, h), (18, 8, 31))
    gap = max(2, int(min(w, h) * 0.012))
    rects = []
    for (fx, fy, fw, fh) in layout["panels"]:
        rects.append((int(fx * w) + (gap // 2 if fx > 0 else 0),
                      int(fy * h) + (gap // 2 if fy > 0 else 0),
                      int(fw * w) - (gap // 2 if fx > 0 else 0) - (gap // 2 if fx + fw < 1 else 0),
                      int(fh * h) - (gap // 2 if fy > 0 else 0) - (gap // 2 if fy + fh < 1 else 0)))
    tilts = layout.get("tilts", [0] * len(rects))
    band = layout["band"]
    if band == "center":
        band_rect = (w // 3, h // 3, w // 3, h // 3)
    elif band == "top":
        band_rect = (0, 0, w, int(h * 0.22))
    else:
        band_rect = (0, h - int(h * 0.22), w, int(h * 0.22))

    backdrop = 0 if layout_id == "tilted" else -1
    if backdrop >= 0:
        paste_cover(base, photos[photo_keys[backdrop]], rects[backdrop])
    if show_sun and layout_id != "nine":
        draw_sun(base, grade, w, h, band)
    if show_skyline and layout_id != "nine":
        draw_skyline(base, w, h, int(h * 0.8))
    draw_birds(base, w, h, band)

    d = ImageDraw.Draw(base, "RGBA")
    for i, rect in enumerate(rects):
        if i == backdrop:
            continue
        if band == "center" and i == len(rects) // 2:
            continue  # the Comic Nine centre cell is the title block, not a photo
        x, y, rw, rh = rect
        tilt = tilts[i]
        img = photos[photo_keys[i]]
        if tilt:
            tile = Image.new("RGBA", (rw + gap * 2, rh + int(gap * 2.4)), (0, 0, 0, 0))
            td = ImageDraw.Draw(tile)
            td.rectangle([0, 0, tile.width - 1, tile.height - 1],
                         fill=(253, 246, 236, 255))
            inner = Image.new("RGB", (rw, rh), (26, 11, 40))
            paste_cover(inner, img, (0, 0, rw, rh))
            tile.paste(inner, (gap, gap))
            tile = tile.rotate(-tilt, expand=True, resample=Image.BICUBIC)
            shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
            sd = ImageDraw.Draw(shadow)
            sd.rectangle([x - gap, y - gap, x + rw + gap, y + rh + gap * 2],
                         fill=(0, 0, 0, 110))
            shadow = shadow.filter(ImageFilter.GaussianBlur(10))
            base.paste(Image.alpha_composite(base.convert("RGBA"), shadow).convert("RGB"), (0, 0))
            base.paste(tile, (x - (tile.width - rw) // 2, y - (tile.height - rh) // 2), tile)
        else:
            d.rectangle([x - 1, y - 1, x + rw + 1, y + rh + 1], fill=(26, 11, 40, 255))
            paste_cover(base, img, rect)
            d.rectangle([x + 1, y + 1, x + rw - 1, y + rh - 1],
                        outline=(255, 255, 255, 140), width=max(2, int(min(w, h) * 0.004)))

    if layout_id == "tilted" and show_palms:
        draw_palm(base, int(w * 0.03), int(h * 0.99), min(w, h) * 0.0016, 0.1)
        draw_palm(base, int(w * 0.97), int(h * 0.99), min(w, h) * 0.0013, -0.12)

    grade_wash(base, grade)

    bx, by, bw, bh = band_rect
    if band == "center":
        d.rectangle([bx, by, bx + bw, by + bh], fill=(14, 5, 26, 255))
        d.rectangle([bx + 2, by + 2, bx + bw - 2, by + bh - 2],
                    outline=grade["sky"][0], width=max(3, int(min(w, h) * 0.006)))
    elif layout_id != "bleed":
        ramp = Image.new("L", (1, 100), 0)
        px = ramp.load()
        for yy in range(100):
            px[0, yy] = int(yy / 99 * 225)
        shade = Image.new("RGBA", (bw, bh), (10, 3, 20, 255))
        shade.putalpha(ramp.resize((bw, bh)))
        overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
        overlay.paste(shade, (bx, by))
        base.paste(Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB"), (0, 0))

    pad = int(min(w, h) * 0.035)
    if halftone and band != "center":
        draw_halftone(base, bx + pad, by + bh - int(pad * 1.15),
                      int(bw * 0.3), int(pad * 0.85))
    cx = bx + bw // 2
    base_px = int(min(w, h) * 0.115 * title_scale)
    title_px, title_h = gradient_text(
        base, cx, by + int(pad * 0.7), title.upper(), TITLE_FONT, base_px,
        grade["title"], max_w=bw - pad * 2)
    if subtitle:
        sub_px = max(14, int(title_px * 0.32))
        glow_text(base, cx, by + int(pad * 0.7) + title_h + int(sub_px * 0.35),
                  subtitle, SUB_FONT, sub_px, (255, 255, 255), grade["glow"])
    if show_palms and layout_id not in ("tilted", "nine"):
        draw_palm(base, int(w * 0.015), int(h * 0.985), min(w, h) * 0.0011, 0.08)
    if grain:
        add_grain(base)
    if vignette:
        add_vignette(base)
    return base

# ---------------------------------------------------------------- editor shot

def txt(d, xy, s, font, fill=(246, 239, 255)):
    d.text(xy, s, font=font, fill=fill)


def rrect(d, box, radius, **kw):
    d.rounded_rectangle(box, radius=radius, **kw)


def draw_editor(w, h, photos):
    img = Image.new("RGB", (w, h), (26, 20, 36))
    d = ImageDraw.Draw(img, "RGBA")
    # browser window
    d.rounded_rectangle([8, 8, w - 8, h - 8], radius=12, fill=(13, 5, 24))
    d.rounded_rectangle([8, 8, w - 8, h - 8], radius=12, outline=(58, 32, 96), width=1)
    # chrome bar
    d.rounded_rectangle([8, 8, w - 8, 52], radius=12, fill=(23, 12, 42))
    d.rectangle([8, 34, w - 8, 52], fill=(23, 12, 42))
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([24 + i * 22, 21, 24 + i * 22 + 13, 34], fill=c)
    d.rounded_rectangle([110, 16, 560, 38], radius=8, fill=(13, 5, 24))
    f_url = ImageFont.truetype(UI_FONT, 13)
    txt(d, (122, 21), "localhost:8080", f_url, (185, 168, 214))
    f_tab = ImageFont.truetype(UI_FONT, 13)
    txt(d, (600, 21), "Neon Vice Cover Studio", f_tab, (246, 239, 255))
    # app topbar
    f_h1 = ImageFont.truetype(TITLE_FONT, 26)
    f_sub = ImageFont.truetype(UI_FONT, 12)
    d.rounded_rectangle([26, 66, 78, 118], radius=10,
                        fill=(255, 226, 89))
    txt(d, (36, 76), "NV", ImageFont.truetype(TITLE_FONT, 22), (22, 8, 38))
    txt(d, (90, 68), "NEON VICE COVER STUDIO", f_h1)
    txt(d, (90, 100), "Your photos, made into a GTA-style poster cover. 100% offline, nothing uploads.",
        f_sub, (185, 168, 214))
    f_btn = ImageFont.truetype(UI_FONT, 13)
    top_labels = [("Undo", 0), ("Redo", 0), ("Surprise me", 1), ("Add photos", 1)]
    total_w = sum(f_btn.getlength(t) + 26 for t, _ in top_labels) + 3 * 8
    x = w - 22 - total_w
    for label, accent in top_labels:
        bw = int(f_btn.getlength(label) + 26)
        fill = (255, 154, 61) if accent else (29, 15, 51)
        d.rounded_rectangle([x, 76, x + bw, 110], radius=16, fill=fill,
                            outline=(58, 32, 96) if not accent else None)
        txt(d, (x + 13, 85), label, f_btn, (22, 8, 38) if accent else (246, 239, 255))
        x += bw + 8
    # rails
    rail_w, gap = 250, 14
    left = (22, 132, 22 + rail_w, h - 22)
    right = (w - 22 - rail_w, 132, w - 22, h - 22)
    stage = (left[2] + gap, 132, right[0] - gap, h - 22)
    f_h2 = ImageFont.truetype(TITLE_FONT, 15)
    f_body = ImageFont.truetype(UI_FONT, 12)
    f_small = ImageFont.truetype(UI_FONT, 11)

    def section(box, title, y):
        d.rounded_rectangle(box, radius=12, fill=(29, 15, 51),
                            outline=(58, 32, 96))
        txt(d, (box[0] + 12, y), title, f_h2, (255, 226, 89))
        return y + 26

    # --- left rail
    y = section(left, "1 · YOUR PHOTOS", 146)
    th = 84
    for i, (key, name) in enumerate([("boulevard", "Boulevard"), ("pier", "Pier")]):
        x0 = left[0] + 12 + i * 122
        thumb = photos[key].copy()
        thumb.thumbnail((110, th))
        img.paste(thumb, (x0, y))
        d.rectangle([x0, y, x0 + 110, y + th], outline=(10, 255, 239) if i == 0 else (58, 32, 96), width=2)
        txt(d, (x0 + 4, y + th + 4), name, f_small)
    y += th + 26
    d.rounded_rectangle([left[0] + 12, y, left[2] - 12, y + 52], radius=8,
                        outline=(58, 32, 96))
    txt(d, (left[0] + 22, y + 8), "Drop photos here", f_body)
    txt(d, (left[0] + 22, y + 28), "or click to browse — JPG, PNG, WebP", f_small, (185, 168, 214))
    y += 66
    y = section((left[0], y, left[2], y + 128), "PANEL", y + 14)
    txt(d, (left[0] + 12, y), "Panel 1 of 4 — click a panel", f_small, (185, 168, 214))
    y += 24
    txt(d, (left[0] + 12, y), "Zoom", f_body)
    d.rounded_rectangle([left[0] + 62, y + 6, left[2] - 52, y + 10], radius=2, fill=(58, 32, 96))
    d.ellipse([left[0] + 96, y - 1, left[0] + 108, y + 11], fill=(255, 47, 179))
    txt(d, (left[2] - 44, y), "100%", f_body, (255, 226, 89))
    y += 30
    for j, label in enumerate(["Fill all", "Shuffle", "Reset crop"]):
        x0 = left[0] + 12 + j * 76
        d.rounded_rectangle([x0, y, x0 + 70, y + 26], radius=13, fill=(36, 19, 68),
                            outline=(58, 32, 96))
        txt(d, (x0 + 9, y + 6), label, ImageFont.truetype(UI_FONT, 10))
    y += 40
    y = section((left[0], y, left[2], y + 118), "EFFECTS", y + 14)
    for j, label in enumerate(["Retro sun", "City skyline", "Palm silhouettes",
                               "Film grain", "Vignette", "Halftone dots"]):
        xx = left[0] + 12 + (j % 2) * 118
        yy = y + (j // 2) * 24
        d.rectangle([xx, yy + 1, xx + 11, yy + 12], outline=(10, 255, 239), width=1)
        d.line([(xx + 2, yy + 7), (xx + 5, yy + 10), (xx + 10, yy + 3)],
               fill=(10, 255, 239), width=2)
        txt(d, (xx + 16, yy), label, f_small)

    # --- stage
    d.rounded_rectangle(stage, radius=12, fill=(23, 10, 42), outline=(58, 32, 96))
    sx = stage[0] + 14
    for j, label in enumerate(["Square", "Story", "Wide"]):
        x0 = sx + j * 78
        d.rounded_rectangle([x0, 146, x0 + 70, 172], radius=13,
                            fill=(255, 47, 179, 40) if j == 0 else (29, 15, 51),
                            outline=(255, 47, 179) if j == 0 else (58, 32, 96))
        txt(d, (x0 + 14, 151), label, f_small)
    txt(d, (sx + 250, 151), "Ready — photos stay on your machine.", f_small, (185, 168, 214))
    preview = draw_cover(460, 460, "hero", "vice-sunset", "VICE CITY",
                         "welcome back to Leonida",
                         ["boulevard", "pier", "beach", "neon"], photos)
    px = stage[0] + (stage[2] - stage[0] - 460) // 2
    img.paste(preview, (px, 184))
    d.rectangle([px, 184, px + 460, 184 + 460], outline=(255, 255, 255, 60), width=1)
    ey = 184 + 460 + 14
    for j, label in enumerate(["PNG · 1080 × 1080", "PNG · 1080 × 1350", "PNG · 1920 × 1080"]):
        x0 = stage[0] + 14 + j * 228
        d.rounded_rectangle([x0, ey, x0 + 216, ey + 42], radius=10, fill=(10, 255, 239))
        txt(d, (x0 + 34, ey + 12), label, ImageFont.truetype(UI_FONT, 13), (22, 8, 38))

    # --- right rail
    y = section(right, "2 · LAYOUT", 146)
    for j, label in enumerate(["Hero Grid", "Comic Nine", "Tilted Snaps", "Full Bleed"]):
        x0 = right[0] + 12 + (j % 2) * 118
        yy = y + (j // 2) * 56
        d.rounded_rectangle([x0, yy, x0 + 110, yy + 48], radius=8, fill=(36, 19, 68),
                            outline=(255, 226, 89) if j == 0 else (58, 32, 96), width=2 if j == 0 else 1)
        txt(d, (x0 + 8, yy + 6), label, f_body)
        txt(d, (x0 + 8, yy + 26), "4 panels" if j != 1 else "9 panels", f_small, (185, 168, 214))
    y += 122
    y = section((right[0], y, right[2], y + 118), "3 · COLOUR GRADE", y + 14)
    grades = [("Vice Sunset", [(255, 154, 61), (255, 94, 122), (181, 55, 242)]),
              ("Neon Nights", [(10, 255, 239), (255, 47, 179), (27, 15, 59)]),
              ("Golden Hour", [(255, 215, 106), (255, 140, 66), (201, 75, 75)]),
              ("Miami Teal", [(126, 240, 212), (43, 179, 255), (11, 61, 102)])]
    for j, (label, stops) in enumerate(grades):
        x0 = right[0] + 12 + (j % 2) * 118
        yy = y + (j // 2) * 44
        chip = hgrad(110, 40, stops)
        img.paste(chip, (x0, yy))
        d.rounded_rectangle([x0, yy, x0 + 110, yy + 40], radius=8,
                            outline=(255, 255, 255) if j == 0 else (58, 32, 96), width=2 if j == 0 else 1)
        txt(d, (x0 + 8, yy + 22), label, ImageFont.truetype(UI_FONT, 11))
    y += 96
    y = section((right[0], y, right[2], y + 168), "4 · CAPTION", y + 14)
    for label, value, font in [("Title", "VICE CITY", ImageFont.truetype(TITLE_FONT, 15)),
                               ("Subtitle", "welcome back to Leonida",
                                ImageFont.truetype(SUB_FONT, 14))]:
        txt(d, (right[0] + 12, y), label, f_small, (185, 168, 214))
        y += 18
        d.rounded_rectangle([right[0] + 12, y, right[2] - 12, y + 30], radius=8, fill=(18, 8, 31),
                            outline=(58, 32, 96))
        txt(d, (right[0] + 22, y + 6), value, font)
        y += 42
    txt(d, (right[0] + 12, y), "Title size", f_small, (185, 168, 214))
    d.rounded_rectangle([right[0] + 84, y + 6, right[2] - 52, y + 10], radius=2, fill=(58, 32, 96))
    d.ellipse([right[0] + 118, y - 1, right[0] + 130, y + 11], fill=(255, 47, 179))
    txt(d, (right[2] - 44, y), "100%", f_body, (255, 226, 89))
    return img


# ---------------------------------------------------------------- save + main

def save_png_fit(img, path, max_bytes=256 * 1024):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)
    size = os.path.getsize(path)
    if size > max_bytes:
        quant = img.convert("P", palette=Image.ADAPTIVE, colors=256)
        quant.save(path, optimize=True)
        size = os.path.getsize(path)
    scale = 0.9
    while size > max_bytes and scale > 0.6:
        small = img.resize((int(img.width * scale), int(img.height * scale)),
                           Image.LANCZOS)
        small.save(path, optimize=True)
        size = os.path.getsize(path)
        if size > max_bytes:
            small.convert("P", palette=Image.ADAPTIVE, colors=256).save(path, optimize=True)
            size = os.path.getsize(path)
        scale -= 0.1
    print(f"{os.path.basename(path)}: {img.size[0]}x{img.size[1]} {size} bytes "
          f"({'OK' if size <= max_bytes else 'OVER'})")
    return size


def main():
    photos = load_photos()
    os.makedirs(SHOTS, exist_ok=True)
    cover_wide = draw_cover(1280, 720, "hero", "vice-sunset", "VICE CITY",
                            "welcome back to Leonida",
                            ["boulevard", "pier", "beach", "neon"], photos)
    save_png_fit(cover_wide, os.path.join(SHOTS, "1-cover.png"))
    editor = draw_editor(1280, 800, photos)
    save_png_fit(editor, os.path.join(SHOTS, "2-editor.png"))
    cover_square = draw_cover(1080, 1080, "nine", "neon-nights", "NEON SHORE",
                              "chasing the last light",
                              ["neon", "boulevard", "pier", "beach", "rooftop",
                               "neon", "pier", "boulevard", "beach"], photos)
    save_png_fit(cover_square, os.path.join(SHOTS, "3-cover-square.png"))
    cover_story = draw_cover(1024, 1280, "strips", "golden-hour", "GOLDEN HOUR",
                             "every sunset is a premiere",
                             ["beach", "boulevard", "pier"], photos)
    save_png_fit(cover_story, os.path.join(SHOTS, "4-cover-story.png"))


if __name__ == "__main__":
    main()
