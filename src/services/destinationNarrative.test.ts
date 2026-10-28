import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {destinations} from "../data/destinations";
import type {Destination} from "../types";
import type {Locale} from "./i18n";
import {destinationNarrative,hasDestinationStory} from "./destinationNarrative";
import {localizeDestination} from "./destinationLocale";
import {getDestinationState} from "./destinationState";

const readRelease=(file:string)=>JSON.parse(readFileSync(new URL(`../../catalogue/${file}`,import.meta.url),"utf8")).places as Destination[];
const oldRelease=readRelease("locations-2026-10.json");
const added=readRelease("locations-2026-10-27.json");
const latest=readRelease("locations-2026-10-28.json");
const places=[...destinations,...oldRelease,...added,...latest];
const languages:Locale[]=["en","ms","zh","ja","ko","pt","ta","es","fr"];

describe("researched place descriptions",()=>{
 it("retains distinct venues, valid source facts and safe descriptions across the expanded catalogue",()=>{
  expect(places).toHaveLength(814);
  expect(new Set(places.map(p=>p.id)).size).toBe(places.length);
  const key=(p:Destination)=>`${getDestinationState(p)}:${p.name.toLowerCase().replace(/[^a-z0-9]/g,"")}`;
  expect(new Set(places.map(key)).size).toBe(places.length);
  for(const place of places){
   expect(hasDestinationStory(place.visitorStory),place.name).toBe(true);
   expect(place.description.length,place.name).toBeGreaterThan(180);
   expect(place.description.length,place.name).toBeLessThan(1600);
   expect(place.description,place.name).not.toMatch(/undefined|\[object Object\]/);
   expect(place).not.toHaveProperty("visitorCount");
   expect(place).not.toHaveProperty("activitySummary");
  }
 });
 it("renders meaningful translated context and place-specific highlights in every language",()=>{
  for(const locale of languages){
   for(const place of places){
    const narrative=destinationNarrative(place,locale);
    expect(narrative?.length,`${place.name}: ${locale}`).toBeGreaterThan(55);
    expect(narrative,`${place.name}: ${locale}`).not.toMatch(/undefined|\[object Object\]/);
    const localized=localizeDestination(place,locale);
    expect(localized.id).toBe(place.id);
    expect(localized.imageUrl).toBe(place.imageUrl);
    if(locale!=="en"){
     expect(localized.description).toBe(destinationNarrative({...place,city:localized.city},locale));
     expect(localized.description).not.toBe(place.description);
     expect(localized.description).not.toContain("Look out for");
    }
   }
  }
 });
 it("does not crash on unknown or malformed metadata from older or externally edited records",()=>{
  const base=destinations[0];
  for(const visitorStory of [undefined,{theme:"__proto__",highlights:["history","architecture"]},{theme:"museum",highlights:["constructor","history"]},{theme:"museum",highlights:[]},{theme:"unknown",highlights:["objects","history"]}]){
   expect(destinationNarrative({...base,visitorStory},"fr")).toBeUndefined();
   expect(()=>localizeDestination({...base,visitorStory},"fr")).not.toThrow();
  }
 });
});
