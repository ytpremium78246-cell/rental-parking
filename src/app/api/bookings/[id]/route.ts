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

    const { action, reason, transactionRef } = await request.json();
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

      case "DRIVER_CONFIRM_PAYMENT": {
        if (booking.driverId !== user.id) {
          return NextResponse.json({ error: "Only driver can submit payment confirmation" }, { status: 403 });
        }

        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: "DRIVER_CONFIRMED",
            driverConfirmedAt: new Date(),
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
