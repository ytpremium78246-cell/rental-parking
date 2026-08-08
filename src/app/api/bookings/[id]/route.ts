import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFull } from "@/lib/auth";
import { cancelBookingByDriver, cancelBookingByOwner, validateStateTransition } from "@/lib/booking-engine";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUserFull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, reason, transactionRef } = body;
    const bookingId = params.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true, driver: true, owner: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Action Dispatcher
    switch (action) {
      case "ACCEPT": {
        if (booking.ownerId !== user.id && user.role !== "ADMIN") {
          return NextResponse.json({ error: "Only the spot owner can accept requests" }, { status: 403 });
        }
        if (user.hasOutstandingPenalty) {
          return NextResponse.json({ error: "You cannot accept bookings while you have an outstanding penalty. Please clear your penalty first." }, { status: 403 });
        }
        if (!validateStateTransition(booking.status, "Accepted")) {
          return NextResponse.json({ error: `Cannot accept booking from ${booking.status}` }, { status: 400 });
        }

        // Capacity Check: Ensure owner doesn't overbook beyond totalSlots
        const overlappingBookingsCount = await prisma.booking.count({
          where: {
            listingId: booking.listingId,
            status: "Accepted",
            startTime: { lt: booking.endTime },
            endTime: { gt: booking.startTime }
          }
        });

        if (overlappingBookingsCount >= booking.listing.totalSlots) {
          return NextResponse.json({ 
            error: `Capacity full! You already have ${overlappingBookingsCount} accepted booking(s) during this time. Max capacity is ${booking.listing.totalSlots}.` 
          }, { status: 403 });
        }

        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "Accepted", updatedAt: new Date() },
        });

        await prisma.notification.create({
          data: {
            userId: booking.driverId,
            title: "Booking Accepted! 🎉",
            message: `Owner accepted your booking for '${booking.listing.title}'. You can now park.`,
            type: "BOOKING_UPDATE",
          },
        });

        return NextResponse.json({ success: true, booking: updated });
      }

      case "REJECT": {
        if (booking.ownerId !== user.id && user.role !== "ADMIN") {
          return NextResponse.json({ error: "Only the spot owner can reject requests" }, { status: 403 });
        }

        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "Rejected", cancellationReason: reason || "Owner unavailable" },
        });

        await prisma.notification.create({
          data: {
            userId: booking.driverId,
            title: "Booking Declined",
            message: `Owner was unable to accept your request for '${booking.listing.title}'.`,
            type: "BOOKING_UPDATE",
          },
        });

        return NextResponse.json({ success: true, booking: updated });
      }

      case "DRIVER_CANCEL": {
        const result = await cancelBookingByDriver(bookingId, user.id, reason || "Cancelled by driver");
        return NextResponse.json(result);
      }

      case "OWNER_CANCEL": {
        const result = await cancelBookingByOwner(bookingId, user.id, reason || "Cancelled by owner");
        return NextResponse.json(result);
      }

      case "MUTUAL_CANCEL": {
        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "MutualCancel", cancellationReason: "Mutual agreement between Driver and Owner" },
        });

        return NextResponse.json({ success: true, booking: updated });
      }

      case "VERIFY_CODE": {
        if (booking.ownerId !== user.id && user.role !== "ADMIN") {
          return NextResponse.json({ error: "Only spot owner can verify code" }, { status: 403 });
        }
        if (booking.verificationCode !== body.code) {
          return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
        }
        if (booking.timerStartedAt) {
          return NextResponse.json({ error: "Parking session already started" }, { status: 400 });
        }

        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: { timerStartedAt: new Date() },
        });

        await prisma.notification.create({
          data: {
            userId: booking.driverId,
            title: "Parking Session Started ⏱️",
            message: `Owner verified your code. Your physical parking timer has started.`,
            type: "BOOKING_UPDATE",
          },
        });

        return NextResponse.json({ success: true, booking: updated });
      }

      case "STOP_PARKING_TIMER": {
        if (booking.ownerId !== user.id && booking.driverId !== user.id && user.role !== "ADMIN") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        if (!booking.timerStartedAt) {
          return NextResponse.json({ error: "Parking timer hasn't started yet" }, { status: 400 });
        }
        if (booking.timerEndedAt) {
          return NextResponse.json({ error: "Parking timer already stopped" }, { status: 400 });
        }

        const timerEndedAt = new Date();
        const durationMs = timerEndedAt.getTime() - new Date(booking.timerStartedAt).getTime();
        const totalHours = Math.max(1, Math.ceil(durationMs / (1000 * 3600)));
        
        // Fetch listing for rate
        const listing = await prisma.parkingListing.findUnique({ where: { id: booking.listingId } });
        if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

        const finalAmount = totalHours * listing.ratePerHour;

        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: { 
            timerEndedAt,
            amount: finalAmount,
            totalHours,
            status: "Completed", // Ends the physical part, awaiting payment
          },
        });

        const notifyUserId = user.id === booking.driverId ? booking.ownerId : booking.driverId;
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            title: "Parking Session Ended 🏁",
            message: `The physical parking session ended. Final duration: ${totalHours} hrs. Amount: ₹${finalAmount}.`,
            type: "BOOKING_UPDATE",
          },
        });

        return NextResponse.json({ success: true, booking: updated });
      }

      case "DRIVER_CONFIRM_PAYMENT": {
        if (booking.driverId !== user.id) {
          return NextResponse.json({ error: "Only driver can submit payment confirmation" }, { status: 403 });
        }

        if (booking.paymentStatus === "DRIVER_CONFIRMED" || booking.paymentStatus === "SETTLED") {
          return NextResponse.json({ error: "Payment already claimed" }, { status: 400 });
        }

        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: "DRIVER_CONFIRMED",
            driverConfirmedAt: new Date(),
            paymentClaimedAt: new Date(),
            paymentClaimedBy: user.id,
          },
        });

        await prisma.paymentConfirmation.create({
          data: {
            bookingId,
            confirmedByUserId: user.id,
            role: "DRIVER",
            paymentMode: booking.paymentMode,
            transactionRef: transactionRef || "DIRECT-UPI",
          },
        });

        await prisma.notification.create({
          data: {
            userId: booking.ownerId,
            title: "Driver Sent Payment!",
            message: `Driver confirmed direct ${booking.paymentMode} payment of ₹${booking.amount}. Please verify and confirm receipt.`,
            type: "BOOKING_UPDATE",
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "DRIVER_CLAIMED_PAYMENT",
            details: `Booking ${booking.bookingCode}`,
          },
        });

        return NextResponse.json({ success: true, booking: updated });
      }

      case "OWNER_CONFIRM_PAYMENT": {
        if (booking.ownerId !== user.id && user.role !== "ADMIN") {
          return NextResponse.json({ error: "Only spot owner can confirm payment receipt" }, { status: 403 });
        }

        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "Completed",
            paymentStatus: "SETTLED",
            ownerConfirmedAt: new Date(),
          },
        });

        await prisma.paymentConfirmation.create({
          data: {
            bookingId,
            confirmedByUserId: user.id,
            role: "OWNER",
            paymentMode: booking.paymentMode,
            transactionRef: transactionRef || "OWNER-RECEIVED",
          },
        });

        // Award +1 trust bonus to driver and owner for successful completed transaction
        await prisma.user.update({
          where: { id: booking.driverId },
          data: { trustScore: { increment: 1 } },
        });
        await prisma.user.update({
          where: { id: booking.ownerId },
          data: { trustScore: { increment: 1 } },
        });

        await prisma.notification.create({
          data: {
            userId: booking.driverId,
            title: "Booking Completed! ⭐",
            message: `Owner confirmed payment receipt. Thank you for using Parking India! Leave a review.`,
            type: "BOOKING_UPDATE",
          },
        });

        return NextResponse.json({ success: true, booking: updated });
      }

      case "OWNER_REJECT_PAYMENT": {
        if (booking.ownerId !== user.id && user.role !== "ADMIN") {
          return NextResponse.json({ error: "Only spot owner can reject payment receipt" }, { status: 403 });
        }

        const driver = await prisma.user.findUnique({ where: { id: booking.driverId } });
        if (!driver) {
           return NextResponse.json({ error: "Driver not found" }, { status: 404 });
        }

        const newWarningsCount = (driver.falsePaymentWarnings || 0) + 1;
        const penaltyAmount = 0.20 * booking.amount;

        try {
          // Update driver trust score and warnings
          await prisma.user.update({
            where: { id: booking.driverId },
            data: {
              trustScore: { decrement: 3 },
              falsePaymentWarnings: newWarningsCount,
            }
          });
        } catch (err) {
          // Fallback if Prisma schema is out of sync (falsePaymentWarnings missing)
          await prisma.user.update({
            where: { id: booking.driverId },
            data: { trustScore: { decrement: 3 } }
          });
        }

        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "Disputed",
            paymentStatus: "PENDING",
            disputeStatus: "OPEN",
            disputeReason: reason,
            disputedAt: new Date(),
            disputedBy: user.id,
          },
        });

        // Push the unpaid booking amount directly into the Penalty Ledger
        // This freezes the driver's account until they pay the owner.
        const isThirdStrike = newWarningsCount >= 3;
        const amountOwed = isThirdStrike ? booking.amount + penaltyAmount : booking.amount;

        await prisma.penaltyLedger.create({
          data: {
            userId: booking.driverId,
            aggrievedUserId: booking.ownerId,
            bookingId: bookingId,
            amount: amountOwed, // Legacy support
            principalAmount: booking.amount,
            fineAmount: isThirdStrike ? penaltyAmount : 0.0,
            remainingAmount: amountOwed,
            paidAmount: 0.0,
            reason: isThirdStrike
              ? `Unpaid booking ${booking.bookingCode} + 20% penalty fee for 3rd false payment strike.`
              : `Unpaid booking ${booking.bookingCode} (Marked as False Request by owner).`,
            status: "OUTSTANDING",
          }
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "OWNER_DISPUTED_PAYMENT",
            details: `Booking ${booking.bookingCode}, Reason: ${reason}`,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: booking.driverId,
            action: "PENALTY_CREATED",
            details: `Amount: ₹${amountOwed}, 3rd Strike: ${isThirdStrike}`,
          },
        });

        if (isThirdStrike) {
          await prisma.notification.create({
            data: {
              userId: booking.driverId,
              title: "Payment Dispute / Penalty Assessed ⚠️",
              message: `Owner marked your payment request as FALSE (Strike ${newWarningsCount}). The unpaid booking + a 20% penalty has been added to your ledger. Your trust score was reduced by 3 points.`,
              type: "PENALTY_ALERT",
            },
          });
        } else {
          await prisma.notification.create({
            data: {
              userId: booking.driverId,
              title: "Payment Dispute Warning ⚠️",
              message: `Owner marked your payment request as FALSE. The unpaid amount is now in your penalty ledger. This is warning ${newWarningsCount} of 3. Your trust score was reduced by 3 points.`,
              type: "SYSTEM",
            },
          });
        }

        return NextResponse.json({ success: true, booking: updated });
      }

      case "RAISE_DISPUTE": {
        const dispute = await prisma.dispute.create({
          data: {
            bookingId,
            raisedByUserId: user.id,
            reason: reason || "Payment / booking fulfillment dispute raised",
            status: "OPEN",
          },
        });

        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "Disputed" },
        });

        return NextResponse.json({ success: true, dispute });
      }

      default:
        return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Booking Action API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
