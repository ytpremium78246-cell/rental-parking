import { prisma } from "./prisma";
import {
  DRIVER_FREE_CANCELLATION_MINS,
  OWNER_GRACE_PERIOD_MINS,
  PENALTY_AMOUNT_INR,
  LATE_CANCEL_TRUST_PENALTY,
  NO_SHOW_TRUST_PENALTY,
  VALID_BOOKING_TRANSITIONS,
} from "./constants";

export function validateStateTransition(currentStatus: string, nextStatus: string): boolean {
  const allowed = VALID_BOOKING_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(nextStatus);
}

export async function cancelBookingByDriver(bookingId: string, driverUserId: string, reason: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.driverId !== driverUserId) throw new Error("Unauthorized action");
  if (!validateStateTransition(booking.status, "CancelledByDriver")) {
    throw new Error(`Cannot cancel booking in ${booking.status} state`);
  }

  const now = new Date();
  
  let isPenaltyApplicable = false;
  let minutesSinceAcceptance = 0;

  if (booking.status === "Accepted") {
    const acceptedAt = booking.updatedAt || booking.createdAt;
    minutesSinceAcceptance = (now.getTime() - new Date(acceptedAt).getTime()) / (1000 * 60);
    isPenaltyApplicable = minutesSinceAcceptance > DRIVER_FREE_CANCELLATION_MINS;
  }

  let penaltyAmount = 0;

  await prisma.$transaction(async (tx) => {
    if (isPenaltyApplicable) {
      penaltyAmount = PENALTY_AMOUNT_INR;

      // 1. Create Penalty Ledger
      await tx.penaltyLedger.create({
        data: {
          userId: driverUserId,
          aggrievedUserId: booking.ownerId,
          bookingId: booking.id,
          amount: PENALTY_AMOUNT_INR,
          reason: `Driver cancelled booking #${booking.bookingCode} after ${DRIVER_FREE_CANCELLATION_MINS}-minute grace period (${Math.round(minutesSinceAcceptance)} mins elapsed since acceptance)`,
          status: "OUTSTANDING",
        },
      });

      // 2. Reduce Trust Score
      const driverUser = await tx.user.findUnique({ where: { id: driverUserId } });
      if (driverUser) {
        const newScore = Math.max(0, driverUser.trustScore + LATE_CANCEL_TRUST_PENALTY);
        await tx.user.update({
          where: { id: driverUserId },
          data: { trustScore: newScore },
        });

        await tx.trustHistory.create({
          data: {
            userId: driverUserId,
            bookingId: booking.id,
            scoreChange: LATE_CANCEL_TRUST_PENALTY,
            reason: `Late cancellation penalty for booking #${booking.bookingCode}`,
            newScore: newScore,
          },
        });
      }
    }

    // 3. Update Booking
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CancelledByDriver",
        cancellationReason: reason,
        cancelledByUserId: driverUserId,
        penaltyAmount: penaltyAmount,
      },
    });

    // 4. Create Notification for Owner
    await tx.notification.create({
      data: {
        userId: booking.ownerId,
        title: "Booking Cancelled by Driver",
        message: `Driver cancelled booking #${booking.bookingCode}. ${isPenaltyApplicable ? "₹10 penalty assessed to driver." : `Free cancellation within ${DRIVER_FREE_CANCELLATION_MINS} mins.`}`,
        type: "BOOKING_UPDATE",
        actionUrl: `/bookings/${booking.id}`,
      },
    });
  });

  return { success: true, penaltyAmount, isPenaltyApplicable };
}

export async function cancelBookingByOwner(bookingId: string, ownerUserId: string, reason: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.ownerId !== ownerUserId) throw new Error("Unauthorized action");
  if (!validateStateTransition(booking.status, "CancelledByOwner")) {
    throw new Error(`Cannot cancel booking in ${booking.status} state`);
  }

  const now = new Date();
  const acceptedAt = booking.updatedAt || booking.createdAt;
  const minutesSinceAcceptance = (now.getTime() - new Date(acceptedAt).getTime()) / (1000 * 60);
  const isPenaltyApplicable = minutesSinceAcceptance > OWNER_GRACE_PERIOD_MINS;

  let penaltyAmount = 0;

  await prisma.$transaction(async (tx) => {
    if (isPenaltyApplicable) {
      penaltyAmount = PENALTY_AMOUNT_INR;

      // 1. Create Penalty Ledger for Owner
      await tx.penaltyLedger.create({
        data: {
          userId: ownerUserId,
          aggrievedUserId: booking.driverId,
          bookingId: booking.id,
          amount: PENALTY_AMOUNT_INR,
          reason: `Owner cancelled booking #${booking.bookingCode} after ${OWNER_GRACE_PERIOD_MINS}-minute grace period (${Math.round(minutesSinceAcceptance)} mins elapsed)`,
          status: "OUTSTANDING",
        },
      });

      // 2. Reduce Trust Score
      const ownerUser = await tx.user.findUnique({ where: { id: ownerUserId } });
      if (ownerUser) {
        const newScore = Math.max(0, ownerUser.trustScore + LATE_CANCEL_TRUST_PENALTY);
        await tx.user.update({
          where: { id: ownerUserId },
          data: { trustScore: newScore },
        });

        await tx.trustHistory.create({
          data: {
            userId: ownerUserId,
            bookingId: booking.id,
            scoreChange: LATE_CANCEL_TRUST_PENALTY,
            reason: `Late owner cancellation penalty for booking #${booking.bookingCode}`,
            newScore: newScore,
          },
        });
      }
    }

    // 3. Update Booking
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CancelledByOwner",
        cancellationReason: reason,
        cancelledByUserId: ownerUserId,
        penaltyAmount: penaltyAmount,
      },
    });

    // 4. Create Notification for Driver
    await tx.notification.create({
      data: {
        userId: booking.driverId,
        title: "Booking Cancelled by Owner",
        message: `Owner cancelled booking #${booking.bookingCode}. ${isPenaltyApplicable ? "₹10 penalty assessed to owner." : "Free cancellation within grace period."}`,
        type: "BOOKING_UPDATE",
        actionUrl: `/bookings/${booking.id}`,
      },
    });
  });

  return { success: true, penaltyAmount, isPenaltyApplicable };
}
