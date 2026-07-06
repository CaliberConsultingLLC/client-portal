#!/usr/bin/env python3
"""Dept 360 — LinkedIn HERO post (imagination-first, Caliber-2.0 themed)."""
import os, math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

random.seed(360)
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
LOGO = "/sessions/dreamy-tender-archimedes/mnt/northstar-platform/public/CaliberConsulting2.0-transparent.png"

S = 2
W, H = 1080 * S, 1350 * S

CHAR_TOP = (20, 22, 26); CHAR_BOT = (28, 31, 36); INK = (15, 16, 19)
GOLD = (232, 204, 112)
GOLD_STOPS = [(120, 92, 44), (190, 154, 86), (240, 214, 134), (228, 198, 122)]
EMER = (44, 122, 82); EMER_BR = (63, 168, 107)
ROSE = (206, 150, 150); SILVER = (150, 160, 166); WHITE = (246, 248, 251)


def F(kind, size):
    f = "Outfit-Bold.ttf" if kind == "bold" else "Outfit-Regular.ttf"
    return ImageFont.truetype(os.path.join(FONTS, f), size)


def vgrad(size, c0, c1):
    h = size[1]; base = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        base.putpixel((0, y), tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3)))
    return base.resize(size)


def metal_strip(h, stops):
    img = Image.new("RGB", (1, h)); n = len(stops) - 1
    for y in range(h):
        t = y / max(1, h - 1) * n; i = min(int(t), n - 1); f = t - i
        img.putpixel((0, y), tuple(int(stops[i][k] + (stops[i + 1][k] - stops[i][k]) * f) for k in range(3)))
    return img


def grad_text(im, xy, text, font, anchor, stops):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).text(xy, text, font=font, fill=255, anchor=anchor)
    bb = mask.getbbox()
    if not bb:
        return
    strip = metal_strip(bb[3] - bb[1], stops).resize((im.size[0], bb[3] - bb[1]))
    full = Image.new("RGB", im.size, (0, 0, 0)); full.paste(strip, (0, bb[1]))
    im.paste(full, (0, 0), mask)


def tracked(dr, cx, cy, text, font, fill, tr):
    widths = [dr.textlength(c, font=font) for c in text]
    total = sum(widths) + tr * (len(text) - 1)
    asc, desc = font.getmetrics(); x = cx - total / 2; y = cy - (asc + desc) / 2
    for c, w in zip(text, widths):
        dr.text((x, y), c, font=font, fill=fill); x += w + tr


def ribbon(dr, x0, y0, x1, y1, thick, color, alpha=120):
    N = 60; top, bot = [], []
    for i in range(N + 1):
        t = i / N
        ex = x0 + (x1 - x0) * (t * t * (3 - 2 * t))
        by = y0 + (y1 - y0) * (t * t * (3 - 2 * t))
        th = thick * (0.6 + 0.4 * math.sin(math.pi * t))
        top.append((ex, by - th / 2)); bot.append((ex, by + th / 2))
    dr.polygon(top + bot[::-1], fill=color + (alpha,))


def facet_bg():
    im = vgrad((W, H), CHAR_TOP, CHAR_BOT).convert("RGBA")
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh, "RGBA")
    for pts, col in [
        ([(0, 0), (W * 0.30, 0), (0, H * 0.20)], (255, 255, 255, 7)),
        ([(W, 0), (W, H * 0.16), (W * 0.74, 0)], (232, 204, 112, 9)),
        ([(W, H), (W * 0.78, H), (W, H * 0.82)], (44, 122, 82, 8))]:
        sd.polygon(pts, fill=col)
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(60)))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse([W * 0.5 - 620, H * 0.56 - 620, W * 0.5 + 620, H * 0.56 + 620], fill=(46, 122, 82, 40))
    gd.ellipse([W * 0.5 - 360, H * 0.56 - 360, W * 0.5 + 360, H * 0.56 + 360], fill=(232, 204, 112, 24))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(150)))
    vig = Image.new("L", (W, H), 0); vd = ImageDraw.Draw(vig)
    vd.ellipse([-W * 0.25, -H * 0.18, W * 1.25, H * 1.18], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(220))
    inv = Image.eval(vig, lambda p: 255 - p)
    dark = Image.new("RGBA", (W, H), (0, 0, 0, 150))
    im.alpha_composite(Image.composite(dark, Image.new("RGBA", (W, H), (0, 0, 0, 0)), inv))
    return im


def node_card(side_x, yy, cw, ch, accent):
    card = Image.new("RGBA", (cw + 8, ch + 8), (0, 0, 0, 0)); d = ImageDraw.Draw(card)
    d.rounded_rectangle([4, 4, cw + 4, ch + 4], radius=26, fill=(34, 38, 44, 235),
                        outline=(255, 255, 255, 26), width=2)
    d.rounded_rectangle([4, 4, 14, ch + 4], radius=5, fill=accent + (220,))
    return card


img = facet_bg()
draw = ImageDraw.Draw(img, "RGBA")

tracked(draw, W / 2, 150, "DEPARTMENT  RELATIONSHIP  INTELLIGENCE", F("reg", 34), GOLD, 8)
grad_text(img, (W / 2, 250), "What would your teams", F("bold", 104), "ma", GOLD_STOPS)
grad_text(img, (W / 2, 372), "say about each other?", F("bold", 104), "ma", GOLD_STOPS)
draw = ImageDraw.Draw(img, "RGBA")
tracked(draw, W / 2, 506, "Every leader thinks they know. Most are surprised by the answer.",
        F("reg", 33), (255, 255, 255, 205), 1)

cxc, cyc = W / 2, 1520
R = 210
left = [("CUSTOMER SUCCESS", EMER_BR), ("FINANCE", ROSE), ("MARKETING", GOLD), ("OPERATIONS", EMER_BR)]
right = [("PEOPLE OPS", GOLD), ("PRODUCT", EMER_BR), ("TECHNOLOGY", SILVER)]
lx, rx = 470, W - 470
cw, ch = 470, 150
ly = [1100, 1380, 1660, 1940]
ry = [1250, 1520, 1790]

for (nm, ac), yy in zip(left, ly):
    ribbon(draw, lx + cw / 2 - 8, yy, cxc - R + 14, cyc, 82, ac, alpha=120)
for (nm, ac), yy in zip(right, ry):
    ribbon(draw, cxc + R - 14, cyc, rx - cw / 2 + 8, yy, 80, ac, alpha=120)

seal = Image.new("RGBA", (R * 2 + 40, R * 2 + 40), (0, 0, 0, 0)); sd = ImageDraw.Draw(seal); cc = R + 20
sd.ellipse([cc - R, cc - R, cc + R, cc + R], fill=INK + (255,))
sd.ellipse([cc - R, cc - R, cc + R, cc + R], outline=GOLD + (230,), width=7)
sd.ellipse([cc - R + 16, cc - R + 16, cc + R - 16, cc + R - 16], outline=(255, 255, 255, 40), width=2)
sd.ellipse([cc - 150, cc - 150, cc + 150, cc + 150], outline=EMER_BR + (180,), width=4)
img.alpha_composite(seal, (int(cxc - cc), int(cyc - cc)))
tracked(ImageDraw.Draw(img, "RGBA"), cxc, cyc - 104, "YOUR  ORG", F("reg", 28), (255, 255, 255, 170), 6)
grad_text(img, (cxc, cyc - 44), "?", F("bold", 168), "ma", GOLD_STOPS)
tracked(ImageDraw.Draw(img, "RGBA"), cxc, cyc + 128, "COLLABORATION  SCORE", F("reg", 25), GOLD, 4)

for (nm, ac), yy in zip(left + right, ly + ry):
    side_x = lx if (nm, ac) in left else rx
    card = node_card(side_x - cw / 2, yy - ch / 2, cw, ch, ac)
    img.alpha_composite(card, (int(side_x - cw / 2 - 4), int(yy - ch / 2 - 4)))
    dd = ImageDraw.Draw(img, "RGBA")
    dd.text((side_x - cw / 2 + 40, yy - ch / 2 + 38), nm, font=F("bold", 33), fill=(255, 255, 255, 225))
    dd.text((side_x - cw / 2 + 40, yy - ch / 2 + 86), "score", font=F("reg", 27), fill=(255, 255, 255, 120))
    dd.text((side_x + cw / 2 - 40, yy - 22), "?", font=F("bold", 70), fill=GOLD, anchor="ra")

draw = ImageDraw.Draw(img, "RGBA")
tracked(draw, W / 2, 2210, "Strong ties.  Hidden friction.  Blind spots.  —  what would yours reveal?",
        F("reg", 31), (255, 255, 255, 200), 1)

draw.line([(140, 2520), (W - 140, 2520)], fill=(232, 204, 112, 90), width=2)
tx = 140
try:
    logo = Image.open(LOGO).convert("RGBA")
    lh = 196; lw = int(logo.width * lh / logo.height); logo = logo.resize((lw, lh))
    img.alpha_composite(logo, (140, 2556)); tx = 140 + lw + 40
except Exception:
    pass
draw = ImageDraw.Draw(img, "RGBA")
draw.text((tx, 2596), "DEPT 360", font=F("bold", 46), fill=GOLD)
draw.text((tx, 2660), "Caliber Consulting  ·  People & Culture Solutions", font=F("reg", 30), fill=(255, 255, 255, 170))
draw.text((W - 140, 2624), "caliberconsultingllc.org", font=F("reg", 30), fill=(255, 255, 255, 150), anchor="ra")

out = img.convert("RGB").resize((1080, 1350), Image.LANCZOS)
out.save(os.path.join(HERE, "post1_hero.png"))
print("saved post1_hero.png", out.size)
