"use client";

import React, { useState } from "react";
import { X, Lock, Mail, Phone, User, ShieldCheck, Zap } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"DRIVER" | "OWNER">("DRIVER");
  const [upiId, setUpiId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: demoEmail, password: demoPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { emailOrPhone, password }
          : { name, phone, email, password, role, upiId, vehicleNumber };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-5">
        <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
          <h2 className="text-xl font-bold text-[#1d1d1f]">
            {mode === "login" ? "Log In to Parking India" : "Create Marketplace Account"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-[#7a7a7a] hover:bg-[#f0f0f0]">
            <X className="w-5 h-5" />
          </button>
        </div>



        {error && <div className="p-3 bg-red-50 text-red-600 border border-red-200 text-xs rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "login" ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Email or Phone</label>
                <input
                  type="text"
                  required
                  placeholder="driver@example.com or 9999988888"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setRole("DRIVER")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${
                    role === "DRIVER" ? "bg-[#0066cc] text-white border-[#0066cc]" : "bg-white text-[#1d1d1f] border-[#e0e0e0]"
                  }`}
                >
                  Register as Car Owner
                </button>
                <button
                  type="button"
                  onClick={() => setRole("OWNER")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${
                    role === "OWNER" ? "bg-[#0066cc] text-white border-[#0066cc]" : "bg-white text-[#1d1d1f] border-[#e0e0e0]"
                  }`}
                >
                  Register as Parking Owner
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Amit Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="9999988888"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">UPI ID (Direct Pay)</label>
                  <input
                    type="text"
                    placeholder="amit@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#0066cc] hover:bg-[#0071e3] text-white font-semibold rounded-xl text-sm transition shadow-sm"
          >
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-[#7a7a7a]">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button onClick={() => setMode("register")} className="text-[#0066cc] font-semibold underline">
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already registered?{" "}
              <button onClick={() => setMode("login")} className="text-[#0066cc] font-semibold underline">
                Log In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
