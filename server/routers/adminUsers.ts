import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { createAdminUser, getAllUsers, updateUserRole } from "../db";

const CreateAdminUserInput = z.object({
  openId: z.string().min(3, "OpenID is required"),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

const UpdateUserRoleInput = z.object({
  userId: z.number().int().positive(),
  role: z.enum(["user", "admin"]),
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastSignedIn: user.lastSignedIn,
    }));
  }),

  createAdmin: adminProcedure
    .input(CreateAdminUserInput)
    .mutation(async ({ input }) => {
      const user = await createAdminUser({
        openId: input.openId.trim(),
        name: input.name?.trim() || null,
        email: input.email?.trim() || null,
      });

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create admin user",
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
});
