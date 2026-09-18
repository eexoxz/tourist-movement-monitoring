import type { DestinationCategory } from "../types";

export type TourismAdvisoryType = "weather" | "traffic" | "road-closure" | "safety" | "event";
export type TourismAdvisorySeverity = "high" | "medium" | "low";

export type TourismAdvisoryTemplate = {
  id: string;
  type: TourismAdvisoryType;
  severity: TourismAdvisorySeverity;
  city: string;
  category?: DestinationCategory;
  title: string;
  message: string;
  action: string;
  startsInDays: number;
  lastsDays: number;
};

export const tourismAdvisoryTemplates: TourismAdvisoryTemplate[] = [
  {
    id: "weather-rain-general",
    type: "weather",
    severity: "medium",
    city: "Malaysia",
    title: "Wet weather reminder",
    message: "Afternoon rain can affect walking routes, outdoor viewpoints and beach plans.",
    action: "Keep indoor alternatives ready and allow extra travel time between attractions.",
    startsInDays: 0,
    lastsDays: 7,
  },
  {
    id: "traffic-city-weekend",
    type: "traffic",
    severity: "medium",
    city: "Kuala Lumpur",
    category: "urban",
    title: "City centre traffic watch",
    message: "Central city attractions may see heavier evening movement and ride-hailing delays.",
    action: "Use rail-linked stops first and avoid planning tight transfers between popular sites.",
    startsInDays: 1,
    lastsDays: 3,
  },
  {
    id: "road-heritage-penang",
    type: "road-closure",
    severity: "low",
    city: "Penang",
    category: "heritage",
    title: "Heritage street access note",
    message: "Some heritage streets may be slower for cars during market, walking-tour or maintenance periods.",
    action: "Plan to walk the last short distance and keep pickup points outside narrow heritage lanes.",
    startsInDays: 0,
    lastsDays: 10,
  },
  {
    id: "event-crowd-melaka",
    type: "event",
    severity: "medium",
    city: "Melaka",
    category: "food",
    title: "Evening crowd reminder",
    message: "Food streets and heritage night areas can become crowded during weekends and holiday windows.",
    action: "Visit earlier for calmer movement, or use crowd levels to pick a quieter nearby place.",
    startsInDays: 2,
    lastsDays: 5,
  },
  {
    id: "safety-coastal-sabah",
    type: "safety",
    severity: "low",
    city: "Kota Kinabalu",
    category: "coastal",
    title: "Coastal safety reminder",
    message: "Beach and sunset spots can become busy quickly near evening peak periods.",
    action: "Stay near lit public areas and keep emergency contact details updated in your profile.",
    startsInDays: 0,
    lastsDays: 8,
  },
];
