import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      roleCode?: string;
    };
  }

  interface User {
    id?: string;
    accessToken?: string;
    role?: string;
    roleCode?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    role?: string;
    roleCode?: string;
  }
}
