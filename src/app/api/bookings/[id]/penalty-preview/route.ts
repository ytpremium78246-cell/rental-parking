import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFull } from "@/lib/auth";
import { OWNER_GRACE_PERIOD_MINS, DRIVER_FREE_CANCELLATION_MINS } from "@/lib/constants";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUserFull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const actor = searchParams.get("actor");
    
    if (actor !== "OWNER" && actor !== "DRIVER") {
      return NextResponse.json({ error: "Invalid actor" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const now = new Date();
    let penaltyAmount = 0;
    let isPenaltyApplicable = false;

    if (actor === "OWNER") {
      const acceptedAt = booking.updatedAt || booking.createdAt;
      const minutesSinceAcceptance = (now.getTime() - new Date(acceptedAt).getTime()) / (1000 * 60);
      const hasTimerStarted = !!booking.timerStartedAt;
      isPenaltyApplicable = hasTimerStarted || (minutesSinceAcceptance > OWNER_GRACE_PERIOD_MINS);

      if (isPenaltyApplicable) {
        if (hasTimerStarted) {
          penaltyAmount = booking.amount * 2;
        } else {
          // Calculate progressive penalty
          const lastPenalty = await prisma.penaltyLedger.findFirst({
            where: {
              userId: user.id,
              reason: { contains: "Owner cancelled booking" },
            },
            orderBy: { createdAt: "desc" },
          });

          let currentPenalty = lastPenalty ? lastPenalty.amount : 0;
          let nextPenalty = 10;
          if (currentPenalty > 0) {
            if ((currentPenalty * 0.20) < 10) {
              nextPenalty = currentPenalty + 10;
            } else {
              nextPenalty = currentPenalty * 1.20;
            }
          }
          penaltyAmount = Math.round(nextPenalty * 100) / 100;
        }
      }
    } else if (actor === "DRIVER") {
      if (booking.status === "Accepted") {
        const acceptedAt = booking.updatedAt || booking.createdAt;
        const minutesSinceAcceptance = (now.getTime() - new Date(acceptedAt).getTime()) / (1000 * 60);
        isPenaltyApplicable = minutesSinceAcceptance > DRIVER_FREE_CANCELLATION_MINS;

        if (isPenaltyApplicable) {
          const lastPenalty = await prisma.penaltyLedger.findFirst({
            where: {
              userId: user.id,
              reason: { contains: "Driver cancelled booking" },
            },
            orderBy: { createdAt: "desc" },
          });

          let currentPenalty = lastPenalty ? lastPenalty.amount : 0;
          let nextPenalty = 10;
          if (currentPenalty > 0) {
            if ((currentPenalty * 0.20) < 10) {
              nextPenalty = currentPenalty + 10;
            } else {
              nextPenalty = currentPenalty * 1.20;
            }
          }
          penaltyAmount = Math.round(nextPenalty * 100) / 100;
        }
      }
    }

    return NextResponse.json({ penaltyAmount, isPenaltyApplicable });
  } catch (error) {
    console.error("Preview Penalty Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
