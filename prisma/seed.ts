import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('adminpass', 10)
  const student1Password = await bcrypt.hash('password123', 10)
  const student2Password = await bcrypt.hash('password456', 10)

  await prisma.user.upsert({
    where: { identifier: 'admin01' },
    update: {},
    create: {
      identifier: 'admin01',
      name: 'Super Admin',
      passwordHash: adminPassword,
      role: 'ADMIN'
    }
  })

  await prisma.user.upsert({
    where: { identifier: 'stu101' },
    update: {},
    create: {
      identifier: 'stu101',
      name: 'Ashiqur Rahman',
      passwordHash: student1Password,
      role: 'STUDENT',
      profile: {
        create: { targetUniversity: 'BUET' }
      }
    }
  })

  await prisma.user.upsert({
    where: { identifier: 'stu102' },
    update: {},
    create: {
      identifier: 'stu102',
      name: 'Tania Akter',
      passwordHash: student2Password,
      role: 'STUDENT',
      profile: {
        create: { targetUniversity: 'Dhaka Medical College' }
      }
    }
  })

  console.log('Seeding finished successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
