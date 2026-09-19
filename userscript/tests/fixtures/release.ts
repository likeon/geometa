import { scriptUrl } from '../../scripts/release.mjs';

export const scriptFixture = `// ==UserScript==
// @name         GeoGuessr Learnable Meta
// @namespace    geometa
// @version      0.96
// @updateURL    ${scriptUrl}
// @downloadURL  ${scriptUrl}
// @connect      learnablemeta.com
// ==/UserScript==
/* ## [0.96] */
(function () {})();
`;
export const sourceCommit = 'a'.repeat(40);
