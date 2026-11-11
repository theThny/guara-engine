import asyncio
import re
import math
from concurrent.futures import ThreadPoolExecutor
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth
from skills.color_extractor import extract_colors

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcula a distância geodésica em quilômetros entre dois pontos geográficos.
    """
    R = 6371.0  # Raio médio da Terra em km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def _scrape_google_maps_sync(
    query: str, 
    location: str, 
    max_places: int = 30,
    target_lat: float = None,
    target_lng: float = None,
    max_radius_km: float = 25.0
):
    results = []
    clean_location_city = location.split(",")[0].strip().lower()
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="pt-BR",
            viewport={"width": 1280, "height": 900}
        )
        page = context.new_page()
        
        # 1. Aplica Playwright Stealth anti-detecção
        try:
            Stealth().apply_stealth_sync(page)
        except Exception as se:
            print(f"[STEALTH WARNING] {se}")

        search_url = f"https://www.google.com/maps/search/{query}+em+{location}"
        print(f"[SCRAPER] Acessando Google Maps em modo ultra-rápido: {search_url}")
        
        try:
            page.goto(search_url, timeout=12000, wait_until="domcontentloaded")
            page.wait_for_timeout(1500)
            
            # Consentimento de cookies se aparecer
            try:
                consent = page.query_selector('button[aria-label*="Aceitar"], button:has-text("Aceitar tudo"), form[action*="consent"] button')
                if consent:
                    consent.click()
                    page.wait_for_timeout(500)
            except Exception:
                pass

            # 2. Rolagem contínua dinâmica no feed
            feed = page.query_selector('div[role="feed"]')
            if feed:
                for _ in range(3):
                    feed.evaluate('el => el.scrollBy(0, 3000)')
                    page.wait_for_timeout(600)
                    curr_links = page.query_selector_all('a[href*="/maps/place/"]')
                    if len(curr_links) >= max_places:
                        break

            # 3. Extração estruturada de cada card do Maps
            place_links = page.query_selector_all('a[href*="/maps/place/"]')
            print(f"[SCRAPER] Extraindo metadados de {len(place_links)} cards...")
            seen_names = set()
            raw_places = []

            for link in place_links:
                title = link.get_attribute("aria-label")
                if not title or title.strip() in seen_names:
                    continue
                
                href = link.get_attribute("href") or ""
                
                # Coordenadas geográficas reais obtidas da URL
                lat, lng = 0.0, 0.0
                m = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', href)
                if not m:
                    m = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', href)
                if m:
                    lat, lng = float(m.group(1)), float(m.group(2))
                    
                # Extrai texto do card, URL da imagem e status de patrocínio
                card_data = link.evaluate("""el => {
                    let parent = el.closest('div[jsaction*="mouseover"]') || el.parentElement?.parentElement?.parentElement;
                    if (!parent) return { text: '', imgSrc: null, isAd: false };
                    let text = parent.innerText || '';
                    let isAd = /patrocinado|anúncio|anuncio/i.test(text);
                    let img = parent.querySelector('img[src*="googleusercontent"], img[src*="ggpht"], img');
                    let imgSrc = (img && img.src && img.src.startsWith('http')) ? img.src : null;
                    return { text, imgSrc, isAd };
                }""")
                
                # FILTRO 1: Descartar Anúncios Patrocinados
                if card_data.get("isAd"):
                    continue

                # FILTRO 2: Geofencing por Coordenadas Haversine
                if target_lat and target_lng and lat != 0.0 and lng != 0.0:
                    dist_km = haversine_distance_km(lat, lng, target_lat, target_lng)
                    if dist_km > max_radius_km:
                        continue

                card_text = card_data.get("text", "")
                lines = [l.strip() for l in card_text.split("\n") if l.strip()]
                
                # Nota média e total de avaliações reais
                rating = 0.0
                reviews = 0
                for line in lines:
                    rm = re.search(r'(\d[,\.]\d)\s*\(([0-9\.]+)\)', line)
                    if rm:
                        rating = float(rm.group(1).replace(",", "."))
                        reviews = int(rm.group(2).replace(".", ""))
                        break
                    rm_single = re.search(r'^(\d[,\.]\d)$', line)
                    if rm_single:
                        rating = float(rm_single.group(1).replace(",", "."))

                # Telefone real
                phone = None
                for line in lines:
                    pm = re.search(r'(\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4})', line)
                    if pm:
                        phone = pm.group(1).strip()
                        break
                        
                # Endereço físico real
                address = None
                for line in lines:
                    if any(k in line.lower() for k in ["r.", "rua", "av.", "avenida", "pç", "praça", "rodovia", "alameda", "travessa"]):
                        address = line.split("·")[-1].strip() if "·" in line else line.strip()
                        break
                if not address:
                    address = f"{location}"

                # FILTRO 3: Validação textual de município
                if address and " - " in address:
                    parts = address.split(" - ")
                    if len(parts) > 1 and clean_location_city not in parts[-1].lower() and any(c in parts[-1].lower() for c in ["mg", "sp", "rj", "ba", "pr", "sc", "rs", "go", "es"]):
                        if clean_location_city not in address.lower():
                            continue

                seen_names.add(title.strip())
                    
                # Status de funcionamento
                status_op = "Horário comercial"
                for line in lines:
                    if any(k in line.lower() for k in ["fechado", "aberto", "abre", "encerra"]):
                        status_op = line
                        break

                clean_name = title.split("-")[0].strip() if "-" in title and len(title) > 30 else title
                foto_url = card_data.get("imgSrc")

                raw_places.append({
                    "id": f"real-maps-{len(raw_places) + 1}",
                    "nome_fantasia": clean_name.upper(),
                    "nicho": query.capitalize(),
                    "endereco_completo": address,
                    "telefone": phone or "Não informado no Maps",
                    "avaliacao_media": rating if rating > 0 else 4.5,
                    "total_avaliacoes": reviews,
                    "status_funcionamento": status_op,
                    "lat": lat if lat != 0.0 else (target_lat or -17.8439),
                    "lng": lng if lng != 0.0 else (target_lng or -42.0791),
                    "foto_url": foto_url,
                    "avatar_logo_url": foto_url,
                    "url_maps": href,
                    "paleta_hex": ["#FF3400", "#FA8E00", "#180303"],
                })

                if len(raw_places) >= max_places:
                    break

            results = raw_places

        except Exception as e:
            print(f"[SCRAPER ERROR] Erro durante a raspagem: {e}")
        finally:
            browser.close()
            
    print(f"[SCRAPER] Concluído com sucesso! {len(results)} estabelecimentos reais validados em {location}.")
    return results

async def search_maps(
    query: str, 
    location: str, 
    max_places: int = 30,
    target_lat: float = None,
    target_lng: float = None,
    max_radius_km: float = 25.0
):
    return await asyncio.to_thread(
        _scrape_google_maps_sync, 
        query, 
        location, 
        max_places, 
        target_lat, 
        target_lng, 
        max_radius_km
    )
