"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import {
  MapPin,
  ShieldCheck,
  Zap,
  Car,
  Bike,
  IndianRupee,
  Clock,
  CheckCircle,
  ArrowRight,
  ParkingSquare,
  Users,
  Award,
} from "lucide-react";

export default function Home() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => {});
  }, []);

  const handleOwnerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthOpen(true);
    } else {
      router.push("/owner");
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthOpen(false);
    router.push("/owner");
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 via-white to-white pt-12 pb-16 border-b border-[#e0e0e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-[#0066cc] px-4 py-1.5 rounded-full text-xs font-bold border border-blue-200">
            <Zap className="w-4 h-4" />
            <span>Direct P2P Parking • Zero Commission on Parking Fees</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#1d1d1f] max-w-4xl mx-auto leading-tight">
            Rent Private Parking Spots or Earn From Your Unused Driveway in <span className="text-[#0066cc]">India</span>
          </h1>

          <p className="text-base sm:text-xl text-[#7a7a7a] max-w-2xl mx-auto">
            Book verified parking spaces nearby in under 20 seconds. Pay land owners directly via UPI, QR, or Cash with platform trust & penalty protection.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/search"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold text-sm rounded-2xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <MapPin className="w-4 h-4" />
              <span>Find Nearby Parking</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="/owner"
              onClick={handleOwnerClick}
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-gray-50 text-[#1d1d1f] border border-[#e0e0e0] font-bold text-sm rounded-2xl shadow-sm transition flex items-center justify-center space-x-2"
            >
              <ParkingSquare className="w-4 h-4 text-[#0066cc]" />
              <span>List Your Parking Spot</span>
            </a>
          </div>

          {/* Key Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-[#e0e0e0]/60">
            <div className="p-4 bg-white rounded-2xl border border-[#e0e0e0]">
              <div className="text-2xl font-extrabold text-[#1d1d1f]">50+</div>
              <div className="text-xs text-[#7a7a7a]">Verified Locations</div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-[#e0e0e0]">
              <div className="text-2xl font-extrabold text-[#0066cc]">100%</div>
              <div className="text-xs text-[#7a7a7a]">Direct UPI Payments</div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-[#e0e0e0]">
              <div className="text-2xl font-extrabold text-[#1d1d1f]">₹10</div>
              <div className="text-xs text-[#7a7a7a]">Fair Cancellation Protection</div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-[#e0e0e0]">
              <div className="text-2xl font-extrabold text-[#0066cc]">100</div>
              <div className="text-xs text-[#7a7a7a]">Initial Trust Score</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-[#1d1d1f]">How Parking India Works</h2>
          <p className="text-sm text-[#7a7a7a] max-w-xl mx-auto">
            A simple, transparent 4-step process designed for drivers and space owners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 space-y-3 shadow-subtle hover:border-[#0066cc] transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold text-lg">
              1
            </div>
            <h3 className="font-bold text-base text-[#1d1d1f]">Search & Select</h3>
            <p className="text-xs text-[#7a7a7a] leading-relaxed">
              Find verified parking spaces near your destination by city, landmark, or vehicle type.
            </p>
          </div>

          <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 space-y-3 shadow-subtle hover:border-[#0066cc] transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold text-lg">
              2
            </div>
            <h3 className="font-bold text-base text-[#1d1d1f]">Book & Get Acceptance</h3>
            <p className="text-xs text-[#7a7a7a] leading-relaxed">
              Reserve duration and send a instant booking request to the space owner.
            </p>
          </div>

          <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 space-y-3 shadow-subtle hover:border-[#0066cc] transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold text-lg">
              3
            </div>
            <h3 className="font-bold text-base text-[#1d1d1f]">Park Securely</h3>
            <p className="text-xs text-[#7a7a7a] leading-relaxed">
              Drive in, park in covered or CCTV-monitored private spots with peace of mind.
            </p>
          </div>

          <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 space-y-3 shadow-subtle hover:border-[#0066cc] transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold text-lg">
              4
            </div>
            <h3 className="font-bold text-base text-[#1d1d1f]">Direct UPI Pay</h3>
            <p className="text-xs text-[#7a7a7a] leading-relaxed">
              Pay the owner directly using GPay, PhonePe, Paytm, or Cash. No platform cuts.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Penalty Engine Section */}
      <section className="bg-[#f8f9fa] border-y border-[#e0e0e0] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Platform Integrity</span>
            </div>

            <h2 className="text-3xl font-extrabold text-[#1d1d1f] leading-tight">
              Fair Penalty Engine & Trust Protection System
            </h2>

            <p className="text-sm text-[#7a7a7a] leading-relaxed">
              Parking India operates on trust. We protect drivers from last-minute cancellations and ensure space owners are respected with clear penalty rules.
            </p>

            <ul className="space-y-3 text-xs text-[#1d1d1f]">
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-[#0066cc] flex-shrink-0 mt-0.5" />
                <span><strong>5-Min Grace Period for Car Owners:</strong> Cancel for free within 5 minutes. ₹10 fee thereafter.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-[#0066cc] flex-shrink-0 mt-0.5" />
                <span><strong>3-Min Grace Period for Parking Owners:</strong> Parking Owners can cancel free within 3 minutes of acceptance.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-[#0066cc] flex-shrink-0 mt-0.5" />
                <span><strong>Penalty Enforcement:</strong> Outstanding penalties temporarily block new bookings until settled.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-[#0066cc] flex-shrink-0 mt-0.5" />
                <span><strong>Trust Score (Starts at 100):</strong> Reliable users build top search rankings and status badges.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-[#e0e0e0] rounded-3xl p-8 shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-4">
              <div className="font-bold text-[#1d1d1f]">Trust & Penalty Dashboard</div>
              <span className="bg-blue-50 text-[#0071e3] text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                Active Guarantee
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[#f8f9fa] rounded-2xl border border-[#e0e0e0] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#7a7a7a]">Default Car Owner Trust Score</div>
                  <div className="text-xl font-bold text-[#1d1d1f]">100 / 100</div>
                </div>
                <Award className="w-8 h-8 text-[#0066cc]" />
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Late Cancellation Protection</span>
                </div>
                <div>Late driver/owner cancellations immediately assess ₹10 penalty ledger and -2 Trust Score.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0066cc] rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Ready to Book or Rent Parking in India?</h2>
          <p className="text-blue-100 max-w-xl mx-auto text-sm sm:text-base">
            Join thousands of drivers and property owners experiencing direct P2P parking across major Indian cities.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/search"
              className="px-8 py-3.5 bg-white text-[#0066cc] hover:bg-blue-50 font-bold text-sm rounded-2xl transition shadow-md"
            >
              Search Spots Now
            </Link>
            <a
              href="/owner"
              onClick={handleOwnerClick}
              className="px-8 py-3.5 bg-[#0052a3] hover:bg-[#00478f] text-white border border-blue-400 font-bold text-sm rounded-2xl transition"
            >
              Earn as Parking Owner
            </a>
          </div>
        </div>
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} />
    </div>
  );
}
