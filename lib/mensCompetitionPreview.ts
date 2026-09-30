import {
  buildMensImportPreview,
  type BirdieTwoWinner,
  type ImportedGolfResult,
  type MensImportPreview,
  type PlayerPayout,
} from "@/lib/intelligentGolfParser";
import { calculateMensCompetition, roundMoney } from "@/lib/payoutCalculator";

type Input = {
  rawText: string;
  divisionTexts?: string[];
  grossResultsText?: string;
  twosPaidText?: string;
  twosWinnersText?: string;
  entrants: number;
  entryFee?: number;
  twosEntrantsOverride?: number | null;
  twosWinnersPresent?: boolean | null;
  divisionCount?: 1 | 2 | 3;
};

function clean(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\*/g, "").trim();
}

function nameKey(value: string) {
  return clean(value).replace(/\s+/g, " ").toLowerCase();
}

function parseResults(text: string, division: number): ImportedGolfResult[] {
  const results: ImportedGolfResult[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = clean(raw);
    const match = line.match(
      /^(\d+(?:st|nd|rd|th))\s+(.+?)\s*\((\d+)\)\s+(\d+(?:\.\d+)?)\s*$/i,
    );
    if (!match) continue;

    const value = Number(match[4]);
    results.push({
      division,
      place: match[1],
      playerName: clean(match[2]),
      handicap: Number(match[3]),
      nett: value,
      gross: value,
      reportedGross: value,
    });
  }

  return results;
}

function parseNames(text: string): string[] {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);

  // The dedicated Birdie 2 entrants box may contain either:
  // 1) just the paid player names, or
  // 2) the full Intelligent Golf Birdie 2 section with paid/not-paid headings.
  const paidHeadingIndex = lines.findIndex((line) =>
    /following players paid from an account/i.test(line),
  );
  const notPaidHeadingIndex = lines.findIndex((line) =>
    /following players did not pay/i.test(line),
  );

  const candidateLines =
    paidHeadingIndex >= 0
      ? lines.slice(
          paidHeadingIndex + 1,
          notPaidHeadingIndex > paidHeadingIndex ? notPaidHeadingIndex : lines.length,
        )
      : lines;

  const names = candidateLines
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !/^birdie\s*2/i.test(line))
    .filter((line) => !/^open\s+/i.test(line))
    .filter((line) => !/following players/i.test(line))
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);

  return Array.from(new Map(names.map((name) => [nameKey(name), name])).values());
}

function parseTwosWinners(text: string): BirdieTwoWinner[] {
  const winners: BirdieTwoWinner[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = clean(raw);
    if (!line || line.startsWith("#")) continue;

    const detailed = line.match(
      /^(.+?)\s*\((\d+)\)\s+2\s+(\d+(?:st|nd|rd|th))\s*$/i,
    );
    if (detailed) {
      winners.push({
        playerName: clean(detailed[1]),
        handicap: Number(detailed[2]),
        hole: detailed[3],
      });
      continue;
    }

    const withHandicap = line.match(/^(.+?)\s*\((\d+)\)\s*$/);
    if (withHandicap) {
      winners.push({
        playerName: clean(withHandicap[1]),
        handicap: Number(withHandicap[2]),
      });
      continue;
    }

    if (!/^the following/i.test(line)) {
      winners.push({ playerName: line });
    }
  }

  return Array.from(
    new Map(winners.map((winner) => [nameKey(winner.playerName), winner])).values(),
  );
}

function addAward(
  map: Map<string, PlayerPayout>,
  playerName: string,
  description: string,
  amount: number,
) {
  const key = nameKey(playerName);
  const existing = map.get(key);

  if (existing) {
    existing.awards.push({ description, amount });
    existing.amount = roundMoney(existing.amount + amount);
  } else {
    map.set(key, {
      playerName,
      amount: roundMoney(amount),
      awards: [{ description, amount }],
    });
  }
}

export function buildMensCompetitionPreview(input: Input): MensImportPreview {
  // Legacy all-in-one imports still use the old parser. The new separated
  // screen is deliberately parsed box-by-box so one box cannot affect another.
  if (!input.divisionTexts) {
    return buildMensImportPreview({
      rawText: input.rawText,
      entrants: input.entrants,
      entryFee: input.entryFee,
      divisionCount: input.divisionCount,
    });
  }

  const divisionCount = input.divisionCount ?? 1;
  const divisions: Record<number, ImportedGolfResult[]> = { 1: [], 2: [], 3: [] };

  for (let index = 0; index < divisionCount; index += 1) {
    divisions[index + 1] = parseResults(input.divisionTexts[index] ?? "", index + 1);
  }

  const players = Object.values(divisions).flat();
  const grossResults = parseResults(input.grossResultsText ?? "", 0);
  const paidPlayers = parseNames(input.twosPaidText ?? "");
  const paidSet = new Set(paidPlayers.map(nameKey));
  const pastedWinners = parseTwosWinners(input.twosWinnersText ?? "");
  const twosWinners = pastedWinners.filter((winner) => paidSet.has(nameKey(winner.playerName)));

  const errors: string[] = [];
  if (input.entrants <= 0) errors.push("Enter the total number of competition entrants.");

  for (let division = 1; division <= divisionCount; division += 1) {
    if (divisions[division].length === 0) {
      errors.push(`Division ${division} results were not found in the pasted information.`);
    }
  }

  for (const winner of pastedWinners) {
    if (!paidSet.has(nameKey(winner.playerName))) {
      errors.push(`${winner.playerName} is shown as a Birdie 2 winner but is not in the Birdie 2 entrants list.`);
    }
  }

  const calculation = calculateMensCompetition({
    entrants: input.entrants,
    entryFee: input.entryFee,
    twosEntrants: paidPlayers.length,
    twosEntryFee: 1,
    twosWinners: twosWinners.length,
    feeRate: 0.04,
    divisionCount,
  });

  const grossWinner =
    grossResults.find((result) => result.place.toLowerCase() === "1st") ?? null;

  const payoutMap = new Map<string, PlayerPayout>();

  for (const prize of calculation.prizes) {
    if (prize.division === "Gross") {
      if (grossWinner) {
        addAward(payoutMap, grossWinner.playerName, "Gross Winner", prize.amount);
      } else {
        errors.push("Gross results are required because this competition includes a Gross prize.");
      }
      continue;
    }

    const divisionMatch = prize.division.match(/Division\s+(\d+)/i);
    if (!divisionMatch) continue;
    const division = Number(divisionMatch[1]);
    const result = divisions[division].find(
      (player) => player.place.toLowerCase() === prize.place.toLowerCase(),
    );

    if (!result) {
      errors.push(`${prize.division} ${prize.place} result is missing.`);
      continue;
    }

    addAward(
      payoutMap,
      result.playerName,
      `${prize.division} ${prize.place}`,
      prize.amount,
    );
  }

  for (const winner of twosWinners) {
    addAward(
      payoutMap,
      winner.playerName,
      winner.hole ? `Birdie 2 (${winner.hole})` : "Birdie 2",
      calculation.twosIndividualPayout,
    );
  }

  return {
    importData: {
      divisions,
      players,
      twosPaidPlayers: paidPlayers,
      twosWinners,
      twosEntryFee: 1,
      detectedDate: null,
      warnings: [],
    },
    calculation,
    grossWinner,
    playerPayouts: Array.from(payoutMap.values()).sort((a, b) =>
      a.playerName.localeCompare(b.playerName),
    ),
    sectionPayment: calculation.netSectionTopUp,
    errors,
    warnings: [],
  };
}
