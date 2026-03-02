import type { Metadata } from "next";
import "./globals.css";
import { AdminProvider } from "./admin-context";
import NavBar from "./nav-bar";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1920&q=80";

export const metadata: Metadata = {
  title: "March Madness Pool",
  description: "Draft teams, track the tournament, crown the champion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Background image layer */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${HERO_IMAGE})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* Dark gradient overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* All content sits above the background */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <AdminProvider>
            <NavBar />
            <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
          </AdminProvider>
        </div>
      </body>
    </html>
  );
}
