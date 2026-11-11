import httpx
import json

async def generate_ai_profile(payload: dict):
    nome_fantasia = payload.get("nome_fantasia", "Comércio")
    socio_nome = payload.get("socio_nome", "")
    nicho = payload.get("nicho", "Comércio")
    cidade = payload.get("cidade", "")
    avaliacao_media = payload.get("avaliacao_media", 4.5)
    total_avaliacoes = payload.get("total_avaliacoes", 50)
    bio_insta = payload.get("bio_instagram", "")
    seguidores = payload.get("seguidores_instagram", "")
    perfil_sugerido = payload.get("perfil_comportamento", "ARROJADO / OFERTAS CONSTANTES")
    gargalo_base = payload.get("gargalo_principal", "Ausência de canal direto de fidelização e vendas no WhatsApp")
    
    # Extrai primeiro nome civil do sócio para abordagem humana
    primeiro_nome = ""
    if socio_nome and socio_nome.lower() not in ["desconhecido", "sócio desconhecido", "não informado", "proprietário"]:
        primeiro_nome = socio_nome.strip().split()[0].title()

    cidade_curta = cidade.split(",")[0].strip()

    system_prompt = """Você é o motor de inteligência comercial do Guará Engine, especialista em prospecção ativa B2B para comércios locais no Brasil.
Sua missão é gerar um diagnóstico tático e um pitch cirúrgico para envio via WhatsApp diretamente ao proprietário ou tomador de decisão.

DIRETRIZES OBRIGATÓRIAS:
1. Se o nome do sócio estiver disponível, comece o pitch chamando-o pelo primeiro nome de forma natural e profissional (ex: "Fala, Jonaldo! Tudo bem?"). NUNCA use saudações impessoais como "Olá equipe", "Prezados" ou "Olá [Nome da Loja]".
2. Cite um elemento real da loja (quantidade de seguidores, avaliações no Maps ou frase da bio).
3. Aponte um gargalo comercial real (ex: dias de menor movimento sem ofertas ativas, dependência de tráfego de rua, ausência de catálogo interativo no WhatsApp).
4. Conclua com um Call-to-Action (CTA) direto e de baixo atrito (ex: "Topa 3 minutos no WhatsApp pra eu te mostrar a estratégia?").
5. Responda EXCLUSIVAMENTE em formato JSON estrito."""

    prompt = f"""Analise este comércio real:
- Nome Fantasia: {nome_fantasia}
- Proprietário / Sócio-Administrador: {primeiro_nome or socio_nome or 'Proprietário'}
- Nicho: {nicho}
- Localização: {cidade_curta}
- Avaliação Google Maps: {avaliacao_media} ⭐ ({total_avaliacoes} avaliações)
- Instagram: {seguidores} seguidores • Bio: "{bio_insta}"
- Perfil Comportamental: {perfil_sugerido}

Gere um JSON com:
{{
  "score_relevancia": <inteiro de 85 a 99>,
  "score_ousadia": "<03/05 a 05/05>",
  "classificacao_perfil": "{perfil_sugerido}",
  "analise_presenca_digital": "<análise concisa da presença digital e bio>",
  "pontos_fortes": ["<ponto forte 1>", "<ponto forte 2>"],
  "vulnerabilidades_oportunidades": ["<gargalo real 1>", "<gargalo real 2>"],
  "gatilho_de_venda": "<gatilho prático de conversão>",
  "pitch_sugerido": "<mensagem de WhatsApp chamando o proprietário pelo primeiro nome, citando a loja e dor real>"
}}"""

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "qwen2.5:7b",
                    "system": system_prompt,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                }
            )
            if response.status_code == 200:
                data = response.json()
                raw_json = json.loads(data.get("response", "{}"))
                if "pitch_sugerido" in raw_json and raw_json["pitch_sugerido"]:
                    return raw_json
    except Exception as e:
        print(f"[OLLAMA] Fallback contextual cirúrgico ativado ({e})")

    # Fallback contextual de alta conversão caso o Ollama demore ou esteja ocupado
    saudacao = f"Fala, {primeiro_nome}! Tudo bem?" if primeiro_nome else f"Olá! Tudo bem com a equipe da {nome_fantasia}?"
    
    detalhe_social = f"mais de {seguidores} seguidores no Instagram" if seguidores and seguidores != "Não informado" else f"{total_avaliacoes} avaliações no Google Maps"

    pitch_fallback = (
        f"{saudacao} Vi que o {nome_fantasia} tem uma presença muito forte em {cidade_curta}, com {detalhe_social}. "
        f"Notei, porém, que na comunicação digital de vocês ainda falta um canal de reativação para preencher os dias de menor movimento (como terça e quarta) diretamente no WhatsApp, sem intermediários. "
        f"Desenhamos uma estrutura prática para resolver exatamente isso. Topa 3 minutos pra eu te mostrar como funciona?"
    )

    pontos_fortes = [
        f"Marca consolidada na região de {cidade_curta}",
        f"Boa reputação com nota {avaliacao_media} no Google Maps"
    ]
    if seguidores and seguidores != "Não informado":
        pontos_fortes.append(f"Audiência ativa com {seguidores} seguidores no Instagram")

    vulnerabilidades = [
        "Ausência de funil de vendas ativo e catálogo automatizado no WhatsApp",
        "Vulnerabilidade nos dias de menor movimento da semana sem campanhas de reativação",
        "Dependência de tráfego físico e vendas de balcão sem retenção digital"
    ]

    return {
        "score_relevancia": min(99, int(avaliacao_media * 15 + min(total_avaliacoes, 100) * 0.25)),
        "score_ousadia": "05/05" if "ARROJADO" in perfil_sugerido else "03/05",
        "classificacao_perfil": perfil_sugerido,
        "analise_presenca_digital": f"Presença consolidada no Google Maps ({total_avaliacoes} avaliações) e Instagram com {seguidores} seguidores.",
        "pontos_fortes": pontos_fortes,
        "vulnerabilidades_oportunidades": vulnerabilidades,
        "gatilho_de_venda": "Aumento de margem de lucro com clientes fiéis nos dias fracos",
        "pitch_sugerido": pitch_fallback
    }
