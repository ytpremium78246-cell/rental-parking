"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Search, Filter, ShieldCheck, Zap, Car, Bike, Clock, CheckCircle2, AlertTriangle, ArrowRight, X } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import ModalPortal from "@/components/ModalPortal";

export default function SearchPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [city, setCity] = useState("");
  const [slotType, setSlotType] = useState("");
  const [maxPrice, setMaxPrice] = useState("100");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [hours, setHours] = useState(2);
  const [vehicleNumber, setVehicleNumber] = useState("DL 01 AB 1234");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [bookingError, setBookingError] = useState("");
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Penalty Alert Modal
  const [showPenaltyAlert, setShowPenaltyAlert] = useState(false);
  const [penaltyMessage, setPenaltyMessage] = useState("");

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (city) params.append("city", city);
      if (slotType) params.append("slotType", slotType);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error("Fetch listings error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [city, slotType, maxPrice]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  const handleBookListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError("");
    setBookingSuccess(null);

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + hours * 3600000);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: selectedListing.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          paymentMode,
          vehicleNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthOpen(true);
          throw new Error("Please log in to book parking spaces.");
        }
        if (data.penaltyBlocked || data.activeBookingBlocked) {
          setShowPenaltyAlert(true);
          setPenaltyMessage(data.error);
          throw new Error(data.error);
        }
        throw new Error(data.error || "Booking request failed");
      }

      setBookingSuccess(data.booking);
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Search & Filter */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1d1d1f]">Find Parking Near You</h1>
          <p className="text-sm text-[#7a7a7a]">
            Verified P2P parking spots across Delhi, Mumbai, Bengaluru, Pune & major Indian hubs.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-3 text-[#7a7a7a]" />
            <input
              type="text"
              placeholder="Search area, landmark or city (e.g. Connaught Place, Bandra, Indiranagar)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-3 py-2.5 bg-white border border-[#e0e0e0] rounded-xl text-sm font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
            >
              <option value="">All Cities</option>
              <option value="New Delhi">New Delhi</option>
              <option value="Gurugram">Gurugram</option>
              <option value="Noida">Noida</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Pune">Pune</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Chennai">Chennai</option>
            </select>

            <select
              value={slotType}
              onChange={(e) => setSlotType(e.target.value)}
              className="px-3 py-2.5 bg-white border border-[#e0e0e0] rounded-xl text-sm font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
            >
              <option value="">All Vehicles</option>
              <option value="CAR_4W">🚗 Car (4W)</option>
              <option value="BIKE_2W">🏍️ Bike (2W)</option>
              <option value="EV_4W">⚡ EV Car</option>
            </select>

            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0066cc] hover:bg-[#0071e3] text-white text-sm font-semibold rounded-xl transition shadow-sm"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="py-20 text-center text-[#7a7a7a]">Loading verified parking spaces...</div>
      ) : listings.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#e0e0e0] rounded-2xl p-8 space-y-3">
          <p className="text-lg font-bold text-[#1d1d1f]">No parking spaces found matching your search</p>
          <p className="text-xs text-[#7a7a7a]">Try clearing your filters or searching a broader location.</p>
          <button
            onClick={() => {
              setCity("");
              setSlotType("");
              setSearchQuery("");
            }}
            className="px-4 py-2 bg-[#f0f0f0] text-xs font-semibold text-[#1d1d1f] rounded-lg"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#e0e0e0] rounded-2xl p-5 hover:border-[#0066cc] hover:shadow-card transition flex flex-col justify-between space-y-4"
            >
              {item.imageUrl && (
                <div className="w-full h-40 rounded-xl overflow-hidden mb-1">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-1 bg-[#f0f0f0] border border-[#e0e0e0] text-[11px] font-bold text-[#0066cc] rounded-full">
                    {item.slotType === "BIKE_2W" ? "🏍️ 2-Wheeler" : item.slotType === "EV_4W" ? "⚡ EV Spot" : "🚗 4-Wheeler"}
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-[#1d1d1f]">₹{item.ratePerHour}</span>
                    <span className="text-xs text-[#7a7a7a]">/hr</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-base text-[#1d1d1f] line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-[#7a7a7a] flex items-center space-x-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#7a7a7a] flex-shrink-0" />
                    <span className="line-clamp-1">{item.address}, {item.city}</span>
                  </p>
                </div>

                {/* Features & Owner Trust */}
                <div className="flex flex-wrap gap-2 text-[11px] font-medium text-[#7a7a7a]">
                  {item.isCovered && <span className="bg-gray-100 px-2 py-0.5 rounded">Covered</span>}
                  {item.hasCctv && <span className="bg-gray-100 px-2 py-0.5 rounded">CCTV</span>}
                  {item.hasSecurityGuard && <span className="bg-gray-100 px-2 py-0.5 rounded">Guard</span>}
                </div>

                <div className="pt-2 border-t border-[#f0f0f0] flex items-center justify-between text-xs text-[#7a7a7a]">
                  <span>Owner: <strong className="text-[#1d1d1f]">{item.owner.name}</strong></span>
                  <span className="flex items-center space-x-1 text-[#0066cc] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Trust: {item.owner.trustScore}</span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedListing(item)}
                className="w-full py-2.5 bg-[#0066cc] hover:bg-[#0071e3] text-white font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2"
              >
                <span>Book Parking Spot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Booking Drawer / Modal */}
      {selectedListing && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-5 max-h-[90vh] overflow-y-auto">
              {selectedListing.imageUrl && (
                <div className="w-full h-48 rounded-xl overflow-hidden -mt-2">
                  <img src={selectedListing.imageUrl} alt={selectedListing.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
                <div>
                  <h2 className="text-lg font-bold text-[#1d1d1f]">{selectedListing.title}</h2>
                  <p className="text-xs text-[#7a7a7a]">{selectedListing.address}, {selectedListing.city}</p>
                </div>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="text-[#7a7a7a] hover:text-[#1d1d1f] text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {bookingSuccess ? (
                <div className="space-y-4 text-center py-4">
                  <div className="w-12 h-12 bg-blue-100 text-[#0066cc] rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-[#1d1d1f]">Booking Request Sent!</h3>
                  <p className="text-xs text-[#7a7a7a]">
                    Booking Code: <strong className="font-mono text-[#0066cc]">{bookingSuccess.bookingCode}</strong>
                  </p>
                  <p className="text-xs text-[#7a7a7a]">
                    Owner <strong>{selectedListing.owner.name}</strong> will review and accept your request. Direct UPI payment is made after your parking session.
                  </p>
                  <div className="pt-2">
                    <a
                      href="/driver"
                      className="inline-block px-5 py-2.5 bg-[#0066cc] text-white text-xs font-semibold rounded-xl"
                    >
                      View in Driver Dashboard
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookListing} className="space-y-4">
                  {bookingError && (
                    <div className="p-3 bg-red-50 text-red-600 border border-red-200 text-xs rounded-lg">
                      {bookingError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Duration (Hours)</label>
                      <select
                        value={hours}
                        onChange={(e) => setHours(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                      >
                        <option value={1}>1 Hour</option>
                        <option value={2}>2 Hours</option>
                        <option value={4}>4 Hours</option>
                        <option value={8}>8 Hours</option>
                        <option value={24}>Full Day (24 Hours)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Vehicle Number</label>
                      <input
                        type="text"
                        required
                        placeholder="DL 01 AB 1234"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Payment Method (Direct to Owner)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["UPI", "CASH", "QR"].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPaymentMode(mode)}
                          className={`py-2 text-xs font-semibold rounded-xl border ${
                            paymentMode === mode ? "bg-[#0066cc] text-white border-[#0066cc]" : "bg-white text-[#1d1d1f] border-[#e0e0e0]"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e0e0e0] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#7a7a7a]">Total Estimated Fee</span>
                      <div className="text-xl font-extrabold text-[#1d1d1f]">₹{selectedListing.ratePerHour * hours}</div>
                    </div>
                    <span className="text-[11px] text-[#7a7a7a]">Paid Direct to Owner</span>
                  </div>

                  <div className="text-[11px] text-[#7a7a7a] bg-blue-50 text-blue-900 p-3 rounded-xl border border-blue-100 space-y-1">
                    <p className="font-bold flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Cancellation Rule:</span>
                    </p>
                    <p>Free cancellation within 5 mins of booking. ₹10 penalty thereafter.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full py-3 bg-[#0066cc] hover:bg-[#0071e3] text-white font-semibold rounded-xl text-sm transition shadow-sm"
                  >
                    {bookingLoading ? "Submitting Request..." : "Confirm Booking Request"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={fetchListings} />
      {/* Penalty Block Modal */}
      {showPenaltyAlert && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-4 text-center">
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              
              <h2 className="text-lg font-bold text-[#1d1d1f]">
                Action Blocked
              </h2>
              
              <p className="text-sm text-[#7a7a7a]">
                {penaltyMessage}
              </p>
              
              <button
                onClick={() => setShowPenaltyAlert(false)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition shadow-sm mt-2"
              >
                Got it
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
