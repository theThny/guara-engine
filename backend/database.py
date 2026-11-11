import sqlite3
import json
import os
import hashlib
from datetime import datetime
from typing import List, Dict, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "guara_engine.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Tabela de Estabelecimentos (Leads)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        cidade TEXT,
        nicho TEXT,
        nome_fantasia TEXT,
        razao_social TEXT,
        cnpj TEXT,
        clean_cnpj TEXT,
        url_cartao_cnpj TEXT,
        url_receita_federal TEXT,
        situacao_cadastral TEXT,
        cnae TEXT,
        socio_principal TEXT,
        socio_cargo TEXT,
        quadro_societario_json TEXT,
        endereco_completo TEXT,
        telefone TEXT,
        lat REAL,
        lng REAL,
        avaliacao_media REAL,
        total_avaliacoes INTEGER,
        status_funcionamento TEXT,
        foto_url TEXT,
        avatar_logo_url TEXT,
        instagram TEXT,
        instagram_url TEXT,
        instagram_audit_json TEXT,
        paleta_hex_json TEXT,
        is_enriched INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Tabela de Histórico de Varreduras
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cidade TEXT,
        nicho TEXT,
        total_found INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    conn.close()
    print("[DATABASE] SQLite inicializado com sucesso em:", DB_PATH)

def generate_lead_id(nome: str, cidade: str, lat: float = 0.0, lng: float = 0.0) -> str:
    key = f"{nome.strip().lower()}-{cidade.strip().lower()}-{round(lat, 4)}-{round(lng, 4)}"
    return f"lead-{hashlib.md5(key.encode('utf-8')).hexdigest()[:12]}"

def save_lead(lead: Dict, cidade: str, nicho: str):
    conn = get_connection()
    cursor = conn.cursor()
    
    comercio = lead.get("comercio", {})
    contatos = lead.get("contatos", {})
    insta_audit = lead.get("instagram_audit", {})
    identidade = lead.get("identidade_visual", {})
    
    nome_fantasia = (lead.get("nome_fantasia") or comercio.get("nome_fantasia") or "").strip().upper()
    razao_social = lead.get("razao_social") or comercio.get("razao_social") or ""
    cnpj = lead.get("cnpj") or comercio.get("cnpj") or ""
    clean_cnpj = lead.get("clean_cnpj") or comercio.get("clean_cnpj") or ""
    url_cartao_cnpj = lead.get("url_cartao_cnpj") or comercio.get("url_cartao_cnpj") or ""
    url_receita_federal = lead.get("url_receita_federal") or comercio.get("url_receita_federal") or ""
    situacao_cadastral = lead.get("situacao_cadastral") or comercio.get("situacao_cadastral") or "ATIVA"
    cnae = lead.get("cnae") or comercio.get("cnae") or ""
    
    socio_principal = lead.get("socio_principal") or ""
    socio_cargo = lead.get("socio_cargo") or "Sócio-Administrador"
    quadro_societario = lead.get("quadro_societario", [])
    
    endereco = lead.get("endereco_completo") or ""
    telefone = lead.get("telefone") or contatos.get("telefone_maps") or ""
    lat = float(lead.get("lat") or 0.0)
    lng = float(lead.get("lng") or 0.0)
    
    avaliacao = float(lead.get("avaliacao_media") or comercio.get("avaliacao_maps") or 4.5)
    avaliacoes_total = int(lead.get("total_avaliacoes") or comercio.get("total_avaliacoes") or 0)
    status_op = lead.get("status_funcionamento") or "Horário comercial"
    
    foto_url = lead.get("foto_url") or identidade.get("foto_fachada_url") or ""
    avatar_logo_url = lead.get("avatar_logo_url") or insta_audit.get("avatar_url") or foto_url or ""
    
    instagram = lead.get("instagram") or contatos.get("instagram") or insta_audit.get("handle") or ""
    instagram_url = lead.get("instagram_url") or contatos.get("instagram_url") or insta_audit.get("profile_url") or ""
    
    paleta = lead.get("paleta_hex") or identidade.get("paleta_hex") or ["#FF3400", "#FA8E00", "#180303"]
    is_enriched = 1 if lead.get("isEnriched") or lead.get("is_enriched") or cnpj else 0

    lead_id = lead.get("id")
    if not lead_id or lead_id.startswith("real-maps-"):
        lead_id = generate_lead_id(nome_fantasia, cidade, lat, lng)

    cursor.execute("""
    INSERT INTO leads (
        id, cidade, nicho, nome_fantasia, razao_social, cnpj, clean_cnpj,
        url_cartao_cnpj, url_receita_federal, situacao_cadastral, cnae,
        socio_principal, socio_cargo, quadro_societario_json,
        endereco_completo, telefone, lat, lng,
        avaliacao_media, total_avaliacoes, status_funcionamento,
        foto_url, avatar_logo_url, instagram, instagram_url,
        instagram_audit_json, paleta_hex_json, is_enriched, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
        cidade = excluded.cidade,
        nicho = excluded.nicho,
        nome_fantasia = excluded.nome_fantasia,
        razao_social = CASE WHEN excluded.razao_social != '' THEN excluded.razao_social ELSE leads.razao_social END,
        cnpj = CASE WHEN excluded.cnpj != '' THEN excluded.cnpj ELSE leads.cnpj END,
        clean_cnpj = CASE WHEN excluded.clean_cnpj != '' THEN excluded.clean_cnpj ELSE leads.clean_cnpj END,
        url_cartao_cnpj = CASE WHEN excluded.url_cartao_cnpj != '' THEN excluded.url_cartao_cnpj ELSE leads.url_cartao_cnpj END,
        url_receita_federal = CASE WHEN excluded.url_receita_federal != '' THEN excluded.url_receita_federal ELSE leads.url_receita_federal END,
        situacao_cadastral = excluded.situacao_cadastral,
        cnae = CASE WHEN excluded.cnae != '' THEN excluded.cnae ELSE leads.cnae END,
        socio_principal = CASE WHEN excluded.socio_principal != '' THEN excluded.socio_principal ELSE leads.socio_principal END,
        socio_cargo = CASE WHEN excluded.socio_cargo != '' THEN excluded.socio_cargo ELSE leads.socio_cargo END,
        quadro_societario_json = CASE WHEN excluded.quadro_societario_json != '[]' THEN excluded.quadro_societario_json ELSE leads.quadro_societario_json END,
        endereco_completo = excluded.endereco_completo,
        telefone = CASE WHEN excluded.telefone != '' THEN excluded.telefone ELSE leads.telefone END,
        lat = excluded.lat,
        lng = excluded.lng,
        avaliacao_media = excluded.avaliacao_media,
        total_avaliacoes = excluded.total_avaliacoes,
        status_funcionamento = excluded.status_funcionamento,
        foto_url = CASE WHEN excluded.foto_url != '' THEN excluded.foto_url ELSE leads.foto_url END,
        avatar_logo_url = CASE WHEN excluded.avatar_logo_url != '' THEN excluded.avatar_logo_url ELSE leads.avatar_logo_url END,
        instagram = CASE WHEN excluded.instagram != '' THEN excluded.instagram ELSE leads.instagram END,
        instagram_url = CASE WHEN excluded.instagram_url != '' THEN excluded.instagram_url ELSE leads.instagram_url END,
        instagram_audit_json = CASE WHEN excluded.instagram_audit_json != '{}' THEN excluded.instagram_audit_json ELSE leads.instagram_audit_json END,
        paleta_hex_json = excluded.paleta_hex_json,
        is_enriched = CASE WHEN excluded.is_enriched = 1 THEN 1 ELSE leads.is_enriched END,
        updated_at = CURRENT_TIMESTAMP
    """, (
        lead_id, cidade, nicho, nome_fantasia, razao_social, cnpj, clean_cnpj,
        url_cartao_cnpj, url_receita_federal, situacao_cadastral, cnae,
        socio_principal, socio_cargo, json.dumps(quadro_societario),
        endereco, telefone, lat, lng,
        avaliacao, avaliacoes_total, status_op,
        foto_url, avatar_logo_url, instagram, instagram_url,
        json.dumps(insta_audit), json.dumps(paleta), is_enriched
    ))
    
    conn.commit()
    conn.close()

def save_leads_bulk(leads: List[Dict], cidade: str, nicho: str):
    for lead in leads:
        save_lead(lead, cidade, nicho)
        
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO searches (cidade, nicho, total_found) VALUES (?, ?, ?)", (cidade, nicho, len(leads)))
    conn.commit()
    conn.close()

def get_leads_by_city(cidade: str, nicho: Optional[str] = None) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    
    clean_city = cidade.split(",")[0].strip().lower()
    
    if nicho and nicho.lower() not in ["todos", "tudo", "todos os estabelecimentos"]:
        clean_nicho = nicho.strip().lower()
        cursor.execute("""
            SELECT * FROM leads 
            WHERE LOWER(cidade) LIKE ? AND LOWER(nicho) LIKE ?
            ORDER BY avaliacao_media DESC, total_avaliacoes DESC
        """, (f"%{clean_city}%", f"%{clean_nicho}%"))
    else:
        cursor.execute("""
            SELECT * FROM leads 
            WHERE LOWER(cidade) LIKE ?
            ORDER BY avaliacao_media DESC, total_avaliacoes DESC
        """, (f"%{clean_city}%",))
        
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        lead_dict = dict(r)
        try:
            lead_dict["quadro_societario"] = json.loads(lead_dict.get("quadro_societario_json") or "[]")
        except Exception:
            lead_dict["quadro_societario"] = []
            
        try:
            lead_dict["instagram_audit"] = json.loads(lead_dict.get("instagram_audit_json") or "{}")
        except Exception:
            lead_dict["instagram_audit"] = {}
            
        try:
            lead_dict["paleta_hex"] = json.loads(lead_dict.get("paleta_hex_json") or "[]")
        except Exception:
            lead_dict["paleta_hex"] = ["#FF3400", "#FA8E00", "#180303"]
            
        lead_dict["isEnriched"] = bool(lead_dict.get("is_enriched"))
        results.append(lead_dict)
        
    return results

def get_lead_by_id(lead_id: str) -> Optional[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    lead_dict = dict(row)
    try:
        lead_dict["quadro_societario"] = json.loads(lead_dict.get("quadro_societario_json") or "[]")
    except Exception:
        lead_dict["quadro_societario"] = []
        
    try:
        lead_dict["instagram_audit"] = json.loads(lead_dict.get("instagram_audit_json") or "{}")
    except Exception:
        lead_dict["instagram_audit"] = {}
        
    try:
        lead_dict["paleta_hex"] = json.loads(lead_dict.get("paleta_hex_json") or "[]")
    except Exception:
        lead_dict["paleta_hex"] = ["#FF3400", "#FA8E00", "#180303"]
        
    lead_dict["isEnriched"] = bool(lead_dict.get("is_enriched"))
    return lead_dict

def get_search_history() -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM searches ORDER BY created_at DESC LIMIT 20")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
