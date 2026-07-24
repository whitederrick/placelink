import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { ensureAuthenticatedUser, loadDevelopmentUser } from "@/features/auth";
import { webEnv } from "@/lib/env";

const providers: NextAuthConfig["providers"] = [];

if (webEnv.AUTH_KAKAO_ID && webEnv.AUTH_KAKAO_SECRET) {
  providers.push(
    Kakao({
      clientId: webEnv.AUTH_KAKAO_ID,
      clientSecret: webEnv.AUTH_KAKAO_SECRET,
    }),
  );
}
if (webEnv.AUTH_GOOGLE_ID && webEnv.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: webEnv.AUTH_GOOGLE_ID,
      clientSecret: webEnv.AUTH_GOOGLE_SECRET,
    }),
  );
}
if (webEnv.NODE_ENV !== "production") {
  const developmentUsers = [
    {
      providerId: "development-user-jihoon",
      userId: "seed-user-jihoon",
      label: "지훈",
    },
    {
      providerId: "development-user-minji",
      userId: "seed-user-minji",
      label: "민지",
    },
  ] as const;
  for (const developmentUser of developmentUsers) {
    providers.push(
      Credentials({
        id: developmentUser.providerId,
        name: `Development User — ${developmentUser.label}`,
        credentials: {},
        async authorize() {
          const user = await loadDevelopmentUser(developmentUser.userId);
          return user?.status === "ACTIVE"
            ? { id: user.id, name: user.nickname }
            : null;
        },
      }),
    );
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret:
    webEnv.AUTH_SECRET ??
    (webEnv.NODE_ENV === "production"
      ? undefined
      : "placelink-development-secret-2026"),
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false;
      if (account.provider.startsWith("development-user-")) return true;
      const provider =
        account.provider === "kakao"
          ? "KAKAO"
          : account.provider === "google"
            ? "GOOGLE"
            : null;
      if (!provider) return false;
      const authenticatedUser = await ensureAuthenticatedUser({
        provider,
        externalId: account.providerAccountId,
        nickname: user.name?.trim() || "place-link user",
      });
      user.id = authenticatedUser.id;
      return authenticatedUser.status === "ACTIVE";
    },
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === "string")
        session.user.id = token.userId;
      return session;
    },
  },
});
