"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Car, Clock, ShieldCheck, CheckCircle2, AlertTriangle, IndianRupee, QrCode, ArrowRight } from "lucide-react";
import ModalPortal from "@/components/ModalPortal";



export default function DriverDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Direct Payment Modal
  const [activePaymentBooking, setActivePaymentBooking] = useState<any>(null);
  const [showPaymentConsent, setShowPaymentConsent] = useState(false);
  const [consentTimer, setConsentTimer] = useState(3);
  const [upiRef, setUpiRef] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showPaymentConsent && consentTimer > 0) {
      timer = setTimeout(() => {
        setConsentTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showPaymentConsent, consentTimer]);

  // Cancel Modal
  const [activeCancelBooking, setActiveCancelBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState<{message: string, isPenalty: boolean} | null>(null);
  
  const [penaltyPreview, setPenaltyPreview] = useState<{ amount: number; applicable: boolean } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (activeCancelBooking) {
      setPreviewLoading(true);
      fetch(`/api/bookings/${activeCancelBooking.id}/penalty-preview?actor=DRIVER`)
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
      if (!meData.user || meData.user.role !== "DRIVER") return;

      setUser(meData.user);

      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(data.bookings || []);
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
      
      if (meData.user.role !== "DRIVER") {
        router.push(meData.user.role === "OWNER" ? "/owner" : "/");
        return;
      }

      setUser(meData.user);

      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(data.bookings || []);
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

  const handleDriverConfirmPayment = async () => {
    if (!activePaymentBooking) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${activePaymentBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DRIVER_CONFIRM_PAYMENT",
          transactionRef: upiRef || "UPI-DIRECT-PAY",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment confirmation failed");

      setShowPaymentConsent(false);
      setActivePaymentBooking(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!activeCancelBooking) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${activeCancelBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DRIVER_CANCEL",
          reason: cancelReason || "Cancelled by driver",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed");

      if (data.isPenaltyApplicable) {
        setCancelSuccess({
          message: "Booking cancelled. ₹10 penalty assessed for cancellation after 5-minute grace period.",
          isPenalty: true
        });
      } else {
        setCancelSuccess({
          message: "Booking cancelled for free (within grace period or before acceptance).",
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

  const handleStopParking = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "STOP_PARKING_TIMER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to stop parking");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto p-8 text-center text-[#7a7a7a]">Loading Car Owner Dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Driver Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#e0e0e0] pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1d1d1f]">Car Owner Dashboard</h1>
          <p className="text-sm text-[#7a7a7a]">Manage your active bookings, direct UPI payments, and history.</p>
        </div>

        {user && (
          <div className="flex items-center space-x-3 bg-white p-3 border border-[#e0e0e0] rounded-xl">
            <div className="w-10 h-10 bg-[#f0f0f0] rounded-full flex items-center justify-center font-bold text-[#0066cc]">
              🚗
            </div>
            <div>
              <div className="text-xs font-bold text-[#1d1d1f]">{user.name}</div>
              <div className="text-[11px] text-[#7a7a7a]">Trust Score: <span className="font-bold text-[#0066cc]">{user.trustScore}</span></div>
            </div>
          </div>
        )}
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

      {/* Bookings List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#1d1d1f]">Your Bookings</h2>

        {bookings.length === 0 ? (
          <div className="p-8 border border-dashed border-[#e0e0e0] rounded-2xl text-center text-[#7a7a7a] space-y-3">
            <p>You have no active or previous parking bookings.</p>
            <a href="/search" className="inline-block px-4 py-2 bg-[#0066cc] text-white text-xs font-bold rounded-xl">
              Search Parking Spaces
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isAccepted = booking.status === "Accepted";
              const isPending = booking.status === "Pending";
              const isCompleted = booking.status === "Completed";
              const isDriverConfirmed = booking.paymentStatus === "DRIVER_CONFIRMED";

              return (
                <div
                  key={booking.id}
                  className="bg-white border border-[#e0e0e0] rounded-2xl p-5 shadow-subtle space-y-4 flex flex-col md:flex-row md:items-center justify-between"
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
                        Status: {booking.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-[#1d1d1f]">{booking.listing?.title}</h3>
                    <p className="text-xs text-[#7a7a7a]">{booking.listing?.address}, {booking.listing?.city}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-[#7a7a7a] pt-1">
                      <span>Vehicle: <strong className="text-[#1d1d1f]">{booking.vehicleNumber}</strong></span>
                      <span>Amount: <strong className="text-[#1d1d1f]">₹{booking.amount}</strong></span>
                      <span>Payment: <strong className="text-[#1d1d1f]">{booking.paymentMode}</strong></span>
                    </div>

                    {isAccepted && !booking.timerStartedAt && (
                      <div className="mt-2 p-3 bg-[#f8f9fa] border border-[#e0e0e0] rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#7a7a7a] font-semibold">Verification Code for Parking Owner:</p>
                          <p className="text-lg font-bold tracking-widest text-[#1d1d1f]">{booking.verificationCode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#7a7a7a]">Provide this code to the owner</p>
                          <p className="text-[10px] text-[#7a7a7a]">to start the physical parking timer</p>
                        </div>
                      </div>
                    )}

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
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 md:pt-0 items-end sm:items-center">
                    {isAccepted && booking.timerStartedAt && !booking.timerEndedAt && (
                      <button
                        onClick={() => handleStopParking(booking.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                      >
                        Stop Parking / Checkout
                      </button>
                    )}
                    {isAccepted && !isDriverConfirmed && (
                      <button
                        onClick={() => setActivePaymentBooking(booking)}
                        className="px-4 py-2 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1"
                      >
                        <IndianRupee className="w-4 h-4" />
                        <span>Pay Parking Owner Direct (UPI/QR)</span>
                      </button>
                    )}

                    {isDriverConfirmed && (
                      <div className="px-3 py-2 bg-blue-50 border border-blue-200 text-[#0071e3] text-xs font-semibold rounded-xl flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Payment Sent (Awaiting Parking Owner Confirmation)</span>
                      </div>
                    )}

                    {(isPending || isAccepted) && (
                      <button
                        onClick={() => setActiveCancelBooking(booking)}
                        className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs rounded-xl transition"
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

      {/* Direct UPI Payment Modal */}
      {activePaymentBooking && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-5">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
                <h2 className="text-lg font-bold text-[#1d1d1f]">Direct P2P Payment to Parking Owner</h2>
                <button onClick={() => setActivePaymentBooking(null)} className="text-[#7a7a7a] hover:text-[#1d1d1f]">
                  ✕
                </button>
              </div>

              {showPaymentConsent ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-center space-x-2 text-amber-800">
                      <AlertTriangle className="w-5 h-5" />
                      <h3 className="font-bold text-lg">Are you sure?</h3>
                    </div>
                    <p className="text-sm text-amber-900">
                      Are you absolutely sure you have completed the payment of <strong>₹{activePaymentBooking.amount}</strong> to the owner?
                    </p>
                    <p className="text-xs text-amber-800 font-semibold mt-2">
                      Submitting a false payment request will decrease your trust score and result in heavy financial penalties.
                      <br />
                      <strong>Warnings Left: {Math.max(0, 3 - (user?.falsePaymentWarnings || 0))} out of 3</strong>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowPaymentConsent(false);
                        setConsentTimer(3);
                      }}
                      disabled={actionLoading}
                      className="flex-1 py-3 bg-white border border-[#e0e0e0] text-[#1d1d1f] font-bold text-sm rounded-xl transition shadow-sm hover:bg-gray-50"
                    >
                      No, Go Back
                    </button>
                    <button
                      onClick={handleDriverConfirmPayment}
                      disabled={actionLoading || consentTimer > 0}
                      className={`flex-1 py-3 text-white font-bold text-sm rounded-xl transition shadow-sm ${consentTimer > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0066cc] hover:bg-[#0071e3]'}`}
                    >
                      {actionLoading ? "Confirming..." : consentTimer > 0 ? `Read Warning (${consentTimer}s)` : "Yes, I Have Paid"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e0e0e0] space-y-2">
                    <div className="flex justify-between text-xs text-[#7a7a7a]">
                      <span>Parking Owner Name:</span>
                      <strong className="text-[#1d1d1f]">{activePaymentBooking.owner?.name}</strong>
                    </div>
                    <div className="flex justify-between text-xs text-[#7a7a7a]">
                      <span>Parking Owner Phone:</span>
                      <strong className="text-[#1d1d1f]">{activePaymentBooking.owner?.phone}</strong>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#0066cc]">
                      <span>Parking Owner UPI ID:</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#e0e0e0]">
                        {activePaymentBooking.owner?.upiId || "owner@upi"}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-extrabold text-[#1d1d1f] pt-2 border-t border-[#e0e0e0]">
                      <span>Total Amount Due:</span>
                      <span>₹{activePaymentBooking.amount}</span>
                    </div>
                  </div>

                  {/* Real UPI QR Code */}
                  <div className="text-center p-4 bg-white border border-[#e0e0e0] rounded-xl space-y-3 flex flex-col items-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${activePaymentBooking.owner?.upiId || "owner@upi"}&pn=${activePaymentBooking.owner?.name || "Owner"}&am=${activePaymentBooking.amount}&cu=INR`)}`} 
                      alt="UPI QR Code" 
                      className="w-32 h-32 mx-auto rounded-lg shadow-sm border border-[#e0e0e0] p-1"
                    />
                    <p className="text-xs text-[#7a7a7a]">
                      Scan in GPay / PhonePe / Paytm to pay <strong>₹{activePaymentBooking.amount}</strong> directly to{" "}
                      <strong>{activePaymentBooking.owner?.upiId || "owner@upi"}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                      UPI Transaction Ref / UTR (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 402911223344"
                      value={upiRef}
                      onChange={(e) => setUpiRef(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setShowPaymentConsent(true);
                      setConsentTimer(3);
                    }}
                    disabled={actionLoading}
                    className="w-full py-3 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold text-sm rounded-xl transition shadow-sm"
                  >
                    I Have Sent Payment to Parking Owner
                  </button>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Cancel Booking Modal */}
      {activeCancelBooking && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-5">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
                <h2 className="text-lg font-bold text-[#1d1d1f]">Cancel Booking #{activeCancelBooking.bookingCode}</h2>
                <button onClick={() => setActiveCancelBooking(null)} className="text-[#7a7a7a] hover:text-[#1d1d1f]">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
                  {activeCancelBooking.status === "Pending" ? (
                    <>
                      <p className="font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>100% Free Cancellation</span>
                      </p>
                      <p>Since the owner hasn't accepted your request yet, you can cancel for free.</p>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Reason for Cancellation</label>
                  <textarea
                    rows={2}
                    placeholder="Plans changed / found alternative parking..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e0e0e0] rounded-xl text-sm focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <button
                  onClick={handleCancelBooking}
                  disabled={actionLoading}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition shadow-sm"
                >
                  {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
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
    </div>
  );
}
