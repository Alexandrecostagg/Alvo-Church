import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers";
import { TenantTheme } from "./tenant-theme";

export const metadata: Metadata = {
  title: "Alvo Church",
  description: "Sistema completo de gestao de igrejas."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>
          <TenantTheme>{children}</TenantTheme>
        </AppProviders>
      </body>
    </html>
  );
}
