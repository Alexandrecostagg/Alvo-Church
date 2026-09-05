import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plataforma Esdras — Gestão para Igrejas e Redes",
  description:
    "Toda a sua igreja, finalmente em um só lugar. Membros, células, finanças, pastoral e IA — tudo integrado. Grátis até 50 membros, sem cartão de crédito.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
