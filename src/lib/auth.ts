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
