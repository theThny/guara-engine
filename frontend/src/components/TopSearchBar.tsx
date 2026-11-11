"use client";

import { 
  ChevronDown, 
  Loader2, 
  Utensils, 
  ShoppingCart, 
  Pizza, 
  Pill, 
  Zap, 
  Wrench, 
  Shirt, 
  HeartPulse,
  Sparkles,
  Check
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

// Ícone de Xícara de Café com vapor idêntico ao da imagem
function CoffeeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={`${className} text-black shrink-0`} viewBox="0 0 24 24" fill="currentColor">
      {/* 3 linhas de vapor */}
      <path 
        d="M6 2.5c-.4.8-.4 1.7 0 2.5M10 2.5c-.4.8-.4 1.7 0 2.5M14 2.5c-.4.8-.4 1.7 0 2.5" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.8" 
        strokeLinecap="round" 
      />
      {/* Corpo da xícara e alça */}
      <path d="M3 8h13v6.5a3.5 3.5 0 0 1-3.5 3.5h-6A3.5 3.5 0 0 1 3 14.5V8zm13 1.5h1.8a2.2 2.2 0 0 1 2.2 2.2v.6a2.2 2.2 0 0 1-2.2 2.2H16V9.5z" />
    </svg>
  );
}

// Ícone de Lupa com estrelas/brilhos idêntico ao da imagem
function SearchSparkleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={`${className} text-black shrink-0`} viewBox="0 0 24 24" fill="currentColor">
      {/* Lupa */}
      <path d="M10 3.5a6.5 6.5 0 0 0-4.6 11.1l-3.2 3.2a1 1 0 1 0 1.4 1.4l3.2-3.2A6.5 6.5 0 1 0 10 3.5zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z" />
      {/* Estrela de brilho grande (4 pontas) */}
      <path d="M18.5 2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
      {/* Estrela de brilho pequena (4 pontas) */}
      <path d="M21.5 8l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z" />
    </svg>
  );
}

// Ícone de Pin de Mapa idêntico ao da imagem (preto sólido com furo central)
function BlackMapPinIcon({ className = "w-5 h-6" }: { className?: string }) {
  return (
    <svg className={`${className} text-black fill-black shrink-0`} viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

interface TopSearchBarProps {
  onSearch: (cidade: string, categoria: string, isVarreduraTotal?: boolean) => void;
  isSearching?: boolean;
  activeCity?: string;
  activeCategoria?: string;
}

export const CATEGORIAS_COM_ICONES = [
  { id: "Cafeterias", label: "Cafeterias", icon: CoffeeIcon },
  { id: "Hamburguerias", label: "Hamburguerias", icon: Utensils },
  { id: "Supermercados", label: "Supermercados", icon: ShoppingCart },
  { id: "Pizzarias", label: "Pizzarias", icon: Pizza },
  { id: "Farmacias", label: "Farmácias", icon: Pill },
  { id: "Academias", label: "Academias", icon: Zap },
  { id: "Oficinas", label: "Oficinas", icon: Wrench },
  { id: "Vestuario", label: "Vestuário", icon: Shirt },
  { id: "Clinicas", label: "Clínicas", icon: HeartPulse },
  { id: "Todos", label: "Todos", icon: Sparkles },
];

export default function TopSearchBar({
  onSearch,
  isSearching = false,
  activeCity = "Malacacheta, MG",
  activeCategoria = "Cafeterias"
}: TopSearchBarProps) {
  const [cityInput, setCityInput] = useState(activeCity);
  const [selectedCat, setSelectedCat] = useState(activeCategoria);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCityInput(activeCity);
  }, [activeCity]);

  useEffect(() => {
    setSelectedCat(activeCategoria);
  }, [activeCategoria]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTriggerSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cityInput.trim()) return;
    const isTotal = selectedCat === "Todos";
    onSearch(cityInput.trim(), selectedCat, isTotal);
  };

  const currentCatObj = CATEGORIAS_COM_ICONES.find(c => c.id === selectedCat || c.label.includes(selectedCat)) || CATEGORIAS_COM_ICONES[0];
  const CurrentIcon = currentCatObj.icon;

  return (
    <form 
      onSubmit={handleTriggerSearch}
      className="bg-[#A82508] rounded-full p-2.5 md:p-3 flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.7)] select-none transition-all"
    >
      {/* ── 1. CAMPO DE CIDADE: Pill branco espaçoso ── */}
      <div className="bg-white h-[52px] rounded-full px-5 flex items-center gap-3.5 w-[360px] md:w-[420px] shadow-sm">
        <BlackMapPinIcon className="w-5 h-6" />
        <input
          type="text"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="Malacacheta, MG"
          className="bg-transparent text-zinc-600 font-normal text-[16px] outline-none w-full placeholder:text-zinc-400"
        />
      </div>

      {/* ── 2. SELETOR DE CATEGORIA: Retângulo arredondado branco (rounded-[16px]) com espaçamento interno ── */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
          className="bg-white h-[52px] rounded-[16px] px-5 flex items-center gap-3 cursor-pointer shadow-sm hover:bg-zinc-50 transition-all active:scale-[0.98]"
        >
          <CurrentIcon className="w-5 h-5 md:w-6 md:h-6" />
          <span className="text-black font-normal text-[16px] tracking-tight">{currentCatObj.label}</span>
          <ChevronDown className={`w-4 h-4 text-black stroke-[2.5] transition-transform ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown de Categorias */}
        {isCatDropdownOpen && (
          <div className="absolute top-full left-0 mt-2.5 w-60 bg-[#18181D] border border-zinc-700/80 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
              {CATEGORIAS_COM_ICONES.map((cat) => {
                const Icon = cat.icon;
                const isCatSelected = selectedCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCat(cat.id);
                      setIsCatDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isCatSelected 
                        ? "bg-[#FF3400] text-white" 
                        : "text-zinc-200 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </div>
                    {isCatSelected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. BOTÃO DE BUSCA: Círculo branco com Lupa + Sparkles espaçoso ── */}
      <button
        type="submit"
        disabled={isSearching}
        className="w-[52px] h-[52px] rounded-full bg-white hover:bg-zinc-100 text-black flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-sm shrink-0 disabled:opacity-50"
        title="Buscar comércios"
      >
        {isSearching ? (
          <Loader2 className="w-6 h-6 animate-spin text-[#FF3400]" />
        ) : (
          <SearchSparkleIcon className="w-6 h-6" />
        )}
      </button>
    </form>
  );
}
