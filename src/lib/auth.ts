import { cookies } from "next/headers";
import { verifyToken, TokenPayload } from "./jwt";
import { prisma } from "./prisma";

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("parking_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function getCurrentUserFull() {
  const userPayload = await getCurrentUser();
  if (!userPayload) return null;

  const user = await prisma.user.findUnique({
    where: { id: userPayload.userId },
    include: {
      profile: true,
      penalties: {
        where: { status: "OUTSTANDING" },
        include: { aggrievedUser: true },
      },
      penaltiesOwedToMe: {
        where: { status: "PENDING_CONFIRMATION" },
        include: { user: true },
      },
    },
  });

  if (!user || !user.isActive) return null;

  // Lazy escalation: If an owner ignores a penalty payment for > 48h, escalate it.
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const stalePenalties = user.penaltiesOwedToMe.filter(p => p.paymentClaimedAt && p.paymentClaimedAt < fortyEightHoursAgo);
  
  if (stalePenalties.length > 0) {
    try {
      await prisma.penaltyLedger.updateMany({
        where: { id: { in: stalePenalties.map(p => p.id) } },
        data: { status: "ESCALATED" }
      });
      // Remove them from current memory so they don't show up in incoming
      user.penaltiesOwedToMe = user.penaltiesOwedToMe.filter(p => !stalePenalties.includes(p));
    } catch (e) {
      console.error("Failed to escalate penalties:", e);
    }
  }

  const hasOutstandingPenalty = user.penalties.length > 0;
  const totalOutstandingAmount = user.penalties.reduce((sum, p) => sum + p.amount, 0);

  return {
    ...user,
    hasOutstandingPenalty,
    totalOutstandingAmount,
    outstandingPenalties: user.penalties,
    incomingPenalties: user.penaltiesOwedToMe,
  };
}
