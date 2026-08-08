import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFull } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUserFull();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const [
      totalUsers,
      totalOwners,
      totalDrivers,
      totalListings,
      totalBookings,
      totalPenalties,
      outstandingPenalties,
      totalDisputes,
      recentBookings,
      allDisputes,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "OWNER" } }),
      prisma.user.count({ where: { role: "DRIVER" } }),
      prisma.parkingListing.count(),
      prisma.booking.count(),
      prisma.penaltyLedger.count(),
      prisma.penaltyLedger.count({ where: { status: "OUTSTANDING" } }),
      prisma.dispute.count(),
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { driver: true, owner: true, listing: true },
      }),
      prisma.dispute.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { booking: { include: { driver: true, owner: true } }, raisedByUser: true },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalOwners,
        totalDrivers,
        totalListings,
        totalBookings,
        totalPenalties,
        outstandingPenalties,
        totalDisputes,
      },
      recentBookings,
      allDisputes,
    });
  } catch (error) {
    console.error("Admin Stats API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
