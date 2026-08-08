import { NextResponse } from "next/server";
import { getCurrentUserFull } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUserFull();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        trustScore: user.trustScore,
        upiId: user.upiId,
        hasOutstandingPenalty: user.hasOutstandingPenalty,
        isPenaltyBlocked: user.hasOutstandingPenalty,
        totalOutstandingAmount: user.totalOutstandingAmount,
        outstandingPenalties: user.outstandingPenalties,
        incomingPenalties: user.incomingPenalties,
        falsePaymentWarnings: user.falsePaymentWarnings,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("Auth Me API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
