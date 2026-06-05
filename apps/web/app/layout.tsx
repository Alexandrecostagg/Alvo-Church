import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers";
import { TenantTheme } from "./tenant-theme";
import { StarfieldBackground } from "./starfield-background";

export const metadata: Metadata = {
  title: "Getro Church",
  description: "Plataforma para igrejas em movimento."
};

export default function RootLayout({
  children
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
