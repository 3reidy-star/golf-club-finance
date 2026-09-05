import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import PayoutForm from "./PayoutForm";

export const dynamic =
  "force-dynamic";

export default async function NewPayoutPage() {
  const session =
    await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user =
    session.user;

  /*
    Kevin should never be on this page.
  */

  if (
    user.role ===
    "TOPUP_ADMIN"
  ) {
    redirect(
      "/payouts/top-ups",
    );
  }

  const sections =
    await prisma.section.findMany({
      where: {
        active: true,

        code: {
          in: [
            "MENS",
            "SENIORS",
            "LADIES",
            "JUNIORS",
          ],
        },
      },

      orderBy: {
        name: "asc",
      },

      select: {
        code: true,
        name: true,
      },
    });

  if (
    user.role ===
    "SECTION_USER"
  ) {
    const sectionCode =
      user.sectionCodes[0];

    if (!sectionCode) {
      throw new Error(
        "This section login has not been assigned to a section.",
      );
    }

    const section =
      sections.find(
        (item) =>
          item.code ===
          sectionCode,
      );

    if (!section) {
      throw new Error(
        "Your section could not be found.",
      );
    }

    return (
      <PayoutForm
        sections={[
          {
            code:
              section.code,
            name:
              section.name,
          },
        ]}
        initialSectionCode={
          section.code
        }
        lockedSection
        sectionName={
          section.name
        }
      />
    );
  }

  /*
    Admin / Treasurer can select
    any section.
  */

  const firstSection =
    sections[0];

  if (!firstSection) {
    throw new Error(
      "No active sections have been configured.",
    );
  }

  return (
    <PayoutForm
      sections={sections.map(
        (section) => ({
          code:
            section.code,
          name:
            section.name,
        }),
      )}
      initialSectionCode={
        firstSection.code
      }
      lockedSection={false}
      sectionName="Golf Club Finance"
    />
  );
}