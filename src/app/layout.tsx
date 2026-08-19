import type { Metadata } from "next";
import RedeViva from "@/components/RedeViva";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "AyA — Clínica Integrada",
  description: "Um ecossistema de saúde integrada. Conectar, crescer e transformar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Philosopher é a fonte de marca (gratuita). Spectral e Sacramento
            entram como SUBSTITUTAS de Singel e Brittany até que as licenciadas
            sejam auto-hospedadas em /public/fonts. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Philosopher:ital,wght@0,400;0,700;1,400;1,700&family=Spectral:ital,wght@0,300;0,400;0,500;0,600&family=Sacramento&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <RedeViva />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
