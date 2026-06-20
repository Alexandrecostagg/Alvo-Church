import Link from "next/link";
import { MapPin, Clock, Calendar, Heart, ClipboardList } from "lucide-react";

interface Props {
  params: Promise<{ orgSlug: string }>;
}

export default async function PublicOrgPortal({ params }: Props) {
  const { orgSlug } = await params;

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo placeholder */}
        <div style={logoAreaStyle}>
          <div style={logoPlaceholderStyle}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "var(--alvo-accent-dark, var(--getro-primary-dark))" }}>
              {orgSlug.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <h1 style={churchNameStyle}>{orgSlug}</h1>
          <p style={taglineStyle}>Bem-vindo!</p>
        </div>

        {/* Quick actions */}
        <div style={actionsStyle}>
          <Link href={`/p/${orgSlug}/visit`} style={actionCardStyle}>
            <ClipboardList size={24} strokeWidth={1.8} style={{ color: "var(--alvo-accent-dark, var(--getro-primary-dark))" }} />
            <div>
              <strong style={actionTitleStyle}>Sou visitante</strong>
              <p style={actionDescStyle}>Preencha um breve formulário para nos conhecermos</p>
            </div>
          </Link>

          <Link href={`/p/${orgSlug}/give`} style={actionCardStyle}>
            <Heart size={24} strokeWidth={1.8} style={{ color: "var(--alvo-accent-dark, var(--getro-primary-dark))" }} />
            <div>
              <strong style={actionTitleStyle}>Contribuir</strong>
              <p style={actionDescStyle}>Dízimos, ofertas e campanhas</p>
            </div>
          </Link>
        </div>

        {/* Info placeholder */}
        <div style={infoSectionStyle}>
          <div style={infoRowStyle}>
            <Clock size={16} />
            <span>Horários de culto em breve</span>
          </div>
          <div style={infoRowStyle}>
            <MapPin size={16} />
            <span>Endereço em breve</span>
          </div>
          <div style={infoRowStyle}>
            <Calendar size={16} />
            <span>Próximos eventos em breve</span>
          </div>
        </div>
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  background: "#fdfaf6",
} as const;

const cardStyle = {
  maxWidth: 480,
  width: "100%",
  display: "grid",
  gap: 24,
} as const;

const logoAreaStyle = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 8,
  paddingBottom: 8,
};

const logoPlaceholderStyle = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  background: "rgba(154,52,18,0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const churchNameStyle = {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
  color: "#1c2433",
  textTransform: "capitalize" as const,
};

const taglineStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: 15,
};

const actionsStyle = {
  display: "grid",
  gap: 12,
};

const actionCardStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 16,
  padding: "20px",
  borderRadius: 16,
  background: "#fff",
  border: "1px solid rgba(29,41,64,0.12)",
  textDecoration: "none",
  color: "inherit",
};

const actionTitleStyle = {
  display: "block",
  fontSize: 15,
  fontWeight: 600,
  color: "#1c2433",
  marginBottom: 2,
};

const actionDescStyle = {
  margin: 0,
  fontSize: 13,
  color: "#64748b",
  lineHeight: 1.4,
};

const infoSectionStyle = {
  padding: "16px 20px",
  borderRadius: 12,
  background: "#fff",
  border: "1px solid rgba(29,41,64,0.08)",
  display: "grid",
  gap: 10,
};

const infoRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 14,
  color: "#64748b",
};
