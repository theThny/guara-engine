"use client";

import { 
  Search, 
  ChevronDown, 
  Star, 
  Clock, 
  Loader2,
  Check
} from "lucide-react";
import { useState, useMemo } from "react";

interface SidebarProps {
  leads: any[];
  selectedLeadId: string | null;
  onSelectLead: (lead: any) => void;
  isSearching?: boolean;
}

export default function Sidebar({
  leads = [],
  selectedLeadId,
  onSelectLead,
  isSearching = false
}: SidebarProps) {
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("TODOS");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"nota" | "avaliacoes">("nota");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Lista de categorias únicas encontradas nos leads
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      const cat = l.nicho || l.comercio?.nicho;
      if (cat) set.add(cat.toUpperCase());
    });
    return ["TODOS", ...Array.from(set)];
  }, [leads]);

  // Filtra e ordena
  const displayedLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        const nome = (lead.nome_fantasia || lead.comercio?.nome_fantasia || "").toLowerCase();
        const cat = (lead.nicho || lead.comercio?.nicho || "").toUpperCase();
        const matchesText = nome.includes(filterText.toLowerCase());
        const matchesCat = filterCategory === "TODOS" || cat.includes(filterCategory) || filterCategory.includes(cat);
        return matchesText && matchesCat;
      })
      .sort((a, b) => {
        if (sortBy === "nota") {
          return (b.avaliacao_media || 0) - (a.avaliacao_media || 0);
        }
        return (b.total_avaliacoes || 0) - (a.total_avaliacoes || 0);
      });
  }, [leads, filterText, filterCategory, sortBy]);

  return (
    <aside className="absolute top-6 left-6 z-20 w-[330px] xl:w-[350px] max-h-[calc(100vh-48px)] bg-[#4A0E04]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.8)] select-none">
      {/* 1. Topo: Filtro de Categoria e Ordenação (Estilo Mockup) */}
      <div className="flex items-center justify-between text-xs font-semibold text-white/90 px-1">
        {/* Dropdown TODOS */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsFilterDropdownOpen(!isFilterDropdownOpen);
              setIsSortDropdownOpen(false);
            }}
            className="flex items-center gap-1 hover:text-[#FA8E00] transition-colors uppercase tracking-wider"
          >
            <span>{filterCategory}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#1A0404]/95 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 max-h-48 overflow-y-auto custom-scrollbar">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setFilterCategory(cat);
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                    filterCategory === cat ? "bg-[#FF3400] text-white" : "text-zinc-200 hover:bg-white/10"
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  {filterCategory === cat && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Ordenar */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsSortDropdownOpen(!isSortDropdownOpen);
              setIsFilterDropdownOpen(false);
            }}
            className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
          >
            <span className="text-[11px] text-white/50">Ordenar:</span>
            <span className="font-bold">{sortBy === "nota" ? "Melhor Nota" : "Mais Avaliados"}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {isSortDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-40 bg-[#1A0404]/95 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setSortBy("nota");
                  setIsSortDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                  sortBy === "nota" ? "bg-[#FF3400] text-white" : "text-zinc-200 hover:bg-white/10"
                }`}
              >
                <span>Melhor Nota</span>
                {sortBy === "nota" && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortBy("avaliacoes");
                  setIsSortDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                  sortBy === "avaliacoes" ? "bg-[#FF3400] text-white" : "text-zinc-200 hover:bg-white/10"
                }`}
              >
                <span>Mais Avaliados</span>
                {sortBy === "avaliacoes" && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Campo de Busca Interno em Cápsula Branca (Estilo Mockup) */}
      <div className="relative my-2.5 flex items-center">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder=""
          className="w-full rounded-full bg-white text-black pl-3 pr-8 py-1.5 text-xs font-semibold outline-none shadow-inner"
        />
        <Search className="w-3.5 h-3.5 text-black absolute right-3 pointer-events-none" />
      </div>

      {/* 3. Feed de Cards Escuros (Estilo Mockup) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center h-48 text-white/70 space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#FA8E00]" />
            <span className="text-xs font-semibold tracking-wider">CARREGANDO COMÉRCIOS...</span>
          </div>
        ) : displayedLeads.length === 0 ? (
          <div className="p-4 text-center text-white/50 text-xs font-medium">
            Nenhum comércio encontrado.
          </div>
        ) : (
          displayedLeads.map((lead, idx) => {
            const isSelected = lead.id === selectedLeadId || (!selectedLeadId && idx === 0);
            const nome = lead.nome_fantasia || lead.comercio?.nome_fantasia || "Comércio";
            const nicho = lead.nicho || lead.comercio?.nicho || "Comércio Local";
            const rating = (lead.avaliacao_media || lead.comercio?.avaliacao_maps || 5.0).toFixed(1);
            const statusOp = lead.status_funcionamento || "Horário Comercial";
            
            const avatarImg = lead.avatar_logo_url || lead.instagram_audit?.avatar_url || lead.foto_url;
            const initial = nome.substring(0, 2).toUpperCase();

            return (
              <div
                key={lead.id || idx}
                onClick={() => onSelectLead(lead)}
                className={`p-2 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer transition-all duration-150 ${
                  isSelected 
                    ? "bg-[#1C1C22] border-2 border-[#FF3400] shadow-lg scale-[1.01]" 
                    : "bg-[#141416] hover:bg-[#1A1A1E] border border-white/5 hover:border-white/15"
                }`}
              >
                {/* Lado Esquerdo: Avatar Circular Branco + Informações */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`relative w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm border ${
                    isSelected ? "border-[#FF3400]" : "border-zinc-800"
                  }`}>
                    {avatarImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={avatarImg} 
                        alt={nome} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-[10px] font-black text-black">
                        {initial}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-white font-bold text-xs uppercase tracking-tight truncate leading-tight">
                      {nome}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[9.5px] text-white/50 truncate">
                      <span className="truncate">{nicho}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 truncate text-white/70">
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{statusOp}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Estrela Âmbar + Nota */}
                <div className="flex items-center gap-1 text-xs font-bold text-[#FA8E00] shrink-0 pr-1">
                  <Star className="w-3.5 h-3.5 fill-[#FA8E00] text-[#FA8E00]" />
                  <span>{rating}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
