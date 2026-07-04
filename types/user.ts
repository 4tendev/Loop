export const userTypes = ["member", "admin"] as const;

export type UserType = (typeof userTypes)[number];

export const authProviders = ["email", "google", "telegram"] as const;

export type AuthProvider = (typeof authProviders)[number];

export type User = {
  id: string;
  profileImage: string;
  name: string;
  type: UserType;
  createdAt: Date;
  updatedAt: Date;
};

export type ApiUser = Omit<User, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
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
  profileImage?: string;
  type?: UserType;
};

export type CreateUserAuthMethodInput = {
  provider: AuthProvider;
  providerUserId: string;
};

export type UpdateUserInput = Partial<Pick<User, "name" | "type">>;
