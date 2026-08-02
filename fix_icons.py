from PIL import Image
import os

def fix_icon(input_path, output_path, bg_color=(255, 255, 255, 255)):
    try:
        print(f"Processing {input_path}")
        img = Image.open(input_path).convert("RGBA")
        background = Image.new("RGBA", img.size, bg_color)
        background.paste(img, mask=img)
        background.convert("RGB").save(output_path)
        print(f"Saved {output_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

public_dir = r"d:\pranay\vs code\tlgeci\public\logo"
fix_icon(os.path.join(public_dir, "icon-192x192.png"), os.path.join(public_dir, "icon-192x192-maskable.png"))
fix_icon(os.path.join(public_dir, "icon-512x512.png"), os.path.join(public_dir, "icon-512x512-maskable.png"))
