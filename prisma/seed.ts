import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  await prisma.subject.upsert({
    where: { id: 'physics-1' },
    update: {},
    create: {
      id: 'physics-1',
      name: 'Physics 1st Paper',
      isDefault: true,
      chapters: {
        create: [
          { name: 'Physical World and Measurement', isDefault: true, order: 1 },
          { name: 'Vector', isDefault: true, order: 2 },
        ]
      }
    }
  })

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
