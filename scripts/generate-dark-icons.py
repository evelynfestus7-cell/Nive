import os
from PIL import Image, ImageDraw, ImageFilter

os.makedirs('assets/logos', exist_ok=True)
logo = Image.open('assets/logos/logo.png').convert('RGBA')

size = 512
bg_color = (5, 5, 5, 255) # #050505 dark background

# 1. Dark 512x512
img512 = Image.new('RGBA', (size, size), bg_color)
glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(glow)
for r in range(180, 0, -5):
    alpha = int(35 * (1 - (r / 180.0)))
    draw.ellipse([(size/2 - r, size/2 - r), (size/2 + r, size/2 + r)], fill=(213, 0, 0, alpha))
glow = glow.filter(ImageFilter.GaussianBlur(15))
img512.alpha_composite(glow)

logo_resized = logo.copy()
logo_resized.thumbnail((370, 370), Image.Resampling.LANCZOS)
x = (size - logo_resized.width) // 2
y = (size - logo_resized.height) // 2
img512.paste(logo_resized, (x, y), logo_resized)
img512.save('assets/logos/logo-dark-512.png', 'PNG')

# 2. Maskable 512x512 (Safe-zone padded for Android adaptive icons)
maskable = Image.new('RGBA', (size, size), bg_color)
maskable.alpha_composite(glow)
logo_maskable = logo.copy()
logo_maskable.thumbnail((310, 310), Image.Resampling.LANCZOS)
mx = (size - logo_maskable.width) // 2
my = (size - logo_maskable.height) // 2
maskable.paste(logo_maskable, (mx, my), logo_maskable)
maskable.save('assets/logos/logo-maskable.png', 'PNG')

# 3. 192x192
img192 = img512.resize((192, 192), Image.Resampling.LANCZOS)
img192.save('assets/logos/logo-dark-192.png', 'PNG')

# 4. Apple Touch Icon 180x180
img180 = img512.resize((180, 180), Image.Resampling.LANCZOS)
img180.save('assets/logos/apple-touch-icon.png', 'PNG')

print('Icons created successfully!')
