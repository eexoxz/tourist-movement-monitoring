import {readFileSync} from "node:fs";
import {expect,test} from "vitest";
import {validateCatalogue,planCatalogueImport} from "./importPlan.mjs";

const release=JSON.parse(readFileSync(new URL("./locations-2026-10-27.json",import.meta.url),"utf8"));
test("the expansion explicitly allows missing photos without accepting false photo credits",()=>{
 const {places}=release;
 expect(release.photoPolicy).toBe("verified-venues-may-await-photo");
 expect(()=>validateCatalogue(places,{requirePhoto:false})).not.toThrow();
 expect(planCatalogueImport(places,places,{requirePhoto:false}).create).toEqual([]);
 const without=places.find(p=>!p.imageUrl);
 expect(without).toBeTruthy();
 expect(()=>validateCatalogue([without])).toThrow(/photograph/);
 expect(()=>validateCatalogue([{...without,imageCredit:{author:"Someone",license:"CC0",sourceUrl:"https://commons.wikimedia.org/wiki/File:Missing.jpg"}}],{requirePhoto:false})).toThrow(/without/);
 for(const place of places.filter(p=>p.imageUrl)){
  const bytes=readFileSync(new URL(`../public${place.imageUrl}`,import.meta.url));
  expect(bytes.length).toBeGreaterThan(1024);expect(bytes.length).toBeLessThanOrEqual(600000);
  expect(bytes[0]===255&&bytes[1]===216||bytes.subarray(1,4).toString()==="PNG"||bytes.subarray(8,12).toString()==="WEBP").toBe(true);
 }
});
