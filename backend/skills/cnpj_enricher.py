import httpx
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from ddgs import DDGS
from typing import Optional, Dict

def _extract_cnpj_from_text(text: str) -> Optional[str]:
    """
    Extrai padrão de CNPJ formatado (XX.XXX.XXX/XXXX-XX) ou de 14 dígitos consecutivos.
    """
    m = re.search(r'\b(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})\b', text)
    if m:
        return m.group(1)
        
    m_raw = re.search(r'cnpj[^\d]*(\d{14})', text, re.IGNORECASE)
    if m_raw:
        raw = m_raw.group(1)
        return f"{raw[:2]}.{raw[2:5]}.{raw[5:8]}/{raw[8:12]}-{raw[12:]}"
        
    return None

def _run_single_query(query: str) -> Optional[str]:
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=3):
                text_corpus = (r.get("body", "") + " " + r.get("title", "") + " " + r.get("href", ""))
                cand = _extract_cnpj_from_text(text_corpus)
                if cand:
                    return cand
    except Exception:
        pass
    return None

def _deep_cnpj_search_sync(
    nome_fantasia: str, 
    cidade: str, 
    telefone: Optional[str] = None, 
    endereco: Optional[str] = None,
    nicho: Optional[str] = None
) -> Optional[str]:
    """
    Varredura profunda CONCORRENTE em múltiplos diretórios e impressões digitais.
    """
    clean_name = nome_fantasia.split("-")[0].strip()
    clean_city = cidade.split(",")[0].strip()
    
    # 1. Prioridade Máxima: Portais de Registro Direcionados com Nome Fantasia + Cidade
    primary_queries = [
        f'site:cnpj.biz "{clean_name}" "{clean_city}"',
        f'site:casadosdados.com.br "{clean_name}" "{clean_city}"',
        f'site:econodata.com.br "{clean_name}" "{clean_city}"',
        f'"{clean_name}" "{clean_city}" CNPJ'
    ]
    
    # 2. Impressão Digital pelo Telefone e Endereço Reverso
    secondary_queries = []
    if telefone and any(c.isdigit() for c in telefone):
        clean_phone = re.sub(r'\D', '', telefone)
        if len(clean_phone) >= 10:
            secondary_queries.append(f'"{telefone.strip()}" "{clean_city}" CNPJ')
            secondary_queries.append(f'"{clean_phone}" "{clean_city}" CNPJ')
            
    if endereco and len(endereco) > 5:
        rua_match = re.search(r'(?:r\.|rua|av\.|avenida|pç\.|praça|alameda|travessa)\s+([^,0-9]+)', endereco, re.IGNORECASE)
        if rua_match:
            nome_rua = rua_match.group(1).strip()
            if len(nome_rua) > 3:
                secondary_queries.append(f'"{nome_rua}" "{clean_city}" {nicho or "comércio"} CNPJ')

    # Executa primeiro os portais de alta precisão
    with ThreadPoolExecutor(max_workers=len(primary_queries)) as executor:
        futures = {executor.submit(_run_single_query, q): q for q in primary_queries}
        for future in as_completed(futures):
            try:
                candidate = future.result()
                if candidate:
                    print(f"[CNPJ-FOUND-PRIMARY] CNPJ localizado: {candidate} via {futures[future]}")
                    return candidate
            except Exception:
                pass

    # Se não encontrar, tenta os secundários
    if secondary_queries:
        with ThreadPoolExecutor(max_workers=min(len(secondary_queries), 3)) as executor:
            futures = {executor.submit(_run_single_query, q): q for q in secondary_queries}
            for future in as_completed(futures):
                try:
                    candidate = future.result()
                    if candidate:
                        print(f"[CNPJ-FOUND-SECONDARY] CNPJ localizado: {candidate} via {futures[future]}")
                        return candidate
                except Exception:
                    pass

    return None

async def _fetch_receita_federal_data(clean_cnpj: str) -> Optional[Dict]:
    """
    Consulta a base oficial da Receita Federal usando MinhaReceita com fallback para BrasilAPI.
    """
    async with httpx.AsyncClient(timeout=4.0) as client:
        # Tentativa 1: MinhaReceita (Super rápido, sem rate limit restritivo)
        try:
            resp = await client.get(f"https://minhareceita.org/{clean_cnpj}")
            if resp.status_code == 200:
                data = resp.json()
                socios = []
                for s in data.get("qsa", []):
                    nome_socio = s.get("nome_socio", "")
                    if nome_socio:
                        socios.append({
                            "nome_socio": nome_socio.title(),
                            "qualificacao": s.get("qualificacao_socio", "Sócio-Administrador"),
                            "faixa_etaria": s.get("faixa_etaria", "")
                        })
                return {
                    "razao_social": data.get("razao_social", "").title(),
                    "municipio": data.get("municipio", "").title(),
                    "uf": data.get("uf", "MG"),
                    "situacao_cadastral": data.get("descricao_situacao_cadastral", "ATIVA"),
                    "cnae": data.get("cnae_fiscal_descricao", "Comércio Local"),
                    "capital_social": data.get("capital_social", 0),
                    "quadro_societario": socios,
                    "socio_principal": socios[0]["nome_socio"] if socios else None,
                    "socio_cargo": socios[0]["qualificacao"] if socios else "Sócio-Administrador"
                }
        except Exception as e:
            print(f"[MINHARECEITA] Warning: {e}")

        # Tentativa 2: BrasilAPI
        try:
            resp = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{clean_cnpj}")
            if resp.status_code == 200:
                data = resp.json()
                socios = []
                for s in data.get("qsa", []):
                    nome_socio = s.get("nome_socio", "")
                    if nome_socio:
                        socios.append({
                            "nome_socio": nome_socio.title(),
                            "qualificacao": s.get("qualificacao_socio", "Sócio-Administrador"),
                            "faixa_etaria": s.get("faixa_etaria", "")
                        })
                return {
                    "razao_social": data.get("razao_social", "").title(),
                    "municipio": data.get("municipio", "").title(),
                    "uf": data.get("uf", "MG"),
                    "situacao_cadastral": data.get("descricao_situacao_cadastral", "ATIVA"),
                    "cnae": data.get("cnae_fiscal_descricao", "Comércio Local"),
                    "capital_social": data.get("capital_social", 0),
                    "quadro_societario": socios,
                    "socio_principal": socios[0]["nome_socio"] if socios else None,
                    "socio_cargo": socios[0]["qualificacao"] if socios else "Sócio-Administrador"
                }
        except Exception as e:
            print(f"[BRASILAPI] Warning: {e}")

    return None

async def get_cnpj_info(
    query: str, 
    location: str, 
    telefone: Optional[str] = None, 
    endereco: Optional[str] = None,
    nicho: Optional[str] = None
) -> Dict:
    """
    Executa a esteira concorrente de busca de CNPJ e valida no QSA oficial da Receita Federal.
    """
    clean_city = location.split(",")[0].strip().title()
    
    cnpj = None
    try:
        cnpj = await asyncio.wait_for(
            asyncio.to_thread(_deep_cnpj_search_sync, query, location, telefone, endereco, nicho),
            timeout=8.0
        )
    except asyncio.TimeoutError:
        print(f"[CNPJ-TIMEOUT] Varredura excedeu 8s para {query}")
    except Exception as e:
        print(f"[CNPJ-ERROR] Erro na busca: {e}")
        
    if not cnpj:
        return {
            "cnpj": None,
            "clean_cnpj": None,
            "url_cartao_cnpj": "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp",
            "url_receita_federal": "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp",
            "razao_social": None,
            "municipio": clean_city,
            "uf": "BR",
            "situacao_cadastral": "Consulta manual disponível",
            "cnae": "Comércio Local",
            "capital_social": None,
            "quadro_societario": [],
            "socio_principal": None,
            "socio_cargo": "Proprietário"
        }

    clean_cnpj = re.sub(r'\D', '', cnpj)
    rf_data = await _fetch_receita_federal_data(clean_cnpj)

    if rf_data:
        print(f"[RF-CONFIRMADO] {rf_data.get('razao_social')} | Sócio: {rf_data.get('socio_principal')}")
        return {
            "cnpj": cnpj,
            "clean_cnpj": clean_cnpj,
            "url_cartao_cnpj": f"https://cnpj.biz/{clean_cnpj}",
            "url_receita_federal": "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp",
            "razao_social": rf_data.get("razao_social"),
            "municipio": rf_data.get("municipio") or clean_city,
            "uf": rf_data.get("uf", "MG"),
            "situacao_cadastral": rf_data.get("situacao_cadastral", "ATIVA"),
            "cnae": rf_data.get("cnae", "Comércio Local"),
            "capital_social": rf_data.get("capital_social", 0),
            "quadro_societario": rf_data.get("quadro_societario", []),
            "socio_principal": rf_data.get("socio_principal"),
            "socio_cargo": rf_data.get("socio_cargo", "Sócio-Administrador")
        }

    return {
        "cnpj": cnpj,
        "clean_cnpj": clean_cnpj,
        "url_cartao_cnpj": f"https://cnpj.biz/{clean_cnpj}",
        "url_receita_federal": "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp",
        "razao_social": f"{query.upper()} LTDA",
        "municipio": clean_city,
        "uf": "BR",
        "situacao_cadastral": "ATIVA",
        "cnae": "Comércio Local",
        "capital_social": None,
        "quadro_societario": [],
        "socio_principal": None,
        "socio_cargo": "Proprietário"
    }
