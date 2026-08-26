import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { hashPassword } from "../_core/passwords";
import { adminProcedure, router } from "../_core/trpc";
import { createAdminUser, deleteUserById, getAllUsers, updateUserAccess, updateUserPassword, updateUserRole } from "../db";

const CreateAdminUserInput = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin"]).default("user"),
});

const UpdateUserRoleInput = z.object({
  userId: z.number().int().positive(),
  role: z.enum(["user", "admin"]),
});

const ResetPasswordInput = z.object({
  userId: z.number().int().positive(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const UpdateUserAccessInput = z.object({
  userId: z.number().int().positive(),
  accessEnabled: z.boolean(),
});

const DeleteUserInput = z.object({
  userId: z.number().int().positive(),
});

export const adminUsersRouter = router({
  list: adminProcedure.query(async () => {
    const users = await getAllUsers();
    return users.map(user => ({
      id: user.id,
      openId: user.openId,
      name: user.name,
      email: user.email,
      loginMethod: user.loginMethod,
      role: user.role,
      accessEnabled: user.accessEnabled !== 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastSignedIn: user.lastSignedIn,
    }));
  }),

  createUser: adminProcedure
    .input(CreateAdminUserInput)
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const user = await createAdminUser({
        openId: `password:${email}`,
        name: input.name.trim(),
        email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        loginMethod: "password",
      });

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create user",
        });
      }

      return user;
    }),

  updateRole: adminProcedure
    .input(UpdateUserRoleInput)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId && input.role === "user") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove your own admin role",
        });
      }

      const user = await updateUserRole(input.userId, input.role);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  setAccessEnabled: adminProcedure
    .input(UpdateUserAccessInput)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId && !input.accessEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "คุณไม่สามารถปิดสิทธิ์บัญชีตัวเองได้",
        });
      }

      const user = await updateUserAccess(input.userId, input.accessEnabled);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  resetPassword: adminProcedure
    .input(ResetPasswordInput)
    .mutation(async ({ input }) => {
      const user = await updateUserPassword(input.userId, await hashPassword(input.password));
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return { success: true, userId: user.id };
    }),

  deleteUser: adminProcedure
    .input(DeleteUserInput)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account",
        });
      }

      const deleted = await deleteUserById(input.userId);
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return { success: true, userId: input.userId };
    }),
});
