import { tourismAdvisoryTemplates, type TourismAdvisoryTemplate } from "../data/tourismAdvisories";
import type { Destination, MovementPoint } from "../types";
import { nearestDestination } from "./geo";

export type TourismAdvisory = Omit<TourismAdvisoryTemplate, "startsInDays" | "lastsDays"> & {
  startsAt: string;
  endsAt: string;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function buildTourismAdvisories(now = new Date()): TourismAdvisory[] {
  const today = normalizeDay(now);

  return tourismAdvisoryTemplates.map((template) => {
    const startsAt = addDays(today, template.startsInDays);
    const endsAt = addDays(startsAt, template.lastsDays);
    const { startsInDays, lastsDays, ...advisory } = template;

    return {
      ...advisory,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    };
  });
}

export function getRelevantTourismAdvisories(input: {
  destinations: Destination[];
  activePoint?: MovementPoint;
  now?: Date;
  limit?: number;
}) {
  const now = input.now ?? new Date();
  const nearest = input.activePoint ? nearestDestination(input.activePoint, input.destinations)?.destination : null;
  const referenceCity = nearest?.city;
  const referenceCategory = nearest?.category;
  const activeAdvisories = buildTourismAdvisories(now).filter((advisory) => {
    const startsAt = new Date(advisory.startsAt);
    const endsAt = new Date(advisory.endsAt);
    return startsAt.getTime() <= now.getTime() && endsAt.getTime() >= now.getTime();
  });

  return activeAdvisories
    .sort((a, b) => {
      const aCityScore = a.city === referenceCity ? 0 : a.city === "Malaysia" ? 1 : 2;
      const bCityScore = b.city === referenceCity ? 0 : b.city === "Malaysia" ? 1 : 2;
      const aCategoryScore = a.category && a.category === referenceCategory ? 0 : 1;
      const bCategoryScore = b.category && b.category === referenceCategory ? 0 : 1;
      return aCityScore - bCityScore || aCategoryScore - bCategoryScore || new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime();
    })
    .slice(0, input.limit ?? 3);
}
