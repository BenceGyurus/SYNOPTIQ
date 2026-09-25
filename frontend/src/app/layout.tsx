import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solaris — Solplanet monitoring",
  description: "Open source Solplanet inverter monitoring",
  manifest: "/manifest.json",
  icons: { icon: "/solaris.svg", apple: "/solaris.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Solaris",
  },
};

export const viewport: Viewport = {
  themeColor: "#17312e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
