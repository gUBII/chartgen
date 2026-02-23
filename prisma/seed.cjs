const { PrismaClient, StaffRole } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const supervisor = await prisma.staff.upsert({
    where: { workerNumber: "SUP-001" },
    update: {
      id: "32213",
      displayName: "Sarah Supervisor",
      role: StaffRole.SUPERVISOR,
    },
    create: {
      id: "32213",
      workerNumber: "SUP-001",
      displayName: "Sarah Supervisor",
      role: StaffRole.SUPERVISOR,
    },
  });

  const participant = await prisma.participant.upsert({
    where: { id: "112334" },
    update: {
      fullName: "John Doe",
      externalReference: "NDIS-PART-001",
      defaultFoodTexture: 5,
      defaultFluidThickness: 2,
    },
    create: {
      id: "112334",
      fullName: "John Doe",
      externalReference: "NDIS-PART-001",
      defaultFoodTexture: 5,
      defaultFluidThickness: 2,
    },
  });

  console.log({
    supervisor: {
      id: supervisor.id,
      workerNumber: supervisor.workerNumber,
      role: supervisor.role,
    },
    participant: {
      id: participant.id,
      fullName: participant.fullName,
      defaultFoodTexture: participant.defaultFoodTexture,
      defaultFluidThickness: participant.defaultFluidThickness,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
