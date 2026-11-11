# GUARÁ Engine 🐺🔍

O **GUARÁ Engine** é uma plataforma tática de **OSINT (Open-Source Intelligence) e prospecção B2B** focada em negócios locais. O sistema permite escanear regiões e cidades, localizar comércios em um mapa interativo e enriquecer automaticamente os dados cadastrais oficiais da Receita Federal (CNPJ, Razão Social, Quadro Societário/QSA com sócios reais) e presença digital (Instagram, seguidores, posts e identidade visual).

---

## ⚡ Tecnologias

- **Frontend:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack), TypeScript, [Tailwind CSS](https://tailwindcss.com/), [MapLibre GL](https://maplibre.org/), Lucide Icons, Tipografia Instrument Sans.
- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+), Uvicorn.
- **Web Scraping & OSINT:** [Playwright](https://playwright.dev/) com Playwright Stealth, DuckDuckGo Search (`ddgs`), MinhaReceita & BrasilAPI.
- **Banco de Dados:** SQLite local (`guara_engine.db`) com indexação e cache inteligente.

---

## 🚀 Como Rodar o Projeto Localmente

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Python](https://www.python.org/) (versão 3.10 ou superior)
- [Git](https://git-scm.com/)

---

### 2. Configurando o Backend (API)

```bash
cd backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# No Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# No Linux/Mac:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Instalar binários do Playwright Chromium
playwright install chromium

# Iniciar servidor FastAPI
python main.py
```
O backend estará rodando em: `http://localhost:8000`

---

### 3. Configurando o Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar ambiente de desenvolvimento
npm run dev
```
O frontend estará acessível em: `http://localhost:3000`

---

## 🧭 Arquitetura & Fluxo

1. **Varredura Geográfica:** A partir de uma cidade e nicho, o sistema geocodifica via OpenStreetMap (Nominatim) e pesquisa os estabelecimentos no Google Maps com cálculo geodésico (Haversine) para filtrar apenas locais dentro do raio real (ex: 25 km).
2. **Cache First:** Pesquisas anteriores são salvas no banco de dados local SQLite e retornam instantaneamente (~0.05s).
3. **Enriquecimento Cadastral Just-In-Time:** Ao selecionar um comércio, uma busca concorrente de 4 camadas localiza o CNPJ e cruza os dados com a Receita Federal, descobrindo os Sócios-Administradores e qualificações do QSA.
4. **Presença Digital:** Auditoria automatizada do perfil do Instagram (seguidores, publicações, bio) e extração cromática da marca a partir do logotipo oficial.

---

## 📄 Licença

Este projeto é desenvolvido para prospecção corporativa e inteligência de mercado.
