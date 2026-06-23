import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "GigaPrix - Esports for Gigling Racing",
    template: "%s",
  },
  description:
    "Championships and leagues built directly on Gigaverse Racing. Create competitions, link on-chain races, auto-advance stages, and crown champions.",
  applicationName: "GigaPrix",
  openGraph: {
    title: "GigaPrix - Esports for Gigling Racing",
    description:
      "Create championships & leagues, link on-chain races, crown champions.",
    siteName: "GigaPrix",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GigaPrix - Esports for Gigling Racing",
    description:
      "Create championships & leagues, link on-chain races, crown champions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
