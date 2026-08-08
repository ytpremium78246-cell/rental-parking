import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, password, role, vehicleNumber, vehicleType, address, upiId } = body;

    if (!name || !phone || !password || !role) {
      return NextResponse.json({ error: "Name, Phone, Password, and Role are required" }, { status: 400 });
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return NextResponse.json({ error: "Phone number is already registered" }, { status: 400 });
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json({ error: "Email address is already registered" }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        phone,
        email: email || null,
        role: role.toUpperCase(),
        passwordHash,
        trustScore: 100,
        upiId: upiId || null,
        profile: {
          create: {
            vehicleNumber: vehicleNumber || null,
            vehicleType: vehicleType || null,
            address: address || null,
          },
        },
      },
    });

    const token = await signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
      phone: newUser.phone,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        trustScore: newUser.trustScore,
      },
    });

    response.cookies.set("parking_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
