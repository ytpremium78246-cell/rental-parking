const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Database Seeding for Parking India...");

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.trustHistory.deleteMany();
  await prisma.review.deleteMany();
  await prisma.paymentConfirmation.deleteMany();
  await prisma.penaltyLedger.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.parkingListing.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const ownerPasswordHash = await bcrypt.hash("Owner@123", 10);
  const driverPasswordHash = await bcrypt.hash("Driver@123", 10);

  // 1. Create Admin
  await prisma.user.create({
    data: {
      phone: "9876543210",
      email: "admin@example.com",
      name: "Super Admin",
      role: "ADMIN",
      passwordHash: passwordHash,
      trustScore: 100,
      isVerified: true,
      upiId: "admin@upi",
    },
  });

  // 2. Create 2 Land Owners with 3 listings each
  
  // Land Owner 1
  await prisma.user.create({
    data: {
      phone: "9810000001",
      email: "owner1@example.com",
      name: "Ramesh (Parking Owner 1)",
      role: "OWNER",
      passwordHash: ownerPasswordHash,
      trustScore: 100,
      isVerified: true,
      upiId: "owner1@upi",
      profile: {
        create: {
          address: "B-42, Connaught Place",
          city: "New Delhi",
          state: "Delhi",
          pincode: "110001",
          bio: "Verified commercial & residential spot owner in CP Delhi.",
        },
      },
      ownedListings: {
        create: [
          {
            title: "Safe Covered Parking near CP Metro",
            description: "24/7 guarded parking with CCTV.",
            address: "B-42, Connaught Place",
            city: "New Delhi",
            state: "Delhi",
            pincode: "110001",
            latitude: 28.6328,
            longitude: 77.2197,
            ratePerHour: 50.0,
            ratePerDay: 400.0,
            slotType: "CAR_4W",
            totalSlots: 2,
            availableSlots: 2,
            isCovered: true,
            hasCctv: true,
            hasSecurityGuard: true,
            upiId: "owner1@upi",
            isAvailable: true,
            imageUrl: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=600&auto=format&fit=crop",
          },
          {
            title: "Premium EV Charging Spot CP",
            description: "Covered spot with EV charging plug.",
            address: "B-42, Connaught Place",
            city: "New Delhi",
            state: "Delhi",
            pincode: "110001",
            latitude: 28.6330,
            longitude: 77.2199,
            ratePerHour: 60.0,
            ratePerDay: 500.0,
            slotType: "EV_4W",
            totalSlots: 1,
            availableSlots: 1,
            isCovered: true,
            hasCctv: true,
            hasSecurityGuard: true,
            upiId: "owner1@upi",
            isAvailable: true,
            imageUrl: "https://images.unsplash.com/photo-1662970711974-5fc98fb0da46?q=80&w=600&auto=format&fit=crop",
          },
          {
            title: "Quick Access Bike Parking CP",
            description: "Safe bike parking area, completely shaded.",
            address: "B-42, Connaught Place",
            city: "New Delhi",
            state: "Delhi",
            pincode: "110001",
            latitude: 28.6329,
            longitude: 77.2198,
            ratePerHour: 20.0,
            ratePerDay: 150.0,
            slotType: "BIKE_2W",
            totalSlots: 5,
            availableSlots: 5,
            isCovered: true,
            hasCctv: true,
            hasSecurityGuard: false,
            upiId: "owner1@upi",
            isAvailable: true,
            imageUrl: "https://images.unsplash.com/photo-1621379434823-3b608da1e2d9?q=80&w=600&auto=format&fit=crop",
          }
        ],
      }
    },
  });

  // Land Owner 2
  await prisma.user.create({
    data: {
      phone: "9810000002",
      email: "owner2@example.com",
      name: "Suresh (Parking Owner 2)",
      role: "OWNER",
      passwordHash: ownerPasswordHash,
      trustScore: 98,
      isVerified: true,
      upiId: "owner2@upi",
      profile: {
        create: {
          address: "Sector 14, Main Road",
          city: "Gurugram",
          state: "Haryana",
          pincode: "122001",
          bio: "Independent private spot owner in Gurugram.",
        },
      },
      ownedListings: {
        create: [
          {
            title: "Open Driveway in Sector 14",
            description: "Spacious parking for large SUVs.",
            address: "Sector 14, Main Road",
            city: "Gurugram",
            state: "Haryana",
            pincode: "122001",
            latitude: 28.4595,
            longitude: 77.0266,
            ratePerHour: 40.0,
            ratePerDay: 300.0,
            slotType: "CAR_4W",
            totalSlots: 1,
            availableSlots: 1,
            isCovered: false,
            hasCctv: false,
            hasSecurityGuard: false,
            upiId: "owner2@upi",
            isAvailable: true,
            imageUrl: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?q=80&w=600&auto=format&fit=crop",
          },
          {
            title: "Corner Covered Plot Sector 14",
            description: "Shaded corner plot, good for sedans.",
            address: "Sector 14, Main Road",
            city: "Gurugram",
            state: "Haryana",
            pincode: "122001",
            latitude: 28.4600,
            longitude: 77.0270,
            ratePerHour: 45.0,
            ratePerDay: 350.0,
            slotType: "CAR_4W",
            totalSlots: 2,
            availableSlots: 2,
            isCovered: true,
            hasCctv: true,
            hasSecurityGuard: false,
            upiId: "owner2@upi",
            isAvailable: true,
            imageUrl: "https://images.unsplash.com/photo-1582294157778-f076110f0fbf?q=80&w=600&auto=format&fit=crop",
          },
          {
            title: "EV 2-Wheeler charging spot",
            description: "Dedicated electric scooter charging point.",
            address: "Sector 14, Main Road",
            city: "Gurugram",
            state: "Haryana",
            pincode: "122001",
            latitude: 28.4598,
            longitude: 77.0268,
            ratePerHour: 25.0,
            ratePerDay: 200.0,
            slotType: "EV_2W",
            totalSlots: 2,
            availableSlots: 2,
            isCovered: true,
            hasCctv: false,
            hasSecurityGuard: false,
            upiId: "owner2@upi",
            isAvailable: true,
            imageUrl: "https://images.unsplash.com/photo-1576722880198-d1a2fc08fdd9?q=80&w=600&auto=format&fit=crop",
          }
        ],
      }
    },
  });

  // 4. Create 5 Car Owners (Drivers)
  for (let i = 1; i <= 5; i++) {
    await prisma.user.create({
      data: {
        phone: \`999000000\${i}\`,
        email: \`carowner\${i}@example.com\`,
        name: \`Car Owner \${i}\`,
        role: "DRIVER",
        passwordHash: driverPasswordHash,
        trustScore: 100,
        isVerified: true,
        profile: {
          create: {
            vehicleNumber: \`DL 01 AB 123\${i}\`,
            vehicleType: "CAR_4W",
          },
        },
      },
    });
  }

  console.log("✅ Seeding completed! Database is reset with exactly 8 users and 6 listings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
