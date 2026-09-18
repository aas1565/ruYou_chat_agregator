import { api } from "@/lib/api/client";
import type { PublicUser } from "@/lib/types";

export function login(email: string, password: string) {
  return api<{ user: PublicUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export function getMe() {
  return api<{ user: PublicUser }>("/api/auth/me");
}
