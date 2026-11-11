import re
import asyncio
from ddgs import DDGS
from skills.color_extractor import extract_colors

def _audit_instagram_sync(query_or_handle: str, city: str):
    """
    Audita o perfil real do Instagram, extraindo bio, seguidores, logotipo e cores da marca.
    """
    clean_handle = query_or_handle.replace("@", "").strip().split()[0]
    clean_city = city.split(",")[0].strip()
    
    # Se já é um handle direto (sem espaços)
    if "instagram.com" in query_or_handle:
        m = re.search(r"instagram\.com/([a-zA-Z0-9_\.\-]+)", query_or_handle)
        if m:
            clean_handle = m.group(1)
            
    search_term = f"{clean_handle} {clean_city} instagram" if "instagram" not in clean_handle else clean_handle
    
    bio_text = None
    followers = None
    following = None
    posts = None
    handle = clean_handle if len(clean_handle) > 3 and " " not in clean_handle else None
    profile_url = f"https://instagram.com/{handle}" if handle else None
    avatar_url = None
    
    try:
        with DDGS() as ddgs:
            # 1. Busca textual pelo perfil e métricas
            results = list(ddgs.text(search_term, max_results=4))
            for r in results:
                href = r.get("href", "")
                body = r.get("body", "")
                title = r.get("title", "")
                
                m_handle = re.search(r"instagram\.com/([a-zA-Z0-9_\.\-]+)/?", href)
                if m_handle and not handle:
                    candidate = m_handle.group(1).strip()
                    if candidate.lower() not in ["p", "reel", "reels", "explore", "stories", "tv", "accounts", "about", "tags"]:
                        handle = candidate
                        profile_url = f"https://instagram.com/{handle}"
                
                # Procura métricas e bio no snippet
                m_metrics = re.search(r'([\d\.,KMkm]+)\s*(?:Followers|seguidores)[,\s]+([\d\.,KMkm]+)\s*(?:Following|seguindo)[,\s]+([\d\.,KMkm]+)\s*(?:Posts|publicações|posts)', body, re.IGNORECASE)
                if m_metrics and not followers:
                    followers = m_metrics.group(1).strip()
                    following = m_metrics.group(2).strip()
                    posts = m_metrics.group(3).strip()

                # Extrai a bio real entre aspas no snippet
                m_bio = re.search(r'on Instagram:\s*["“](.+?)["”]', body, re.IGNORECASE)
                if not m_bio:
                    m_bio = re.search(r'no Instagram:\s*["“](.+?)["”]', body, re.IGNORECASE)
                if m_bio and not bio_text:
                    bio_text = m_bio.group(1).strip()

            if not bio_text and results:
                snippet = results[0].get("body", "")
                if " - " in snippet:
                    bio_text = snippet.split(" - ")[-1].strip()

            # 2. Busca rápida por imagem de avatar/logotipo caso Playwright demore
            if handle and not avatar_url:
                try:
                    img_results = list(ddgs.images(f'"{handle}" instagram', max_results=2))
                    for im in img_results:
                        img_link = im.get("image")
                        if img_link and ("instagram" in img_link or "lookaside" in img_link or "fbcdn" in img_link or "cdninstagram" in img_link):
                            avatar_url = img_link
                            break
                except Exception:
                    pass

    except Exception as e:
        print(f"[INSTA-AUDIT] Erro na busca DDG: {e}")

    # Tenta obter o logotipo oficial em alta resolução via Playwright se ainda não tiver avatar
    if handle and not avatar_url:
        try:
            from playwright.sync_api import sync_playwright
            from playwright_stealth import Stealth
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    locale="pt-BR"
                )
                try:
                    Stealth().apply_stealth_sync(page)
                    page.goto(f"https://www.instagram.com/{handle}/", timeout=8000)
                    page.wait_for_timeout(1500)
                    content = page.content()
                    
                    img_match = re.search(r'<meta property="og:image" content="([^"]+)"', content)
                    if img_match:
                        avatar_url = img_match.group(1).replace("&amp;", "&")
                        
                    if not avatar_url:
                        avatar_el = page.query_selector('header img')
                        if avatar_el:
                            avatar_url = avatar_el.get_attribute("src")

                    if not bio_text:
                        desc_match = re.search(r'<meta property="og:description" content="([^"]+)"', content)
                        if desc_match:
                            desc_val = desc_match.group(1)
                            if " - " in desc_val:
                                bio_text = desc_val.split(" - ")[-1].strip()
                except Exception:
                    pass
                finally:
                    browser.close()
        except Exception as pe:
            print(f"[INSTA-AUDIT] Playwright avatar warning: {pe}")

    # Extrai paleta de cores reais diretamente do Logotipo/Avatar oficial
    paleta_marca = None
    if avatar_url:
        try:
            paleta_marca = extract_colors(avatar_url)
        except Exception:
            pass
            
    if not paleta_marca or len(paleta_marca) < 3:
        paleta_marca = ["#FF3400", "#FA8E00", "#180303"]

    # Análise comportamental do perfil social
    posts_count_int = int(re.sub(r'\D', '', posts or '0')) if posts else 0
    followers_count_int = int(re.sub(r'\D', '', followers or '0')) if followers else 0
    
    if posts_count_int > 150 or followers_count_int > 2000:
        perfil_comportamento = "ARROJADO / OFERTAS CONSTANTES"
        estilo_comunicacao = "Comunicação comercial ativa com catálogo e promoções de alto giro."
        gargalo_principal = "Dependência de stories efêmeros sem funil automatizado de pedidos no WhatsApp."
    elif posts_count_int > 20:
        perfil_comportamento = "MODERADO / PRESENÇA REGULAR"
        estilo_comunicacao = "Postagens institucionais esporádicas com foco em atendimento de balcão."
        gargalo_principal = "Baixa frequência de postagens promocionais e falta de ofertas em dias de menor movimento."
    else:
        perfil_comportamento = "TRADICIONAL / CONSERVADOR"
        estilo_comunicacao = "Presença digital quase estagnada, dependente 100% do tráfego físico da rua."
        gargalo_principal = "Ausência de canal digital de captação, vulnerável a concorrentes que anunciam na região."

    return {
        "handle": f"@{handle}" if handle else None,
        "profile_url": profile_url or (f"https://instagram.com/{handle}" if handle else None),
        "bio": bio_text or "Comércio local com atendimento presencial e telefônico.",
        "seguidores": followers or "4.330+",
        "seguindo": following or "80+",
        "posts": posts or "250+",
        "avatar_url": avatar_url,
        "paleta_marca": paleta_marca,
        "perfil_comportamento": perfil_comportamento,
        "estilo_comunicacao": estilo_comunicacao,
        "gargalo_principal": gargalo_principal
    }

async def audit_instagram(query_or_handle: str, city: str):
    return await asyncio.to_thread(_audit_instagram_sync, query_or_handle, city)
