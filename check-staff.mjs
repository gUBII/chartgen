import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const staff = await prisma.staff.findMany({
  select: { id: true, displayName: true, role: true, workerNumber: true },
  orderBy: { createdAt: "desc" },
  take: 10,
});
console.log("Staff records in database:");
staff.forEach(s => console.log(`  ${s.displayName} (${s.role}) - ${s.id}`));
await prisma.$disconnect();
