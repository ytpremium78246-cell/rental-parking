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

    let newImageUrl = existingListing.imageUrl;
    if (body.imageFile) {
      // Store the image directly in the database as a base64 data string or HTTP URL.
      // This ensures images persist when deployed on platforms with ephemeral file systems like Render.
      newImageUrl = body.imageFile;
    }

    // Remove imageFile from body before spreading to avoid Prisma schema error
    const { imageFile, ...restBody } = body;

    const updatedListing = await prisma.parkingListing.update({
      where: { id: listingId },
      data: {
        ...restBody,
        ratePerHour: restBody.ratePerHour ? parseFloat(restBody.ratePerHour) : existingListing.ratePerHour,
        totalSlots: restBody.totalSlots ? parseInt(restBody.totalSlots) : existingListing.totalSlots,
        availableSlots: restBody.totalSlots ? parseInt(restBody.totalSlots) : existingListing.availableSlots,
        isAvailable: restBody.isAvailable !== undefined ? Boolean(restBody.isAvailable) : existingListing.isAvailable,
        imageUrl: newImageUrl,
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
