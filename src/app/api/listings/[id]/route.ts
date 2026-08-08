import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFull } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUserFull();
    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const listingId = params.id;
    const body = await request.json();

    const existingListing = await prisma.parkingListing.findUnique({
      where: { id: listingId },
    });

    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (existingListing.ownerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "You can only update your own listings" }, { status: 403 });
    }

    const updatedListing = await prisma.parkingListing.update({
      where: { id: listingId },
      data: {
        ...body,
        ratePerHour: body.ratePerHour ? parseFloat(body.ratePerHour) : existingListing.ratePerHour,
        isAvailable: body.isAvailable !== undefined ? Boolean(body.isAvailable) : existingListing.isAvailable,
      },
    });

    return NextResponse.json({ success: true, listing: updatedListing });
  } catch (error) {
    console.error("Update Listing API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUserFull();
    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const listingId = params.id;

    const existingListing = await prisma.parkingListing.findUnique({
      where: { id: listingId },
    });

    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (existingListing.ownerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "You can only delete your own listings" }, { status: 403 });
    }

    await prisma.parkingListing.delete({
      where: { id: listingId },
    });

    return NextResponse.json({ success: true, message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Delete Listing API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
