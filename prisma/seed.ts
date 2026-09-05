import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient();

function getPassword(variableName: string) {
  const password = process.env[variableName];

  if (!password) {
    throw new Error(
      `${variableName} is missing from .env`,
    );
  }

  if (password.length < 8) {
    throw new Error(
      `${variableName} must be at least 8 characters.`,
    );
  }

  return password;
}

async function hashPassword(
  variableName: string,
) {
  return bcrypt.hash(
    getPassword(variableName),
    12,
  );
}

async function main() {
  const sections = [
    {
      code: "MENS" as const,
      name: "Men's",
    },
    {
      code: "SENIORS" as const,
      name: "Seniors",
    },
    {
      code: "LADIES" as const,
      name: "Ladies",
    },
    {
      code: "JUNIORS" as const,
      name: "Juniors",
    },
  ];

  const sectionIds = new Map<
    string,
    string
  >();

  for (const section of sections) {
    const savedSection =
      await prisma.section.upsert({
        where: {
          code: section.code,
        },

        update: {
          name: section.name,
          active: true,
          defaultPaymentFee: 0.04,
        },

        create: {
          code: section.code,
          name: section.name,
          active: true,
          defaultPaymentFee: 0.04,
        },
      });

    sectionIds.set(
      section.code,
      savedSection.id,
    );
  }

  const users = [
    {
      username: "admin",
      email: "admin@golfclub.local",
      name: "Administrator",
      role: "ADMIN" as const,
      passwordEnv:
        "SEED_ADMIN_PASSWORD",
      sectionCode: null,
    },

    {
      username: "treasurer",
      email: "craig@example.com",
      name: "Treasurer",
      role: "TREASURER" as const,
      passwordEnv:
        "SEED_TREASURER_PASSWORD",
      sectionCode: null,
    },

    {
      username: "kevin",
      email: "kevin@example.com",
      name: "Kevin",
      role: "TOPUP_ADMIN" as const,
      passwordEnv:
        "SEED_KEVIN_PASSWORD",
      sectionCode: null,
    },

    {
      username: "mens",
      email: "mens@golfclub.local",
      name: "Men's Section",
      role: "SECTION_USER" as const,
      passwordEnv:
        "SEED_MENS_PASSWORD",
      sectionCode: "MENS",
    },

    {
      username: "seniors",
      email: "seniors@golfclub.local",
      name: "Seniors Section",
      role: "SECTION_USER" as const,
      passwordEnv:
        "SEED_SENIORS_PASSWORD",
      sectionCode: "SENIORS",
    },

    {
      username: "ladies",
      email: "ladies@golfclub.local",
      name: "Ladies Section",
      role: "SECTION_USER" as const,
      passwordEnv:
        "SEED_LADIES_PASSWORD",
      sectionCode: "LADIES",
    },

    {
      username: "juniors",
      email: "juniors@golfclub.local",
      name: "Juniors Section",
      role: "SECTION_USER" as const,
      passwordEnv:
        "SEED_JUNIORS_PASSWORD",
      sectionCode: "JUNIORS",
    },
  ];

  for (const userInput of users) {
    const passwordHash =
      await hashPassword(
        userInput.passwordEnv,
      );

    const user =
      await prisma.user.upsert({
        where: {
          email: userInput.email,
        },

        update: {
          username:
            userInput.username,

          name:
            userInput.name,

          role:
            userInput.role,

          active: true,

          passwordHash,
        },

        create: {
          username:
            userInput.username,

          email:
            userInput.email,

          name:
            userInput.name,

          role:
            userInput.role,

          active: true,

          passwordHash,
        },
      });

    await prisma.sectionMember.deleteMany({
      where: {
        userId: user.id,
      },
    });

    if (userInput.sectionCode) {
      const sectionId =
        sectionIds.get(
          userInput.sectionCode,
        );

      if (!sectionId) {
        throw new Error(
          `Unable to find ${userInput.sectionCode} section.`,
        );
      }

      await prisma.sectionMember.create({
        data: {
          userId: user.id,
          sectionId,
        },
      });
    }
  }

  console.log("");
  console.log(
    "Golf club users seeded successfully.",
  );
  console.log("");
  console.log(
    "Available usernames:",
  );
  console.log("  admin");
  console.log("  treasurer");
  console.log("  kevin");
  console.log("  mens");
  console.log("  seniors");
  console.log("  ladies");
  console.log("  juniors");
  console.log("");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });