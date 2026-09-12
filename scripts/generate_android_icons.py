import os
from PIL import Image, ImageDraw

def generate_icons():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_path = os.path.join(base_dir, "public", "assets", "logos", "logo.png")
    res_dir = os.path.join(base_dir, "android", "app", "src", "main", "res")

    print(f"Loading logo from: {logo_path}")
    logo = Image.open(logo_path).convert("RGBA")

    # Trim any outer transparent padding from logo
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)

    densities = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432)
    }

    bg_color = (5, 5, 5, 255) # #050505

    for folder, (icon_size, fg_size) in densities.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)

        # 1. Generate ic_launcher.png (Square with rounded corners or full fill)
        launcher_img = Image.new("RGBA", (icon_size, icon_size), (0, 0, 0, 0))
        # Draw rounded rectangle background
        draw = ImageDraw.Draw(launcher_img)
        corner_radius = int(icon_size * 0.18)
        draw.rounded_rectangle(
            [0, 0, icon_size - 1, icon_size - 1],
            radius=corner_radius,
            fill=bg_color
        )
        # Paste scaled logo
        target_logo_size = int(icon_size * 0.72)
        logo_aspect = logo.width / logo.height
        if logo_aspect > 1:
            w = target_logo_size
            h = int(w / logo_aspect)
        else:
            h = target_logo_size
            w = int(h * logo_aspect)
        scaled_logo = logo.resize((w, h), Image.Resampling.LANCZOS)
        pos = ((icon_size - w) // 2, (icon_size - h) // 2)
        launcher_img.alpha_composite(scaled_logo, dest=pos)
        launcher_path = os.path.join(folder_path, "ic_launcher.png")
        launcher_img.save(launcher_path, "PNG")
        print(f"Saved: {launcher_path} ({icon_size}x{icon_size})")

        # 2. Generate ic_launcher_round.png (Circular)
        round_img = Image.new("RGBA", (icon_size, icon_size), (0, 0, 0, 0))
        round_draw = ImageDraw.Draw(round_img)
        round_draw.ellipse([0, 0, icon_size - 1, icon_size - 1], fill=bg_color)
        target_round_logo_size = int(icon_size * 0.65)
        if logo_aspect > 1:
            rw = target_round_logo_size
            rh = int(rw / logo_aspect)
        else:
            rh = target_round_logo_size
            rw = int(rh * logo_aspect)
        scaled_round_logo = logo.resize((rw, rh), Image.Resampling.LANCZOS)
        rpos = ((icon_size - rw) // 2, (icon_size - rh) // 2)
        round_img.alpha_composite(scaled_round_logo, dest=rpos)
        round_path = os.path.join(folder_path, "ic_launcher_round.png")
        round_img.save(round_path, "PNG")
        print(f"Saved: {round_path} ({icon_size}x{icon_size})")

        # 3. Generate ic_launcher_foreground.png (Adaptive icon foreground: 108dp canvas, ~65% safe center)
        fg_img = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        target_fg_size = int(fg_size * 0.58)
        if logo_aspect > 1:
            fw = target_fg_size
            fh = int(fw / logo_aspect)
        else:
            fh = target_fg_size
            fw = int(fh * logo_aspect)
        scaled_fg_logo = logo.resize((fw, fh), Image.Resampling.LANCZOS)
        fpos = ((fg_size - fw) // 2, (fg_size - fh) // 2)
        fg_img.alpha_composite(scaled_fg_logo, dest=fpos)
        fg_path = os.path.join(folder_path, "ic_launcher_foreground.png")
        fg_img.save(fg_path, "PNG")
        print(f"Saved: {fg_path} ({fg_size}x{fg_size})")

    # Also update splash screens with dark theme and centered logo
    splash_dirs = [
        "drawable",
        "drawable-land-hdpi",
        "drawable-land-mdpi",
        "drawable-land-xhdpi",
        "drawable-land-xxhdpi",
        "drawable-land-xxxhdpi",
        "drawable-port-hdpi",
        "drawable-port-mdpi",
        "drawable-port-xhdpi",
        "drawable-port-xxhdpi",
        "drawable-port-xxxhdpi",
    ]

    for s_dir in splash_dirs:
        target_file = os.path.join(res_dir, s_dir, "splash.png")
        if os.path.exists(target_file):
            try:
                old_img = Image.open(target_file)
                sw, sh = old_img.size
                splash = Image.new("RGBA", (sw, sh), bg_color)
                # Logo size around 30% of min dimension
                min_dim = min(sw, sh)
                splash_logo_size = max(48, int(min_dim * 0.35))
                if logo_aspect > 1:
                    slw = splash_logo_size
                    slh = int(slw / logo_aspect)
                else:
                    slh = splash_logo_size
                    slw = int(slh * logo_aspect)
                scaled_splash_logo = logo.resize((slw, slh), Image.Resampling.LANCZOS)
                sp_pos = ((sw - slw) // 2, (sh - slh) // 2)
                splash.alpha_composite(scaled_splash_logo, dest=sp_pos)
                splash.save(target_file, "PNG")
                print(f"Updated splash: {target_file} ({sw}x{sh})")
            except Exception as e:
                print(f"Could not update splash {target_file}: {e}")

    print("All icons and splash screens updated successfully!")

if __name__ == "__main__":
    generate_icons()
