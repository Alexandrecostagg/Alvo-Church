import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers";
import { TenantTheme } from "./tenant-theme";
import { StarfieldBackground } from "./starfield-background";

export const metadata: Metadata = {
  title: "Plataforma Esdras",
  description: "Plataforma de gestão para igrejas e redes eclesiásticas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <StarfieldBackground />
        <AppProviders>
          <TenantTheme>{children}</TenantTheme>
        </AppProviders>
      </body>
    </html>
  );
}
