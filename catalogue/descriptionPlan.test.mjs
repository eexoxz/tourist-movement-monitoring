import {expect,test} from "vitest";
import {planDescriptionUpdates} from "./descriptionPlan.mjs";

test("editorial updates are guarded, repeatable and preserve separately edited descriptions",()=>{
 const update={id:"place-a",beforeDescription:"Old approved copy",description:"A researched description. ".repeat(8),visitorStory:{theme:"community",highlights:["history","houses"]}};
 const row={id:update.id,description:update.beforeDescription,updateTime:"2026-10-27T00:00:00Z"};
 const planned=planDescriptionUpdates([update],[row]);
 expect(planned.change).toEqual([{id:update.id,description:update.description,visitorStory:update.visitorStory,updateTime:row.updateTime}]);
 expect(planDescriptionUpdates([update],[{...row,description:"An administrator's own new wording"}]).protectedRows).toHaveLength(1);
 expect(planDescriptionUpdates([update],[{...row,description:update.description,visitorStory:{highlights:update.visitorStory.highlights,theme:update.visitorStory.theme}}]).unchanged).toEqual([row.id]);
 expect(()=>planDescriptionUpdates([{...update,visitorCount:100}],[row])).toThrow(/unrelated/);
 expect(planDescriptionUpdates([update],[]).change).toEqual([]);
});
