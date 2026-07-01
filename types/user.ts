export const userTypes = ["member", "admin"] as const;

export type UserType = (typeof userTypes)[number];

export const authProviders = ["email", "google", "telegram"] as const;

export type AuthProvider = (typeof authProviders)[number];

export type User = {
  id: string;
  name: string;
  type: UserType;
  createdAt: Date;
  updatedAt: Date;
};

export type UserAuthMethod = {
  id: string;
  userId: User["id"];
  provider: AuthProvider;
  providerUserId: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export type CreateUserInput = {
  name: string;
  type?: UserType;
};

export type CreateUserAuthMethodInput = {
  userId: User["id"];
  provider: AuthProvider;
  providerUserId: string;
};

export type UpdateUserInput = Partial<Pick<User, "name" | "type">>;
