"use client";

import { useState, useEffect } from "react";
import FeedCard from "@/components/FeedCard";
import TopSearchBar from "@/components/TopSearchBar";
import MapCanvas from "@/components/MapCanvas";
import LeadDossier from "@/components/LeadDossier";
import { AlertCircle } from "lucide-react";

export default function Home() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isEnrichingLead, setIsEnrichingLead] = useState(false);
  const [isReprocessingLead, setIsReprocessingLead] = useState(false);
  const [activeCity, setActiveCity] = useState("Malacacheta, MG");
  const [activeCategoria, setActiveCategoria] = useState("Cafeterias");
  const [isTotalMode, setIsTotalMode] = useState(false);
  const [currentCoords, setCurrentCoords] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    handleSearch("Malacacheta, MG", "Cafeterias", false, [-42.0791, -17.8439]);
  }, []);

  const handleSearch = async (
    cidade: string,
    categoria: string,
    isVarreduraTotal: boolean = false,
    preResolvedCoords?: [number, number]
  ) => {
    setIsSearching(true);
    setSearchError(null);
    setActiveCity(cidade);
    setActiveCategoria(categoria);
    setIsTotalMode(isVarreduraTotal);

    try {
      let targetLat = -17.8439;
      let targetLng = -42.0791;

      if (preResolvedCoords && preResolvedCoords.length === 2) {
        targetLng = preResolvedCoords[0];
        targetLat = preResolvedCoords[1];
      } else {
        const cleanQuery = cidade.split(",")[0].trim();
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery + ", Brasil")}&format=json&limit=1`, {
            headers: { 'User-Agent': 'GuaraEngine/2.0' }
          });
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            targetLat = parseFloat(geoData[0].lat);
            targetLng = parseFloat(geoData[0].lon);
          }
        } catch (e) { console.warn("Geocoding fallback", e); }
      }

      const searchQuery = isVarreduraTotal ? "comércio local" : categoria;
      let fetchedLeads: any[] = [];

      try {
        const res = await fetch("http://localhost:8000/api/leads/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery, location: cidade, target_lat: targetLat, target_lng: targetLng, max_radius_km: 25.0 })
        });
        if (res.ok) {
          const data = await res.json();
          fetchedLeads = data.leads || [];
        } else {
          setSearchError("Erro na resposta do serviço de busca.");
        }
      } catch (err) {
        console.error("Backend error", err);
        setSearchError("Não foi possível conectar ao backend Guará.");
      }

      if (fetchedLeads && fetchedLeads.length > 0) {
        const mapped = fetchedLeads.map((item: any, idx: number) => ({
          ...item,
          id: item.id || `lead-real-${idx + 1}`,
          isEnriched: Boolean(item.cnpj && item.socio_principal),
          lng: (item.lat && item.lng) ? item.lng : targetLng + (Math.random() - 0.5) * 0.01,
          lat: (item.lat && item.lng) ? item.lat : targetLat + (Math.random() - 0.5) * 0.01,
          nicho: item.nicho || (isVarreduraTotal ? "Comércio Local" : categoria)
        }));
        setLeads(mapped);
        const first = mapped[0];
        setSelectedLead(first);
        if (first && !first.isEnriched) handleEnrichLead(first);
      } else {
        setLeads([]);
        setSelectedLead(null);
        setSearchError(`Nenhum estabelecimento encontrado para "${searchQuery}" em "${cidade}".`);
      }
    } catch (err) {
      console.error("Search pipeline error", err);
      setSearchError("Ocorreu uma falha no processamento da pesquisa.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleEnrichLead = async (leadToEnrich: any) => {
    if (!leadToEnrich) return;
    setIsEnrichingLead(true);
    try {
      let enrichedResult: any = null;
      try {
        const res = await fetch("http://localhost:8000/api/leads/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead: {
              id: leadToEnrich.id,
              nome_fantasia: leadToEnrich.nome_fantasia,
              nicho: leadToEnrich.nicho,
              endereco_completo: leadToEnrich.endereco_completo,
              telefone: leadToEnrich.telefone,
              avaliacao_media: leadToEnrich.avaliacao_media || 4.5,
              total_avaliacoes: leadToEnrich.total_avaliacoes || 50,
              lat: leadToEnrich.lat,
              lng: leadToEnrich.lng,
              foto_url: leadToEnrich.foto_url,
              avatar_logo_url: leadToEnrich.avatar_logo_url,
              instagram: leadToEnrich.instagram,
              instagram_url: leadToEnrich.instagram_url
            }
          })
        });
        if (res.ok) enrichedResult = await res.json();
      } catch (e) { console.warn("Backend enrich warning", e); }

      const updated = {
        ...leadToEnrich,
        razao_social: enrichedResult?.comercio?.razao_social || enrichedResult?.razao_social || leadToEnrich.razao_social || null,
        cnpj: enrichedResult?.comercio?.cnpj || enrichedResult?.cnpj || leadToEnrich.cnpj || null,
        clean_cnpj: enrichedResult?.comercio?.clean_cnpj || enrichedResult?.clean_cnpj || leadToEnrich.clean_cnpj || null,
        url_cartao_cnpj: enrichedResult?.comercio?.url_cartao_cnpj || enrichedResult?.url_cartao_cnpj || null,
        cnae: enrichedResult?.comercio?.cnae || enrichedResult?.cnae || leadToEnrich.cnae || null,
        situacao_cadastral: enrichedResult?.comercio?.situacao_cadastral || enrichedResult?.situacao_cadastral || leadToEnrich.situacao_cadastral || "ATIVA",
        quadro_societario: enrichedResult?.quadro_societario || leadToEnrich.quadro_societario || [],
        socio_principal: enrichedResult?.socio_principal || leadToEnrich.socio_principal || null,
        socio_cargo: enrichedResult?.socio_cargo || leadToEnrich.socio_cargo || null,
        avatar_logo_url: enrichedResult?.avatar_logo_url || leadToEnrich.avatar_logo_url || null,
        foto_url: enrichedResult?.foto_url || leadToEnrich.foto_url || null,
        instagram: enrichedResult?.contatos?.instagram || enrichedResult?.instagram || leadToEnrich.instagram || null,
        instagram_url: enrichedResult?.contatos?.instagram_url || enrichedResult?.instagram_url || leadToEnrich.instagram_url || null,
        instagram_audit: enrichedResult?.instagram_audit || leadToEnrich.instagram_audit || null,
        paleta_hex: enrichedResult?.paleta_hex || leadToEnrich.paleta_hex || ["#FF3400", "#FA8E00", "#1A0303"],
        isEnriched: true
      };
      setLeads((prev) => prev.map((l) => (l.id === leadToEnrich.id ? updated : l)));
      setSelectedLead(updated);
    } catch (err) {
      console.error("Enrich error", err);
    } finally {
      setIsEnrichingLead(false);
    }
  };

  const handleReprocessLead = async (leadToReprocess: any) => {
    if (!leadToReprocess) return;
    setIsReprocessingLead(true);
    try {
      const res = await fetch("http://localhost:8000/api/leads/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: {
            id: leadToReprocess.id, nome_fantasia: leadToReprocess.nome_fantasia,
            nicho: leadToReprocess.nicho, endereco_completo: leadToReprocess.endereco_completo,
            telefone: leadToReprocess.telefone, avaliacao_media: leadToReprocess.avaliacao_media || 4.5,
            total_avaliacoes: leadToReprocess.total_avaliacoes || 50,
            lat: leadToReprocess.lat, lng: leadToReprocess.lng,
            foto_url: leadToReprocess.foto_url, avatar_logo_url: leadToReprocess.avatar_logo_url,
            instagram: leadToReprocess.instagram, instagram_url: leadToReprocess.instagram_url
          }
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setLeads((prev) => prev.map((l) => (l.id === leadToReprocess.id ? updated : l)));
        setSelectedLead(updated);
      }
    } catch (err) {
      console.error("Reprocess error", err);
    } finally {
      setIsReprocessingLead(false);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#0D0D11] text-white overflow-hidden select-none">
      {/* ── LAYER 0: MAPA FULLSCREEN ── */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapCanvas
          leads={leads}
          onSelectLead={(lead) => {
            setSelectedLead(lead);
            if (!lead.isEnriched || !lead.cnpj) handleEnrichLead(lead);
          }}
          selectedLeadId={selectedLead?.id || null}
          activeCityName={activeCity}
          onCenterChange={setCurrentCoords}
          isTotalMode={isTotalMode}
        />
      </div>

      {/* ── LAYER 1: BARRA SUPERIOR CENTRAL ── */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
        <TopSearchBar
          onSearch={handleSearch}
          isSearching={isSearching}
          activeCity={activeCity}
          activeCategoria={activeCategoria}
        />
      </div>

      {/* ── LAYER 2: FEED CARD ESQUERDO ── */}
      <div className="absolute left-8 top-8 bottom-8 w-[380px] z-20">
        <FeedCard
          leads={leads}
          selectedLeadId={selectedLead?.id || null}
          onSelectLead={(lead) => {
            setSelectedLead(lead);
            if (!lead.isEnriched || !lead.cnpj) handleEnrichLead(lead);
          }}
          isSearching={isSearching}
        />
      </div>

      {/* ── LAYER 3: PAINEL DIREITO (DOSSIÊ) ── */}
      {selectedLead && (
        <div className="absolute right-0 top-0 bottom-0 w-[450px] xl:w-[480px] z-20">
          <LeadDossier
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onEnrichLead={handleEnrichLead}
            onReprocessLead={handleReprocessLead}
            isEnriching={isEnrichingLead}
            isReprocessing={isReprocessingLead}
          />
        </div>
      )}

      {/* ── OVERLAY: Loading ── */}
      {isSearching && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#0D0D11]/80 backdrop-blur-sm pointer-events-none">
          <div className="relative flex items-center justify-center w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-[#FF3400]/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border border-[#FF3400]/30 animate-pulse" />
            <div className="w-16 h-16 rounded-full border-2 border-t-[#FF3400] border-r-[#FA8E00] border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-lg font-extrabold text-white tracking-[0.15em] uppercase">
            Varrendo {activeCity}
          </p>
          <p className="text-sm text-[#FA8E00] font-medium mt-1.5 animate-pulse">
            {activeCategoria} • Google Maps
          </p>
        </div>
      )}

      {/* ── ERRO ── */}
      {searchError && !isSearching && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-40 bg-[#18181D] border border-[#FF3400]/50 p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-lg">
          <AlertCircle className="w-5 h-5 text-[#FF3400] shrink-0" />
          <div className="text-sm text-white/90 leading-relaxed">{searchError}</div>
          <button onClick={() => setSearchError(null)} className="ml-auto text-sm font-bold text-white/40 hover:text-white shrink-0">✕</button>
        </div>
      )}
    </div>
  );
}
