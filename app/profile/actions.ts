"use server";

import { updateUserSchema } from "@/lib/schemas/user.schema";
import type { z } from "zod";

type UpdateUserInput = z.infer<typeof updateUserSchema>;

type ActionResult = {
  success: boolean;
  message: string;
};

// Replace with a real DB call (e.g., Prisma, Drizzle) in production.
export async function updateProfileAction(
  _prevState: ActionResult,
  data: UpdateUserInput,
): Promise<ActionResult> {
  const parsed = updateUserSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid input. Please check your fields.",
    };
  }

  // Placeholder: persist parsed.data to the database here.
  return { success: true, message: "Profile updated successfully." };
}
