import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const count = await prisma.mARLog.count()
  console.log('MARLog count:', count)
  try {
    const bspCount = await prisma.behaviourSupportPlan.count()
    console.log('BehaviourSupportPlan count:', bspCount)
  } catch (e) {
    console.error('BehaviourSupportPlan count error:', e.message)
  }
}
main().finally(() => prisma.$disconnect())
