import {
  calculateMensCompetition,
  roundMoney,
} from "@/lib/payoutCalculator";

export type ImportedGolfResult = {
  division: number;
  place: string;
  playerName: string;
  handicap: number;
  nett: number;
  gross: number;
  reportedGross?: number;
};

export type BirdieTwoWinner = {
  playerName: string;
  handicap?: number;
  hole?: string;
};

export type IntelligentGolfImport = {
  divisions: Record<number, ImportedGolfResult[]>;
  players: ImportedGolfResult[];

  twosPaidPlayers: string[];
  twosWinners: BirdieTwoWinner[];
  twosEntryFee: number;

  detectedDate: string | null;

  warnings: string[];
};

export type PlayerAward = {
  description: string;
  amount: number;
};

export type PlayerPayout = {
  playerName: string;
  amount: number;
  awards: PlayerAward[];
};

export type MensImportPreview = {
  importData: IntelligentGolfImport;

  calculation: ReturnType<
    typeof calculateMensCompetition
  >;

  grossWinner: ImportedGolfResult | null;

  playerPayouts: PlayerPayout[];

  sectionPayment: number;

  errors: string[];
  warnings: string[];
};

function cleanText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\*/g, "")
    .trim();
}

function normalizeName(value: string) {
  return cleanText(value)
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function extractMarkdownPlayer(
  value: string,
): {
  playerName: string;
  handicap?: number;
} | null {
  const cleaned = value.replace(/\u00a0/g, " ");

  const markdownMatch = cleaned.match(
    /\[([^\]]+)\]\([^)]+\)\s*\((\d+)\)/,
  );

  if (markdownMatch) {
    return {
      playerName: cleanText(markdownMatch[1]),
      handicap: Number(markdownMatch[2]),
    };
  }

  const plainMatch = cleaned.match(
    /^(.+?)\s*\((\d+)\)\s*$/,
  );

  if (plainMatch) {
    return {
      playerName: cleanText(plainMatch[1]),
      handicap: Number(plainMatch[2]),
    };
  }

  return null;
}

function extractLinkedNumber(
  value: string,
): number | null {
  const linked = value.match(
    /\[(\d+(?:\.\d+)?)\]/,
  );

  if (linked) {
    return Number(linked[1]);
  }

  const plain = cleanText(value).match(
    /^(\d+(?:\.\d+)?)$/,
  );

  if (plain) {
    return Number(plain[1]);
  }

  return null;
}

function divisionFromLine(
  line: string,
): number | null {
  const text = line.toLowerCase();

  if (
    /div(?:i)?sion\s+(one|1)\s+results/.test(
      text,
    )
  ) {
    return 1;
  }

  if (
    /div(?:i)?sion\s+(two|2)\s+results/.test(
      text,
    )
  ) {
    return 2;
  }

  if (
    /div(?:i)?sion\s+(three|3)\s+results/.test(
      text,
    )
  ) {
    return 3;
  }

  return null;
}

function parseDateFromText(
  text: string,
): string | null {
  const months: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };

  const match = text.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
  );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = months[match[2].toLowerCase()];
  const year = Number(match[3]);

  return `${year}-${String(month).padStart(
    2,
    "0",
  )}-${String(day).padStart(2, "0")}`;
}

function parsePlainResultLine(
  line: string,
  division: number,
): ImportedGolfResult | null {
  /*
    Real Intelligent Golf clipboard format:

    1st Karl Bowden(9) 72
    2nd Neil Miller(12) 75
    3rd Terry Tennens(8) 77
  */

  const match = line.match(
    /^\s*(\d+(?:st|nd|rd|th))\s+(.+?)\s*\((\d+)\)\s+(\d+)\s*$/i,
  );

  if (!match) {
    return null;
  }

  const place = cleanText(match[1]);
  const playerName = cleanText(match[2]);
  const handicap = Number(match[3]);
  const nett = Number(match[4]);
  const gross = nett + handicap;

  return {
    division,
    place,
    playerName,
    handicap,
    nett,
    gross,
  };
}

function parsePlainTwosWinnerLine(
  line: string,
): BirdieTwoWinner | null {
  /*
    Possible clipboard format:

    Karl Bowden(9) 2 7th
    Laurence Parr(8) 2 5th
  */

  const match = line.match(
    /^\s*(.+?)\s*\((\d+)\)\s+2\s+(\d+(?:st|nd|rd|th))\s*$/i,
  );

  if (!match) {
    return null;
  }

  return {
    playerName: cleanText(match[1]),
    handicap: Number(match[2]),
    hole: cleanText(match[3]),
  };
}

export function parseIntelligentGolf(
  rawText: string,
): IntelligentGolfImport {
  const lines = rawText.split(/\r?\n/);

  const divisions: Record<
    number,
    ImportedGolfResult[]
  > = {
    1: [],
    2: [],
    3: [],
  };

  const warnings: string[] = [];

  const twosPaidPlayers: string[] = [];
  const twosWinners: BirdieTwoWinner[] = [];

  let twosEntryFee = 1;

  let currentDivision: number | null = null;
  let readingTwosPaid = false;
  let readingTwosNotPaid = false;

  const detectedDate =
    parseDateFromText(rawText);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const detectedDivision =
      divisionFromLine(line);

    if (detectedDivision) {
      currentDivision = detectedDivision;
      readingTwosPaid = false;
      readingTwosNotPaid = false;
      continue;
    }

    const twosFeeMatch = line.match(
      /Birdie\s*2'?s?.*?£\s*(\d+(?:\.\d+)?)/i,
    );

    if (twosFeeMatch) {
      twosEntryFee = Number(twosFeeMatch[1]);
      currentDivision = null;
      continue;
    }

    if (
      /following players paid from an account/i.test(
        line,
      )
    ) {
      readingTwosPaid = true;
      readingTwosNotPaid = false;
      currentDivision = null;
      continue;
    }

    if (
      /following players did not pay/i.test(
        line,
      )
    ) {
      readingTwosPaid = false;
      readingTwosNotPaid = true;
      currentDivision = null;
      continue;
    }

    /*
      REAL INTELLIGENT GOLF DIVISION RESULT
    */

    if (currentDivision) {
      const plainResult =
        parsePlainResultLine(
          line,
          currentDivision,
        );

      if (plainResult) {
        divisions[currentDivision].push(
          plainResult,
        );

        continue;
      }
    }

    /*
      MARKDOWN DIVISION RESULT
    */

    if (
      currentDivision &&
      line.startsWith("|")
    ) {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());

      if (cells.length >= 4) {
        const place = cleanText(cells[0]);

        if (
          /^\d+(?:st|nd|rd|th)$/i.test(
            place,
          )
        ) {
          const player =
            extractMarkdownPlayer(cells[1]);

          if (
            player &&
            player.handicap !== undefined
          ) {
            const reportedGross =
              extractLinkedNumber(cells[2]);

            const nett =
              extractLinkedNumber(cells[3]);

            if (nett !== null) {
              const gross =
                nett + player.handicap;

              divisions[currentDivision].push({
                division: currentDivision,
                place,

                playerName:
                  player.playerName,

                handicap:
                  player.handicap,

                nett,
                gross,

                reportedGross:
                  reportedGross ??
                  undefined,
              });

              if (
                reportedGross !== null &&
                reportedGross !== gross
              ) {
                warnings.push(
                  `${player.playerName}: Intelligent Golf shows gross ${reportedGross}, but Nett ${nett} + handicap ${player.handicap} calculates to ${gross}.`,
                );
              }

              continue;
            }
          }
        }
      }
    }

    /*
      BIRDIE 2 WINNERS - MARKDOWN
    */

    if (line.startsWith("|")) {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());

      if (cells.length >= 3) {
        const possiblePlayer =
          extractMarkdownPlayer(cells[0]);

        const twoCount =
          cleanText(cells[1]);

        const hole =
          cleanText(cells[2]);

        if (
          possiblePlayer &&
          twoCount === "2" &&
          /^\d+(?:st|nd|rd|th)$/i.test(
            hole,
          )
        ) {
          twosWinners.push({
            playerName:
              possiblePlayer.playerName,

            handicap:
              possiblePlayer.handicap,

            hole,
          });

          continue;
        }
      }
    }

    /*
      BIRDIE 2 WINNERS - REAL CLIPBOARD
    */

    const plainTwosWinner =
      parsePlainTwosWinnerLine(line);

    if (plainTwosWinner) {
      twosWinners.push(
        plainTwosWinner,
      );

      continue;
    }

    /*
      BIRDIE 2 PAID PLAYERS
    */

    if (readingTwosPaid) {
      if (
        line.startsWith("|") ||
        line.startsWith("#")
      ) {
        continue;
      }

      const playerName =
        cleanText(line);

      if (playerName) {
        twosPaidPlayers.push(
          playerName,
        );
      }

      continue;
    }

    /*
      Ignore players who did not pay
    */

    if (readingTwosNotPaid) {
      continue;
    }
  }

  const players =
    Object.values(divisions).flat();

  const seenPlayers =
    new Set<string>();

  for (const player of players) {
    const normalized =
      normalizeName(
        player.playerName,
      );

    if (
      seenPlayers.has(normalized)
    ) {
      warnings.push(
        `${player.playerName} appears more than once in the divisional results.`,
      );
    }

    seenPlayers.add(normalized);
  }

  const uniquePaid = Array.from(
    new Map(
      twosPaidPlayers.map((name) => [
        normalizeName(name),
        cleanText(name),
      ]),
    ).values(),
  );

  const uniqueWinners = Array.from(
    new Map(
      twosWinners.map((winner) => [
        `${normalizeName(
          winner.playerName,
        )}-${winner.hole ?? ""}`,

        winner,
      ]),
    ).values(),
  );

  return {
    divisions,
    players,

    twosPaidPlayers:
      uniquePaid,

    twosWinners:
      uniqueWinners,

    twosEntryFee,

    detectedDate,

    warnings,
  };
}

function addPlayerAward(
  map: Map<string, PlayerPayout>,

  playerName: string,
  description: string,
  amount: number,
) {
  const key =
    normalizeName(playerName);

  const existing =
    map.get(key);

  if (existing) {
    existing.awards.push({
      description,
      amount,
    });

    existing.amount =
      roundMoney(
        existing.amount + amount,
      );

    return;
  }

  map.set(key, {
    playerName:
      cleanText(playerName),

    amount:
      roundMoney(amount),

    awards: [
      {
        description,
        amount,
      },
    ],
  });
}

function requiredDivisionCount(
  entrants: number,
) {
  if (entrants <= 20) {
    return 1;
  }

  if (entrants < 75) {
    return 2;
  }

  return 3;
}

export function buildMensImportPreview(
  input: {
    rawText: string;
    entrants: number;
    entryFee?: number;
  },
): MensImportPreview {
  const importData =
    parseIntelligentGolf(
      input.rawText,
    );

  const entrants =
    Number(input.entrants || 0);

  const entryFee =
    Number(input.entryFee ?? 5);

  const errors: string[] = [];

  const warnings = [
    ...importData.warnings,
  ];

  if (entrants <= 0) {
    errors.push(
      "Enter the total number of competition entrants.",
    );
  }

  if (
    importData.players.length === 0
  ) {
    errors.push(
      "No Intelligent Golf division results were recognised.",
    );
  }

  const divisionsRequired =
    requiredDivisionCount(
      entrants,
    );

  for (
    let division = 1;
    division <= divisionsRequired;
    division += 1
  ) {
    if (
      importData.divisions[
        division
      ].length === 0
    ) {
      errors.push(
        `Division ${division} results were not found in the pasted information.`,
      );
    }
  }

  const calculation =
    calculateMensCompetition({
      entrants,
      entryFee,

      twosEntrants:
        importData.twosPaidPlayers.length,

      twosEntryFee:
        importData.twosEntryFee,

      twosWinners:
        importData.twosWinners.length,

      feeRate: 0.04,
    });

  /*
    Find lowest calculated gross
    across all divisions.
  */

  const lowestGross =
    importData.players.length > 0
      ? Math.min(
          ...importData.players.map(
            (player) =>
              player.gross,
          ),
        )
      : null;

  const grossCandidates =
    lowestGross === null
      ? []
      : importData.players.filter(
          (player) =>
            player.gross ===
            lowestGross,
        );

  let grossWinner:
    | ImportedGolfResult
    | null = null;

  if (
    grossCandidates.length === 1
  ) {
    grossWinner =
      grossCandidates[0];
  } else if (
    grossCandidates.length > 1
  ) {
    errors.push(
      `There is a Gross tie on ${lowestGross}. The Gross winner needs to be confirmed manually before creating the payout.`,
    );
  }

  const payoutMap =
    new Map<
      string,
      PlayerPayout
    >();

  /*
    Allocate competition prizes.
  */

  for (
    const prize of calculation.prizes
  ) {
    if (
      prize.division === "Gross"
    ) {
      if (grossWinner) {
        addPlayerAward(
          payoutMap,

          grossWinner.playerName,

          "Gross Winner",

          prize.amount,
        );
      }

      continue;
    }

    const divisionMatch =
      prize.division.match(
        /Division\s+(\d+)/i,
      );

    if (!divisionMatch) {
      continue;
    }

    const divisionNumber =
      Number(
        divisionMatch[1],
      );

    const result =
      importData.divisions[
        divisionNumber
      ].find(
        (player) =>
          player.place.toLowerCase() ===
          prize.place.toLowerCase(),
      );

    if (!result) {
      errors.push(
        `${prize.division} ${prize.place} result is missing.`,
      );

      continue;
    }

    addPlayerAward(
      payoutMap,

      result.playerName,

      `${prize.division} ${prize.place}`,

      prize.amount,
    );
  }

  /*
    Birdie 2s validation and payouts.
  */

  if (
    importData.twosWinners.length >
      0 &&
    importData.twosPaidPlayers.length ===
      0
  ) {
    errors.push(
      "Birdie 2s winners were found, but the list of players who paid into the Birdie 2s was not found.",
    );
  }

  const paidSet =
    new Set(
      importData.twosPaidPlayers.map(
        normalizeName,
      ),
    );

  for (
    const winner of
    importData.twosWinners
  ) {
    if (
      !paidSet.has(
        normalizeName(
          winner.playerName,
        ),
      )
    ) {
      errors.push(
        `${winner.playerName} is shown as a Birdie 2 winner but is not in the list of players who paid.`,
      );

      continue;
    }

    addPlayerAward(
      payoutMap,

      winner.playerName,

      winner.hole
        ? `Birdie 2 (${winner.hole})`
        : "Birdie 2",

      calculation.twosIndividualPayout,
    );
  }

  const playerPayouts =
    Array.from(
      payoutMap.values(),
    ).sort((a, b) =>
      a.playerName.localeCompare(
        b.playerName,
      ),
    );

  /*
    Reconcile expected player payout
    against generated player lines.
  */

  const generatedPlayerTotal =
    roundMoney(
      playerPayouts.reduce(
        (total, payout) =>
          total + payout.amount,
        0,
      ),
    );

  const expectedPlayerTotal =
    roundMoney(
      calculation.totalPlayerPayout,
    );

  if (
    Math.abs(
      generatedPlayerTotal -
        expectedPlayerTotal,
    ) > 0.05 &&
    errors.length === 0
  ) {
    warnings.push(
      `Generated player top-ups total £${generatedPlayerTotal.toFixed(
        2,
      )}, while the calculated player payout is £${expectedPlayerTotal.toFixed(
        2,
      )}.`,
    );
  }

  return {
    importData,

    calculation,

    grossWinner,

    playerPayouts,

    sectionPayment:
      calculation.netSectionTopUp,

    errors,
    warnings,
  };
}