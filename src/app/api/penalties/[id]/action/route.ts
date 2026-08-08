import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFull } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUserFull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, reason } = await request.json();
    const penaltyId = params.id;

    const penalty = await prisma.penaltyLedger.findUnique({
      where: { id: penaltyId },
      include: { user: true },
    });

    if (!penalty) {
      return NextResponse.json({ error: "Penalty not found" }, { status: 404 });
    }

    if (penalty.aggrievedUserId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized to perform action on this penalty" }, { status: 403 });
    }

    if (penalty.status !== "PENDING_CONFIRMATION") {
      return NextResponse.json({ error: `Cannot perform action from ${penalty.status} state` }, { status: 400 });
    }

    if (action === "CONFIRM") {
      const updated = await prisma.penaltyLedger.update({
        where: { id: penaltyId },
        data: { 
          status: "PAID",
          paidAt: new Date(),
          paidAmount: penalty.amount, // Set paidAmount
          remainingAmount: 0.0,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "OWNER_CONFIRMED_PENALTY",
          details: `Penalty ${penalty.id} marked as PAID. Amount: ₹${penalty.amount}`,
        },
      });

      await prisma.notification.create({
        data: {
          userId: penalty.userId,
          title: "Penalty Payment Confirmed ✅",
          message: `${user.name} confirmed receipt of your penalty payment.`,
          type: "PENALTY_ALERT",
        },
      });

      return NextResponse.json({ success: true, penalty: updated });
    } else if (action === "DISPUTE") {
      const updated = await prisma.penaltyLedger.update({
        where: { id: penaltyId },
        data: { status: "OUTSTANDING" },
      });

      if (penalty.bookingId) {
        await prisma.dispute.create({
          data: {
            bookingId: penalty.bookingId,
            raisedByUserId: user.id,
            reason: reason || "Penalty payment marked as not received",
            status: "OPEN",
          },
        });
      }

      // 3-strike warning logic for false penalty payments
      const lyingUser = penalty.user;
      const newWarningsCount = (lyingUser.falsePaymentWarnings || 0) + 1;
      
      try {
        await prisma.user.update({
          where: { id: lyingUser.id },
          data: {
            trustScore: { decrement: 3 },
            falsePaymentWarnings: newWarningsCount,
          }
        });
      } catch (err) {
        await prisma.user.update({
          where: { id: lyingUser.id },
          data: { trustScore: { decrement: 3 } }
        });
      }

      if (newWarningsCount >= 3) {
        const doublePenaltyAmount = 2 * penalty.amount;
        await prisma.penaltyLedger.create({
          data: {
            userId: lyingUser.id,
            aggrievedUserId: user.id,
            bookingId: penalty.bookingId,
            amount: doublePenaltyAmount,
            reason: `Falsely claimed payment for penalty. 3rd Strike: Assessed 2x penalty (₹${doublePenaltyAmount.toFixed(2)}).`,
            status: "OUTSTANDING",
          }
        });

        await prisma.notification.create({
          data: {
            userId: lyingUser.id,
            title: "Penalty Payment Disputed / 2x Penalty Assessed ⚠️",
            message: `${user.name} reported they did not receive your penalty payment (Strike ${newWarningsCount}). A 2x penalty of ₹${doublePenaltyAmount.toFixed(2)} was added to your ledger, and trust score reduced by 3.`,
            type: "PENALTY_ALERT",
          },
        });
      } else {
        await prisma.notification.create({
          data: {
            userId: lyingUser.id,
            title: "Penalty Payment Disputed Warning ⚠️",
            message: `${user.name} reported they did not receive your penalty payment. This is warning ${newWarningsCount} of 3. Your trust score was reduced by 3 points.`,
            type: "SYSTEM",
          },
        });
      }

      return NextResponse.json({ success: true, penalty: updated });
    }

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
  } catch (error: any) {
    console.error("Penalty Action API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
