# Testing Evidence

This file tracks implementation testing against the DPP test plan. Keep screenshots and user-testing notes in the report appendix later; this file is for project-side evidence.

## Automated Checks

| Check | Command | Current Result |
| --- | --- | --- |
| TypeScript and production build | `npm run build` | Passing |
| Service tests | `npm test` | Passing: 38 tests |

## DPP Test Mapping

| DPP ID | Area | Current Coverage |
| --- | --- | --- |
| FT1 | User registration | Covered by `src/services/accounts.test.ts` |
| FT2 | User login | Covered by `src/services/accounts.test.ts` |
| FT3 | Invalid login | Covered by `src/services/accounts.test.ts` |
| FT4 | Location permission | Covered at service level by `src/services/movement.test.ts` consent tests |
| FT5 | Location denied | Covered by tracking rejection when consent is missing |
| FT6 | Trip tracking | Covered by trip start, movement point saving, trip stop, and active-trip recovery tests |
| FT7 | Map route and destination markers | Implemented through `src/components/MapView.tsx`; final browser screenshot still needed |
| FT8 | Movement history | Covered by trip-specific route selection in the tourist history screen |
| FT9 | Destination details | Covered by selectable destination panel and detail view in the tourist overview |
| FT10 | Recommendation generation | Covered by `src/services/analytics.test.ts` |
| FT11 | Admin dashboard | Covered by `src/services/dashboard.test.ts` summary, filter, export, coverage, profile, and trend tests |
| FT12 | AI analysis display/data | Covered at service level by K-Means, Decision Tree, and evaluation tests |
| FT13 | Manage destination data | Covered by `src/services/destinationManagement.test.ts` |
| FT14 | Logout | Implemented in the app shell; final manual screenshot evidence still needed |
| NFT2 | Protected access | Covered by `src/services/access.test.ts` role-view guard tests |
| NFT3 | Privacy | Covered by consent requirement, consent revocation, and tourist data deletion tests |
| AIT1 | K-Means clustering | Confirms valid completed trips receive cluster records |
| AIT2 | Cluster interpretation | Confirms silhouette output and decision-path evidence are produced |
| AIT3 | Decision Tree classification | Confirms labelled demo profiles match predicted output |
| AIT4 | Recommendation logic | Confirms recommendation output is generated from movement/profile data |
| AIT5 | Insufficient data handling | Confirms fallback recommendations avoid misleading personalization |

## Manual Test Notes To Capture Later

| DPP ID | Manual Evidence Needed |
| --- | --- |
| FT1-FT3 | Registration, login, and invalid-login screenshots |
| FT4-FT6 | Browser location permission, denied permission, start/stop trip recording |
| FT7-FT9 | Map route display, movement history, destination detail selection |
| FT11, FT13, FT14 | Admin dashboard, destination management, logout |
| NFT1-NFT8 | Timing, browser compatibility, reliability repetition, maintainability review |
| UT1-UT7 | User task completion notes, completion time, satisfaction rating |
