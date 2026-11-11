"use client";

import { 
  MessageCircle, Camera, X, ShieldCheck, MapPin, Phone, Palette,
  ExternalLink, RotateCw, FileText, Star, Users, AlertCircle, 
  Loader2, ChevronDown, ChevronRight, Building2
} from "lucide-react";
import { useState, useEffect, ReactNode } from "react";

// ── Componente Accordion Reutilizável ─────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  badge,
  children,
  defaultOpen = true,
  accent = false,
}: {
  icon: any;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-zinc-800/70 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/30 transition-colors group select-none"
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            accent
              ? "bg-[#FF3400]/15 ring-1 ring-[#FF3400]/30"
              : "bg-white/5 ring-1 ring-white/10"
          }`}
        >
          <Icon
            className={`w-3.5 h-3.5 ${accent ? "text-[#FF3400]" : "text-[#FA8E00]"}`}
          />
        </div>
        <span className="text-[12.5px] font-bold text-zinc-200 flex-1 text-left tracking-wide">
          {title}
        </span>
        {badge && <span className="mr-1">{badge}</span>}
        {open ? (
          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0 transition-transform" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 transition-transform" />
        )}
      </button>

      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ── Linha de dado (label + value) estilo referência ───────────────────────────
function Row({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value?: ReactNode;
  mono?: boolean;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-zinc-800/50 last:border-b-0">
      <span className="text-[11px] text-zinc-400 font-medium shrink-0">{label}</span>
      <span
        className={`text-[12px] font-semibold text-right leading-tight ${
          highlight ? "text-[#FA8E00]" : "text-zinc-100"
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface LeadDossierProps {
  lead: any | null;
  onClose: () => void;
  onEnrichLead?: (lead: any) => void;
  onReprocessLead?: (lead: any) => void;
  isEnriching?: boolean;
  isReprocessing?: boolean;
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function LeadDossier({
  lead,
  onClose,
  onEnrichLead,
  onReprocessLead,
  isEnriching = false,
  isReprocessing = false,
}: LeadDossierProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  useEffect(() => {
    if (
      lead &&
      (!lead.isEnriched || !lead.cnpj) &&
      !isEnriching &&
      !isReprocessing &&
      onEnrichLead
    ) {
      onEnrichLead(lead);
    }
  }, [lead?.id]);

  if (!lead) return null;

  // ── Extração de dados ────────────────────────────────────────────────────
  const nome = lead.nome_fantasia || lead.comercio?.nome_fantasia || "Comércio";
  const nicho = lead.nicho || lead.comercio?.nicho || "Comércio Local";
  const endereco = lead.endereco_completo || "Endereço não informado";
  const telefone = lead.telefone || lead.contatos?.whatsapp || "Não informado";
  const cleanPhone = telefone.replace(/\D/g, "");

  const cnpj = lead.cnpj || lead.comercio?.cnpj || null;
  const cleanCnpj = lead.clean_cnpj || (cnpj ? cnpj.replace(/\D/g, "") : null);
  const razaoSocial = lead.razao_social || lead.comercio?.razao_social || null;
  const cnae = lead.cnae || lead.comercio?.cnae || null;
  const situacao = lead.situacao_cadastral || (cnpj ? "ATIVA" : null);
  const urlCartaoCnpj = cleanCnpj
    ? `https://cnpj.biz/${cleanCnpj}`
    : "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp";

  const socios = lead.quadro_societario || lead.socios || [];
  const socioPrincipal =
    lead.socio_principal || (socios.length > 0 ? socios[0].nome_socio : null);
  const socioCargo =
    lead.socio_cargo ||
    (socios.length > 0 ? socios[0].qualificacao : "Sócio-Administrador");

  const instaAudit = lead.instagram_audit || {};
  const instagram = instaAudit.handle || lead.instagram || null;
  const instagramUser = instagram ? instagram.replace("@", "").trim() : "";
  const instagramUrl =
    instaAudit.profile_url ||
    lead.instagram_url ||
    (instagramUser ? `https://instagram.com/${instagramUser}` : null);
  const bioInsta = instaAudit.bio || null;
  const seguidoresInsta = instaAudit.seguidores || null;
  const postsInsta = instaAudit.posts || null;
  const avatarLogoUrl = instaAudit.avatar_url || lead.avatar_logo_url || null;
  const fotoFachadaUrl = lead.foto_url || null;
  const paleta: string[] =
    lead.paleta_hex || lead.identidade_visual?.paleta_hex || [
      "#FF3400",
      "#FA8E00",
      "#1A0303",
    ];

  const rating = (
    lead.avaliacao_media ||
    lead.comercio?.avaliacao_maps ||
    5.0
  ).toFixed(1);
  const reviews = lead.total_avaliacoes || lead.comercio?.total_avaliacoes || 0;
  const statusOp = lead.status_funcionamento || "Horário Comercial";
  const isOpen =
    statusOp.toLowerCase().includes("aberto") ||
    statusOp.toLowerCase().includes("abre");

  const whatsappUrl =
    cleanPhone && cleanPhone.length >= 10
      ? `https://wa.me/55${cleanPhone}`
      : `https://wa.me/`;
  const initial = nome.substring(0, 2).toUpperCase();

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <aside className="bg-[#0D0D11] w-full h-full flex flex-col border-l border-zinc-800/80 shadow-[-12px_0_50px_rgba(0,0,0,0.7)] overflow-hidden select-none">
      
      {/* ════════════════════════════════════════
          CABEÇALHO — avatar, nome, controles
      ════════════════════════════════════════ */}
      <div className="bg-[#131318] px-5 py-4 border-b border-zinc-800/80 shrink-0">
        {/* Linha superior: label + botões */}
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
            Dossiê Comercial
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onReprocessLead?.(lead)}
              disabled={isReprocessing || isEnriching}
              title="Reprocessar dados"
              className="w-7 h-7 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/70 flex items-center justify-center transition-all disabled:opacity-40"
            >
              <RotateCw
                className={`w-3.5 h-3.5 text-[#FA8E00] ${
                  isReprocessing || isEnriching ? "animate-spin" : ""
                }`}
              />
            </button>
            <button
              onClick={onClose}
              title="Fechar"
              className="w-7 h-7 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/70 flex items-center justify-center transition-all"
            >
              <X className="w-3.5 h-3.5 text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Avatar + Nome + Nicho */}
        <div className="flex items-center gap-3.5">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700/60 flex-shrink-0 overflow-hidden shadow-md">
            {avatarLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarLogoUrl} alt={nome} className="w-full h-full object-cover" />
            ) : fotoFachadaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoFachadaUrl} alt={nome} className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-black text-zinc-300 flex items-center justify-center w-full h-full">
                {initial}
              </span>
            )}
          </div>

          {/* Texto */}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide truncate leading-snug">
              {nome}
            </h2>
            <p className="text-[11px] text-zinc-400 font-medium mt-0.5 truncate">{nicho}</p>
          </div>
        </div>

        {/* Pílulas de métricas ─ linha abaixo do avatar */}
        <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-zinc-800/60">
          {/* Rating */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 shrink-0">
            <Star className="w-3.5 h-3.5 fill-[#FA8E00] text-[#FA8E00]" />
            <span>{rating}</span>
            <span className="text-zinc-500 font-normal">({reviews})</span>
          </div>

          {/* Status aberto/fechado */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold shrink-0 ${
              isOpen
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-400"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isOpen ? "bg-green-400" : "bg-zinc-500"
              }`}
            />
            <span className="truncate max-w-[110px]">{statusOp}</span>
          </div>

          {/* CNPJ badge */}
          {cnpj && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/8 border border-green-500/25 text-[11px] font-bold text-green-400 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CNPJ</span>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          CORPO COM ACCORDION
      ════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">

        {/* ── 1. PROPRIETÁRIO / SÓCIO ── */}
        <Section icon={Users} title="Proprietário / Sócio-Administrador" defaultOpen>
          {isEnriching && !socioPrincipal ? (
            <div className="flex items-center gap-2 text-zinc-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#FA8E00]" />
              <span className="text-xs font-medium">Consultando Receita Federal...</span>
            </div>
          ) : socioPrincipal ? (
            <div className="space-y-1.5">
              <div className="text-sm font-bold text-white uppercase leading-tight flex items-start gap-2">
                <span>{socioPrincipal}</span>
                <ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              </div>
              <div className="text-[11px] text-[#FA8E00] font-semibold">
                {socioCargo || "Sócio-Administrador"}
                <span className="text-zinc-500 font-normal ml-1">• Receita Federal</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500 py-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">Não localizado na base pública</span>
            </div>
          )}
        </Section>

        {/* ── 2. DADOS CADASTRAIS (CNPJ) ── */}
        <Section
          icon={Building2}
          title="Dados Cadastrais"
          badge={
            <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/25 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Receita
            </span>
          }
          defaultOpen
        >
          <div className="space-y-0">
            <Row label="CNPJ" value={cnpj || (isEnriching ? "Buscando..." : "—")} mono />
            <Row
              label="Situação"
              value={
                situacao ? (
                  <span className={situacao === "ATIVA" ? "text-green-400" : "text-amber-400"}>
                    {situacao}
                  </span>
                ) : isEnriching ? (
                  "Verificando..."
                ) : (
                  "—"
                )
              }
            />
            {razaoSocial && <Row label="Razão Social" value={razaoSocial} />}
            {cnae && <Row label="CNAE" value={cnae} />}
          </div>

          <a
            href={urlCartaoCnpj}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white text-xs font-bold transition-all group shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-[#FA8E00] group-hover:scale-110 transition-transform shrink-0" />
            <span>Ver comprovante na Receita Federal</span>
            <ExternalLink className="w-3 h-3 text-zinc-500 shrink-0" />
          </a>
        </Section>

        {/* ── 3. PRESENÇA DIGITAL ── */}
        <Section
          icon={Camera}
          title="Presença Digital"
          badge={
            instagram ? (
              <a
                href={instagramUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-bold text-[#FA8E00] hover:underline flex items-center gap-1"
              >
                {instagram}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : undefined
          }
          defaultOpen={false}
        >
          {/* Contadores */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Seguidores", value: seguidoresInsta },
              { label: "Publicações", value: postsInsta },
              { label: "Avaliações", value: reviews ? String(reviews) : null },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center"
              >
                <div className="text-[10px] text-zinc-400 font-semibold uppercase">{label}</div>
                <div className="text-sm font-bold text-white mt-0.5">{value || "—"}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          {bioInsta && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-300 leading-relaxed italic">
              "{bioInsta}"
            </div>
          )}
        </Section>

        {/* ── 4. IDENTIDADE VISUAL (Paleta) ── */}
        <Section icon={Palette} title="Identidade Visual" defaultOpen={false}>
          <div className="text-[10px] text-zinc-500 mb-3 font-medium">
            Paleta extraída da marca — clique para copiar HEX
          </div>
          <div className="flex gap-2">
            {paleta.map((hex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleCopyHex(hex)}
                className="flex-1 flex flex-col items-center gap-1.5 group"
                title={`Copiar ${hex}`}
              >
                <div
                  className="w-full h-10 rounded-xl border border-zinc-700/70 shadow-sm group-hover:scale-105 group-hover:shadow-lg transition-all"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors font-mono uppercase">
                  {copiedHex === hex ? "✓ OK" : hex}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── 5. CONTATOS & LOCALIZAÇÃO ── */}
        <Section icon={Phone} title="Contatos & Localização" defaultOpen>
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
              <span className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
                <Phone className="w-3.5 h-3.5 text-[#FA8E00] shrink-0" />
                Telefone
              </span>
              <a
                href={`tel:${cleanPhone}`}
                className="text-xs font-bold text-zinc-100 hover:text-[#FA8E00] transition-colors font-mono"
              >
                {telefone}
              </a>
            </div>

            <div className="flex items-start justify-between gap-4 py-2">
              <span className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#FF3400] shrink-0" />
                Endereço
              </span>
              <span className="text-xs font-medium text-zinc-200 text-right leading-relaxed max-w-[210px]">
                {endereco}
              </span>
            </div>
          </div>
        </Section>

      </div>

      {/* ════════════════════════════════════════
          RODAPÉ — CTA WhatsApp
      ════════════════════════════════════════ */}
      <div className="bg-[#131318] px-5 py-4 border-t border-zinc-800/80 shrink-0">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-[#FF3400] hover:bg-[#ff4d1e] active:scale-[0.99] text-white font-bold text-xs uppercase tracking-[0.1em] rounded-xl shadow-[0_0_22px_rgba(255,52,0,0.35)] hover:shadow-[0_0_35px_rgba(255,52,0,0.5)] transition-all"
        >
          <MessageCircle className="w-4 h-4 fill-white shrink-0" />
          Abrir WhatsApp Comercial
        </a>
      </div>
    </aside>
  );
}
