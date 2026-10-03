import { PrismaClient } from '@prisma/client'

/**
 * A single Prisma client is reused across hot reloads in development,
 * otherwise Next.js would open a new connection pool on every change.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
