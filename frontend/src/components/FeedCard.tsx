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

interface FeedCardProps {
  leads: any[];
  selectedLeadId: string | null;
  onSelectLead: (lead: any) => void;
  isSearching?: boolean;
}

export default function FeedCard({
  leads = [],
  selectedLeadId,
  onSelectLead,
  isSearching = false
}: FeedCardProps) {
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("TODOS");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"nota" | "avaliacoes">("nota");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      const cat = l.nicho || l.comercio?.nicho;
      if (cat) set.add(cat.toUpperCase());
    });
    return ["TODOS", ...Array.from(set)];
  }, [leads]);

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
        if (sortBy === "nota") return (b.avaliacao_media || 0) - (a.avaliacao_media || 0);
        return (b.total_avaliacoes || 0) - (a.total_avaliacoes || 0);
      });
  }, [leads, filterText, filterCategory, sortBy]);

  return (
    <div className="bg-[#121215]/98 backdrop-blur-xl border border-zinc-800/90 rounded-2xl overflow-hidden flex flex-col h-full shadow-[0_12px_45px_rgba(0,0,0,0.85)]">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-800/80 bg-[#18181D]">
        {/* Filtros superiores */}
        <div className="flex items-center justify-between mb-3.5">
          {/* Dropdown TODOS */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setIsFilterDropdownOpen(!isFilterDropdownOpen); setIsSortDropdownOpen(false); }}
              className="flex items-center gap-1.5 text-sm font-bold text-white hover:text-[#FA8E00] transition-colors"
            >
              <span>{filterCategory}</span>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </button>
            {isFilterDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-[#18181D] border border-zinc-700/80 rounded-2xl p-1.5 shadow-2xl z-50 max-h-56 overflow-y-auto custom-scrollbar">
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setFilterCategory(cat); setIsFilterDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      filterCategory === cat ? "bg-[#FF3400] text-white" : "text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    <span>{cat}</span>
                    {filterCategory === cat && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ordenar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setIsSortDropdownOpen(!isSortDropdownOpen); setIsFilterDropdownOpen(false); }}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <span className="text-zinc-500">Ordenar:</span>
              <span className="font-semibold text-zinc-300">{sortBy === "nota" ? "Melhor Nota" : "Mais Avaliados"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            {isSortDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#18181D] border border-zinc-700/80 rounded-2xl p-1.5 shadow-2xl z-50">
                {[{ id: "nota", label: "Melhor Nota" }, { id: "avaliacoes", label: "Mais Avaliados" }].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { setSortBy(opt.id as any); setIsSortDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      sortBy === opt.id ? "bg-[#FF3400] text-white" : "text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Campo de busca interno */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrar nesta lista..."
            className="w-full bg-[#121215] text-white font-medium text-sm placeholder-zinc-500 rounded-xl pl-4 pr-10 py-2.5 border border-zinc-800/90 outline-none focus:border-zinc-600 transition-colors shadow-inner"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Lista de Comércios */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#FA8E00]" />
            <span className="text-sm font-semibold">Buscando comércios...</span>
          </div>
        ) : displayedLeads.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-12 font-medium">
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
              <button
                key={lead.id || idx}
                onClick={() => onSelectLead(lead)}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all text-left ${
                  isSelected
                    ? "bg-[#1C1C24] border border-[#FF3400] shadow-[0_0_25px_rgba(255,52,0,0.25)] ring-1 ring-[#FF3400]/40"
                    : "bg-[#16161B] border border-zinc-800/80 hover:bg-[#1E1E26] hover:border-zinc-700"
                }`}
              >
                {/* Número do Marcador / Avatar */}
                <div className={`w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center border font-bold text-sm transition-all ${
                  isSelected 
                    ? "bg-[#FF3400] text-white border-white/50 shadow-md" 
                    : "bg-zinc-800 text-zinc-200 border-zinc-700"
                }`}>
                  {avatarImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarImg} alt={nome} className="w-full h-full object-cover" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-white uppercase tracking-tight truncate leading-snug">
                    {nome}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2 truncate">
                    <span className="truncate">{nicho}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1 text-zinc-400 truncate">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{statusOp}</span>
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 shrink-0 px-2 py-1 bg-black/40 rounded-lg border border-zinc-800">
                  <Star className="w-3.5 h-3.5 fill-[#FA8E00] text-[#FA8E00]" />
                  <span className="text-sm font-bold text-[#FA8E00]">{rating}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-zinc-800/80 bg-[#18181D] flex items-center justify-between">
        <span className="text-xs text-zinc-400 font-medium">{displayedLeads.length} estabelecimentos</span>
        <span className="text-xs text-[#FA8E00] font-bold tracking-wider">GUARÁ ENGINE</span>
      </div>
    </div>
  );
}
