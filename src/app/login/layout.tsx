import type { Metadata } from "next";

// Única página visible para buscadores: el resto de la app queda con noindex.
export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: true, follow: false },
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
