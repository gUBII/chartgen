import { Prisma } from "@prisma/client";

export type PrismaApiError = {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export function mapPrismaApiError(error: unknown): PrismaApiError | null {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      code: "DATABASE_UNAVAILABLE",
      message: "Database is not reachable. Check DATABASE_URL and runtime network access.",
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2028") {
      return {
        status: 503,
        code: "DATABASE_TRANSACTION_EXPIRED",
        message: "Database transaction expired during request processing. Retry with a narrower range.",
        details: { prismaCode: error.code },
      };
    }

    if (error.code === "P2021" || error.code === "P2022") {
      return {
        status: 503,
        code: "SCHEMA_NOT_READY",
        message: "Database schema is missing required table/column for this endpoint.",
        details: { prismaCode: error.code },
      };
    }

    if (error.code === "P1000") {
      return {
        status: 503,
        code: "DATABASE_AUTH_FAILED",
        message: "Database authentication failed. Verify deployment credentials.",
        details: { prismaCode: error.code },
      };
    }

    if (error.code === "P1001") {
      return {
        status: 503,
        code: "DATABASE_UNAVAILABLE",
        message: "Database host is unreachable from this runtime.",
        details: { prismaCode: error.code },
      };
    }

    if (error.code === "P1012") {
      return {
        status: 500,
        code: "DATABASE_CONFIG_INVALID",
        message: "Database environment configuration is invalid.",
        details: { prismaCode: error.code },
      };
    }

    if (error.code === "P2002") {
      return {
        status: 409,
        code: "CONSTRAINT_CONFLICT",
        message: "Unique constraint conflict detected.",
        details: { prismaCode: error.code },
      };
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      status: 500,
      code: "DATABASE_UNKNOWN_ERROR",
      message: "An unknown database error occurred. Check server logs for details.",
    };
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      status: 500,
      code: "DATABASE_RUNTIME_PANIC",
      message: "Prisma runtime panic occurred while processing the request.",
    };
  }

  return null;
}
