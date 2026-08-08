"use client";

import React, { useState } from "react";
import { AlertOctagon, CheckCircle2, ShieldAlert, IndianRupee } from "lucide-react";
import ModalPortal from "@/components/ModalPortal";

interface PenaltyBlockBannerProps {
  penalties: any[];
  onSettled: () => void;
}

export default function PenaltyBlockBanner({ penalties, onSettled }: PenaltyBlockBannerProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [upiRef, setUpiRef] = useState("");
  const [error, setError] = useState("");

  const totalAmount = penalties.reduce((sum, p) => sum + p.amount, 0);
  const mainAggrievedUser = penalties.find(p => p.aggrievedUser)?.aggrievedUser || null;

  const handlePayPenalty = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/penalties/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentRef: upiRef || `UPI-PENALTY-${Date.now()}` 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Penalty payment failed");
      
      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        onSettled();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-amber-50 border-y border-amber-200 text-amber-900 py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold text-amber-950">Outstanding Penalty Alert: ₹{totalAmount}</span>
              <span className="ml-2 text-amber-800">
                Late cancellation fees restrict new bookings & listings until settled.
              </span>
            </div>
          </div>

          {success ? (
            <div className="flex items-center space-x-1 text-[#0066cc] font-bold bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>Penalty Payment Sent! Awaiting Confirmation.</span>
            </div>
          ) : (
            <button
              onClick={() => {
                if (mainAggrievedUser?.upiId) {
                  setShowModal(true);
                } else {
                  handlePayPenalty(); // Direct pay if no aggrieved user (e.g. system penalty)
                }
              }}
              disabled={loading}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm transition flex-shrink-0"
            >
              {loading ? "Processing..." : `Pay ₹${totalAmount} Penalty Now (Instant Unlock)`}
            </button>
          )}
        </div>
      </div>

      {showModal && mainAggrievedUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
                <h2 className="text-lg font-bold text-[#1d1d1f]">Settle Penalty</h2>
                <button onClick={() => setShowModal(false)} className="text-[#7a7a7a] hover:text-[#1d1d1f]">
                  ✕
                </button>
              </div>

              {error && <div className="p-2 bg-red-50 text-red-600 text-xs rounded-lg">{error}</div>}
              {success && <div className="p-2 bg-blue-50 text-[#0066cc] text-xs rounded-lg">Payment successful!</div>}

              <div className="text-center space-y-3">
                <p className="text-xs text-[#7a7a7a]">
                  Scan to pay <strong className="text-[#1d1d1f]">₹{totalAmount}</strong> to{" "}
                  <strong className="text-[#1d1d1f]">{mainAggrievedUser.name}</strong>
                </p>
                
                {/* Real UPI QR Code */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${mainAggrievedUser.upiId}&pn=${mainAggrievedUser.name}&am=${totalAmount}&cu=INR`)}`} 
                  alt="UPI QR Code" 
                  className="w-32 h-32 mx-auto rounded-lg shadow-sm border border-[#e0e0e0] p-1"
                />

                <div className="text-[11px] font-mono bg-[#f8f9fa] border border-[#e0e0e0] p-2 rounded-lg text-[#1d1d1f]">
                  {mainAggrievedUser.upiId}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">UPI Ref / UTR (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 402911223344"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                />
              </div>

              <button
                onClick={handlePayPenalty}
                disabled={loading || success}
                className="w-full py-2.5 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold text-sm rounded-xl transition shadow-sm"
              >
                {loading ? "Processing..." : "I Have Paid"}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
