import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFull } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const slotType = searchParams.get("slotType");
    const maxPrice = searchParams.get("maxPrice");
    const search = searchParams.get("search");

    const whereClause: any = {
      isAvailable: true,
    };

    if (city) {
      whereClause.city = { contains: city };
    }

    if (slotType) {
      whereClause.slotType = slotType;
    }

    if (maxPrice) {
      whereClause.ratePerHour = { lte: parseFloat(maxPrice) };
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { address: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const listings = await prisma.parkingListing.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            trustScore: true,
            phone: true,
            upiId: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedListings = listings.map((item) => {
      const avgRating =
        item.reviews.length > 0
          ? item.reviews.reduce((acc, r) => acc + r.rating, 0) / item.reviews.length
          : 5.0;

      return {
        ...item,
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews: item.reviews.length,
      };
    });

    return NextResponse.json({ listings: formattedListings });
  } catch (error) {
    console.error("Fetch Listings API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFull();
    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only verified owners can create parking listings" }, { status: 403 });
    }

    if (user.hasOutstandingPenalty) {
      return NextResponse.json(
        {
          error: `Outstanding penalty of ₹${user.totalOutstandingAmount} must be paid before creating new parking listings.`,
          penaltyBlocked: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, address, city, state, pincode, latitude, longitude, ratePerHour, ratePerDay, slotType, totalSlots, isCovered, hasCctv, hasSecurityGuard, upiId, imageFile } = body;

    if (!title || !address || !city || !state || !pincode || !ratePerHour || !upiId) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Current location (latitude and longitude) is required." }, { status: 400 });
    }

    if (!imageFile) {
      return NextResponse.json({ error: "Parking space image is required." }, { status: 400 });
    }

    let imageUrl = null;
    if (imageFile) {
      // Basic base64 to file conversion
      try {
        const base64Data = imageFile.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `parking-${Date.now()}.jpg`;
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
        fs.writeFileSync(filePath, buffer);
        imageUrl = `/uploads/${filename}`;
      } catch (err) {
        console.error("Error saving image:", err);
        return NextResponse.json({ error: "Failed to save image." }, { status: 500 });
      }
    }

    const newListing = await prisma.parkingListing.create({
      data: {
        ownerId: user.id,
        title,
        description,
        address,
        city,
        state,
        pincode,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        ratePerHour: parseFloat(ratePerHour),
        ratePerDay: ratePerDay ? parseFloat(ratePerDay) : null,
        slotType: slotType || "CAR_4W",
        totalSlots: parseInt(totalSlots) || 1,
        availableSlots: parseInt(totalSlots) || 1,
        isCovered: Boolean(isCovered),
        hasCctv: Boolean(hasCctv),
        hasSecurityGuard: Boolean(hasSecurityGuard),
        upiId,
        imageUrl,
      },
    });

    return NextResponse.json({ success: true, listing: newListing });
  } catch (error) {
    console.error("Create Listing API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
