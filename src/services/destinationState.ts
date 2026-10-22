import { discoveryStates } from "../data/discoveryAreas";
import type { Destination, MalaysianState } from "../types";

const cityStates: Record<string, MalaysianState> = {
  "kuala lumpur": "Federal Territories", putrajaya: "Federal Territories", labuan: "Federal Territories",
  ipoh: "Perak", taiping: "Perak", kuching: "Sarawak", sibu: "Sarawak", "kota kinabalu": "Sabah", sandakan: "Sabah",
  "george town": "Penang", "johor bahru": "Johor", "alor setar": "Kedah", langkawi: "Kedah", "kota bharu": "Kelantan",
  seremban: "Negeri Sembilan", kuantan: "Pahang", kangar: "Perlis", "shah alam": "Selangor", "petaling jaya": "Selangor",
  "kuala terengganu": "Terengganu",
};

export function getDestinationState(destination: Destination): MalaysianState | undefined {
  if (destination.state && discoveryStates.includes(destination.state)) return destination.state;
  const city = destination.city.trim().toLowerCase();
  if (cityStates[city]) return cityStates[city];
  const address = `${destination.city}, ${destination.address ?? ""}`.toLowerCase();
  const state = discoveryStates.find((candidate) => address.includes(candidate.toLowerCase()));
  if (state) return state;
  return ["kuala lumpur", "putrajaya", "labuan"].some((territory) => address.includes(territory)) ? "Federal Territories" : undefined;
}
