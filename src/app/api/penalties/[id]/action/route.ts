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
        data: { status: "PAID" },
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

      await prisma.notification.create({
        data: {
          userId: penalty.userId,
          title: "Penalty Payment Disputed ❌",
          message: `${user.name} reported that they did not receive your penalty payment. Your account is restricted again.`,
          type: "PENALTY_ALERT",
        },
      });

      return NextResponse.json({ success: true, penalty: updated });
    }

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
  } catch (error: any) {
    console.error("Penalty Action API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
