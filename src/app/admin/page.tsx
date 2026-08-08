"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  ParkingSquare,
  BookmarkCheck,
  AlertTriangle,
  ShieldAlert,
  IndianRupee,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "bookings" | "disputes">("overview");

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setRecentBookings(data.recentBookings || []);
        setDisputes(data.allDisputes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  if (loading) {
    return <div className="max-w-7xl mx-auto p-8 text-center text-[#7a7a7a]">Loading Admin Dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#e0e0e0] pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1d1d1f] flex items-center space-x-2">
            <LayoutDashboard className="w-8 h-8 text-purple-600" />
            <span>Admin Control Panel</span>
          </h1>
          <p className="text-sm text-[#7a7a7a]">
            Platform analytics, booking state engine monitor, penalty ledger & dispute management.
          </p>
        </div>

        <div className="flex bg-[#f0f0f0] p-1 rounded-xl font-medium text-xs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === "overview" ? "bg-white font-bold text-[#1d1d1f] shadow-sm" : "text-[#7a7a7a]"
            }`}
          >
            Overview & Stats
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === "bookings" ? "bg-white font-bold text-[#1d1d1f] shadow-sm" : "text-[#7a7a7a]"
            }`}
          >
            Bookings Monitor
          </button>
          <button
            onClick={() => setActiveTab("disputes")}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === "disputes" ? "bg-white font-bold text-[#1d1d1f] shadow-sm" : "text-[#7a7a7a]"
            }`}
          >
            Disputes ({disputes.length})
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e0e0e0] p-5 rounded-2xl space-y-1">
            <div className="text-xs text-[#7a7a7a] font-medium flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-[#0066cc]" />
              <span>Total Marketplace Users</span>
            </div>
            <div className="text-2xl font-extrabold text-[#1d1d1f]">{stats.totalUsers}</div>
            <div className="text-[11px] text-[#7a7a7a]">
              {stats.totalOwners} Owners • {stats.totalDrivers} Drivers
            </div>
          </div>

          <div className="bg-white border border-[#e0e0e0] p-5 rounded-2xl space-y-1">
            <div className="text-xs text-[#7a7a7a] font-medium flex items-center space-x-1">
              <ParkingSquare className="w-3.5 h-3.5 text-[#0066cc]" />
              <span>Active Parking Spaces</span>
            </div>
            <div className="text-2xl font-extrabold text-[#1d1d1f]">{stats.totalListings}</div>
            <div className="text-[11px] text-[#7a7a7a]">Verified P2P Listings</div>
          </div>

          <div className="bg-white border border-[#e0e0e0] p-5 rounded-2xl space-y-1">
            <div className="text-xs text-[#7a7a7a] font-medium flex items-center space-x-1">
              <BookmarkCheck className="w-3.5 h-3.5 text-[#0066cc]" />
              <span>Total Bookings</span>
            </div>
            <div className="text-2xl font-extrabold text-[#0066cc]">{stats.totalBookings}</div>
            <div className="text-[11px] text-[#7a7a7a]">Processed via Platform</div>
          </div>

          <div className="bg-white border border-[#e0e0e0] p-5 rounded-2xl space-y-1">
            <div className="text-xs text-[#7a7a7a] font-medium flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Penalties & Disputes</span>
            </div>
            <div className="text-2xl font-extrabold text-red-600">{stats.outstandingPenalties}</div>
            <div className="text-[11px] text-[#7a7a7a]">Outstanding ₹10 Penalties</div>
          </div>
        </div>
      )}

      {/* Bookings Engine Monitor Tab */}
      {(activeTab === "overview" || activeTab === "bookings") && (
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1d1d1f]">Recent Bookings Trajectory</h2>
            <span className="text-xs text-[#7a7a7a]">Showing top 10 recent transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1d1d1f]">
              <thead className="bg-[#f8f9fa] border-b border-[#e0e0e0] text-[#7a7a7a] uppercase font-semibold">
                <tr>
                  <th className="p-3">Booking Code</th>
                  <th className="p-3">Driver</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">Parking Spot</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/80">
                    <td className="p-3 font-mono font-bold text-[#0066cc]">#{b.bookingCode}</td>
                    <td className="p-3">{b.driver?.name} ({b.driver?.phone})</td>
                    <td className="p-3">{b.owner?.name} ({b.owner?.phone})</td>
                    <td className="p-3">{b.listing?.title}</td>
                    <td className="p-3 font-bold">₹{b.amount}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-800">
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 font-medium">{b.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disputes Tab */}
      {(activeTab === "overview" || activeTab === "disputes") && (
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1d1d1f]">Disputes & Resolutions</h2>
            <span className="text-xs text-[#7a7a7a]">Direct platform dispute arbitration</span>
          </div>

          {disputes.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#e0e0e0] rounded-xl text-xs text-[#7a7a7a]">
              No active disputes in system.
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((d) => (
                <div key={d.id} className="p-4 bg-[#f8f9fa] border border-[#e0e0e0] rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#1d1d1f]">
                      Dispute for Booking #{d.booking?.bookingCode}
                    </span>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                      Status: {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#7a7a7a]">
                    Raised by: <strong className="text-[#1d1d1f]">{d.raisedByUser?.name}</strong> • Reason: {d.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
