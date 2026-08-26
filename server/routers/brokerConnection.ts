import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  deleteBrokerConnectionForUser,
  getBrokerConnectionForUser,
  updateBrokerConnectionStatus,
  upsertBrokerConnection,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import {
  decryptSettradeCredentials,
  encryptSettradeCredentials,
  isBrokerCredentialEncryptionConfigured,
  maskAppId,
  validateSettradeConnection,
} from "../services/settradeBrokerConnectionService";

function toSafeConnection(connection: Awaited<ReturnType<typeof getBrokerConnectionForUser>>) {
  if (!connection) return null;
  return {
    provider: connection.provider,
    brokerId: connection.brokerId,
    appCode: connection.appCode,
    appIdHint: connection.appIdHint,
    status: connection.status,
    lastCheckedAt: connection.lastCheckedAt,
    lastError: connection.lastError,
    updatedAt: connection.updatedAt,
    secretStored: Boolean(connection.encryptedAppSecret),
  };
}

const connectionInput = z.object({
  brokerId: z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9_-]+$/),
  appCode: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  appId: z.string().trim().min(5).max(255),
  appSecret: z.string().trim().min(32).max(512),
});

export const brokerConnectionRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => ({
    encryptionReady: isBrokerCredentialEncryptionConfigured(),
    persistenceReady: Boolean(process.env.DATABASE_URL),
    connection: toSafeConnection(await getBrokerConnectionForUser(ctx.user.id)),
  })),

  save: protectedProcedure.input(connectionInput).mutation(async ({ ctx, input }) => {
    if (!isBrokerCredentialEncryptionConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "ระบบยังไม่ได้ตั้งค่า encryption key สำหรับเก็บข้อมูลเชื่อมต่ออย่างปลอดภัย",
      });
    }
    if (!process.env.DATABASE_URL) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "ระบบยังไม่ได้ตั้งค่าฐานข้อมูลถาวร จึงไม่รับ API credentials ของลูกค้า",
      });
    }

    const connection = await upsertBrokerConnection(ctx.user.id, {
      provider: "settrade",
      brokerId: input.brokerId,
      appCode: input.appCode,
      appIdHint: maskAppId(input.appId),
      encryptedAppSecret: encryptSettradeCredentials({ appId: input.appId, appSecret: input.appSecret }),
      status: "configured",
      lastCheckedAt: null,
      lastError: null,
    });

    return toSafeConnection(connection);
  }),

  verify: protectedProcedure.mutation(async ({ ctx }) => {
    const connection = await getBrokerConnectionForUser(ctx.user.id);
    if (!connection) {
      throw new TRPCError({ code: "NOT_FOUND", message: "ยังไม่ได้เชื่อมต่อโบรกเกอร์" });
    }

    try {
      const credentials = decryptSettradeCredentials(connection.encryptedAppSecret);
      await validateSettradeConnection({
        brokerId: connection.brokerId,
        appCode: connection.appCode,
        appId: credentials.appId,
        appSecret: credentials.appSecret,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection check failed";
      await updateBrokerConnectionStatus(ctx.user.id, {
        status: "error",
        lastCheckedAt: new Date(),
        lastError: "ไม่สามารถยืนยันการเชื่อมต่อกับ Settrade ได้ กรุณาตรวจ broker ID, app code และ credentials",
      });
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${message}. กรุณาตรวจข้อมูลใน Settrade API Portal`,
      });
    }

    const updated = await updateBrokerConnectionStatus(ctx.user.id, {
      status: "verified",
      lastCheckedAt: new Date(),
      lastError: null,
    });
    return toSafeConnection(updated);
  }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteBrokerConnectionForUser(ctx.user.id);
    return { success: true };
  }),
});
