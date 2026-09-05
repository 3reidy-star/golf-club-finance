import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(6),
});

export const {
  auth,
  signIn,
  signOut,
  handlers,
} = NextAuth({
  ...authConfig,

  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      credentials: {
        username: {
          label: "Username",
          type: "text",
        },

        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const parsed =
          credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const username =
          parsed.data.username.toLowerCase();

        const user = await prisma.user.findFirst({
          where: {
            username: {
              equals: username,
              mode: "insensitive",
            },

            active: true,
          },

          include: {
            sectionMembers: {
              include: {
                section: true,
              },
            },
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordMatches =
          await bcrypt.compare(
            parsed.data.password,
            user.passwordHash,
          );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,

          name:
            user.name ??
            user.username ??
            user.email,

          email: user.email,

          role: user.role,

          sectionCodes:
            user.sectionMembers.map(
              (membership) =>
                membership.section.code,
            ),
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        token.role = (
          user as typeof user & {
            role: string;
          }
        ).role;

        token.sectionCodes = (
          user as typeof user & {
            sectionCodes: string[];
          }
        ).sectionCodes;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);

        session.user.role = String(token.role);

        session.user.sectionCodes =
          Array.isArray(token.sectionCodes)
            ? token.sectionCodes.map(String)
            : [];
      }

      return session;
    },

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);

      if (nextUrl.pathname === "/login") {
        return true;
      }

      return isLoggedIn;
    },
  },
});