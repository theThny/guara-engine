import httpx
import tempfile
import os
import re
from colorthief import ColorThief
from PIL import Image

def _rgb_to_hex(rgb):
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}".upper()

def extract_colors(image_url: str):
    """
    Baixa a imagem real da fachada ou logotipo do comércio e extrai as cores predominantes.
    """
    if not image_url or not image_url.startswith("http"):
        return ["#FF3400", "#FA8E00", "#180303"]
        
    temp_path = None
    try:
        # 1. Download rápido da imagem com timeout curto
        with httpx.Client(timeout=4.0, follow_redirects=True) as client:
            resp = client.get(image_url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if resp.status_code != 200 or len(resp.content) < 500:
                return ["#FF3400", "#FA8E00", "#180303"]
                
            fd, temp_path = tempfile.mkstemp(suffix=".jpg")
            with os.fdopen(fd, "wb") as f:
                f.write(resp.content)

        # 2. Converte e redimensiona para processamento ultrarrápido
        with Image.open(temp_path) as img:
            img = img.convert("RGB")
            img.thumbnail((150, 150))
            img.save(temp_path, "JPEG")

        # 3. Extrai cores predominantes com ColorThief
        color_thief = ColorThief(temp_path)
        dominant_color = color_thief.get_color(quality=1)
        palette = color_thief.get_palette(color_count=3, quality=1)

        hex_palette = [_rgb_to_hex(dominant_color)]
        for c in palette:
            hex_c = _rgb_to_hex(c)
            if hex_c not in hex_palette:
                hex_palette.append(hex_c)
            if len(hex_palette) >= 3:
                break
                
        while len(hex_palette) < 3:
            hex_palette.append("#180303")

        return hex_palette
    except Exception as e:
        print(f"[COLOR EXTRACTOR] Falha ao extrair cores de {image_url[:40]}...: {e}")
        return ["#FF3400", "#FA8E00", "#180303"]
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
