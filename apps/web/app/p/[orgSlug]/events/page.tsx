import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { publicPortalSnapshot } from "../../../api/_lib/public-portal";

interface Props { params: Promise<{ orgSlug: string }> }

export default async function PublicEventsPage({ params }: Props) {
  const { orgSlug } = await params;
  const portal = await publicPortalSnapshot(orgSlug).catch(() => null);
  if (!portal) notFound();
  const formatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: portal.timeZone });

  return (
    <main style={{ minHeight: "100vh", padding: "32px 16px 64px", background: "#fdfaf6", color: "#1c2433" }}>
      <div style={{ width: "min(760px, 100%)", margin: "0 auto" }}>
        <Link href={`/p/${portal.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#7c2d12", textDecoration: "none", fontWeight: 700, marginBottom: 24 }}>
          <ArrowLeft size={16} /> Voltar
        </Link>
        <p style={{ margin: "0 0 6px", color: "#9a3412", fontWeight: 800, fontSize: 12, letterSpacing: 1.2 }}>AGENDA PÚBLICA</p>
        <h1 style={{ margin: 0, fontSize: "clamp(28px, 6vw, 44px)" }}>Eventos de {portal.displayName}</h1>
        <p style={{ color: "#64748b", lineHeight: 1.6 }}>Informações publicadas pela igreja. Inscrições de membros são feitas com segurança pelo aplicativo.</p>

        <div style={{ display: "grid", gap: 14, marginTop: 28 }}>
          {portal.events.length === 0 ? (
            <section style={cardStyle}>
              <CalendarDays size={30} color="#9a3412" />
              <strong>Nenhum evento publicado no momento.</strong>
              <span style={{ color: "#64748b" }}>Volte em breve para conferir a próxima programação.</span>
            </section>
          ) : portal.events.map((event) => (
            <article key={event.id} style={cardStyle}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <CalendarDays size={26} color="#9a3412" />
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 8px", fontSize: 21 }}>{event.name}</h2>
                  {event.description && <p style={{ margin: "0 0 12px", color: "#64748b", lineHeight: 1.55 }}>{event.description}</p>}
                  <div style={{ display: "grid", gap: 7, color: "#475569", fontSize: 14 }}>
                    <span style={metaStyle}><Clock3 size={15} /> {formatter.format(new Date(event.startsAt))}</span>
                    <span style={metaStyle}><MapPin size={15} /> {event.locationName || (event.locationType === "online" ? "Evento online" : "Local informado pela liderança")}</span>
                    {event.isPaid && <span><strong>Ingresso:</strong> R$ {(event.priceAmount ?? 0).toFixed(2).replace(".", ",")}</span>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

const cardStyle = { display: "grid", gap: 10, padding: 22, borderRadius: 16, background: "#fff", border: "1px solid rgba(29,41,64,0.1)", boxShadow: "0 4px 20px rgba(29,41,64,0.04)" } as const;
const metaStyle = { display: "inline-flex", gap: 7, alignItems: "center" } as const;
