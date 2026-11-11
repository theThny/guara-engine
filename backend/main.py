from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uuid

# Import database
import database

# Import skills
from skills.scraper_maps import search_maps
from skills.cnpj_enricher import get_cnpj_info
from skills.color_extractor import extract_colors
from skills.instagram_auditor import audit_instagram

app = FastAPI(title="Guará Engine API")

# Initialize SQLite database
database.init_db()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchQuery(BaseModel):
    query: str
    location: str
    target_lat: Optional[float] = None
    target_lng: Optional[float] = None
    max_radius_km: Optional[float] = 25.0
    force_refresh: Optional[bool] = False

class LeadBase(BaseModel):
    id: str
    nome_fantasia: str
    nicho: str
    endereco_completo: str
    telefone: str
    avaliacao_media: float
    total_avaliacoes: int
    lat: float
    lng: float
    foto_url: Optional[str] = None
    avatar_logo_url: Optional[str] = None
    instagram: Optional[str] = None
    instagram_url: Optional[str] = None
    status_funcionamento: Optional[str] = None

class EnrichRequest(BaseModel):
    lead: LeadBase

class ReprocessRequest(BaseModel):
    lead: LeadBase

@app.get("/")
def read_root():
    return {"status": "Guará Engine API is running", "database": "guara_engine.db"}

@app.post("/api/leads/search")
async def search_leads(query: SearchQuery):
    try:
        # 1. Verifica cache local primeiro (se não for refresh forçado)
        if not query.force_refresh:
            cached = database.get_leads_by_city(query.location, query.query)
            if cached and len(cached) > 0:
                print(f"[CACHE HIT] Retornando {len(cached)} comércios do banco local para {query.location}")
                return {"leads": cached, "from_cache": True}

        # 2. Se não estiver no cache, executa raspagem furtiva com Geofencing
        results = await search_maps(
            query=query.query, 
            location=query.location, 
            target_lat=query.target_lat, 
            target_lng=query.target_lng, 
            max_radius_km=query.max_radius_km or 25.0
        )
        
        # 3. Salva no banco de dados local para persistência permanente
        if results and len(results) > 0:
            database.save_leads_bulk(results, query.location, query.query)
            
        return {"leads": results, "from_cache": False}
    except Exception as e:
        print(f"[SEARCH ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/leads/enrich")
async def enrich_lead(req: EnrichRequest):
    lead = req.lead.dict()
    
    # 1. Consulta Cadastral Oficial com Varredura em 4 Camadas (Telefone, Portais, Endereço e QSA)
    cnpj_info = await get_cnpj_info(
        query=lead['nome_fantasia'], 
        location=req.lead.endereco_completo,
        telefone=lead.get('telefone'),
        endereco=lead.get('endereco_completo'),
        nicho=lead.get('nicho')
    )
    
    # 2. Auditoria Real do Instagram (Bio, Seguidores, Posts, Avatar e Cores da Marca)
    insta_audit = await audit_instagram(
        lead.get('instagram') or lead['nome_fantasia'], 
        lead['endereco_completo']
    )
    
    # 3. Paleta de Cores: extraída do Logotipo Oficial da marca
    avatar_url = insta_audit.get("avatar_url") or lead.get("avatar_logo_url")
    foto_url = lead.get('foto_url')
    
    if avatar_url:
        paleta = insta_audit.get("paleta_marca") or extract_colors(avatar_url)
    elif foto_url:
        paleta = extract_colors(foto_url)
    else:
        paleta = ["#FF3400", "#FA8E00", "#180303"]
    
    # Sócio-Administrador principal
    socio_principal = cnpj_info.get("socio_principal")
    socio_cargo = "Proprietário"
    if cnpj_info.get('quadro_societario') and len(cnpj_info['quadro_societario']) > 0:
        socio_principal = cnpj_info['quadro_societario'][0]['nome_socio']
        socio_cargo = cnpj_info['quadro_societario'][0].get('qualificacao', 'Sócio-Administrador')

    enriched_lead = {
        "id": lead['id'],
        "nome_fantasia": lead['nome_fantasia'],
        "razao_social": cnpj_info.get('razao_social', lead['nome_fantasia'] + " LTDA"),
        "cnpj": cnpj_info.get('cnpj', None),
        "clean_cnpj": cnpj_info.get('clean_cnpj', None),
        "url_cartao_cnpj": cnpj_info.get('url_cartao_cnpj'),
        "url_receita_federal": cnpj_info.get('url_receita_federal'),
        "situacao_cadastral": cnpj_info.get('situacao_cadastral', "ATIVA"),
        "cnae": cnpj_info.get('cnae', "Comércio Local"),
        "socio_principal": socio_principal,
        "socio_cargo": socio_cargo,
        "quadro_societario": cnpj_info.get('quadro_societario', []),
        "nicho": lead['nicho'],
        "endereco_completo": lead['endereco_completo'],
        "telefone": lead['telefone'],
        "lat": lead['lat'],
        "lng": lead['lng'],
        "avaliacao_media": lead['avaliacao_media'],
        "total_avaliacoes": lead['total_avaliacoes'],
        "status_funcionamento": lead.get('status_funcionamento', "Horário comercial"),
        "foto_url": foto_url,
        "avatar_logo_url": avatar_url,
        "instagram": insta_audit.get("handle") or lead.get('instagram'),
        "instagram_url": insta_audit.get("profile_url") or lead.get('instagram_url'),
        "instagram_audit": insta_audit,
        "paleta_hex": paleta,
        "isEnriched": True
    }
    
    # Atualiza banco de dados local
    cidade = lead['endereco_completo'].split("-")[-1].strip() if "-" in lead['endereco_completo'] else "Brasil"
    database.save_lead(enriched_lead, cidade, lead['nicho'])
    
    return enriched_lead

@app.post("/api/leads/reprocess")
async def reprocess_lead(req: ReprocessRequest):
    """
    Reprocessa isoladamente um único comércio selecionado (Maps + CNPJ + Instagram).
    """
    lead = req.lead.dict()
    print(f"[REPROCESS] Reprocessando comércio individual: {lead['nome_fantasia']}")
    
    # 1. Consulta CNPJ com Varredura em 4 Camadas
    cnpj_info = await get_cnpj_info(
        query=lead['nome_fantasia'], 
        location=lead['endereco_completo'],
        telefone=lead.get('telefone'),
        endereco=lead.get('endereco_completo'),
        nicho=lead.get('nicho')
    )
    
    # 2. Re-audita perfil do Instagram e Logotipo
    insta_audit = await audit_instagram(
        lead.get('instagram') or lead['nome_fantasia'], 
        lead['endereco_completo']
    )
    
    avatar_url = insta_audit.get("avatar_url") or lead.get("avatar_logo_url")
    foto_url = lead.get('foto_url')
    
    if avatar_url:
        paleta = insta_audit.get("paleta_marca") or extract_colors(avatar_url)
    elif foto_url:
        paleta = extract_colors(foto_url)
    else:
        paleta = ["#FF3400", "#FA8E00", "#180303"]

    socio_principal = cnpj_info.get("socio_principal")
    socio_cargo = "Proprietário"
    if cnpj_info.get('quadro_societario') and len(cnpj_info['quadro_societario']) > 0:
        socio_principal = cnpj_info['quadro_societario'][0]['nome_socio']
        socio_cargo = cnpj_info['quadro_societario'][0].get('qualificacao', 'Sócio-Administrador')

    updated_lead = {
        "id": lead['id'],
        "nome_fantasia": lead['nome_fantasia'],
        "razao_social": cnpj_info.get('razao_social', lead['nome_fantasia'] + " LTDA"),
        "cnpj": cnpj_info.get('cnpj', None),
        "clean_cnpj": cnpj_info.get('clean_cnpj', None),
        "url_cartao_cnpj": cnpj_info.get('url_cartao_cnpj'),
        "url_receita_federal": cnpj_info.get('url_receita_federal'),
        "situacao_cadastral": cnpj_info.get('situacao_cadastral', "ATIVA"),
        "cnae": cnpj_info.get('cnae', "Comércio Local"),
        "socio_principal": socio_principal,
        "socio_cargo": socio_cargo,
        "quadro_societario": cnpj_info.get('quadro_societario', []),
        "nicho": lead['nicho'],
        "endereco_completo": lead['endereco_completo'],
        "telefone": lead['telefone'],
        "lat": lead['lat'],
        "lng": lead['lng'],
        "avaliacao_media": lead['avaliacao_media'],
        "total_avaliacoes": lead['total_avaliacoes'],
        "status_funcionamento": lead.get('status_funcionamento', "Horário comercial"),
        "foto_url": foto_url,
        "avatar_logo_url": avatar_url,
        "instagram": insta_audit.get("handle") or lead.get('instagram'),
        "instagram_url": insta_audit.get("profile_url") or lead.get('instagram_url'),
        "instagram_audit": insta_audit,
        "paleta_hex": paleta,
        "isEnriched": True
    }
    
    # Salva no banco de dados local
    cidade = lead['endereco_completo'].split("-")[-1].strip() if "-" in lead['endereco_completo'] else "Brasil"
    database.save_lead(updated_lead, cidade, lead['nicho'])
    
    return updated_lead

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
