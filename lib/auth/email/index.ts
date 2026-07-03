import type { AuthProvider, CreateUserAuthMethodInput, User } from "@/types/user";

export const emailAuthProvider = "email" satisfies AuthProvider;

export function normalizeEmailProviderUserId(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmailProviderUserId(providerUserId: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providerUserId);
}

export function createEmailProviderUserId(email: string) {
  const providerUserId = normalizeEmailProviderUserId(email);

  if (!isValidEmailProviderUserId(providerUserId)) {
    throw new Error("Invalid email address");
  }

  return providerUserId;
}

export function createEmailAuthMethodInput(
  userId: User["id"],
  email: string,
): CreateUserAuthMethodInput {
  return {
    userId,
    provider: emailAuthProvider,
    providerUserId: createEmailProviderUserId(email),
  };
}
