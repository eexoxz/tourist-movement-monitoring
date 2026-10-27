import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {planDescriptionUpdates} from "./descriptionPlan.mjs";

const args=process.argv.slice(2);
const project=args[args.indexOf("--project")+1];
if(!args.includes("--project")||!/^[a-z][a-z0-9-]{4,62}$/.test(project??""))throw Error("Specify the Firebase project explicitly using --project.");
const require=createRequire(import.meta.url), root=fileURLToPath(new URL("../",import.meta.url));
const auth=require("firebase-tools/lib/auth.js"), account=auth.getProjectDefaultAccount(root);
if(!account)throw Error("An existing Firebase CLI login is required.");
const token=await auth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes||[]);
const endpoint=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const headers={Authorization:`Bearer ${token.access_token}`,"Content-Type":"application/json"};
const decode=value=>!value?undefined:"stringValue"in value?value.stringValue:"arrayValue"in value?(value.arrayValue.values??[]).map(decode):"mapValue"in value?Object.fromEntries(Object.entries(value.mapValue.fields??{}).map(([k,v])=>[k,decode(v)])):undefined;
const encode=value=>typeof value==="string"?{stringValue:value}:Array.isArray(value)?{arrayValue:{values:value.map(encode)}}:{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]))}};
const existing=[];let pageToken="";
do{
 const url=new URL(endpoint+"/destinations");url.searchParams.set("pageSize","1000");if(pageToken)url.searchParams.set("pageToken",pageToken);
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error("Catalogue read HTTP "+response.status);
 const result=await response.json();
 existing.push(...(result.documents??[]).map(doc=>({id:doc.name.split("/").at(-1),description:decode(doc.fields.description),visitorStory:decode(doc.fields.visitorStory),updateTime:doc.updateTime})));
 pageToken=result.nextPageToken??"";
}while(pageToken);
const {updates}=JSON.parse(await readFile(new URL("./description-enrichment-2026-10-27.json",import.meta.url),"utf8"));
const plan=planDescriptionUpdates(updates,existing);
console.log(JSON.stringify({project,changes:plan.change.length,unchanged:plan.unchanged.length,protected:plan.protectedRows},null,2));
if(!args.includes("--apply")){console.log("Dry run only. No writes performed.");process.exit(0);}
for(let offset=0;offset<plan.change.length;offset+=40){
 const batch=plan.change.slice(offset,offset+40);
 const response=await fetch(endpoint+":commit",{method:"POST",headers,signal:AbortSignal.timeout(30000),body:JSON.stringify({writes:batch.map(row=>({update:{name:`projects/${project}/databases/(default)/documents/destinations/${row.id}`,fields:{description:encode(row.description),visitorStory:encode(row.visitorStory)}},updateMask:{fieldPaths:["description","visitorStory"]},currentDocument:{updateTime:row.updateTime}}))})});
 if(!response.ok)throw Error("Editorial update stopped: HTTP "+response.status+". Re-run the dry run; no unrelated fields were written.");
 console.log(`Updated ${Math.min(offset+batch.length,plan.change.length)} / ${plan.change.length} descriptions.`);
}
