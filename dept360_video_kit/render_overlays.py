#!/usr/bin/env python3
"""
Dept 360 LinkedIn video - overlay asset generator (v2).
Renders every text/card PNG layer (1080x1080, transparent) for build_video.sh.
Brand: Montserrat if present in ./fonts, else Outfit (geometric, Montserrat-like).
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
FONTS = os.path.join(HERE, "fonts")
os.makedirs(ASSETS, exist_ok=True)

W = H = 1080

GOLD   = (232, 204, 112, 255)
DARK   = (30, 35, 41, 255)
GREEN  = (56, 107, 69, 255)
WHITE  = (255, 255, 255, 255)
MUTED  = (255, 255, 255, 184)
BLUE   = (94, 120, 152, 255)
RED    = (192, 80, 80, 255)
AMBER  = (232, 162, 74, 255)


def _find(*names):
    for n in names:
        p = os.path.join(FONTS, n)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return p
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p):
            return p
    return None


F_BOLD_PATH = _find("Montserrat-Bold.ttf", "Outfit-Bold.ttf")
F_SEMI_PATH = _find("Montserrat-SemiBold.ttf", "Outfit-Bold.ttf")
F_MED_PATH  = _find("Montserrat-Medium.ttf", "Outfit-Regular.ttf")
F_REG_PATH  = _find("Montserrat-Regular.ttf", "Outfit-Regular.ttf")
F_ITAL_PATH = _find("Montserrat-Italic.ttf", "Outfit-Regular.ttf")
# synthesize an oblique only when no true italic is available
SYNTH_OBLIQUE = os.path.basename(F_ITAL_PATH or "") != "Montserrat-Italic.ttf"


def font(kind, size):
    path = {"bold": F_BOLD_PATH, "semi": F_SEMI_PATH, "med": F_MED_PATH,
            "reg": F_REG_PATH, "ital": F_ITAL_PATH}[kind]
    return ImageFont.truetype(path, size)


def new_layer():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def center_text(draw, cx, cy, text, fnt, fill):
    draw.text((cx, cy), text, font=fnt, fill=fill, anchor="mm")


def tracked_text(draw, cx, cy, text, fnt, fill, tracking):
    widths = [draw.textlength(ch, font=fnt) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    asc, desc = fnt.getmetrics()
    x = cx - total / 2
    y = cy - (asc + desc) / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += w + tracking


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for word in words:
        t = (cur + " " + word).strip()
        if draw.textlength(t, font=fnt) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def text_img(text, fnt, fill, pad=24):
    b = ImageDraw.Draw(Image.new("RGBA", (4, 4))).textbbox((0, 0), text, font=fnt)
    w, h = b[2] - b[0] + pad * 2, b[3] - b[1] + pad * 2
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((pad - b[0], pad - b[1]), text, font=fnt, fill=fill)
    return im


def oblique(im, k=0.20):
    w, h = im.size
    return im.transform((w + int(h * k), h), Image.AFFINE,
                        (1, k, -k * h, 0, 1, 0), resample=Image.BICUBIC)


def paste_center(layer, im, cx, cy):
    layer.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


def save(img, name):
    img.save(os.path.join(ASSETS, name))
    print("  wrote", name)


# SCENE 1 -- Hook
def scene1():
    l1 = new_layer()
    im = text_img("We collaborate well.", font("ital", 66), MUTED)
    if SYNTH_OBLIQUE:
        im = oblique(im, 0.20)
    paste_center(l1, im, W // 2, 470)
    save(l1, "s1_line1.png")

    l2 = new_layer()
    center_text(ImageDraw.Draw(l2), W // 2, 600,
                "Not according to your data.", font("bold", 66), GOLD)
    save(l2, "s1_line2.png")


# SCENE 2 -- logo lockup
def scene2_logo():
    lg = new_layer()
    d = ImageDraw.Draw(lg)
    d.rounded_rectangle([56, 56, 660, 168], radius=18, fill=(30, 35, 41, 150))
    d.rounded_rectangle([84, 80, 92, 144], radius=4, fill=GOLD)
    d.text((112, 74), "DEPT 360", font=font("bold", 46), fill=GOLD)
    d.text((114, 132), "Department Relationship Intelligence",
           font=font("med", 22), fill=MUTED)
    save(lg, "s2_logo.png")


# SCENE 3 -- metrics
def pill(label, value, value_color, top, accent=None):
    lay = new_layer()
    d = ImageDraw.Draw(lay)
    x0, x1 = 150, 930
    bottom = top + 150
    d.rounded_rectangle([x0, top, x1, bottom], radius=22,
                        fill=(255, 255, 255, 16),
                        outline=(255, 255, 255, 40), width=2)
    if accent:
        d.rounded_rectangle([x0, top, x0 + 10, bottom], radius=5, fill=accent)
    d.text((x0 + 46, top + 42), label, font=font("semi", 24), fill=MUTED)
    d.text((x1 - 46, top + 30), value, font=font("bold", 72),
           fill=value_color, anchor="ra")
    return lay


def scene3():
    k = new_layer()
    tracked_text(ImageDraw.Draw(k), W // 2, 140,
                 "SALES - RELATIONSHIP SNAPSHOT", font("semi", 26), GOLD, 5)
    save(k, "s3_kicker.png")

    save(pill("INCOMING CDRS", "60.4", WHITE, 210, accent=BLUE),  "s3_pill1.png")
    save(pill("PERCEPTION GAP", "24.4", AMBER, 380, accent=AMBER), "s3_pill2.png")
    save(pill("COLLABORATION INDEX", "58.2", WHITE, 550, accent=GREEN), "s3_pill3.png")

    w = new_layer()
    d = ImageDraw.Draw(w)
    x0, x1, top, bottom = 150, 930, 740, 940
    d.rounded_rectangle([x0, top, x1, bottom], radius=22,
                        fill=(192, 80, 80, 38),
                        outline=(192, 80, 80, 180), width=2)
    d.rounded_rectangle([x0, top, x0 + 10, bottom], radius=5, fill=RED)
    d.text((x0 + 46, top + 30), "FINANCE  <->  SALES",
           font=font("bold", 30), fill=RED)
    fnt = font("med", 29)
    yy = top + 84
    for ln in wrap(d, "24.4 pt gap. Largest perception mismatch in the portfolio.",
                   fnt, x1 - x0 - 92):
        d.text((x0 + 46, yy), ln, font=fnt, fill=WHITE)
        yy += 42
    save(w, "s3_watchout.png")


# SCENE 4 -- CTA
def scene4():
    bg = Image.new("RGBA", (W, H), DARK)
    grad = Image.new("L", (1, H), 0)
    for y in range(H):
        grad.putpixel((0, y), int(26 * (1 - abs(y - H / 2) / (H / 2))))
    grad = grad.resize((W, H))
    bg = Image.composite(Image.new("RGBA", (W, H), GREEN), bg, grad)
    d = ImageDraw.Draw(bg)
    d.rectangle([0, 0, W, 6], fill=GOLD)
    d.rectangle([0, H - 6, W, H], fill=GREEN)
    save(bg, "s4_bg.png")

    lbl = new_layer()
    tracked_text(ImageDraw.Draw(lbl), W // 2, 388,
                 "CALIBER CONSULTING LLC", font("semi", 27), MUTED, 6)
    save(lbl, "s4_label.png")

    l1 = new_layer()
    center_text(ImageDraw.Draw(l1), W // 2, 500, "Map every silo.",
                font("bold", 84), WHITE)
    save(l1, "s4_line1.png")

    l2 = new_layer()
    center_text(ImageDraw.Draw(l2), W // 2, 628, "Request your Dept 360.  ->",
                font("bold", 64), GOLD)
    save(l2, "s4_line2.png")


if __name__ == "__main__":
    print("Rendering overlays ->", ASSETS)
    print("fonts: bold=%s ital=%s synth_oblique=%s" %
          (os.path.basename(F_BOLD_PATH or "?"),
           os.path.basename(F_ITAL_PATH or "?"), SYNTH_OBLIQUE))
    scene1()
    scene2_logo()
    scene3()
    scene4()
    print("Done.")
