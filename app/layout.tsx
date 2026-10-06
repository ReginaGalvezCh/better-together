import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Better Together",
  description: "Alertas y apoyo anónimo para cuidarnos en eventos concurridos.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
        <PwaRegister />
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
