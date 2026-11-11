"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plus, Minus, Filter } from "lucide-react";

interface MapCanvasProps {
  leads: any[];
  onSelectLead: (lead: any) => void;
  selectedLeadId: string | null;
  activeCityName?: string;
  onCenterChange?: (coordsStr: string) => void;
  isTotalMode?: boolean;
}

// Category color helper
export function getCategoryBadgeColor(nicho: string = ""): string {
  const n = nicho.toLowerCase();
  if (n.includes("hamburg") || n.includes("restaurante") || n.includes("pizz") || n.includes("lanche") || n.includes("comida")) {
    return "#FF3400"; // Vermilion
  }
  if (n.includes("café") || n.includes("cafe") || n.includes("padaria") || n.includes("confeitaria")) {
    return "#FA8E00"; // Orange
  }
  if (n.includes("auto") || n.includes("posto") || n.includes("mecanica") || n.includes("oficina")) {
    return "#F97316"; // Bright Orange
  }
  if (n.includes("saude") || n.includes("clinica") || n.includes("odonto") || n.includes("farmacia") || n.includes("dentista")) {
    return "#00E5FF"; // Tactical Cyan
  }
  if (n.includes("mercado") || n.includes("supermercado") || n.includes("loja") || n.includes("varejo")) {
    return "#EAB308"; // Amber
  }
  if (n.includes("academia") || n.includes("crossfit") || n.includes("fitness")) {
    return "#A855F7"; // Purple
  }
  return "#FF3400";
}

export default function MapCanvas({
  leads,
  onSelectLead,
  selectedLeadId,
  activeCityName = "POTÉ",
  onCenterChange,
  isTotalMode = false
}: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const [selectedFilterCat, setSelectedFilterCat] = useState<string>("todos");

  // Helper to format decimal coords to Deg-Min-Sec string
  const formatCoords = (lng: number, lat: number) => {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    const absLat = Math.abs(lat);
    const absLng = Math.abs(lng);
    const latDeg = Math.floor(absLat);
    const latMin = Math.floor((absLat - latDeg) * 60);
    const latSec = Math.floor(((absLat - latDeg) * 60 - latMin) * 60);
    const lngDeg = Math.floor(absLng);
    const lngMin = Math.floor((absLng - lngDeg) * 60);
    const lngSec = Math.floor(((absLng - lngDeg) * 60 - lngMin) * 60);
    return `COORD: ${latDeg}°${latMin}'${latSec}"${latDir} ${lngDeg}°${lngMin}'${lngSec}"${lngDir}`;
  };

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;

    // Configure local worker
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    // Initialize with tactical Guara style
    const initialCenter: [number, number] = [-41.9494, -18.8511];
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "/guara_style.json",
      center: initialCenter,
      zoom: 13.8,
      attributionControl: false,
      pitch: 0,
      dragRotate: false,
    });

    map.current.on("load", () => {
      map.current?.resize();
    });

    map.current.on("move", () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      onCenterChange?.(formatCoords(center.lng, center.lat));
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [onCenterChange]);

  // When leads change, pan/fly to the center of the new leads
  useEffect(() => {
    if (!map.current || leads.length === 0) return;

    const validLeads = leads.filter(l => (l.lng || l.localizacao?.coordenadas?.longitude) && (l.lat || l.localizacao?.coordenadas?.latitude));
    if (validLeads.length === 0) return;

    const avgLng = validLeads.reduce((acc, l) => acc + (l.lng || l.localizacao?.coordenadas?.longitude), 0) / validLeads.length;
    const avgLat = validLeads.reduce((acc, l) => acc + (l.lat || l.localizacao?.coordenadas?.latitude), 0) / validLeads.length;

    if (avgLng && avgLat) {
      map.current.flyTo({
        center: [avgLng, avgLat],
        zoom: leads.length > 10 ? 13.2 : 14,
        speed: 1.4,
        curve: 1.2
      });
    }
  }, [leads]);

  const handleZoomIn = () => map.current?.zoomIn();
  const handleZoomOut = () => map.current?.zoomOut();

  // Distinct categories present in current leads
  const categoriesPresent = Array.from(new Set(leads.map(l => l.nicho || l.comercio?.nicho || "Geral")));

  const filteredLeads = selectedFilterCat === "todos"
    ? leads
    : leads.filter(l => (l.nicho || l.comercio?.nicho || "Geral") === selectedFilterCat);

  // Render tactical markers
  useEffect(() => {
    if (!map.current) return;

    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    filteredLeads.forEach((lead, index) => {
      const isSelected = lead.id === selectedLeadId || (!selectedLeadId && index === 0);

      const leadLng = lead.lng ?? lead.localizacao?.coordenadas?.longitude;
      const leadLat = lead.lat ?? lead.localizacao?.coordenadas?.latitude;
      if (!leadLng || !leadLat) return;

      const el = document.createElement("div");
      el.style.zIndex = isSelected ? "50" : "20";
      el.style.cursor = "pointer";
      el.style.userSelect = "none";

      const nome = lead.nome_fantasia || lead.comercio?.nome_fantasia || "Comércio";
      const displayNum = String(index + 1);
      const size = isSelected ? "42" : "34";
      const fontSize = isSelected ? "14" : "12";
      const bg = isSelected ? "#FF3400" : "#1C1C28";
      const border = isSelected ? "2px solid rgba(255,255,255,0.9)" : "2px solid rgba(255,255,255,0.15)";
      const boxShadow = isSelected
        ? "0 0 0 3px rgba(255,52,0,0.4), 0 4px 20px rgba(255,52,0,0.6)"
        : "0 2px 10px rgba(0,0,0,0.65)";

      el.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        " class="group">

          <div style="
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: ${bg};
            border: ${border};
            box-shadow: ${boxShadow};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: ${fontSize}px;
            color: #ffffff;
            transition: all 0.18s ease;
            letter-spacing: -0.02em;
          ">${displayNum}</div>

          <div style="
            width: 2px;
            height: ${isSelected ? "8px" : "5px"};
            background: ${isSelected ? "#FF3400" : "rgba(255,255,255,0.2)"};
            border-radius: 1px;
            margin-top: 1px;
          "></div>

          <div class="group-hover:block hidden" style="
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            background: #13131a;
            border: 1px solid rgba(255,52,0,0.4);
            border-radius: 8px;
            padding: 4px 10px;
            white-space: nowrap;
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            pointer-events: none;
            z-index: 100;
            box-shadow: 0 4px 18px rgba(0,0,0,0.7);
          ">${nome}</div>
        </div>
      `;

      el.addEventListener("click", () => {
        onSelectLead(lead);
        if (map.current) {
          map.current.flyTo({ center: [leadLng, leadLat], zoom: 14.5, speed: 1.2 });
        }
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([leadLng, leadLat])
        .addTo(map.current!);

      markersRef.current[lead.id || `lead-${index}`] = marker;
    });
  }, [filteredLeads, selectedLeadId, onSelectLead]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#140202] overflow-hidden">
      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Watermark Dinâmico do Nome da Cidade Pesquisada */}
      <div className="absolute left-[28%] top-[45%] -translate-y-1/2 pointer-events-none select-none z-0">
        <span className="font-black text-6xl tracking-[0.25em] text-[#3d0d0d]/20 uppercase">
          {activeCityName.split(",")[0].trim()}
        </span>
      </div>

      {/* Logo de Marca GUARÁ Inferior Esquerdo */}
      <div className="absolute bottom-8 left-10 z-10 pointer-events-none select-none">
        <span className="text-3xl font-extrabold tracking-widest text-white/90 uppercase">
          GUARÁ
        </span>
      </div>

      {/* Barra de Filtro de Categorias no Mapa (quando estiver em Varredura Total) */}
      {isTotalMode && categoriesPresent.length > 1 && (
        <div className="absolute top-24 left-4 z-20 flex items-center gap-1 bg-[#140202]/90 backdrop-blur-md border border-white/10 p-1 rounded-[5px] shadow-2xl max-w-[80vw] overflow-x-auto">
          <span className="text-[10px] font-mono text-white/40 flex items-center gap-1 px-2">
            <Filter className="w-3 h-3 text-[#FA8E00]" /> Filtrar:
          </span>
          <button
            type="button"
            onClick={() => setSelectedFilterCat("todos")}
            className={`px-2 py-0.5 rounded-[3px] text-[10px] font-mono transition-all ${
              selectedFilterCat === "todos"
                ? "bg-[#FF3400] text-white font-bold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Todos ({leads.length})
          </button>
          {categoriesPresent.map((cat) => {
            const count = leads.filter(l => (l.nicho || l.comercio?.nicho || "Geral") === cat).length;
            const color = getCategoryBadgeColor(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedFilterCat(cat)}
                className={`px-2 py-0.5 rounded-[3px] text-[10px] font-mono flex items-center gap-1 transition-all ${
                  selectedFilterCat === cat
                    ? "bg-white/20 text-white font-bold border border-white/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                <span>{cat} ({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Controles de Zoom Sutis */}
      <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95"
          title="Aproximar"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95"
          title="Afastar"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
