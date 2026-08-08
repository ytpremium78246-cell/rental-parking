"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LogIn, LogOut, ShieldCheck, MapPin, Car, ParkingSquare, LayoutDashboard, Menu, X } from "lucide-react";
import AuthModal from "./AuthModal";
import PenaltyBlockBanner from "./PenaltyBlockBanner";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  return (
    <>
      {user?.hasOutstandingPenalty && user?.outstandingPenalties?.length > 0 && (
        <PenaltyBlockBanner penalties={user.outstandingPenalties} onSettled={fetchUser} />
      )}

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#e0e0e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0066cc] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              P
            </div>
            <span className="font-bold text-xl tracking-tight text-[#1d1d1f]">
              Parking<span className="text-[#0066cc]">India</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-[#1d1d1f]">
            <Link href="/search" className="flex items-center space-x-1.5 hover:text-[#0066cc] transition">
              <MapPin className="w-4 h-4 text-[#0066cc]" />
              <span>Find Parking</span>
            </Link>

            {user?.role === "DRIVER" && (
              <Link href="/driver" className="flex items-center space-x-1.5 hover:text-[#0066cc] transition">
                <Car className="w-4 h-4 text-[#0066cc]" />
                <span>Driver Dashboard</span>
              </Link>
            )}

            {user?.role === "OWNER" && (
              <Link href="/owner" className="flex items-center space-x-1.5 hover:text-[#0066cc] transition">
                <ParkingSquare className="w-4 h-4 text-[#0066cc]" />
                <span>Owner Dashboard</span>
              </Link>
            )}

            {user?.role === "ADMIN" && (
              <Link href="/admin" className="flex items-center space-x-1.5 text-purple-700 font-bold hover:text-purple-800 transition">
                <LayoutDashboard className="w-4 h-4 text-purple-600" />
                <span>Admin Dashboard</span>
              </Link>
            )}
          </nav>

          {/* User Session / Auth Controls */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Trust Score Badge */}
                <div className="flex items-center space-x-1 px-2.5 py-1 bg-[#f0f0f0] border border-[#e0e0e0] rounded-full text-xs font-semibold text-[#1d1d1f]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0066cc]" />
                  <span>Trust: {user.trustScore}</span>
                </div>

                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-[#1d1d1f]">{user.name}</div>
                  <div className="text-[10px] text-[#7a7a7a] font-mono">{user.role}</div>
                </div>

                <button
                  onClick={handleLogout}
                  className="hidden md:block p-2 text-[#7a7a7a] hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="hidden md:inline-flex items-center space-x-2 px-4 py-2 bg-[#0066cc] hover:bg-[#0071e3] text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In / Sign Up</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-[#1d1d1f] hover:bg-[#f0f0f0] rounded-xl transition"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[#e0e0e0] shadow-xl absolute top-16 left-0 right-0 py-4 px-4 space-y-4">
            <Link href="/search" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-2 text-[#1d1d1f] p-2 hover:bg-[#f0f0f0] rounded-xl">
              <MapPin className="w-5 h-5 text-[#0066cc]" />
              <span className="font-semibold">Find Parking</span>
            </Link>

            {user?.role === "DRIVER" && (
              <Link href="/driver" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-2 text-[#1d1d1f] p-2 hover:bg-[#f0f0f0] rounded-xl">
                <Car className="w-5 h-5 text-[#0066cc]" />
                <span className="font-semibold">Driver Dashboard</span>
              </Link>
            )}

            {user?.role === "OWNER" && (
              <Link href="/owner" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-2 text-[#1d1d1f] p-2 hover:bg-[#f0f0f0] rounded-xl">
                <ParkingSquare className="w-5 h-5 text-[#0066cc]" />
                <span className="font-semibold">Owner Dashboard</span>
              </Link>
            )}

            {user?.role === "ADMIN" && (
              <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-2 text-purple-700 p-2 hover:bg-purple-50 rounded-xl">
                <LayoutDashboard className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">Admin Dashboard</span>
              </Link>
            )}

            <div className="pt-4 border-t border-[#e0e0e0]">
              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full p-2 text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Log Out</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsAuthOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-[#0066cc] text-white rounded-xl font-bold"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Log In / Sign Up</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={fetchUser} />
    </>
  );
}
