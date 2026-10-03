import type { MalaysianState } from "../types";

export type DiscoveryArea = {
  id: string;
  name: string;
  state: MalaysianState;
  latitude: number;
  longitude: number;
};

// Approximate town centres for browsing, never recorded as a tourist's GPS position.
export const discoveryAreas: DiscoveryArea[] = [
  { id: "johor-bahru", name: "Johor Bahru", state: "Johor", latitude: 1.46, longitude: 103.76 },
  { id: "alor-setar", name: "Alor Setar", state: "Kedah", latitude: 6.12, longitude: 100.37 },
  { id: "langkawi", name: "Kuah, Langkawi", state: "Kedah", latitude: 6.32, longitude: 99.85 },
  { id: "kota-bharu", name: "Kota Bharu", state: "Kelantan", latitude: 6.13, longitude: 102.24 },
  { id: "melaka", name: "Melaka City", state: "Melaka", latitude: 2.2, longitude: 102.25 },
  { id: "seremban", name: "Seremban", state: "Negeri Sembilan", latitude: 2.73, longitude: 101.94 },
  { id: "kuantan", name: "Kuantan", state: "Pahang", latitude: 3.82, longitude: 103.33 },
  { id: "george-town", name: "George Town", state: "Penang", latitude: 5.42, longitude: 100.33 },
  { id: "jelutong", name: "Jelutong", state: "Penang", latitude: 5.38, longitude: 100.31 },
  { id: "air-itam", name: "Air Itam", state: "Penang", latitude: 5.4, longitude: 100.28 },
  { id: "batu-kawan", name: "Batu Kawan", state: "Penang", latitude: 5.26, longitude: 100.43 },
  { id: "butterworth", name: "Butterworth", state: "Penang", latitude: 5.4, longitude: 100.37 },
  { id: "ipoh", name: "Ipoh", state: "Perak", latitude: 4.6, longitude: 101.08 },
  { id: "taiping", name: "Taiping", state: "Perak", latitude: 4.85, longitude: 100.74 },
  { id: "kangar", name: "Kangar", state: "Perlis", latitude: 6.44, longitude: 100.2 },
  { id: "kota-kinabalu", name: "Kota Kinabalu", state: "Sabah", latitude: 5.98, longitude: 116.07 },
  { id: "sandakan", name: "Sandakan", state: "Sabah", latitude: 5.84, longitude: 118.12 },
  { id: "kuching", name: "Kuching", state: "Sarawak", latitude: 1.55, longitude: 110.34 },
  { id: "sibu", name: "Sibu", state: "Sarawak", latitude: 2.29, longitude: 111.83 },
  { id: "shah-alam", name: "Shah Alam", state: "Selangor", latitude: 3.07, longitude: 101.52 },
  { id: "petaling-jaya", name: "Petaling Jaya", state: "Selangor", latitude: 3.11, longitude: 101.64 },
  { id: "gombak", name: "Gombak / Batu Caves", state: "Selangor", latitude: 3.24, longitude: 101.68 },
  { id: "sekinchan", name: "Sekinchan", state: "Selangor", latitude: 3.5, longitude: 101.1 },
  { id: "kuala-terengganu", name: "Kuala Terengganu", state: "Terengganu", latitude: 5.33, longitude: 103.14 },
  { id: "kuala-lumpur", name: "Kuala Lumpur City Centre", state: "Federal Territories", latitude: 3.15, longitude: 101.7 },
  { id: "kepong", name: "Kepong", state: "Federal Territories", latitude: 3.22, longitude: 101.64 },
  { id: "putrajaya", name: "Putrajaya", state: "Federal Territories", latitude: 2.93, longitude: 101.69 },
  { id: "labuan", name: "Labuan", state: "Federal Territories", latitude: 5.28, longitude: 115.24 },
];

export const discoveryStates = [...new Set(discoveryAreas.map((area) => area.state))];

export function getDiscoveryAreasForState(state: MalaysianState | "") {
  return discoveryAreas.filter((area) => area.state === state);
}
