import {prisma} from "@/lib/prisma";
import type {Prisma} from "@/generated/prisma/client";

/**
 * Transactions belong to repositories (ADR-0014).
 *
 * A service never opens a transaction: it builds a pure *posting plan* with a
 * domain calculator and hands it to one repository method, which writes every
 * row in a single `withTransaction` call. This keeps services free of Prisma
 * and makes the multi-row invariants (one lot and one movement per receipt
 * line, a batch completion with inputs, outputs, movements and a snapshot)
 * atomic and testable.
 */
export type TransactionClient = Prisma.TransactionClient;

export function withTransaction<T>(
  work: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(work);
}
