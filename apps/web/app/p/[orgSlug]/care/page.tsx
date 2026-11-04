import Link from "next/link";
import { notFound } from "next/navigation";
import { publicPortalSnapshot } from "../../../api/_lib/public-portal";
import { ParticipationForm } from "../../../_components/participation-form";
export default async function PublicCarePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const portal = await publicPortalSnapshot(orgSlug).catch(() => null);
  if (!portal) notFound();
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fdfaf6",
        color: "#1c2433",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "white",
          padding: 24,
          borderRadius: 16,
        }}
      >
        <Link href={`/p/${portal.slug}`} style={{ color: "#7c2d12" }}>
          Voltar para {portal.displayName}
        </Link>
        <h1>Oração e cuidado</h1>
        <p>
          Conte à equipe da igreja como podemos ajudar. Você não precisa
          instalar um aplicativo nem criar uma conta.
        </p>
        <p>Seu pedido é privado e será acompanhado pela equipe pastoral.</p>
        {portal.whatsappPhone && <a href={`https://wa.me/${portal.whatsappPhone}?text=ORACAO`} target="_blank" rel="noopener noreferrer">Prefiro conversar pelo WhatsApp</a>}
      <ParticipationForm orgSlug={portal.slug} kind="care" />
      </div>
    </main>
  );
}
