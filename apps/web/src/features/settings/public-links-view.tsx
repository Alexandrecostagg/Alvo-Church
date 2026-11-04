"use client";

import { useEffect, useState } from "react";
import { Copy, Check, QrCode, ExternalLink } from "lucide-react";
import { useAppAuth } from "../../../app/providers";

function QRCodeDisplay({ value, size = 180 }: { value: string; size?: number }) {
  const [image, setImage] = useState("");
  useEffect(() => {
    let cancelled = false;
    setImage("");
    if (value) void import("qrcode").then(qr => qr.toDataURL(value, { width: size, margin: 2 })).then(data => { if (!cancelled) setImage(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [value, size]);
  return image ? <img src={image} width={size} height={size} alt="QR Code do formulário público da igreja" /> : <p>Use o link abaixo enquanto o QR Code é preparado.</p>;
}

export function PublicLinksView() {
  const { tenantRuntime } = useAppAuth();
  const [copied, setCopied] = useState<string | null>(null);

  const orgSlug = tenantRuntime?.organization?.slug || "";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const links = orgSlug ? [
    {
      key: "visit",
      label: "Formulário de Visitante",
      desc: "Exiba este QR Code na entrada do culto",
      path: `/p/${orgSlug}/visit`,
      highlight: true,
    },
    {
      key: "give",
      label: "Link de Doação",
      desc: "Compartilhe para receber dízimos e ofertas",
      path: `/p/${orgSlug}/give`,
      highlight: false,
    },
    {
      key: "care",
      label: "Pedido de oração e cuidado",
      desc: "Atendimento privado, sem instalar aplicativo",
      path: `/p/${orgSlug}/care`,
      highlight: false,
    },
    {
      key: "events",
      label: "Agenda e inscrições",
      desc: "Inscrições sem aplicativo",
      path: `/p/${orgSlug}/events`,
      highlight: false,
    },
    {
      key: "portal",
      label: "Portal Público",
      desc: "Página pública da organização",
      path: `/p/${orgSlug}`,
      highlight: false,
    },
  ] : [];

  async function copyLink(url: string, key: string) {
    await navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="page-root">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Links Públicos &amp; QR Codes</h1>
          <p className="page-subtitle">Páginas acessíveis sem login para visitantes e membros</p>
        </div>
      </header>

      {!orgSlug && <p role="status">A igreja ainda não possui um endereço público configurado.</p>}
      <div style={linksGridStyle}>
        {links.map((link) => {
          const fullUrl = `${baseUrl}${link.path}`;
          return (
            <div key={link.key} style={link.highlight ? { ...linkCardStyle, ...highlightCardStyle } : linkCardStyle}>
              <div style={linkCardHeaderStyle}>
                <div>
                  <strong style={linkLabelStyle}>{link.label}</strong>
                  <p style={linkDescStyle}>{link.desc}</p>
                </div>
                <a href={link.path} target="_blank" rel="noreferrer" style={externalLinkStyle}>
                  <ExternalLink size={14} />
                </a>
              </div>

              {link.highlight && (
                <div style={qrWrapperStyle}>
                  <QRCodeDisplay value={fullUrl} size={180} />
                </div>
              )}

              <div style={urlRowStyle}>
                <code style={urlCodeStyle}>{fullUrl}</code>
                <button
                  style={copyBtnStyle}
                  onClick={() => copyLink(fullUrl, link.key)}
                >
                  {copied === link.key ? <Check size={14} /> : <Copy size={14} />}
                  {copied === link.key ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const linksGridStyle = { display: "grid", gap: 20, maxWidth: 720 } as const;
const linkCardStyle = { padding: "24px", borderRadius: 16, background: "#fff", border: "1px solid rgba(29,41,64,0.12)", display: "grid", gap: 16 } as const;
const highlightCardStyle = { borderColor: "rgba(154,52,18,0.25)", background: "#fffdf8" } as const;
const linkCardHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } as const;
const linkLabelStyle = { display: "block", fontSize: 15, fontWeight: 600, color: "#1c2433", marginBottom: 2 } as const;
const linkDescStyle = { margin: 0, fontSize: 13, color: "#64748b" } as const;
const externalLinkStyle = { display: "flex", color: "#64748b", padding: 4 } as const;
const qrWrapperStyle = { display: "flex", justifyContent: "center", padding: "8px 0" } as const;
const urlRowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid rgba(29,41,64,0.08)", overflow: "hidden" } as const;
const urlCodeStyle = { flex: 1, fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const } as const;
const copyBtnStyle = { display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(29,41,64,0.15)", background: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", flexShrink: 0 } as const;
