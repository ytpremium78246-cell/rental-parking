import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFull } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { penaltyId, paymentRef } = body;

    const penalties = await prisma.penaltyLedger.findMany({
      where: {
        userId: user.id,
        status: "OUTSTANDING",
      },
    });

    if (penalties.length === 0) {
      return NextResponse.json({ error: "No outstanding penalty found for this user" }, { status: 404 });
    }

    let isDirectPayment = false;

    for (const penalty of penalties) {
      const isDirect = !!penalty.aggrievedUserId;
      if (isDirect) isDirectPayment = true;
      const newStatus = isDirect ? "PENDING_CONFIRMATION" : "PAID";

      await prisma.penaltyLedger.update({
        where: { id: penalty.id },
        data: {
          status: newStatus,
          paymentClaimedAt: new Date(),
          paymentRef: paymentRef || `UPI-PENALTY-${Math.floor(100000 + Math.random() * 900000)}`,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DRIVER_CLAIMED_PENALTY_PAYMENT",
          details: `Penalty ${penalty.id}, Amount: ₹${penalty.amount}`,
        },
      });

      if (isDirect) {
        await prisma.notification.create({
          data: {
            userId: penalty.aggrievedUserId!,
            title: "Penalty Payment Received",
            message: `User confirmed sending ₹${penalty.amount} penalty payment. Please verify and confirm receipt.`,
            type: "PENALTY_ALERT",
          },
        });
      }
    }

    const totalAmount = penalties.reduce((sum, p) => sum + p.amount, 0);

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: isDirectPayment ? "Penalty Payment Sent" : "Penalty Settled! ✅",
        message: isDirectPayment 
          ? `Your penalty payment of ₹${totalAmount} is awaiting confirmation. Restrictions lifted.` 
          : `Your penalty of ₹${totalAmount} has been paid. Account restrictions removed.`,
        type: "SYSTEM",
      },
    });

    return NextResponse.json({
      success: true,
      message: isDirectPayment ? "Penalty payment sent. Full account access restored." : "Penalty settled successfully. Full account access restored.",
    });
  } catch (error) {
    console.error("Penalty Payment API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
