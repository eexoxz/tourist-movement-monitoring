import type { Destination } from "../types";

const CHECK_IN_PREFIX = "TMM-CHECKIN";

function hashCode(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36).toUpperCase().padStart(5, "0").slice(0, 5);
}

export function createDestinationCheckInCode(destinationId: string) {
  const normalizedId = destinationId.trim();
  return `${CHECK_IN_PREFIX}-${normalizedId}-${hashCode(normalizedId)}`;
}

export function parseDestinationCheckInCode(input: string, destinations: Destination[]) {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return { error: "Enter or scan an attraction check-in code." };
  }

  const directMatch = destinations.find(
    (destination) =>
      destination.id.toLowerCase() === normalizedInput.toLowerCase() ||
      destination.name.toLowerCase() === normalizedInput.toLowerCase()
  );

  if (directMatch) {
    return { destination: directMatch };
  }

  const match = normalizedInput.match(/^TMM-CHECKIN-(.+)-([A-Z0-9]{5})$/i);
  if (!match) {
    return { error: "This is not a valid tourist attraction check-in code." };
  }

  const [, destinationId, checksum] = match;
  if (hashCode(destinationId) !== checksum.toUpperCase()) {
    return { error: "The attraction check-in code could not be verified." };
  }

  const destination = destinations.find((candidate) => candidate.id === destinationId);
  if (!destination) {
    return { error: "This attraction code is not available in the destination list." };
  }

  return { destination };
}
