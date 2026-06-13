import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱  Seeding database...')

  // Clean existing seed data
  await prisma.user.deleteMany({ where: { email: 'test@Noori.dev' } })

  const passwordHash = await bcrypt.hash('Test1234!', 12)

  const user = await prisma.user.create({
    data: {
      email: 'test@Noori.dev',
      passwordHash,
      emailVerified: true,
      account: {
        create: {
          subscription: {
            create: { plan: 'free' },
          },
        },
      },
    },
    include: { account: true },
  })

  console.log('✅  Seed user created:')
  console.log(`    Email:    test@Noori.dev`)
  console.log(`    Password: Test1234!`)
  console.log(`    User ID:  ${user.id}`)
  console.log(`    Account:  ${user.account?.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
