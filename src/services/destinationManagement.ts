import type { Destination, DestinationCategory } from "../types";
import { createId } from "./storage";

export const destinationCategories: DestinationCategory[] = ["cultural", "nature", "urban", "heritage", "food", "coastal"];

type DestinationInput = {
  name: string;
  city: string;
  category: DestinationCategory | string;
  latitude: number | string;
  longitude: number | string;
  address?: string;
  description: string;
  averageVisitMinutes?: number | string;
};

type DestinationUpdateInput = DestinationInput & {
  id: string;
};

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

export function validateDestination(input: DestinationInput) {
  const name = input.name.trim();
  const city = input.city.trim();
  const address = input.address?.trim() ?? "";
  const description = input.description.trim();
  const latitude = toNumber(input.latitude);
  const longitude = toNumber(input.longitude);
  const averageVisitMinutes = toNumber(input.averageVisitMinutes ?? 60);

  if (name.length < 2) {
    return { error: "Destination name must be at least 2 characters." };
  }

  if (city.length < 2) {
    return { error: "City must be at least 2 characters." };
  }

  if (!destinationCategories.includes(input.category as DestinationCategory)) {
    return { error: "Choose a valid destination category." };
  }

  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) {
    return { error: "Enter a valid latitude." };
  }

  if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    return { error: "Enter a valid longitude." };
  }

  if (description.length < 8) {
    return { error: "Description must be at least 8 characters." };
  }

  if (!Number.isFinite(averageVisitMinutes) || averageVisitMinutes < 1) {
    return { error: "Average visit time must be at least 1 minute." };
  }

  return {
    value: {
      name,
      city,
      category: input.category as DestinationCategory,
      latitude,
      longitude,
      address: address || `${city}, Malaysia`,
      description,
      averageVisitMinutes,
    },
  };
}

export function addDestinationRecord(destinations: Destination[], input: DestinationInput) {
  const validation = validateDestination(input);
  if (validation.error || !validation.value) {
    return { error: validation.error ?? "Destination could not be saved." };
  }

  const duplicate = destinations.some((destination) => destination.name.toLowerCase() === validation.value.name.toLowerCase() && destination.city.toLowerCase() === validation.value.city.toLowerCase());
  if (duplicate) {
    return { error: "This destination already exists for the selected city." };
  }

  const destination: Destination = {
    id: createId("destination"),
    ...validation.value,
  };

  return {
    destination,
    destinations: [...destinations, destination],
  };
}

export function updateDestinationRecord(destinations: Destination[], input: DestinationUpdateInput) {
  const existing = destinations.find((destination) => destination.id === input.id);
  if (!existing) {
    return { error: "Destination was not found." };
  }

  const validation = validateDestination(input);
  if (validation.error || !validation.value) {
    return { error: validation.error ?? "Destination could not be updated." };
  }

  return {
    destination: { ...existing, ...validation.value },
    destinations: destinations.map((destination) => (destination.id === input.id ? { ...existing, ...validation.value } : destination)),
  };
}

export function deleteDestinationRecord(destinations: Destination[], destinationId: string) {
  if (destinations.length <= 1) {
    return { error: "At least one destination must remain available." };
  }

  if (!destinations.some((destination) => destination.id === destinationId)) {
    return { error: "Destination was not found." };
  }

  return {
    destinations: destinations.filter((destination) => destination.id !== destinationId),
  };
}
