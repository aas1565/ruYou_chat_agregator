import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Укажите email или логин").max(200),
  password: z.string().min(1, "Укажите пароль").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
