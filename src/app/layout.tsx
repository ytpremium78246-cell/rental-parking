import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Parking India | P2P Parking Marketplace",
  description:
    "India's premier Peer-to-Peer Parking Marketplace. Rent your private parking slot or book verified spaces nearby with direct UPI payment.",
  keywords: ["Parking India", "P2P Parking", "Rent Parking Space", "UPI Parking Payment", "Delhi Parking", "Mumbai Parking", "Bangalore Parking"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white text-[#1d1d1f]">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="bg-[#f8f9fa] border-t border-[#e0e0e0] py-8 text-center text-sm text-[#7a7a7a]">
          <div className="max-w-7xl mx-auto px-4">
            <p>© {new Date().getFullYear()} Parking India. P2P Parking Marketplace.</p>
            <p className="text-xs mt-1 text-[#7a7a7a]">
              Direct Car Owner → Parking Owner Payments via UPI | Penalty Engine & Trust Protection
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
