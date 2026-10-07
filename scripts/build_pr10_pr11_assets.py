import os
import shutil
from PIL import Image

base_dir = r"C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student"
root_img = os.path.join(base_dir, "images")

pr10_dir = os.path.join(base_dir, "versions", "pr-10")
pr10_orig = os.path.join(pr10_dir, "images", "originals")
pr10_opt = os.path.join(pr10_dir, "images", "optimized")

pr11_dir = os.path.join(base_dir, "versions", "pr-11")
pr11_img = os.path.join(pr11_dir, "images")

for d in [pr10_orig, pr10_opt, pr11_img, os.path.join(root_img, "originals"), os.path.join(root_img, "optimized")]:
    os.makedirs(d, exist_ok=True)

# 1. Copy originals
files_to_copy = [
    "cybersport_tournament.jpg",
    "shadow_fiend_bg.jpg",
    "storm_spirit_render.png",
    "hoodwink_render.png",
    "shadow_fiend_render.png",
    "pudge_render.png",
    "dota2_logo.png"
]

for f in files_to_copy:
    src = os.path.join(root_img, f)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(pr10_orig, f))
        shutil.copy2(src, os.path.join(root_img, "originals", f))
        print(f"Copied original: {f}")

# 2. Optimized images for pr-10
# cybersport_tournament.jpg
with Image.open(os.path.join(pr10_orig, "cybersport_tournament.jpg")) as img:
    w, h = img.size
    new_h = int(h * (960 / w))
    r960 = img.resize((960, new_h), Image.Resampling.LANCZOS)
    r960.save(os.path.join(pr10_opt, "cybersport_tournament.webp"), "WEBP", quality=82)
    r960.save(os.path.join(root_img, "optimized", "cybersport_tournament.webp"), "WEBP", quality=82)
    r960.save(os.path.join(pr10_opt, "cybersport_tournament_q40.jpg"), "JPEG", quality=40)

# shadow_fiend_bg.jpg
with Image.open(os.path.join(pr10_orig, "shadow_fiend_bg.jpg")) as img:
    w, h = img.size
    new_h = int(h * (960 / w))
    r960 = img.resize((960, new_h), Image.Resampling.LANCZOS)
    r960.save(os.path.join(pr10_opt, "shadow_fiend_bg.webp"), "WEBP", quality=82)
    r960.save(os.path.join(root_img, "optimized", "shadow_fiend_bg.webp"), "WEBP", quality=82)

# Renders
for r_name in ["storm_spirit_render.png", "hoodwink_render.png", "shadow_fiend_render.png", "pudge_render.png"]:
    with Image.open(os.path.join(pr10_orig, r_name)) as img:
        resized = img.resize((600, 600), Image.Resampling.LANCZOS)
        w_name = os.path.splitext(r_name)[0] + ".webp"
        resized.save(os.path.join(pr10_opt, w_name), "WEBP", quality=82)
        resized.save(os.path.join(root_img, "optimized", w_name), "WEBP", quality=82)
        if r_name == "hoodwink_render.png":
            resized.save(os.path.join(pr10_opt, "hoodwink_render_q50.webp"), "WEBP", quality=50)

# SVG logo
svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="dotaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#38bdf8" flood-opacity="0.6"/>
    </filter>
  </defs>
  <rect width="100" height="100" rx="20" fill="#08142c" stroke="#38bdf8" stroke-width="2" stroke-opacity="0.4"/>
  <g fill="url(#dotaGrad)" filter="url(#glow)">
    <polygon points="56,16 84,16 84,44 64,44 56,36" />
    <polygon points="16,56 36,56 44,64 44,84 16,84" />
    <polygon points="18,32 32,18 82,68 68,82 46,60 40,66 34,60 40,54" />
  </g>
</svg>"""

with open(os.path.join(pr10_opt, "dota2_logo.svg"), "w", encoding="utf-8") as f:
    f.write(svg_content)
with open(os.path.join(root_img, "optimized", "dota2_logo.svg"), "w", encoding="utf-8") as f:
    f.write(svg_content)

# 3. Responsive Hero images for pr-11 (480px, 960px, 1600px, picture crops)
with Image.open(os.path.join(pr10_orig, "cybersport_tournament.jpg")) as img:
    w, h = img.size
    aspect = h / w

    # 480w
    h480 = int(480 * aspect)
    r480 = img.resize((480, h480), Image.Resampling.LANCZOS)
    r480.save(os.path.join(pr11_img, "hero-480w.webp"), "WEBP", quality=80)
    r480.save(os.path.join(pr11_img, "hero-480w.jpg"), "JPEG", quality=80)

    # 960w
    h960 = int(960 * aspect)
    r960 = img.resize((960, h960), Image.Resampling.LANCZOS)
    r960.save(os.path.join(pr11_img, "hero-960w.webp"), "WEBP", quality=82)
    r960.save(os.path.join(pr11_img, "hero-960w.jpg"), "JPEG", quality=82)

    # 1600w
    h1600 = int(1600 * aspect)
    r1600 = img.resize((1600, h1600), Image.Resampling.LANCZOS)
    r1600.save(os.path.join(pr11_img, "hero-1600w.webp"), "WEBP", quality=85)
    r1600.save(os.path.join(pr11_img, "hero-1600w.jpg"), "JPEG", quality=85)

    # Art direction: Mobile portrait crop 3:4 (480x640)
    crop_width = int(h * 0.75)
    left = (w - crop_width) // 2
    mobile_cropped = img.crop((left, 0, left + crop_width, h)).resize((480, 640), Image.Resampling.LANCZOS)
    mobile_cropped.save(os.path.join(pr11_img, "hero-mobile-portrait.webp"), "WEBP", quality=82)
    mobile_cropped.save(os.path.join(pr11_img, "hero-mobile-portrait.jpg"), "JPEG", quality=82)

    # Desktop landscape crop 21:9 (1600x685)
    crop_height = int(w * (9 / 21))
    top = (h - crop_height) // 2
    desktop_cropped = img.crop((0, top, w, top + crop_height)).resize((1600, 685), Image.Resampling.LANCZOS)
    desktop_cropped.save(os.path.join(pr11_img, "hero-desktop-landscape.webp"), "WEBP", quality=84)
    desktop_cropped.save(os.path.join(pr11_img, "hero-desktop-landscape.jpg"), "JPEG", quality=84)

# Also copy card optimized images to pr-11/images
for fname in ["shadow_fiend_bg.webp", "storm_spirit_render.webp", "hoodwink_render.webp", "shadow_fiend_render.webp", "pudge_render.webp", "dota2_logo.svg"]:
    src = os.path.join(pr10_opt, fname)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(pr11_img, fname))

print("All assets for pr-10 and pr-11 generated successfully!")
