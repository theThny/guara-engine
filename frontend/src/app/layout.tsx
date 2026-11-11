import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Guará Engine — Inteligência de Prospecção",
  description: "Plataforma de mapeamento e inteligência comercial B2B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={instrumentSans.variable}>
      <body className="bg-[#100202] text-white font-sans antialiased overflow-hidden selection:bg-[#FF3400] selection:text-white">
        {children}
      </body>
    </html>
  );
}