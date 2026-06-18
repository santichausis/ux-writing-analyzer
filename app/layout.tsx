import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UX Writing Analyzer — Personal",
  description: "Analizá tus pantallas contra los estándares de UX Writing de textfields personales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
