import type { Metadata } from "next";
import "./globals.css";
import { AdminProvider } from "./admin-context";
import NavBar from "./nav-bar";

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
      <body className="min-h-screen bg-hero-court">
        <AdminProvider>
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
        </AdminProvider>
      </body>
    </html>
  );
}
