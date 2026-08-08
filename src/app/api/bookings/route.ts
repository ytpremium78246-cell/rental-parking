import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFull } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUserFull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let bookings;
    if (user.role === "ADMIN") {
      bookings = await prisma.booking.findMany({
        include: {
          driver: { select: { id: true, name: true, phone: true, email: true, trustScore: true } },
          owner: { select: { id: true, name: true, phone: true, email: true, upiId: true, trustScore: true } },
          listing: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "OWNER") {
      bookings = await prisma.booking.findMany({
        where: { ownerId: user.id },
        include: {
          driver: { select: { id: true, name: true, phone: true, email: true, trustScore: true } },
          listing: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      bookings = await prisma.booking.findMany({
        where: { driverId: user.id },
        include: {
          owner: { select: { id: true, name: true, phone: true, email: true, upiId: true, trustScore: true } },
          listing: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Fetch Bookings API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFull();
    if (!user) {
      return NextResponse.json({ error: "Please log in to book parking spaces" }, { status: 401 });
    }

    if (user.hasOutstandingPenalty) {
      return NextResponse.json(
        {
          error: `Outstanding penalty of ₹${user.totalOutstandingAmount} must be settled before making new bookings.`,
          penaltyBlocked: true,
        },
        { status: 403 }
      );
    }

    const activeBooking = await prisma.booking.findFirst({
      where: {
        driverId: user.id,
        status: { in: ["Pending", "Accepted"] }
      }
    });

    if (activeBooking) {
      return NextResponse.json(
        {
          error: "You already have an active booking request. Please complete or cancel it before booking another spot.",
          activeBookingBlocked: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { listingId, startTime, endTime, paymentMode, vehicleNumber } = body;

    if (!listingId || !startTime || !endTime || !vehicleNumber) {
      return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
    }

    const listing = await prisma.parkingListing.findUnique({
      where: { id: listingId },
    });

    if (!listing || !listing.isAvailable) {
      return NextResponse.json({ error: "Parking space is no longer available" }, { status: 404 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const totalHours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600)));
    const totalAmount = totalHours * listing.ratePerHour;

    const bookingCode = `PKIN-${Math.floor(10000 + Math.random() * 90000)}`;

    const newBooking = await prisma.booking.create({
      data: {
        bookingCode,
        driverId: user.id,
        ownerId: listing.ownerId,
        listingId: listing.id,
        status: "Pending",
        startTime: start,
        endTime: end,
        totalHours,
        amount: totalAmount,
        vehicleNumber,
        vehicleType: listing.slotType,
        paymentMode: paymentMode || "UPI",
        paymentStatus: "PENDING",
      },
      include: {
        listing: true,
        owner: { select: { id: true, name: true, phone: true, upiId: true } },
      },
    });

    // Send notification to Owner
    await prisma.notification.create({
      data: {
        userId: listing.ownerId,
        title: "New Booking Request!",
        message: `${user.name} requested to book '${listing.title}' for ${totalHours} hrs (₹${totalAmount}).`,
        type: "BOOKING_UPDATE",
        actionUrl: `/bookings/${newBooking.id}`,
      },
    });

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (error) {
    console.error("Create Booking API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
