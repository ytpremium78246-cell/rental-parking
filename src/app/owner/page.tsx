"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ParkingSquare,
  PlusCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  IndianRupee,
  ShieldCheck,
  MapPin,
  Clock,
  Car,
  Bike,
  Zap,
} from "lucide-react";
import ModalPortal from "@/components/ModalPortal";

const GraceTimer = ({ startTime, graceMinutes }: { startTime: string; graceMinutes: number }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const start = new Date(startTime).getTime();
      const end = start + graceMinutes * 60 * 1000;
      const now = new Date().getTime();
      const diff = Math.floor((end - now) / 1000);
      return diff > 0 ? diff : 0;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, graceMinutes]);

  if (timeLeft === null) return null;

  if (timeLeft === 0) {
    return (
      <div className="mt-2 p-2 bg-red-100 text-red-700 font-bold rounded-lg text-center border border-red-200">
        Grace Period Expired (Penalty Applies)
      </div>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  return (
    <div className="mt-2 p-2 bg-blue-100 text-blue-800 font-bold rounded-lg text-center border border-blue-200">
      Free Cancellation Time Left: {mins}:{secs.toString().padStart(2, "0")}
    </div>
  );
};

export default function OwnerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Listing Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    address: "",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    ratePerHour: "40",
    slotType: "CAR_4W",
    totalSlots: "1",
    isCovered: true,
    hasCctv: true,
    hasSecurityGuard: false,
    upiId: "",
    imageFile: "",
    latitude: "",
    longitude: "",
  });
  const [locationVerified, setLocationVerified] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit Listing Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeEditListing, setActiveEditListing] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Cancel Modal
  const [activeCancelBooking, setActiveCancelBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState<{message: string, isPenalty: boolean} | null>(null);

  // Verification Modal
  const [activeVerifyBooking, setActiveVerifyBooking] = useState<any>(null);
  const [verificationCodeInput, setVerificationCodeInput] = useState("");

  // Penalty Alert Modal
  const [showPenaltyAlert, setShowPenaltyAlert] = useState(false);

  // Reject Payment Modal
  const [activeRejectBooking, setActiveRejectBooking] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const [penaltyPreview, setPenaltyPreview] = useState<{ amount: number; applicable: boolean } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (activeCancelBooking) {
      setPreviewLoading(true);
      fetch(`/api/bookings/${activeCancelBooking.id}/penalty-preview?actor=OWNER`)
        .then((res) => res.json())
        .then((data) => {
          setPenaltyPreview({ amount: data.penaltyAmount || 0, applicable: !!data.isPenaltyApplicable });
          setPreviewLoading(false);
        })
        .catch(() => setPreviewLoading(false));
    } else {
      setPenaltyPreview(null);
    }
  }, [activeCancelBooking]);

  const router = useRouter();

  const fetchDataSilently = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meData.user || meData.user.role !== "OWNER") return;

      setUser(meData.user);

      const listingsRes = await fetch("/api/listings");
      const listingsData = await listingsRes.json();
      setListings((listingsData.listings || []).filter((l: any) => l.ownerId === meData.user?.id));

      const bookingsRes = await fetch("/api/bookings");
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData.bookings || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      
      if (!meData.user) {
        router.push("/");
        return;
      }
      
      if (meData.user.role !== "OWNER") {
        router.push(meData.user.role === "DRIVER" ? "/driver" : "/");
        return;
      }

      setUser(meData.user);

      if (meData.user?.upiId) {
        setFormData((prev) => ({ ...prev, upiId: meData.user.upiId }));
      }

      const listingsRes = await fetch("/api/listings");
      const listingsData = await listingsRes.json();
      setListings(
        (listingsData.listings || []).filter(
          (l: any) => l.ownerId === meData.user?.id
        )
      );

      const bookingsRes = await fetch("/api/bookings");
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchDataSilently, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleFetchLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        setLocationVerified(true);
      },
      (error) => {
        setLocationError("Unable to retrieve your location. Please allow location access.");
        console.error(error);
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAddError("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, imageFile: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create parking listing");
      }

      setIsAddOpen(false);
      fetchData();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (listing: any) => {
    setActiveEditListing(listing);
    setEditFormData({
      title: listing.title,
      address: listing.address,
      city: listing.city,
      state: listing.state,
      pincode: listing.pincode,
      ratePerHour: listing.ratePerHour.toString(),
      slotType: listing.slotType,
      totalSlots: listing.totalSlots.toString(),
      isCovered: listing.isCovered,
      hasCctv: listing.hasCctv,
      hasSecurityGuard: listing.hasSecurityGuard,
      upiId: listing.upiId,
      imageFile: listing.imageUrl || "",
    });
    setEditError("");
    setIsEditOpen(true);
  };

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditListing) return;
    
    setEditLoading(true);
    setEditError("");

    try {
      const res = await fetch(`/api/listings/${activeEditListing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update parking listing");
      }

      setIsEditOpen(false);
      setActiveEditListing(null);
      fetchData();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure you want to completely remove this parking listing? This action cannot be undone.")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete listing");

      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBookingAction = async (bookingId: string, action: string, extraData?: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyCodeSubmit = async () => {
    if (!activeVerifyBooking || !verificationCodeInput) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${activeVerifyBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VERIFY_CODE", code: verificationCodeInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setActiveVerifyBooking(null);
      setVerificationCodeInput("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePenaltyAction = async (penaltyId: string, action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/penalties/${penaltyId}/action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Penalty action failed");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOwnerCancelBooking = async () => {
    if (!activeCancelBooking) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${activeCancelBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "OWNER_CANCEL",
          reason: cancelReason || "Owner cancelled",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed");

      if (data.isPenaltyApplicable) {
        setCancelSuccess({
          message: "Booking cancelled. ₹10 penalty assessed for cancellation after 3-minute grace period.",
          isPenalty: true
        });
      } else {
        setCancelSuccess({
          message: "Booking cancelled for free within 3-minute grace period.",
          isPenalty: false
        });
      }

      setActiveCancelBooking(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleListingAvailability = async (listingId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto p-8 text-center text-[#7a7a7a]">Loading Parking Owner Dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Owner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#e0e0e0] pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1d1d1f]">Parking Owner Dashboard</h1>
          <p className="text-sm text-[#7a7a7a]">
            Manage your parking spots, accept booking requests, and confirm direct UPI payments.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {user && (
            <div className="flex items-center space-x-3 bg-white p-3 border border-[#e0e0e0] rounded-xl">
              <div className="w-10 h-10 bg-[#f0f0f0] rounded-full flex items-center justify-center font-bold text-[#0066cc]">
                🅿️
              </div>
              <div>
                <div className="text-xs font-bold text-[#1d1d1f]">{user.name}</div>
                <div className="text-[11px] text-[#7a7a7a]">
                  Trust Score: <span className="font-bold text-[#0066cc]">{user.trustScore}</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Parking Spot</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e0e0e0] p-4 rounded-2xl">
          <div className="text-xs text-[#7a7a7a]">Listed Spots</div>
          <div className="text-2xl font-extrabold text-[#1d1d1f]">{listings.length}</div>
        </div>
        <div className="bg-white border border-[#e0e0e0] p-4 rounded-2xl">
          <div className="text-xs text-[#7a7a7a]">Total Bookings</div>
          <div className="text-2xl font-extrabold text-[#0066cc]">{bookings.length}</div>
        </div>
        <div className="bg-white border border-[#e0e0e0] p-4 rounded-2xl">
          <div className="text-xs text-[#7a7a7a]">Pending Requests</div>
          <div className="text-2xl font-extrabold text-amber-600">
            {bookings.filter((b) => b.status === "Pending").length}
          </div>
        </div>
        <div className="bg-white border border-[#e0e0e0] p-4 rounded-2xl">
          <div className="text-xs text-[#7a7a7a]">Settled Earnings</div>
          <div className="text-2xl font-extrabold text-[#0066cc]">
            ₹
            {bookings
              .filter((b) => b.status === "Completed")
              .reduce((sum, b) => sum + b.amount, 0)}
          </div>
        </div>
      </div>

      {/* Incoming Penalty Payments */}
      {user?.incomingPenalties?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#0071e3]">Incoming Penalty Payments</h2>
          <div className="space-y-4">
            {user.incomingPenalties.map((penalty: any) => (
              <div key={penalty.id} className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-[#1d1d1f]">
                    Penalty Payment Received: ₹{penalty.amount}
                  </h3>
                  <p className="text-xs text-[#7a7a7a]">
                    From: <strong className="text-[#1d1d1f]">{penalty.user?.name}</strong> • Ref: <strong className="text-[#1d1d1f]">{penalty.paymentRef}</strong>
                  </p>
                  <p className="text-xs text-[#7a7a7a]">{penalty.reason}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handlePenaltyAction(penalty.id, "CONFIRM")}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold text-xs rounded-xl shadow-sm transition"
                  >
                    Confirm Received
                  </button>
                  <button
                    onClick={() => handlePenaltyAction(penalty.id, "DISPUTE")}
                    disabled={actionLoading}
                    className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition"
                  >
                    Not Received (Dispute)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incoming Requests Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#1d1d1f]">Booking Requests & Active Slots</h2>

        {bookings.length === 0 ? (
          <div className="p-8 border border-dashed border-[#e0e0e0] rounded-2xl text-center text-[#7a7a7a]">
            No booking requests received yet.
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isPending = booking.status === "Pending";
              const isAccepted = booking.status === "Accepted";
              const isDriverConfirmed = booking.paymentStatus === "DRIVER_CONFIRMED";
              const isCompleted = booking.status === "Completed";

              return (
                <div
                  key={booking.id}
                  className="bg-white border border-[#e0e0e0] rounded-2xl p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold bg-[#f0f0f0] px-2 py-0.5 rounded text-[#0066cc]">
                        #{booking.bookingCode}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isAccepted
                            ? "bg-blue-100 text-blue-800"
                            : isCompleted
                            ? "bg-blue-100 text-blue-800"
                            : isPending
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#1d1d1f]">{booking.listing?.title}</h3>
                    <p className="text-xs text-[#7a7a7a]">
                      Car Owner: <strong className="text-[#1d1d1f]">{booking.driver?.name}</strong> ({booking.driver?.phone}) • 
                      Trust: <strong className={booking.driver?.trustScore < 90 ? "text-red-600" : "text-[#0066cc]"}>{booking.driver?.trustScore}</strong> • 
                      Vehicle: <strong className="text-[#1d1d1f]">{booking.vehicleNumber}</strong>
                    </p>

                    <div className="flex gap-4 text-xs text-[#7a7a7a]">
                      <span>Fee: <strong className="text-[#1d1d1f]">₹{booking.amount}</strong></span>
                      <span>Mode: <strong className="text-[#1d1d1f]">{booking.paymentMode}</strong></span>
                      <span>Status: <strong className="text-[#1d1d1f]">{booking.paymentStatus}</strong></span>
                    </div>

                    {isAccepted && booking.timerStartedAt && !booking.timerEndedAt && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#0066cc] font-bold">Physical Parking Session Active ⏱️</p>
                          <p className="text-[10px] text-[#0071e3]">Started at: {new Date(booking.timerStartedAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {isPending && (
                      <>
                        <button
                          onClick={() => {
                            if (user?.hasOutstandingPenalty) {
                              setShowPenaltyAlert(true);
                              return;
                            }
                            handleBookingAction(booking.id, "ACCEPT");
                          }}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                          Accept Request
                        </button>
                        <button
                          onClick={() => handleBookingAction(booking.id, "REJECT")}
                          disabled={actionLoading}
                          className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {isDriverConfirmed && !isCompleted && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBookingAction(booking.id, "OWNER_CONFIRM_PAYMENT")}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm Payment Received (₹{booking.amount})</span>
                        </button>
                        <button
                          onClick={() => setActiveRejectBooking(booking)}
                          disabled={actionLoading}
                          className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition flex items-center space-x-1"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Payment Not Received (False Request)</span>
                        </button>
                      </div>
                    )}

                    {isAccepted && !booking.timerStartedAt && (
                      <button
                        onClick={() => setActiveVerifyBooking(booking)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                      >
                        Start Timer (Enter Code)
                      </button>
                    )}

                    {isAccepted && booking.timerStartedAt && !booking.timerEndedAt && (
                      <button
                        onClick={() => handleBookingAction(booking.id, "STOP_PARKING_TIMER")}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                      >
                        End/Confirm Session
                      </button>
                    )}

                    {isAccepted && (
                      <button
                        onClick={() => setActiveCancelBooking(booking)}
                        className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Owner Listings Section */}
      <div className="space-y-4 pt-4 border-t border-[#e0e0e0]">
        <h2 className="text-xl font-bold text-[#1d1d1f]">My Parking Listings ({listings.length})</h2>

        {listings.length === 0 ? (
          <div className="p-8 border border-dashed border-[#e0e0e0] rounded-2xl text-center text-[#7a7a7a]">
            You have not added any parking spaces yet. Click 'Add Parking Spot' to begin earning.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <div key={item.id} className="bg-white border border-[#e0e0e0] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-[#f0f0f0] text-[11px] font-bold text-[#0066cc] rounded-full">
                    {item.slotType}
                  </span>
                  <button
                    onClick={() => toggleListingAvailability(item.id, item.isAvailable)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      item.isAvailable ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.isAvailable ? "Active / Open" : "Paused / Offline"}
                  </button>
                </div>

                <h3 className="font-bold text-base text-[#1d1d1f]">{item.title}</h3>
                
                {item.imageUrl && (
                  <div className="w-full h-32 rounded-xl overflow-hidden bg-gray-100 my-2">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <p className="text-xs text-[#7a7a7a] flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{item.address}, {item.city}</span>
                </p>

                <div className="flex justify-between items-center text-xs text-[#7a7a7a] pt-2 border-t border-[#f0f0f0]">
                  <span>Rate: <strong className="text-[#1d1d1f]">₹{item.ratePerHour}/hr</strong></span>
                  <span>UPI: <strong className="text-[#0066cc] font-mono">{item.upiId}</strong></span>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#f0f0f0]">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1"
                  >
                    <span>✏️ Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteListing(item.id)}
                    className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1"
                  >
                    <span>🗑️ Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Listing Modal */}
      {isAddOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
                <h2 className="text-lg font-bold text-[#1d1d1f]">List a New Parking Space</h2>
                <button onClick={() => setIsAddOpen(false)} className="text-[#7a7a7a] hover:text-[#1d1d1f]">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateListing} className="space-y-4">
                {addError && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl">{addError}</div>}

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Listing Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Private Gated Driveway Near Metro"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Full Street Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. House 42, Block B, Connaught Place"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Pincode</label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Rate Per Hour (₹)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={formData.ratePerHour}
                      onChange={(e) => setFormData({ ...formData, ratePerHour: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Capacity (Cars)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formData.totalSlots}
                      onChange={(e) => setFormData({ ...formData, totalSlots: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Vehicle Type</label>
                    <select
                      value={formData.slotType}
                      onChange={(e) => setFormData({ ...formData, slotType: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    >
                      <option value="CAR_4W">🚗 Car (4W)</option>
                      <option value="BIKE_2W">🏍️ Bike (2W)</option>
                      <option value="EV_4W">⚡ EV Spot</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    Parking Owner Direct UPI ID (for Car Owner Payments)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210@paytm / owner@okicici"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm font-mono focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <label className="flex items-center space-x-2 text-xs font-medium text-[#1d1d1f]">
                    <input
                      type="checkbox"
                      checked={formData.isCovered}
                      onChange={(e) => setFormData({ ...formData, isCovered: e.target.checked })}
                      className="rounded text-[#0066cc]"
                    />
                    <span>Covered Shed</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-medium text-[#1d1d1f]">
                    <input
                      type="checkbox"
                      checked={formData.hasCctv}
                      onChange={(e) => setFormData({ ...formData, hasCctv: e.target.checked })}
                      className="rounded text-[#0066cc]"
                    />
                    <span>CCTV Monitored</span>
                  </label>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#f0f0f0]">
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      Parking Space Image (Upload OR Web URL) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="flex-1 px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                      />
                      <span className="text-xs text-[#7a7a7a] self-center">OR</span>
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={formData.imageFile.startsWith("http") ? formData.imageFile : ""}
                        onChange={(e) => setFormData({ ...formData, imageFile: e.target.value })}
                        className="flex-1 px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                      />
                    </div>
                    {formData.imageFile && !formData.imageFile.startsWith("http") && <p className="text-xs text-green-600 mt-1">Image attached successfully.</p>}
                    {formData.imageFile && formData.imageFile.startsWith("http") && <p className="text-xs text-green-600 mt-1">Image URL added.</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      Current Location (GPS) <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[10px] text-[#7a7a7a] mb-2">You must be physically present at the parking location to add it.</p>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={handleFetchLocation}
                        className="px-4 py-2 bg-[#f0f0f0] hover:bg-[#e0e0e0] text-[#1d1d1f] text-xs font-bold rounded-xl transition"
                      >
                        📍 Fetch My Location
                      </button>
                      {locationVerified && (
                        <span className="text-xs text-green-600 font-semibold">✓ Location Verified</span>
                      )}
                    </div>
                    {locationError && <p className="text-xs text-red-500 mt-1">{locationError}</p>}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addLoading || !locationVerified || !formData.imageFile}
                  className="w-full py-3 bg-[#0066cc] hover:bg-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition shadow-sm"
                >
                  {addLoading ? "Creating..." : "Publish Parking Listing"}
                </button>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Edit Listing Modal */}
      {isEditOpen && activeEditListing && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
                <h2 className="text-lg font-bold text-[#1d1d1f]">Edit Parking Space</h2>
                <button onClick={() => setIsEditOpen(false)} className="text-[#7a7a7a] hover:text-[#1d1d1f]">
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateListing} className="space-y-4">
                {editError && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl">{editError}</div>}

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Listing Title</label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Full Street Address</label>
                  <input
                    type="text"
                    required
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={editFormData.state}
                      onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Pincode</label>
                    <input
                      type="text"
                      required
                      value={editFormData.pincode}
                      onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Rate Per Hour (₹)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={editFormData.ratePerHour}
                      onChange={(e) => setEditFormData({ ...editFormData, ratePerHour: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Capacity (Cars)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={editFormData.totalSlots}
                      onChange={(e) => setEditFormData({ ...editFormData, totalSlots: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Vehicle Type</label>
                    <select
                      value={editFormData.slotType}
                      onChange={(e) => setEditFormData({ ...editFormData, slotType: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    >
                      <option value="CAR_4W">🚗 Car (4W)</option>
                      <option value="BIKE_2W">🏍️ Bike (2W)</option>
                      <option value="EV_4W">⚡ EV Spot</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    Parking Owner Direct UPI ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.upiId}
                    onChange={(e) => setEditFormData({ ...editFormData, upiId: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm font-mono focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                    Parking Space Image (Upload OR Web URL)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            setEditError("Image size must be less than 5MB");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                        }}
                        className="flex-1 px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                      />
                      <span className="text-xs text-[#7a7a7a] self-center">OR</span>
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={editFormData.imageFile?.startsWith("http") ? editFormData.imageFile : ""}
                        onChange={(e) => setEditFormData({ ...editFormData, imageFile: e.target.value })}
                        className="flex-1 px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                      />
                    </div>
                    {editFormData.imageFile && !editFormData.imageFile.startsWith("http") && <p className="text-xs text-green-600 mt-1">Image attached successfully.</p>}
                    {editFormData.imageFile && editFormData.imageFile.startsWith("http") && <p className="text-xs text-green-600 mt-1">Image URL added.</p>}
                </div>

                <div className="flex gap-4 pt-2">
                  <label className="flex items-center space-x-2 text-xs font-medium text-[#1d1d1f]">
                    <input
                      type="checkbox"
                      checked={editFormData.isCovered}
                      onChange={(e) => setEditFormData({ ...editFormData, isCovered: e.target.checked })}
                      className="rounded text-[#0066cc]"
                    />
                    <span>Covered Shed</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-medium text-[#1d1d1f]">
                    <input
                      type="checkbox"
                      checked={editFormData.hasCctv}
                      onChange={(e) => setEditFormData({ ...editFormData, hasCctv: e.target.checked })}
                      className="rounded text-[#0066cc]"
                    />
                    <span>CCTV Monitored</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={editLoading}
                  className="w-full py-3 bg-[#0066cc] hover:bg-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition shadow-sm"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Cancel Modal */}
      {activeCancelBooking && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-5">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
                <h2 className="text-lg font-bold text-[#1d1d1f]">Cancel Accepted Booking #{activeCancelBooking.bookingCode}</h2>
                <button onClick={() => setActiveCancelBooking(null)} className="text-[#7a7a7a] hover:text-[#1d1d1f]">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-2">
                  <p className="font-bold flex items-center space-x-1 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>Penalty Preview</span>
                  </p>
                  
                  {previewLoading ? (
                    <p className="animate-pulse">Calculating your exact penalty...</p>
                  ) : penaltyPreview ? (
                    <>
                      {penaltyPreview.applicable ? (
                        <div>
                          <p>If you proceed with cancellation right now, you will be assessed a penalty of:</p>
                          <div className="text-xl font-extrabold text-red-600 mt-1">₹{penaltyPreview.amount}</div>
                        </div>
                      ) : (
                        <p className="text-green-700 font-bold">Free Cancellation (No Penalty Applies)</p>
                      )}
                    </>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Reason for Cancellation</label>
                  <textarea
                    rows={2}
                    placeholder="Spot blocked / emergency..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <button
                  onClick={handleOwnerCancelBooking}
                  disabled={actionLoading}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition shadow-sm"
                >
                  {actionLoading ? "Cancelling..." : "Confirm Parking Owner Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Cancel Success / Penalty Modal */}
      {cancelSuccess && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-4 text-center">
              <div className={`mx-auto w-12 h-12 flex items-center justify-center rounded-full ${cancelSuccess.isPenalty ? 'bg-amber-100' : 'bg-blue-100'}`}>
                {cancelSuccess.isPenalty ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-[#0066cc]" />
                )}
              </div>
              
              <h2 className="text-lg font-bold text-[#1d1d1f]">
                {cancelSuccess.isPenalty ? "Penalty Assessed" : "Successfully Cancelled"}
              </h2>
              
              <p className="text-sm text-[#7a7a7a]">
                {cancelSuccess.message}
              </p>
              
              <button
                onClick={() => setCancelSuccess(null)}
                className="w-full py-2.5 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold text-sm rounded-xl transition shadow-sm mt-2"
              >
                Close
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

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
                You cannot accept new booking requests until you pay your outstanding penalties. Please settle your penalty ledger first.
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
      {/* Reject Payment Modal */}
      {activeRejectBooking && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-4">
              <div className="flex items-center space-x-2 text-red-600 border-b border-[#f0f0f0] pb-3">
                <AlertTriangle className="w-6 h-6" />
                <h2 className="text-lg font-bold text-[#1d1d1f]">Report False Payment</h2>
              </div>
              
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-sm font-semibold text-red-800">Are you sure?</p>
                <p className="text-xs text-red-700 mt-1">
                  This will add a severe penalty to the driver's ledger and deduct 3 Trust Score points for a false payment claim.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Reason for Dispute</label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="e.g. Checked my bank app, no payment received for this amount."
                  className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-red-600 min-h-[80px]"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setActiveRejectBooking(null)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-white border border-[#e0e0e0] text-[#1d1d1f] font-bold text-sm rounded-xl transition shadow-sm hover:bg-gray-50"
                >
                  Go Back
                </button>
                <button
                  onClick={() => {
                    if (!disputeReason.trim()) {
                      alert("Please provide a reason for the dispute.");
                      return;
                    }
                    handleBookingAction(activeRejectBooking.id, "OWNER_REJECT_PAYMENT", { reason: disputeReason });
                    setActiveRejectBooking(null);
                    setDisputeReason("");
                  }}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition shadow-sm"
                >
                  {actionLoading ? "Processing..." : "Yes, Report It"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      {/* Verification Modal */}
      {activeVerifyBooking && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-4">
              <div className="flex items-center space-x-2 text-green-600 border-b border-[#f0f0f0] pb-3">
                <CheckCircle2 className="w-6 h-6" />
                <h2 className="text-lg font-bold text-[#1d1d1f]">Verify Car Owner Code</h2>
              </div>
              
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <p className="text-sm font-semibold text-green-800">Start Physical Parking Session</p>
                <p className="text-xs text-green-700 mt-1">
                  Ask the driver for their 4-digit code. Entering it here will start their live parking timer.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">4-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={4}
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full px-3 py-3 border border-[#e0e0e0] rounded-xl text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-green-600"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setActiveVerifyBooking(null);
                    setVerificationCodeInput("");
                  }}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-white border border-[#e0e0e0] text-[#1d1d1f] font-bold text-sm rounded-xl transition shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyCodeSubmit}
                  disabled={actionLoading || verificationCodeInput.length !== 4}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Verifying..." : "Verify & Start Timer"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
