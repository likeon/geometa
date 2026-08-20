// ==UserScript==
// @name         GeoGuessr Learnable Meta
// @namespace    geometa
// @version      0.95
// @description  UserScript for GeoGuessr Learnable Meta maps
// @icon         https://learnablemeta.com/favicon.png
// @downloadURL  https://github.com/likeon/geometa/raw/main/userscript/dist/geometa.user.js
// @updateURL    https://github.com/likeon/geometa/raw/main/userscript/dist/geometa.user.js
// @match        *://*.geoguessr.com/*
// @require      https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/5e449d6b64c828fce5d2915772d61c7f95263e34/geoguessr-event-framework.js
// @connect      learnablemeta.com
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==


/*
# Changelog

## [0.95]

- Added keyboard-accessible tabs for locations that belong to multiple metas
- Show each meta's own images, links, and GeoJSON overlay
- Load inactive meta details only when their tab is opened
- Allow GeoJSON overlays and downloads to be disabled from the userscript menu

## [0.94]

- Added GeoJSON overlays to GeoGuessr round results

## [0.93]

- Added live challenge support for the new GeoGuessr party lobby

## [0.92]

- Fixed updated maps still appearing as changed after publishing

## [0.91]

- Added map-group updates after syncing and from Creator Hub
- Detects changed GeoGuessr maps before updating
- Added map selection, publishing progress, and retries
- Refreshed dialogs and API token management

## [0.90]

- Added meta pins to challenge results
- Fixed meta window leaks and live challenge stacking
- Fixed stale map IDs after Map Maker navigation
- Updated the map label and upload UI for new GeoGuessr layouts
- Added API key management and clearer upload errors
- Isolated features so one failure does not disable the rest

## [0.89]

- Fixed meta window resize persistence and added a menu action to reset its saved layout.

## [0.88]

- Updated framework version for bug-fixes

## [0.87]

- Added ability to view metas on breakdown screen

## [0.86]

- Changed look of announcement closing button

## [0.85]

- Another fix for multiple instances of upload button

## [0.84]

- Fixed multiple instances of upload button, adjusted styles

## [0.83]

- Added uploading locations and announcements system

## [0.82]

- Changed position of LearnableMeta map label for new Geoguessr UI

## [0.81]

- Fixed live challenge support. Added information about userscript version and source of a call (map, challenge, liveChallenge) to location info request to help us with debugging issues.

## [0.80]

- Adjusted window dragging to work on mobile. Improved selection mechanism of elements with dynamic class names. Removed special handling of challenges.

## [0.79]

- Fixed ALM meta list panel when switching to non-ALM map

## [0.78]

- Added info window with version check

## [0.77]

- Added custom footer to the note and clicking on link warning

## [0.76]

- Redesign note and added meta list link

## [0.75]

- Added basic logging to help with debugging issues

## [0.74]

- Fixed window appearance when for some reason a negative position value is saved

## [0.73]

- Fixed live challenge support and updated framework to newest version

## [0.72]

- Adjusted images to fit vertically to the container to avoid scrolling and added magnifying glass effect on mouse hover

## [0.71]

- Added beta support for live challenges

## [0.70]

- Fixed carousel controls jumping and colored the note links

## [0.69]

- Display multiple images with carousel

## [0.68]

- Use panoId as unique location identifier, allow html in note

## [0.67]

- Updated to Svelte 5

## [0.66]

- Made note movable

## [0.65]

- Check map ids via API

## [0.64]

- Added more placeholder map ids

## [0.63]

- Added container resizing.

## [0.62]

- Added images to metas.

## [0.61]

- Added new/placehoder map ids.

## [0.6]

- Bugfixes

## [0.5]

- New note format and prepared for multiple maps support

## [0.4]

- Updated GeoGuessr Event Framework version. Fixes the disappearing daily challenge from GeoGuessr home page.

*/

(async function () {
  'use strict';

  const d=new Set;const importCSS = async e=>{d.has(e)||(d.add(e),(t=>{typeof GM_addStyle=="function"?GM_addStyle(t):(document.head||document.documentElement).appendChild(document.createElement("style")).append(t);})(e));};

  importCSS(` .loadership_ZOJAQ.svelte-f4erjd{display:flex;position:relative;width:72px;height:72px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd){position:absolute;width:8px;height:8px;border-radius:50%;background:#fff;animation:svelte-f4erjd-loadership_ZOJAQ_scale 1.2s infinite,svelte-f4erjd-loadership_ZOJAQ_fade 1.2s infinite;animation-timing-function:linear}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(1){animation-delay:0s;top:62px;left:32px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(2){animation-delay:-.1s;top:58px;left:47px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(3){animation-delay:-.2s;top:47px;left:58px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(4){animation-delay:-.3s;top:32px;left:62px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(5){animation-delay:-.4s;top:17px;left:58px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(6){animation-delay:-.5s;top:6px;left:47px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(7){animation-delay:-.6s;top:2px;left:32px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(8){animation-delay:-.7s;top:6px;left:17px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(9){animation-delay:-.8s;top:17px;left:6px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(10){animation-delay:-.9s;top:32px;left:2px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(11){animation-delay:-1s;top:47px;left:6px}.loadership_ZOJAQ.svelte-f4erjd div:where(.svelte-f4erjd):nth-child(12){animation-delay:-1.1s;top:58px;left:17px}@keyframes svelte-f4erjd-loadership_ZOJAQ_scale{0%,20%,80%,to{transform:scale(1)}50%{transform:scale(1.5)}}@keyframes svelte-f4erjd-loadership_ZOJAQ_fade{0%,20%,80%,to{opacity:.8}50%{opacity:1}}.fi.svelte-tdzec4{width:1.5em;height:1em;display:inline-block;vertical-align:middle;padding-right:3px}.carousel.svelte-8ojyxu{position:relative;overflow:hidden;margin:0 auto}.image-wrapper.svelte-8ojyxu{width:100%;height:100%;display:flex;justify-content:center;align-items:center;cursor:zoom-in}.responsive-image.svelte-8ojyxu{max-width:100%;height:100%;display:block;object-fit:contain}.lens.svelte-8ojyxu{position:absolute;pointer-events:none;border:2px solid #aaa;border-radius:50%;box-shadow:0 0 8px #00000080}.click-area.svelte-8ojyxu{position:absolute;top:0;bottom:0;width:1.4em;cursor:pointer}.prev-area.svelte-8ojyxu{left:0}.next-area.svelte-8ojyxu{right:0}.prev.svelte-8ojyxu,.next.svelte-8ojyxu{background-color:#00000080;color:#fff;border:none;font-size:1.2em;padding:.2em;cursor:pointer;pointer-events:auto;position:absolute;top:50%;transform:translateY(-50%)}.prev.svelte-8ojyxu{left:0}.next.svelte-8ojyxu{right:0}.indicators.svelte-8ojyxu{position:absolute;bottom:15px;left:50%;transform:translate(-50%);display:flex;justify-content:center;align-items:center;gap:8px}.indicator.svelte-8ojyxu{width:12px;height:12px;background-color:#ffffff80;border-radius:50%;cursor:pointer;border:none;padding:0;flex-shrink:0}.indicator.active.svelte-8ojyxu{background-color:#fff}.geometa-footer a{color:#188bd2;text-decoration:none}.geometa-footer a:hover{text-decoration:underline}.geometa-container.svelte-1j2rmt2{position:absolute;top:13rem;left:1rem;z-index:50;display:flex;flex-direction:column;gap:5px;align-items:flex-start;background:var(--ds-color-purple-100, #1c1836);color:#fff;padding:6px 10px;border-radius:5px;font-size:17px;line-height:1.4;width:min(25%,500px);resize:both;overflow:auto}.geometa-container.svelte-1j2rmt2 h2:where(.svelte-1j2rmt2){margin:0;font-size:1.2rem;font-weight:700}.geometa-container.svelte-1j2rmt2 p{margin:0}.geometa-container.svelte-1j2rmt2 ul,.geometa-container.svelte-1j2rmt2 ol{margin:0;padding:0;list-style:none}.geometa-container.svelte-1j2rmt2>.header:where(.svelte-1j2rmt2){margin-top:0}.geometa-footer.svelte-1j2rmt2{color:#d3d3d3;font-size:small}.meta-tabs.svelte-1j2rmt2{display:flex;flex-wrap:wrap;gap:4px;width:100%}.meta-panel.svelte-1j2rmt2{display:flex;flex-direction:column;gap:5px;align-items:flex-start;width:100%}.meta-tab.svelte-1j2rmt2{background:#ffffff14;color:#d3d3d3;border:1px solid transparent;border-radius:4px;padding:2px 8px;font:inherit;font-size:14px;line-height:1.3;text-transform:none;cursor:pointer}.meta-tab.svelte-1j2rmt2:hover{background:#ffffff29;color:#fff}.meta-tab.active.svelte-1j2rmt2{background:#188bd2;color:#fff}.meta-tab.svelte-1j2rmt2:focus-visible{outline:2px solid #fff;outline-offset:1px}.announcement.svelte-1j2rmt2{background-color:#e6f7ff;color:#0050b3;padding:8px 12px;border-radius:4px;font-size:14px;display:flex;justify-content:space-between;align-items:center;width:100%;box-sizing:border-box;margin-bottom:8px;border:1px solid #91d5ff}.announcement a{color:#0050b3;font-weight:700;text-decoration:underline}.announcement a:hover{color:#003a8c}.vote-close-btn.svelte-1j2rmt2{background-color:#b3d9ff;border:1px solid #0050b3;color:#0050b3;font-size:12px;cursor:pointer;padding:1px 10px;border-radius:4px;line-height:1;margin-left:5px;text-transform:none;transition:background-color .2s ease,color .2s ease,border-color .2s ease}.vote-close-btn.svelte-1j2rmt2:hover,.vote-close-btn.svelte-1j2rmt2:focus{background-color:#0050b3;color:#fff;border-color:#036;outline:none}a.svelte-1j2rmt2{color:#188bd2}a.svelte-1j2rmt2:hover{text-decoration:underline}.skill-icons--discord.svelte-1j2rmt2{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cg fill='none'%3E%3Crect width='256' height='256' fill='%235865f2' rx='60'/%3E%3Cg clip-path='url(%23skillIconsDiscord0)'%3E%3Cpath fill='%23ffffff' d='M197.308 64.797a165 165 0 0 0-40.709-12.627a.62.62 0 0 0-.654.31c-1.758 3.126-3.706 7.206-5.069 10.412c-15.373-2.302-30.666-2.302-45.723 0c-1.364-3.278-3.382-7.286-5.148-10.412a.64.64 0 0 0-.655-.31a164.5 164.5 0 0 0-40.709 12.627a.6.6 0 0 0-.268.23c-25.928 38.736-33.03 76.52-29.546 113.836a.7.7 0 0 0 .26.468c17.106 12.563 33.677 20.19 49.94 25.245a.65.65 0 0 0 .702-.23c3.847-5.254 7.276-10.793 10.217-16.618a.633.633 0 0 0-.347-.881c-5.44-2.064-10.619-4.579-15.601-7.436a.642.642 0 0 1-.063-1.064a86 86 0 0 0 3.098-2.428a.62.62 0 0 1 .646-.088c32.732 14.944 68.167 14.944 100.512 0a.62.62 0 0 1 .655.08a80 80 0 0 0 3.106 2.436a.642.642 0 0 1-.055 1.064a102.6 102.6 0 0 1-15.609 7.428a.64.64 0 0 0-.339.889a133 133 0 0 0 10.208 16.61a.64.64 0 0 0 .702.238c16.342-5.055 32.913-12.682 50.02-25.245a.65.65 0 0 0 .26-.46c4.17-43.141-6.985-80.616-29.571-113.836a.5.5 0 0 0-.26-.238M94.834 156.142c-9.855 0-17.975-9.047-17.975-20.158s7.963-20.158 17.975-20.158c10.09 0 18.131 9.127 17.973 20.158c0 11.111-7.962 20.158-17.973 20.158m66.456 0c-9.855 0-17.974-9.047-17.974-20.158s7.962-20.158 17.974-20.158c10.09 0 18.131 9.127 17.974 20.158c0 11.111-7.884 20.158-17.974 20.158'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='skillIconsDiscord0'%3E%3Cpath fill='%23ffffff' d='M28 51h200v154.93H28z'/%3E%3C/clipPath%3E%3C/defs%3E%3C/g%3E%3C/svg%3E")}.flat-color-icons--globe.svelte-1j2rmt2{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%237cb342' d='M24 4C13 4 4 13 4 24s9 20 20 20s20-9 20-20S35 4 24 4'/%3E%3Cpath fill='%230277bd' d='M45 24c0 11.7-9.5 21-21 21S3 35.7 3 24S12.3 3 24 3s21 9.3 21 21m-21.2 9.7c0-.4-.2-.6-.6-.8c-1.3-.4-2.5-.4-3.6-1.5c-.2-.4-.2-.8-.4-1.3c-.4-.4-1.5-.6-2.1-.8h-4.2c-.6-.2-1.1-1.1-1.5-1.7c0-.2 0-.6-.4-.6c-.4-.2-.8.2-1.3 0c-.2-.2-.2-.4-.2-.6c0-.6.4-1.3.8-1.7c.6-.4 1.3.2 1.9.2c.2 0 .2 0 .4.2c.6.2.8 1 .8 1.7v.4c0 .2.2.2.4.2c.2-1.1.2-2.1.4-3.2c0-1.3 1.3-2.5 2.3-2.9c.4-.2.6.2 1.1 0c1.3-.4 4.4-1.7 3.8-3.4c-.4-1.5-1.7-2.9-3.4-2.7c-.4.2-.6.4-1 .6c-.6.4-1.9 1.7-2.5 1.7c-1.1-.2-1.1-1.7-.8-2.3c.2-.8 2.1-3.6 3.4-3.1l.8.8c.4.2 1.1.2 1.7.2c.2 0 .4 0 .6-.2s.2-.2.2-.4c0-.6-.6-1.3-1-1.7s-1.1-.8-1.7-1.1c-2.1-.6-5.5.2-7.1 1.7s-2.9 4-3.8 6.1c-.4 1.3-.8 2.9-1 4.4c-.2 1-.4 1.9.2 2.9c.6 1.3 1.9 2.5 3.2 3.4c.8.6 2.5.6 3.4 1.7c.6.8.4 1.9.4 2.9c0 1.3.8 2.3 1.3 3.4c.2.6.4 1.5.6 2.1c0 .2.2 1.5.2 1.7c1.3.6 2.3 1.3 3.8 1.7c.2 0 1-1.3 1-1.5c.6-.6 1.1-1.5 1.7-1.9c.4-.2.8-.4 1.3-.8c.4-.4.6-1.3.8-1.9c.1-.5.3-1.3.1-1.9m.4-19.4c.2 0 .4-.2.8-.4c.6-.4 1.3-1.1 1.9-1.5s1.3-1.1 1.7-1.5c.6-.4 1.1-1.3 1.3-1.9c.2-.4.8-1.3.6-1.9c-.2-.4-1.3-.6-1.7-.8c-1.7-.4-3.1-.6-4.8-.6c-.6 0-1.5.2-1.7.8c-.2 1.1.6.8 1.5 1.1c0 0 .2 1.7.2 1.9c.2 1-.4 1.7-.4 2.7c0 .6 0 1.7.4 2.1zM41.8 29c.2-.4.2-1.1.4-1.5c.2-1 .2-2.1.2-3.1c0-2.1-.2-4.2-.8-6.1c-.4-.6-.6-1.3-.8-1.9c-.4-1.1-1-2.1-1.9-2.9c-.8-1.1-1.9-4-3.8-3.1c-.6.2-1 1-1.5 1.5c-.4.6-.8 1.3-1.3 1.9c-.2.2-.4.6-.2.8c0 .2.2.2.4.2c.4.2.6.2 1 .4c.2 0 .4.2.2.4c0 0 0 .2-.2.2c-1 1.1-2.1 1.9-3.1 2.9c-.2.2-.4.6-.4.8s.2.2.2.4s-.2.2-.4.4c-.4.2-.8.4-1.1.6c-.2.4 0 1.1-.2 1.5c-.2 1.1-.8 1.9-1.3 2.9c-.4.6-.6 1.3-1 1.9c0 .8-.2 1.5.2 2.1c1 1.5 2.9.6 4.4 1.3c.4.2.8.2 1.1.6c.6.6.6 1.7.8 2.3c.2.8.4 1.7.8 2.5c.2 1 .6 2.1.8 2.9c1.9-1.5 3.6-3.1 4.8-5.2c1.5-1.3 2.1-3 2.7-4.7'/%3E%3C/svg%3E")}.skill-icons--list.svelte-1j2rmt2{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%235865f2' d='M4 3h13.17c.41 0 .8.16 1.09.44l3.3 3.3c.29.29.44.68.44 1.09V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'/%3E%3Cpath fill='%23ffffff' d='M14 2v4h4l-4-4zM7 9h10v2H7V9zm0 4h7v2H7v-2z'/%3E%3C/svg%3E")}.question-mark-icon.svelte-1j2rmt2{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23188bd2' d='M21 2H3c-.55 0-1 .45-1 1v18c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1ZM12 18a1 1 0 1 1 1-1a1 1 0 0 1-1 1Zm2.07-5.25c-.9.52-.98 1.26-.98 1.75h-2c0-1.12.46-2.21 1.78-2.91c.9-.52 1.22-.87 1.22-1.34a1.5 1.5 0 0 0-3 0H9a3.5 3.5 0 0 1 7 0c0 1.63-1.28 2.41-1.93 2.75Z'/%3E%3C/svg%3E");cursor:pointer}.icons.svelte-1j2rmt2{display:inline-block;vertical-align:middle}.flex.svelte-1j2rmt2{display:flex;align-items:center}.icons.svelte-1j2rmt2 a:where(.svelte-1j2rmt2) span:where(.svelte-1j2rmt2){align-items:center;justify-content:center}hr.svelte-1j2rmt2{border:0;border-top:1px solid white;width:100%}.header.svelte-1j2rmt2{cursor:move;border-bottom:1px solid #aaa;width:100%;display:flex;justify-content:space-between;align-items:center;touch-action:none;-webkit-user-select:none;user-select:none}.geometa-note a{color:#188bd2}.geometa-note a:hover{text-decoration:underline}.geometa-note ul li{list-style-type:disc;margin-left:1rem}.geometa-note ol li{list-style-type:decimal;margin-left:1rem}.help-toggle-button.svelte-1j2rmt2{background:transparent;border:none;padding:0;cursor:pointer}.blink.svelte-1j2rmt2{animation:svelte-1j2rmt2-blink-animation 1s infinite}@keyframes svelte-1j2rmt2-blink-animation{0%{filter:brightness(1)}50%{filter:brightness(2);background-color:#004779}to{filter:brightness(1)}}.geometa-meta-btn{background:#188bd2;color:#fff;border:none;border-radius:3px;padding:2px 6px;font-size:11px;cursor:pointer;margin-left:10px;transition:background-color .2s ease;font-weight:700;z-index:1000;pointer-events:auto;display:inline-block}.result-list_listItemWrapper___XCGn{display:flex!important;justify-content:space-between!important;align-items:center!important}.geometa-meta-btn:hover{background:#0056b3}.geometa-pin-question{position:absolute;top:-8px;right:-8px;width:16px;height:16px;background:#188bd2;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;cursor:pointer;z-index:10000;transition:background-color .2s ease;border:1px solid white;box-shadow:0 1px 3px #0000004d}.geometa-pin-question:hover{background:#0056b3;transform:scale(1.1)}.geometa-map-label-container.svelte-1y99qco{background-color:#000000a6;color:#fff;text-align:center;z-index:100;position:absolute;bottom:4px;right:4px;box-sizing:border-box;border-radius:8px;padding:8px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;align-items:center;gap:8px}p.svelte-1y99qco{font-size:14px;font-weight:700}button.svelte-1y99qco{padding:6px 12px;font-size:12px;color:#fff;background-color:#4caf50;border:none;border-radius:4px;cursor:pointer}.toast-notification.svelte-w17ltc{position:fixed;top:72px;right:16px;z-index:10001;min-width:250px;max-width:400px;padding:14px 22px;border-radius:8px;box-shadow:0 5px 15px #0003;color:#fff;display:flex;align-items:flex-start;justify-content:space-between;font-size:.95em;line-height:1.4}.toast-success.svelte-w17ltc{background-color:#28a745;border-left:5px solid #1e7e34}.toast-error.svelte-w17ltc{background-color:#dc3545;border-left:5px solid #b02a37}.toast-info.svelte-w17ltc{background-color:#17a2b8;border-left:5px solid #117a8b}.toast-warning.svelte-w17ltc{background-color:#ffc107;color:#212529;border-left:5px solid #d39e00}.toast-content.svelte-w17ltc{flex-grow:1;margin-right:10px;display:flex;flex-direction:column;gap:6px}.toast-detail.svelte-w17ltc{font-size:.8em;line-height:1.35;opacity:.85;word-break:break-word;padding-top:6px;border-top:1px solid rgba(255,255,255,.35);-webkit-user-select:text;user-select:text}.toast-close-button.svelte-w17ltc{background:transparent;border:none;color:inherit;font-size:1.6em;font-weight:700;margin-left:10px;cursor:pointer;padding:0;line-height:1;opacity:.7;transition:opacity .2s ease}.toast-close-button.svelte-w17ltc:hover{opacity:1}.upload-label-container.svelte-1plj3lz{display:flex;align-items:center;gap:6px}.saved-key.svelte-1plj3lz{border-radius:4px;padding:2px 5px;background:var(--lm-muted);color:var(--lm-foreground);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px}.subtitle.svelte-axobi4{margin:6px 0 0;color:var(--lm-muted-foreground);font-size:14px}.map-update-close.svelte-axobi4{width:32px;height:32px;padding:0}.map-update-close.svelte-axobi4 svg:where(.svelte-axobi4){width:18px;height:18px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:2}.notice.svelte-axobi4,.fatal.svelte-axobi4,.summary.svelte-axobi4{margin:18px 24px 0;padding:13px 15px;border:1px solid var(--lm-border);border-radius:var(--lm-radius);background:var(--lm-muted);color:var(--lm-muted-foreground);font-size:14px;line-height:1.45}.fatal.svelte-axobi4{display:grid;gap:10px;border-color:#dc262659;background:#dc262617;color:var(--lm-destructive)}.fatal.svelte-axobi4 .learnablemeta-button:where(.svelte-axobi4){justify-self:start}.summary.svelte-axobi4{border-color:#16a34a4d;background:#16a34a1a;color:#166534}.toolbar.svelte-axobi4{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 24px 10px;color:var(--lm-muted-foreground);font-size:13px;font-weight:500}.toolbar.svelte-axobi4>div:where(.svelte-axobi4){display:flex;gap:4px}.group-list.svelte-axobi4{display:grid;gap:8px;overflow-y:auto;max-height:390px;margin:14px 24px 0;padding:1px}.group-row.svelte-axobi4{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;min-height:62px;border:1px solid var(--lm-border);border-radius:var(--lm-radius);padding:12px 14px;background:var(--lm-card);color:var(--lm-card-foreground);box-shadow:0 1px 2px #0000000d;text-align:left;cursor:pointer;transition:border-color .15s ease,background-color .15s ease,box-shadow .15s ease}.group-row.svelte-axobi4:hover{border-color:var(--lm-ring);background:color-mix(in srgb,var(--lm-primary) 6%,var(--lm-card));box-shadow:0 1px 4px #0000001a}.group-row.svelte-axobi4:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--lm-ring) 30%,transparent)}.group-details.svelte-axobi4{display:grid;min-width:0;gap:3px}.group-details.svelte-axobi4 strong:where(.svelte-axobi4){overflow:hidden;font-size:14px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.group-details.svelte-axobi4>span:where(.svelte-axobi4){color:var(--lm-muted-foreground);font-size:12px}.group-count.svelte-axobi4{display:inline-flex;flex:none;align-items:center;gap:6px;color:var(--lm-muted-foreground);font-size:12px;font-weight:500}.group-count.svelte-axobi4 svg:where(.svelte-axobi4){width:16px;height:16px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:2}.map-list.svelte-axobi4{overflow-y:auto;margin:0 24px;border:1px solid var(--lm-border);border-radius:var(--lm-radius);background:var(--lm-card)}.map-row.svelte-axobi4{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 14px;border-bottom:1px solid var(--lm-border);color:var(--lm-card-foreground);transition:background-color .15s ease}.map-row.svelte-axobi4:hover{background:var(--lm-muted)}.map-row.selected.svelte-axobi4{background:color-mix(in srgb,var(--lm-primary) 7%,var(--lm-card))}.map-row.svelte-axobi4:last-child{border-bottom:0}.map-row.error-row.svelte-axobi4{background:#dc26260f}.map-row.svelte-axobi4 input[type=checkbox]:where(.svelte-axobi4){width:16px;height:16px;accent-color:var(--lm-primary)}.map-details.svelte-axobi4{display:grid;min-width:0;gap:3px}.map-details.svelte-axobi4 strong:where(.svelte-axobi4){overflow:hidden;font-size:14px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.map-details.svelte-axobi4>span:where(.svelte-axobi4){color:var(--lm-muted-foreground);font-size:12px}.map-details.svelte-axobi4 .row-error:where(.svelte-axobi4){color:var(--lm-destructive);white-space:normal}.status.svelte-axobi4{padding:3px 8px;border:1px solid transparent;border-radius:calc(var(--lm-radius) - 2px);font-size:12px;font-weight:500;white-space:nowrap}.status.good.svelte-axobi4{border-color:#bbf7d0;background:#dcfce7;color:#166534}.status.warning.svelte-axobi4{border-color:#fde68a;background:#fef3c7;color:#854d0e}.status.bad.svelte-axobi4{border-color:#fecaca;background:#fee2e2;color:#991b1b}.status.working.svelte-axobi4{border-color:#bfdbfe;background:#dbeafe;color:#1e40af}.status.neutral.svelte-axobi4{border-color:var(--lm-border);background:var(--lm-muted);color:var(--lm-muted-foreground)}.token-form.svelte-axobi4{display:grid;gap:12px;padding:22px 24px 0}.token-form.svelte-axobi4 p:where(.svelte-axobi4){margin:0;font-size:14px;line-height:1.5}.token-form.svelte-axobi4 .small:where(.svelte-axobi4){color:var(--lm-muted-foreground);font-size:13px}.token-form.svelte-axobi4 a:where(.svelte-axobi4){color:var(--lm-link);text-underline-offset:3px}.token-actions.svelte-axobi4{margin:8px -24px 0}.error-text.svelte-axobi4{margin:0;color:var(--lm-destructive);font-size:13px}@media(prefers-color-scheme:dark){.summary.svelte-axobi4{color:#86efac}.status.good.svelte-axobi4{border-color:#22c55e66;background:#16a34a2e;color:#86efac}.status.warning.svelte-axobi4{border-color:#f59e0b66;background:#b4530933;color:#fde68a}.status.bad.svelte-axobi4{border-color:#ef444466;background:#b91c1c33;color:#fca5a5}.status.working.svelte-axobi4{border-color:#3b82f666;background:#1e40af38;color:#93c5fd}}@media(max-width:620px){.map-row.svelte-axobi4{grid-template-columns:22px minmax(0,1fr)}.group-details.svelte-axobi4>span:where(.svelte-axobi4){display:none}.status.svelte-axobi4{grid-column:2;justify-self:start}} `);

  var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
  var _GM_info = (() => typeof GM_info != "undefined" ? GM_info : void 0)();
  var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
  var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
  var _GM_xmlhttpRequest = (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
  var _unsafeWindow = (() => typeof unsafeWindow != "undefined" ? unsafeWindow : void 0)();
  const DEV = false;
  var is_array = Array.isArray;
  var index_of = Array.prototype.indexOf;
  var array_from = Array.from;
  var define_property = Object.defineProperty;
  var get_descriptor = Object.getOwnPropertyDescriptor;
  var get_descriptors = Object.getOwnPropertyDescriptors;
  var object_prototype = Object.prototype;
  var array_prototype = Array.prototype;
  var get_prototype_of = Object.getPrototypeOf;
  var is_extensible = Object.isExtensible;
  function is_function(thing) {
    return typeof thing === "function";
  }
  const noop = () => {
  };
  function is_promise(value) {
    return typeof value?.then === "function";
  }
  function run(fn) {
    return fn();
  }
  function run_all(arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i]();
    }
  }
  function deferred() {
    var resolve;
    var reject;
    var promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }
  const DERIVED = 1 << 1;
  const EFFECT = 1 << 2;
  const RENDER_EFFECT = 1 << 3;
  const BLOCK_EFFECT = 1 << 4;
  const BRANCH_EFFECT = 1 << 5;
  const ROOT_EFFECT = 1 << 6;
  const BOUNDARY_EFFECT = 1 << 7;
  const CONNECTED = 1 << 9;
  const CLEAN = 1 << 10;
  const DIRTY = 1 << 11;
  const MAYBE_DIRTY = 1 << 12;
  const INERT = 1 << 13;
  const DESTROYED = 1 << 14;
  const EFFECT_RAN = 1 << 15;
  const EFFECT_TRANSPARENT = 1 << 16;
  const EAGER_EFFECT = 1 << 17;
  const HEAD_EFFECT = 1 << 18;
  const EFFECT_PRESERVED = 1 << 19;
  const USER_EFFECT = 1 << 20;
  const WAS_MARKED = 1 << 15;
  const REACTION_IS_UPDATING = 1 << 21;
  const ASYNC = 1 << 22;
  const ERROR_VALUE = 1 << 23;
  const STATE_SYMBOL = Symbol("$state");
  const LEGACY_PROPS = Symbol("legacy props");
  const LOADING_ATTR_SYMBOL = Symbol("");
  const STALE_REACTION = new class StaleReactionError extends Error {
    name = "StaleReactionError";
    message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
  }();
  function lifecycle_outside_component(name) {
    {
      throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
    }
  }
  function async_derived_orphan() {
    {
      throw new Error(`https://svelte.dev/e/async_derived_orphan`);
    }
  }
  function effect_in_teardown(rune) {
    {
      throw new Error(`https://svelte.dev/e/effect_in_teardown`);
    }
  }
  function effect_in_unowned_derived() {
    {
      throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
    }
  }
  function effect_orphan(rune) {
    {
      throw new Error(`https://svelte.dev/e/effect_orphan`);
    }
  }
  function effect_update_depth_exceeded() {
    {
      throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
    }
  }
  function props_invalid_value(key2) {
    {
      throw new Error(`https://svelte.dev/e/props_invalid_value`);
    }
  }
  function state_descriptors_fixed() {
    {
      throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
    }
  }
  function state_prototype_fixed() {
    {
      throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
    }
  }
  function state_unsafe_mutation() {
    {
      throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
    }
  }
  function svelte_boundary_reset_onerror() {
    {
      throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
    }
  }
  const EACH_ITEM_REACTIVE = 1;
  const EACH_INDEX_REACTIVE = 1 << 1;
  const EACH_IS_CONTROLLED = 1 << 2;
  const EACH_IS_ANIMATED = 1 << 3;
  const EACH_ITEM_IMMUTABLE = 1 << 4;
  const PROPS_IS_IMMUTABLE = 1;
  const PROPS_IS_RUNES = 1 << 1;
  const PROPS_IS_UPDATED = 1 << 2;
  const PROPS_IS_BINDABLE = 1 << 3;
  const PROPS_IS_LAZY_INITIAL = 1 << 4;
  const TRANSITION_IN = 1;
  const TRANSITION_OUT = 1 << 1;
  const TRANSITION_GLOBAL = 1 << 2;
  const TEMPLATE_FRAGMENT = 1;
  const TEMPLATE_USE_IMPORT_NODE = 1 << 1;
  const UNINITIALIZED = Symbol();
  const NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
  function svelte_boundary_reset_noop() {
    {
      console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
    }
  }
  let hydrating = false;
  function equals(value) {
    return value === this.v;
  }
  function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
  }
  function safe_equals(value) {
    return !safe_not_equal(value, this.v);
  }
  let legacy_mode_flag = false;
  let tracing_mode_flag = false;
  function enable_legacy_mode_flag() {
    legacy_mode_flag = true;
  }
  let component_context = null;
  function set_component_context(context) {
    component_context = context;
  }
  function push(props, runes = false, fn) {
    component_context = {
      p: component_context,
      i: false,
      c: null,
      e: null,
      s: props,
      x: null,
      l: legacy_mode_flag && !runes ? { s: null, u: null, $: [] } : null
    };
  }
  function pop(component) {
    var context = (
component_context
    );
    var effects = context.e;
    if (effects !== null) {
      context.e = null;
      for (var fn of effects) {
        create_user_effect(fn);
      }
    }
    context.i = true;
    component_context = context.p;
    return (
{}
    );
  }
  function is_runes() {
    return !legacy_mode_flag || component_context !== null && component_context.l === null;
  }
  let micro_tasks = [];
  function run_micro_tasks() {
    var tasks = micro_tasks;
    micro_tasks = [];
    run_all(tasks);
  }
  function queue_micro_task(fn) {
    if (micro_tasks.length === 0 && !is_flushing_sync) {
      var tasks = micro_tasks;
      queueMicrotask(() => {
        if (tasks === micro_tasks) run_micro_tasks();
      });
    }
    micro_tasks.push(fn);
  }
  function flush_tasks() {
    while (micro_tasks.length > 0) {
      run_micro_tasks();
    }
  }
  function handle_error(error) {
    var effect2 = active_effect;
    if (effect2 === null) {
      active_reaction.f |= ERROR_VALUE;
      return error;
    }
    if ((effect2.f & EFFECT_RAN) === 0) {
      if ((effect2.f & BOUNDARY_EFFECT) === 0) {
        throw error;
      }
      effect2.b.error(error);
    } else {
      invoke_error_boundary(error, effect2);
    }
  }
  function invoke_error_boundary(error, effect2) {
    while (effect2 !== null) {
      if ((effect2.f & BOUNDARY_EFFECT) !== 0) {
        try {
          effect2.b.error(error);
          return;
        } catch (e) {
          error = e;
        }
      }
      effect2 = effect2.parent;
    }
    throw error;
  }
  const batches = new Set();
  let current_batch = null;
  let previous_batch = null;
  let batch_values = null;
  let queued_root_effects = [];
  let last_scheduled_effect = null;
  let is_flushing = false;
  let is_flushing_sync = false;
  class Batch {
    committed = false;
current = new Map();
previous = new Map();
#commit_callbacks = new Set();
#discard_callbacks = new Set();
#pending = 0;
#blocking_pending = 0;
#deferred = null;
#dirty_effects = [];
#maybe_dirty_effects = [];
skipped_effects = new Set();
    is_fork = false;
process(root_effects) {
      queued_root_effects = [];
      previous_batch = null;
      this.apply();
      var target = {
        parent: null,
        effect: null,
        effects: [],
        render_effects: [],
        block_effects: []
      };
      for (const root2 of root_effects) {
        this.#traverse_effect_tree(root2, target);
      }
      if (!this.is_fork) {
        this.#resolve();
      }
      if (this.#blocking_pending > 0 || this.is_fork) {
        this.#defer_effects(target.effects);
        this.#defer_effects(target.render_effects);
        this.#defer_effects(target.block_effects);
      } else {
        previous_batch = this;
        current_batch = null;
        flush_queued_effects(target.render_effects);
        flush_queued_effects(target.effects);
        previous_batch = null;
        this.#deferred?.resolve();
      }
      batch_values = null;
    }
#traverse_effect_tree(root2, target) {
      root2.f ^= CLEAN;
      var effect2 = root2.first;
      while (effect2 !== null) {
        var flags2 = effect2.f;
        var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
        var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
        var skip = is_skippable_branch || (flags2 & INERT) !== 0 || this.skipped_effects.has(effect2);
        if ((effect2.f & BOUNDARY_EFFECT) !== 0 && effect2.b?.is_pending()) {
          target = {
            parent: target,
            effect: effect2,
            effects: [],
            render_effects: [],
            block_effects: []
          };
        }
        if (!skip && effect2.fn !== null) {
          if (is_branch) {
            effect2.f ^= CLEAN;
          } else if ((flags2 & EFFECT) !== 0) {
            target.effects.push(effect2);
          } else if (is_dirty(effect2)) {
            if ((effect2.f & BLOCK_EFFECT) !== 0) target.block_effects.push(effect2);
            update_effect(effect2);
          }
          var child2 = effect2.first;
          if (child2 !== null) {
            effect2 = child2;
            continue;
          }
        }
        var parent = effect2.parent;
        effect2 = effect2.next;
        while (effect2 === null && parent !== null) {
          if (parent === target.effect) {
            this.#defer_effects(target.effects);
            this.#defer_effects(target.render_effects);
            this.#defer_effects(target.block_effects);
            target =
target.parent;
          }
          effect2 = parent.next;
          parent = parent.parent;
        }
      }
    }
#defer_effects(effects) {
      for (const e of effects) {
        const target = (e.f & DIRTY) !== 0 ? this.#dirty_effects : this.#maybe_dirty_effects;
        target.push(e);
        set_signal_status(e, CLEAN);
      }
    }
capture(source2, value) {
      if (!this.previous.has(source2)) {
        this.previous.set(source2, value);
      }
      if ((source2.f & ERROR_VALUE) === 0) {
        this.current.set(source2, source2.v);
        batch_values?.set(source2, source2.v);
      }
    }
    activate() {
      current_batch = this;
      this.apply();
    }
    deactivate() {
      current_batch = null;
      batch_values = null;
    }
    flush() {
      this.activate();
      if (queued_root_effects.length > 0) {
        flush_effects();
        if (current_batch !== null && current_batch !== this) {
          return;
        }
      } else if (this.#pending === 0) {
        this.process([]);
      }
      this.deactivate();
    }
    discard() {
      for (const fn of this.#discard_callbacks) fn(this);
      this.#discard_callbacks.clear();
    }
    #resolve() {
      if (this.#blocking_pending === 0) {
        for (const fn of this.#commit_callbacks) fn();
        this.#commit_callbacks.clear();
      }
      if (this.#pending === 0) {
        this.#commit();
      }
    }
    #commit() {
      if (batches.size > 1) {
        this.previous.clear();
        var previous_batch_values = batch_values;
        var is_earlier = true;
        var dummy_target = {
          parent: null,
          effect: null,
          effects: [],
          render_effects: [],
          block_effects: []
        };
        for (const batch of batches) {
          if (batch === this) {
            is_earlier = false;
            continue;
          }
          const sources = [];
          for (const [source2, value] of this.current) {
            if (batch.current.has(source2)) {
              if (is_earlier && value !== batch.current.get(source2)) {
                batch.current.set(source2, value);
              } else {
                continue;
              }
            }
            sources.push(source2);
          }
          if (sources.length === 0) {
            continue;
          }
          const others = [...batch.current.keys()].filter((s) => !this.current.has(s));
          if (others.length > 0) {
            const marked = new Set();
            const checked = new Map();
            for (const source2 of sources) {
              mark_effects(source2, others, marked, checked);
            }
            if (queued_root_effects.length > 0) {
              current_batch = batch;
              batch.apply();
              for (const root2 of queued_root_effects) {
                batch.#traverse_effect_tree(root2, dummy_target);
              }
              queued_root_effects = [];
              batch.deactivate();
            }
          }
        }
        current_batch = null;
        batch_values = previous_batch_values;
      }
      this.committed = true;
      batches.delete(this);
    }
increment(blocking) {
      this.#pending += 1;
      if (blocking) this.#blocking_pending += 1;
    }
decrement(blocking) {
      this.#pending -= 1;
      if (blocking) this.#blocking_pending -= 1;
      this.revive();
    }
    revive() {
      for (const e of this.#dirty_effects) {
        set_signal_status(e, DIRTY);
        schedule_effect(e);
      }
      for (const e of this.#maybe_dirty_effects) {
        set_signal_status(e, MAYBE_DIRTY);
        schedule_effect(e);
      }
      this.#dirty_effects = [];
      this.#maybe_dirty_effects = [];
      this.flush();
    }
oncommit(fn) {
      this.#commit_callbacks.add(fn);
    }
ondiscard(fn) {
      this.#discard_callbacks.add(fn);
    }
    settled() {
      return (this.#deferred ??= deferred()).promise;
    }
    static ensure() {
      if (current_batch === null) {
        const batch = current_batch = new Batch();
        batches.add(current_batch);
        if (!is_flushing_sync) {
          Batch.enqueue(() => {
            if (current_batch !== batch) {
              return;
            }
            batch.flush();
          });
        }
      }
      return current_batch;
    }
static enqueue(task) {
      queue_micro_task(task);
    }
    apply() {
      return;
    }
  }
  function flushSync(fn) {
    var was_flushing_sync = is_flushing_sync;
    is_flushing_sync = true;
    try {
      var result;
      if (fn) ;
      while (true) {
        flush_tasks();
        if (queued_root_effects.length === 0) {
          current_batch?.flush();
          if (queued_root_effects.length === 0) {
            last_scheduled_effect = null;
            return (
result
            );
          }
        }
        flush_effects();
      }
    } finally {
      is_flushing_sync = was_flushing_sync;
    }
  }
  function flush_effects() {
    var was_updating_effect = is_updating_effect;
    is_flushing = true;
    try {
      var flush_count = 0;
      set_is_updating_effect(true);
      while (queued_root_effects.length > 0) {
        var batch = Batch.ensure();
        if (flush_count++ > 1e3) {
          var updates, entry;
          if (DEV) ;
          infinite_loop_guard();
        }
        batch.process(queued_root_effects);
        old_values.clear();
      }
    } finally {
      is_flushing = false;
      set_is_updating_effect(was_updating_effect);
      last_scheduled_effect = null;
    }
  }
  function infinite_loop_guard() {
    try {
      effect_update_depth_exceeded();
    } catch (error) {
      invoke_error_boundary(error, last_scheduled_effect);
    }
  }
  let eager_block_effects = null;
  function flush_queued_effects(effects) {
    var length = effects.length;
    if (length === 0) return;
    var i = 0;
    while (i < length) {
      var effect2 = effects[i++];
      if ((effect2.f & (DESTROYED | INERT)) === 0 && is_dirty(effect2)) {
        eager_block_effects = new Set();
        update_effect(effect2);
        if (effect2.deps === null && effect2.first === null && effect2.nodes_start === null) {
          if (effect2.teardown === null && effect2.ac === null) {
            unlink_effect(effect2);
          } else {
            effect2.fn = null;
          }
        }
        if (eager_block_effects?.size > 0) {
          old_values.clear();
          for (const e of eager_block_effects) {
            if ((e.f & (DESTROYED | INERT)) !== 0) continue;
            const ordered_effects = [e];
            let ancestor = e.parent;
            while (ancestor !== null) {
              if (eager_block_effects.has(ancestor)) {
                eager_block_effects.delete(ancestor);
                ordered_effects.push(ancestor);
              }
              ancestor = ancestor.parent;
            }
            for (let j = ordered_effects.length - 1; j >= 0; j--) {
              const e2 = ordered_effects[j];
              if ((e2.f & (DESTROYED | INERT)) !== 0) continue;
              update_effect(e2);
            }
          }
          eager_block_effects.clear();
        }
      }
    }
    eager_block_effects = null;
  }
  function mark_effects(value, sources, marked, checked) {
    if (marked.has(value)) return;
    marked.add(value);
    if (value.reactions !== null) {
      for (const reaction of value.reactions) {
        const flags2 = reaction.f;
        if ((flags2 & DERIVED) !== 0) {
          mark_effects(
reaction,
            sources,
            marked,
            checked
          );
        } else if ((flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 && (flags2 & DIRTY) === 0 &&
depends_on(reaction, sources, checked)) {
          set_signal_status(reaction, DIRTY);
          schedule_effect(
reaction
          );
        }
      }
    }
  }
  function depends_on(reaction, sources, checked) {
    const depends = checked.get(reaction);
    if (depends !== void 0) return depends;
    if (reaction.deps !== null) {
      for (const dep of reaction.deps) {
        if (sources.includes(dep)) {
          return true;
        }
        if ((dep.f & DERIVED) !== 0 && depends_on(
dep,
          sources,
          checked
        )) {
          checked.set(
dep,
            true
          );
          return true;
        }
      }
    }
    checked.set(reaction, false);
    return false;
  }
  function schedule_effect(signal) {
    var effect2 = last_scheduled_effect = signal;
    while (effect2.parent !== null) {
      effect2 = effect2.parent;
      var flags2 = effect2.f;
      if (is_flushing && effect2 === active_effect && (flags2 & BLOCK_EFFECT) !== 0 && (flags2 & HEAD_EFFECT) === 0) {
        return;
      }
      if ((flags2 & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
        if ((flags2 & CLEAN) === 0) return;
        effect2.f ^= CLEAN;
      }
    }
    queued_root_effects.push(effect2);
  }
  function createSubscriber(start) {
    let subscribers = 0;
    let version = source(0);
    let stop;
    return () => {
      if (effect_tracking()) {
        get(version);
        render_effect(() => {
          if (subscribers === 0) {
            stop = untrack(() => start(() => increment(version)));
          }
          subscribers += 1;
          return () => {
            queue_micro_task(() => {
              subscribers -= 1;
              if (subscribers === 0) {
                stop?.();
                stop = void 0;
                increment(version);
              }
            });
          };
        });
      }
    };
  }
  var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED | BOUNDARY_EFFECT;
  function boundary(node, props, children) {
    new Boundary(node, props, children);
  }
  class Boundary {
parent;
    #pending = false;
#anchor;
#hydrate_open = null;
#props;
#children;
#effect;
#main_effect = null;
#pending_effect = null;
#failed_effect = null;
#offscreen_fragment = null;
#pending_anchor = null;
    #local_pending_count = 0;
    #pending_count = 0;
    #is_creating_fallback = false;
#effect_pending = null;
    #effect_pending_subscriber = createSubscriber(() => {
      this.#effect_pending = source(this.#local_pending_count);
      return () => {
        this.#effect_pending = null;
      };
    });
constructor(node, props, children) {
      this.#anchor = node;
      this.#props = props;
      this.#children = children;
      this.parent =
active_effect.b;
      this.#pending = !!this.#props.pending;
      this.#effect = block(() => {
        active_effect.b = this;
        {
          var anchor = this.#get_anchor();
          try {
            this.#main_effect = branch(() => children(anchor));
          } catch (error) {
            this.error(error);
          }
          if (this.#pending_count > 0) {
            this.#show_pending_snippet();
          } else {
            this.#pending = false;
          }
        }
        return () => {
          this.#pending_anchor?.remove();
        };
      }, flags);
    }
    #hydrate_resolved_content() {
      try {
        this.#main_effect = branch(() => this.#children(this.#anchor));
      } catch (error) {
        this.error(error);
      }
      this.#pending = false;
    }
    #hydrate_pending_content() {
      const pending = this.#props.pending;
      if (!pending) {
        return;
      }
      this.#pending_effect = branch(() => pending(this.#anchor));
      Batch.enqueue(() => {
        var anchor = this.#get_anchor();
        this.#main_effect = this.#run(() => {
          Batch.ensure();
          return branch(() => this.#children(anchor));
        });
        if (this.#pending_count > 0) {
          this.#show_pending_snippet();
        } else {
          pause_effect(
this.#pending_effect,
            () => {
              this.#pending_effect = null;
            }
          );
          this.#pending = false;
        }
      });
    }
    #get_anchor() {
      var anchor = this.#anchor;
      if (this.#pending) {
        this.#pending_anchor = create_text();
        this.#anchor.before(this.#pending_anchor);
        anchor = this.#pending_anchor;
      }
      return anchor;
    }
is_pending() {
      return this.#pending || !!this.parent && this.parent.is_pending();
    }
    has_pending_snippet() {
      return !!this.#props.pending;
    }
#run(fn) {
      var previous_effect = active_effect;
      var previous_reaction = active_reaction;
      var previous_ctx = component_context;
      set_active_effect(this.#effect);
      set_active_reaction(this.#effect);
      set_component_context(this.#effect.ctx);
      try {
        return fn();
      } catch (e) {
        handle_error(e);
        return null;
      } finally {
        set_active_effect(previous_effect);
        set_active_reaction(previous_reaction);
        set_component_context(previous_ctx);
      }
    }
    #show_pending_snippet() {
      const pending = (
this.#props.pending
      );
      if (this.#main_effect !== null) {
        this.#offscreen_fragment = document.createDocumentFragment();
        this.#offscreen_fragment.append(
this.#pending_anchor
        );
        move_effect(this.#main_effect, this.#offscreen_fragment);
      }
      if (this.#pending_effect === null) {
        this.#pending_effect = branch(() => pending(this.#anchor));
      }
    }
#update_pending_count(d) {
      if (!this.has_pending_snippet()) {
        if (this.parent) {
          this.parent.#update_pending_count(d);
        }
        return;
      }
      this.#pending_count += d;
      if (this.#pending_count === 0) {
        this.#pending = false;
        if (this.#pending_effect) {
          pause_effect(this.#pending_effect, () => {
            this.#pending_effect = null;
          });
        }
        if (this.#offscreen_fragment) {
          this.#anchor.before(this.#offscreen_fragment);
          this.#offscreen_fragment = null;
        }
      }
    }
update_pending_count(d) {
      this.#update_pending_count(d);
      this.#local_pending_count += d;
      if (this.#effect_pending) {
        internal_set(this.#effect_pending, this.#local_pending_count);
      }
    }
    get_effect_pending() {
      this.#effect_pending_subscriber();
      return get(
this.#effect_pending
      );
    }
error(error) {
      var onerror = this.#props.onerror;
      let failed = this.#props.failed;
      if (this.#is_creating_fallback || !onerror && !failed) {
        throw error;
      }
      if (this.#main_effect) {
        destroy_effect(this.#main_effect);
        this.#main_effect = null;
      }
      if (this.#pending_effect) {
        destroy_effect(this.#pending_effect);
        this.#pending_effect = null;
      }
      if (this.#failed_effect) {
        destroy_effect(this.#failed_effect);
        this.#failed_effect = null;
      }
      var did_reset = false;
      var calling_on_error = false;
      const reset = () => {
        if (did_reset) {
          svelte_boundary_reset_noop();
          return;
        }
        did_reset = true;
        if (calling_on_error) {
          svelte_boundary_reset_onerror();
        }
        Batch.ensure();
        this.#local_pending_count = 0;
        if (this.#failed_effect !== null) {
          pause_effect(this.#failed_effect, () => {
            this.#failed_effect = null;
          });
        }
        this.#pending = this.has_pending_snippet();
        this.#main_effect = this.#run(() => {
          this.#is_creating_fallback = false;
          return branch(() => this.#children(this.#anchor));
        });
        if (this.#pending_count > 0) {
          this.#show_pending_snippet();
        } else {
          this.#pending = false;
        }
      };
      var previous_reaction = active_reaction;
      try {
        set_active_reaction(null);
        calling_on_error = true;
        onerror?.(error, reset);
        calling_on_error = false;
      } catch (error2) {
        invoke_error_boundary(error2, this.#effect && this.#effect.parent);
      } finally {
        set_active_reaction(previous_reaction);
      }
      if (failed) {
        queue_micro_task(() => {
          this.#failed_effect = this.#run(() => {
            Batch.ensure();
            this.#is_creating_fallback = true;
            try {
              return branch(() => {
                failed(
                  this.#anchor,
                  () => error,
                  () => reset
                );
              });
            } catch (error2) {
              invoke_error_boundary(
                error2,
this.#effect.parent
              );
              return null;
            } finally {
              this.#is_creating_fallback = false;
            }
          });
        });
      }
    }
  }
  function flatten(blockers, sync, async, fn) {
    const d = is_runes() ? derived : derived_safe_equal;
    if (async.length === 0 && blockers.length === 0) {
      fn(sync.map(d));
      return;
    }
    var batch = current_batch;
    var parent = (
active_effect
    );
    var restore = capture();
    function run2() {
      Promise.all(async.map((expression) => async_derived(expression))).then((result) => {
        restore();
        try {
          fn([...sync.map(d), ...result]);
        } catch (error) {
          if ((parent.f & DESTROYED) === 0) {
            invoke_error_boundary(error, parent);
          }
        }
        batch?.deactivate();
        unset_context();
      }).catch((error) => {
        invoke_error_boundary(error, parent);
      });
    }
    if (blockers.length > 0) {
      Promise.all(blockers).then(() => {
        restore();
        try {
          return run2();
        } finally {
          batch?.deactivate();
          unset_context();
        }
      });
    } else {
      run2();
    }
  }
  function capture() {
    var previous_effect = active_effect;
    var previous_reaction = active_reaction;
    var previous_component_context = component_context;
    var previous_batch2 = current_batch;
    return function restore(activate_batch = true) {
      set_active_effect(previous_effect);
      set_active_reaction(previous_reaction);
      set_component_context(previous_component_context);
      if (activate_batch) previous_batch2?.activate();
    };
  }
  function unset_context() {
    set_active_effect(null);
    set_active_reaction(null);
    set_component_context(null);
  }
function derived(fn) {
    var flags2 = DERIVED | DIRTY;
    var parent_derived = active_reaction !== null && (active_reaction.f & DERIVED) !== 0 ? (
active_reaction
    ) : null;
    if (active_effect !== null) {
      active_effect.f |= EFFECT_PRESERVED;
    }
    const signal = {
      ctx: component_context,
      deps: null,
      effects: null,
      equals,
      f: flags2,
      fn,
      reactions: null,
      rv: 0,
      v: (
UNINITIALIZED
      ),
      wv: 0,
      parent: parent_derived ?? active_effect,
      ac: null
    };
    return signal;
  }
function async_derived(fn, location2) {
    let parent = (
active_effect
    );
    if (parent === null) {
      async_derived_orphan();
    }
    var boundary2 = (
parent.b
    );
    var promise = (

void 0
    );
    var signal = source(
UNINITIALIZED
    );
    var should_suspend = !active_reaction;
    var deferreds = new Map();
    async_effect(() => {
      var d = deferred();
      promise = d.promise;
      try {
        Promise.resolve(fn()).then(d.resolve, d.reject).then(() => {
          if (batch === current_batch && batch.committed) {
            batch.deactivate();
          }
          unset_context();
        });
      } catch (error) {
        d.reject(error);
        unset_context();
      }
      var batch = (
current_batch
      );
      if (should_suspend) {
        var blocking = !boundary2.is_pending();
        boundary2.update_pending_count(1);
        batch.increment(blocking);
        deferreds.get(batch)?.reject(STALE_REACTION);
        deferreds.delete(batch);
        deferreds.set(batch, d);
      }
      const handler = (value, error = void 0) => {
        batch.activate();
        if (error) {
          if (error !== STALE_REACTION) {
            signal.f |= ERROR_VALUE;
            internal_set(signal, error);
          }
        } else {
          if ((signal.f & ERROR_VALUE) !== 0) {
            signal.f ^= ERROR_VALUE;
          }
          internal_set(signal, value);
          for (const [b, d2] of deferreds) {
            deferreds.delete(b);
            if (b === batch) break;
            d2.reject(STALE_REACTION);
          }
        }
        if (should_suspend) {
          boundary2.update_pending_count(-1);
          batch.decrement(blocking);
        }
      };
      d.promise.then(handler, (e) => handler(null, e || "unknown"));
    });
    teardown(() => {
      for (const d of deferreds.values()) {
        d.reject(STALE_REACTION);
      }
    });
    return new Promise((fulfil) => {
      function next(p) {
        function go() {
          if (p === promise) {
            fulfil(signal);
          } else {
            next(promise);
          }
        }
        p.then(go, go);
      }
      next(promise);
    });
  }
function user_derived(fn) {
    const d = derived(fn);
    push_reaction_value(d);
    return d;
  }
function derived_safe_equal(fn) {
    const signal = derived(fn);
    signal.equals = safe_equals;
    return signal;
  }
  function destroy_derived_effects(derived2) {
    var effects = derived2.effects;
    if (effects !== null) {
      derived2.effects = null;
      for (var i = 0; i < effects.length; i += 1) {
        destroy_effect(
effects[i]
        );
      }
    }
  }
  function get_derived_parent_effect(derived2) {
    var parent = derived2.parent;
    while (parent !== null) {
      if ((parent.f & DERIVED) === 0) {
        return (
parent
        );
      }
      parent = parent.parent;
    }
    return null;
  }
  function execute_derived(derived2) {
    var value;
    var prev_active_effect = active_effect;
    set_active_effect(get_derived_parent_effect(derived2));
    {
      try {
        derived2.f &= ~WAS_MARKED;
        destroy_derived_effects(derived2);
        value = update_reaction(derived2);
      } finally {
        set_active_effect(prev_active_effect);
      }
    }
    return value;
  }
  function update_derived(derived2) {
    var value = execute_derived(derived2);
    if (!derived2.equals(value)) {
      derived2.v = value;
      derived2.wv = increment_write_version();
    }
    if (is_destroying_effect) {
      return;
    }
    if (batch_values !== null) {
      if (effect_tracking()) {
        batch_values.set(derived2, derived2.v);
      }
    } else {
      var status = (derived2.f & CONNECTED) === 0 ? MAYBE_DIRTY : CLEAN;
      set_signal_status(derived2, status);
    }
  }
  let eager_effects = new Set();
  const old_values = new Map();
  let eager_effects_deferred = false;
  function source(v, stack) {
    var signal = {
      f: 0,
v,
      reactions: null,
      equals,
      rv: 0,
      wv: 0
    };
    return signal;
  }
function state(v, stack) {
    const s = source(v);
    push_reaction_value(s);
    return s;
  }
function mutable_source(initial_value, immutable = false, trackable = true) {
    const s = source(initial_value);
    if (!immutable) {
      s.equals = safe_equals;
    }
    if (legacy_mode_flag && trackable && component_context !== null && component_context.l !== null) {
      (component_context.l.s ??= []).push(s);
    }
    return s;
  }
  function set(source2, value, should_proxy = false) {
    if (active_reaction !== null &&

(!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) && is_runes() && (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 && !current_sources?.includes(source2)) {
      state_unsafe_mutation();
    }
    let new_value = should_proxy ? proxy(value) : value;
    return internal_set(source2, new_value);
  }
  function internal_set(source2, value) {
    if (!source2.equals(value)) {
      var old_value = source2.v;
      if (is_destroying_effect) {
        old_values.set(source2, value);
      } else {
        old_values.set(source2, old_value);
      }
      source2.v = value;
      var batch = Batch.ensure();
      batch.capture(source2, old_value);
      if ((source2.f & DERIVED) !== 0) {
        if ((source2.f & DIRTY) !== 0) {
          execute_derived(
source2
          );
        }
        set_signal_status(source2, (source2.f & CONNECTED) !== 0 ? CLEAN : MAYBE_DIRTY);
      }
      source2.wv = increment_write_version();
      mark_reactions(source2, DIRTY);
      if (is_runes() && active_effect !== null && (active_effect.f & CLEAN) !== 0 && (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0) {
        if (untracked_writes === null) {
          set_untracked_writes([source2]);
        } else {
          untracked_writes.push(source2);
        }
      }
      if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
        flush_eager_effects();
      }
    }
    return value;
  }
  function flush_eager_effects() {
    eager_effects_deferred = false;
    const inspects = Array.from(eager_effects);
    for (const effect2 of inspects) {
      if ((effect2.f & CLEAN) !== 0) {
        set_signal_status(effect2, MAYBE_DIRTY);
      }
      if (is_dirty(effect2)) {
        update_effect(effect2);
      }
    }
    eager_effects.clear();
  }
  function increment(source2) {
    set(source2, source2.v + 1);
  }
  function mark_reactions(signal, status) {
    var reactions = signal.reactions;
    if (reactions === null) return;
    var runes = is_runes();
    var length = reactions.length;
    for (var i = 0; i < length; i++) {
      var reaction = reactions[i];
      var flags2 = reaction.f;
      if (!runes && reaction === active_effect) continue;
      var not_dirty = (flags2 & DIRTY) === 0;
      if (not_dirty) {
        set_signal_status(reaction, status);
      }
      if ((flags2 & DERIVED) !== 0) {
        var derived2 = (
reaction
        );
        batch_values?.delete(derived2);
        if ((flags2 & WAS_MARKED) === 0) {
          if (flags2 & CONNECTED) {
            reaction.f |= WAS_MARKED;
          }
          mark_reactions(derived2, MAYBE_DIRTY);
        }
      } else if (not_dirty) {
        if ((flags2 & BLOCK_EFFECT) !== 0) {
          if (eager_block_effects !== null) {
            eager_block_effects.add(
reaction
            );
          }
        }
        schedule_effect(
reaction
        );
      }
    }
  }
  function proxy(value) {
    if (typeof value !== "object" || value === null || STATE_SYMBOL in value) {
      return value;
    }
    const prototype = get_prototype_of(value);
    if (prototype !== object_prototype && prototype !== array_prototype) {
      return value;
    }
    var sources = new Map();
    var is_proxied_array = is_array(value);
    var version = state(0);
    var parent_version = update_version;
    var with_parent = (fn) => {
      if (update_version === parent_version) {
        return fn();
      }
      var reaction = active_reaction;
      var version2 = update_version;
      set_active_reaction(null);
      set_update_version(parent_version);
      var result = fn();
      set_active_reaction(reaction);
      set_update_version(version2);
      return result;
    };
    if (is_proxied_array) {
      sources.set("length", state(
value.length
      ));
    }
    return new Proxy(
value,
      {
        defineProperty(_, prop2, descriptor) {
          if (!("value" in descriptor) || descriptor.configurable === false || descriptor.enumerable === false || descriptor.writable === false) {
            state_descriptors_fixed();
          }
          var s = sources.get(prop2);
          if (s === void 0) {
            s = with_parent(() => {
              var s2 = state(descriptor.value);
              sources.set(prop2, s2);
              return s2;
            });
          } else {
            set(s, descriptor.value, true);
          }
          return true;
        },
        deleteProperty(target, prop2) {
          var s = sources.get(prop2);
          if (s === void 0) {
            if (prop2 in target) {
              const s2 = with_parent(() => state(UNINITIALIZED));
              sources.set(prop2, s2);
              increment(version);
            }
          } else {
            set(s, UNINITIALIZED);
            increment(version);
          }
          return true;
        },
        get(target, prop2, receiver) {
          if (prop2 === STATE_SYMBOL) {
            return value;
          }
          var s = sources.get(prop2);
          var exists = prop2 in target;
          if (s === void 0 && (!exists || get_descriptor(target, prop2)?.writable)) {
            s = with_parent(() => {
              var p = proxy(exists ? target[prop2] : UNINITIALIZED);
              var s2 = state(p);
              return s2;
            });
            sources.set(prop2, s);
          }
          if (s !== void 0) {
            var v = get(s);
            return v === UNINITIALIZED ? void 0 : v;
          }
          return Reflect.get(target, prop2, receiver);
        },
        getOwnPropertyDescriptor(target, prop2) {
          var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
          if (descriptor && "value" in descriptor) {
            var s = sources.get(prop2);
            if (s) descriptor.value = get(s);
          } else if (descriptor === void 0) {
            var source2 = sources.get(prop2);
            var value2 = source2?.v;
            if (source2 !== void 0 && value2 !== UNINITIALIZED) {
              return {
                enumerable: true,
                configurable: true,
                value: value2,
                writable: true
              };
            }
          }
          return descriptor;
        },
        has(target, prop2) {
          if (prop2 === STATE_SYMBOL) {
            return true;
          }
          var s = sources.get(prop2);
          var has = s !== void 0 && s.v !== UNINITIALIZED || Reflect.has(target, prop2);
          if (s !== void 0 || active_effect !== null && (!has || get_descriptor(target, prop2)?.writable)) {
            if (s === void 0) {
              s = with_parent(() => {
                var p = has ? proxy(target[prop2]) : UNINITIALIZED;
                var s2 = state(p);
                return s2;
              });
              sources.set(prop2, s);
            }
            var value2 = get(s);
            if (value2 === UNINITIALIZED) {
              return false;
            }
          }
          return has;
        },
        set(target, prop2, value2, receiver) {
          var s = sources.get(prop2);
          var has = prop2 in target;
          if (is_proxied_array && prop2 === "length") {
            for (var i = value2; i <
s.v; i += 1) {
              var other_s = sources.get(i + "");
              if (other_s !== void 0) {
                set(other_s, UNINITIALIZED);
              } else if (i in target) {
                other_s = with_parent(() => state(UNINITIALIZED));
                sources.set(i + "", other_s);
              }
            }
          }
          if (s === void 0) {
            if (!has || get_descriptor(target, prop2)?.writable) {
              s = with_parent(() => state(void 0));
              set(s, proxy(value2));
              sources.set(prop2, s);
            }
          } else {
            has = s.v !== UNINITIALIZED;
            var p = with_parent(() => proxy(value2));
            set(s, p);
          }
          var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
          if (descriptor?.set) {
            descriptor.set.call(receiver, value2);
          }
          if (!has) {
            if (is_proxied_array && typeof prop2 === "string") {
              var ls = (
sources.get("length")
              );
              var n = Number(prop2);
              if (Number.isInteger(n) && n >= ls.v) {
                set(ls, n + 1);
              }
            }
            increment(version);
          }
          return true;
        },
        ownKeys(target) {
          get(version);
          var own_keys = Reflect.ownKeys(target).filter((key3) => {
            var source3 = sources.get(key3);
            return source3 === void 0 || source3.v !== UNINITIALIZED;
          });
          for (var [key2, source2] of sources) {
            if (source2.v !== UNINITIALIZED && !(key2 in target)) {
              own_keys.push(key2);
            }
          }
          return own_keys;
        },
        setPrototypeOf() {
          state_prototype_fixed();
        }
      }
    );
  }
  var $window;
  var is_firefox;
  var first_child_getter;
  var next_sibling_getter;
  function init_operations() {
    if ($window !== void 0) {
      return;
    }
    $window = window;
    is_firefox = /Firefox/.test(navigator.userAgent);
    var element_prototype = Element.prototype;
    var node_prototype = Node.prototype;
    var text_prototype = Text.prototype;
    first_child_getter = get_descriptor(node_prototype, "firstChild").get;
    next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
    if (is_extensible(element_prototype)) {
      element_prototype.__click = void 0;
      element_prototype.__className = void 0;
      element_prototype.__attributes = null;
      element_prototype.__style = void 0;
      element_prototype.__e = void 0;
    }
    if (is_extensible(text_prototype)) {
      text_prototype.__t = void 0;
    }
  }
  function create_text(value = "") {
    return document.createTextNode(value);
  }
function get_first_child(node) {
    return first_child_getter.call(node);
  }
function get_next_sibling(node) {
    return next_sibling_getter.call(node);
  }
  function child(node, is_text) {
    {
      return get_first_child(node);
    }
  }
  function first_child(fragment, is_text = false) {
    {
      var first = (

get_first_child(
fragment
        )
      );
      if (first instanceof Comment && first.data === "") return get_next_sibling(first);
      return first;
    }
  }
  function sibling(node, count = 1, is_text = false) {
    let next_sibling = node;
    while (count--) {
      next_sibling =

get_next_sibling(next_sibling);
    }
    {
      return next_sibling;
    }
  }
  function clear_text_content(node) {
    node.textContent = "";
  }
  let listening_to_form_reset = false;
  function add_form_reset_listener() {
    if (!listening_to_form_reset) {
      listening_to_form_reset = true;
      document.addEventListener(
        "reset",
        (evt) => {
          Promise.resolve().then(() => {
            if (!evt.defaultPrevented) {
              for (
                const e of
evt.target.elements
              ) {
                e.__on_r?.();
              }
            }
          });
        },
{ capture: true }
      );
    }
  }
  function without_reactive_context(fn) {
    var previous_reaction = active_reaction;
    var previous_effect = active_effect;
    set_active_reaction(null);
    set_active_effect(null);
    try {
      return fn();
    } finally {
      set_active_reaction(previous_reaction);
      set_active_effect(previous_effect);
    }
  }
  function listen_to_event_and_reset_event(element, event2, handler, on_reset = handler) {
    element.addEventListener(event2, () => without_reactive_context(handler));
    const prev = element.__on_r;
    if (prev) {
      element.__on_r = () => {
        prev();
        on_reset(true);
      };
    } else {
      element.__on_r = () => on_reset(true);
    }
    add_form_reset_listener();
  }
  function validate_effect(rune) {
    if (active_effect === null) {
      if (active_reaction === null) {
        effect_orphan();
      }
      effect_in_unowned_derived();
    }
    if (is_destroying_effect) {
      effect_in_teardown();
    }
  }
  function push_effect(effect2, parent_effect) {
    var parent_last = parent_effect.last;
    if (parent_last === null) {
      parent_effect.last = parent_effect.first = effect2;
    } else {
      parent_last.next = effect2;
      effect2.prev = parent_last;
      parent_effect.last = effect2;
    }
  }
  function create_effect(type, fn, sync, push2 = true) {
    var parent = active_effect;
    if (parent !== null && (parent.f & INERT) !== 0) {
      type |= INERT;
    }
    var effect2 = {
      ctx: component_context,
      deps: null,
      nodes_start: null,
      nodes_end: null,
      f: type | DIRTY | CONNECTED,
      first: null,
      fn,
      last: null,
      next: null,
      parent,
      b: parent && parent.b,
      prev: null,
      teardown: null,
      transitions: null,
      wv: 0,
      ac: null
    };
    if (sync) {
      try {
        update_effect(effect2);
        effect2.f |= EFFECT_RAN;
      } catch (e2) {
        destroy_effect(effect2);
        throw e2;
      }
    } else if (fn !== null) {
      schedule_effect(effect2);
    }
    if (push2) {
      var e = effect2;
      if (sync && e.deps === null && e.teardown === null && e.nodes_start === null && e.first === e.last &&
(e.f & EFFECT_PRESERVED) === 0) {
        e = e.first;
        if ((type & BLOCK_EFFECT) !== 0 && (type & EFFECT_TRANSPARENT) !== 0 && e !== null) {
          e.f |= EFFECT_TRANSPARENT;
        }
      }
      if (e !== null) {
        e.parent = parent;
        if (parent !== null) {
          push_effect(e, parent);
        }
        if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0 && (type & ROOT_EFFECT) === 0) {
          var derived2 = (
active_reaction
          );
          (derived2.effects ??= []).push(e);
        }
      }
    }
    return effect2;
  }
  function effect_tracking() {
    return active_reaction !== null && !untracking;
  }
  function teardown(fn) {
    const effect2 = create_effect(RENDER_EFFECT, null, false);
    set_signal_status(effect2, CLEAN);
    effect2.teardown = fn;
    return effect2;
  }
  function user_effect(fn) {
    validate_effect();
    var flags2 = (
active_effect.f
    );
    var defer = !active_reaction && (flags2 & BRANCH_EFFECT) !== 0 && (flags2 & EFFECT_RAN) === 0;
    if (defer) {
      var context = (
component_context
      );
      (context.e ??= []).push(fn);
    } else {
      return create_user_effect(fn);
    }
  }
  function create_user_effect(fn) {
    return create_effect(EFFECT | USER_EFFECT, fn, false);
  }
  function user_pre_effect(fn) {
    validate_effect();
    return create_effect(RENDER_EFFECT | USER_EFFECT, fn, true);
  }
  function component_root(fn) {
    Batch.ensure();
    const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn, true);
    return (options = {}) => {
      return new Promise((fulfil) => {
        if (options.outro) {
          pause_effect(effect2, () => {
            destroy_effect(effect2);
            fulfil(void 0);
          });
        } else {
          destroy_effect(effect2);
          fulfil(void 0);
        }
      });
    };
  }
  function effect(fn) {
    return create_effect(EFFECT, fn, false);
  }
  function async_effect(fn) {
    return create_effect(ASYNC | EFFECT_PRESERVED, fn, true);
  }
  function render_effect(fn, flags2 = 0) {
    return create_effect(RENDER_EFFECT | flags2, fn, true);
  }
  function template_effect(fn, sync = [], async = [], blockers = [], defer = false) {
    flatten(blockers, sync, async, (values) => {
      create_effect(defer ? EFFECT : RENDER_EFFECT, () => fn(...values.map(get)), true);
    });
  }
  function block(fn, flags2 = 0) {
    var effect2 = create_effect(BLOCK_EFFECT | flags2, fn, true);
    return effect2;
  }
  function branch(fn, push2 = true) {
    return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn, true, push2);
  }
  function execute_effect_teardown(effect2) {
    var teardown2 = effect2.teardown;
    if (teardown2 !== null) {
      const previously_destroying_effect = is_destroying_effect;
      const previous_reaction = active_reaction;
      set_is_destroying_effect(true);
      set_active_reaction(null);
      try {
        teardown2.call(null);
      } finally {
        set_is_destroying_effect(previously_destroying_effect);
        set_active_reaction(previous_reaction);
      }
    }
  }
  function destroy_effect_children(signal, remove_dom = false) {
    var effect2 = signal.first;
    signal.first = signal.last = null;
    while (effect2 !== null) {
      const controller = effect2.ac;
      if (controller !== null) {
        without_reactive_context(() => {
          controller.abort(STALE_REACTION);
        });
      }
      var next = effect2.next;
      if ((effect2.f & ROOT_EFFECT) !== 0) {
        effect2.parent = null;
      } else {
        destroy_effect(effect2, remove_dom);
      }
      effect2 = next;
    }
  }
  function destroy_block_effect_children(signal) {
    var effect2 = signal.first;
    while (effect2 !== null) {
      var next = effect2.next;
      if ((effect2.f & BRANCH_EFFECT) === 0) {
        destroy_effect(effect2);
      }
      effect2 = next;
    }
  }
  function destroy_effect(effect2, remove_dom = true) {
    var removed = false;
    if ((remove_dom || (effect2.f & HEAD_EFFECT) !== 0) && effect2.nodes_start !== null && effect2.nodes_end !== null) {
      remove_effect_dom(
        effect2.nodes_start,
effect2.nodes_end
      );
      removed = true;
    }
    destroy_effect_children(effect2, remove_dom && !removed);
    remove_reactions(effect2, 0);
    set_signal_status(effect2, DESTROYED);
    var transitions = effect2.transitions;
    if (transitions !== null) {
      for (const transition2 of transitions) {
        transition2.stop();
      }
    }
    execute_effect_teardown(effect2);
    var parent = effect2.parent;
    if (parent !== null && parent.first !== null) {
      unlink_effect(effect2);
    }
    effect2.next = effect2.prev = effect2.teardown = effect2.ctx = effect2.deps = effect2.fn = effect2.nodes_start = effect2.nodes_end = effect2.ac = null;
  }
  function remove_effect_dom(node, end) {
    while (node !== null) {
      var next = node === end ? null : (

get_next_sibling(node)
      );
      node.remove();
      node = next;
    }
  }
  function unlink_effect(effect2) {
    var parent = effect2.parent;
    var prev = effect2.prev;
    var next = effect2.next;
    if (prev !== null) prev.next = next;
    if (next !== null) next.prev = prev;
    if (parent !== null) {
      if (parent.first === effect2) parent.first = next;
      if (parent.last === effect2) parent.last = prev;
    }
  }
  function pause_effect(effect2, callback, destroy = true) {
    var transitions = [];
    pause_children(effect2, transitions, true);
    run_out_transitions(transitions, () => {
      if (destroy) destroy_effect(effect2);
      if (callback) callback();
    });
  }
  function run_out_transitions(transitions, fn) {
    var remaining = transitions.length;
    if (remaining > 0) {
      var check = () => --remaining || fn();
      for (var transition2 of transitions) {
        transition2.out(check);
      }
    } else {
      fn();
    }
  }
  function pause_children(effect2, transitions, local) {
    if ((effect2.f & INERT) !== 0) return;
    effect2.f ^= INERT;
    if (effect2.transitions !== null) {
      for (const transition2 of effect2.transitions) {
        if (transition2.is_global || local) {
          transitions.push(transition2);
        }
      }
    }
    var child2 = effect2.first;
    while (child2 !== null) {
      var sibling2 = child2.next;
      var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 ||


(child2.f & BRANCH_EFFECT) !== 0 && (effect2.f & BLOCK_EFFECT) !== 0;
      pause_children(child2, transitions, transparent ? local : false);
      child2 = sibling2;
    }
  }
  function resume_effect(effect2) {
    resume_children(effect2, true);
  }
  function resume_children(effect2, local) {
    if ((effect2.f & INERT) === 0) return;
    effect2.f ^= INERT;
    if ((effect2.f & CLEAN) === 0) {
      set_signal_status(effect2, DIRTY);
      schedule_effect(effect2);
    }
    var child2 = effect2.first;
    while (child2 !== null) {
      var sibling2 = child2.next;
      var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
      resume_children(child2, transparent ? local : false);
      child2 = sibling2;
    }
    if (effect2.transitions !== null) {
      for (const transition2 of effect2.transitions) {
        if (transition2.is_global || local) {
          transition2.in();
        }
      }
    }
  }
  function move_effect(effect2, fragment) {
    var node = effect2.nodes_start;
    var end = effect2.nodes_end;
    while (node !== null) {
      var next = node === end ? null : (

get_next_sibling(node)
      );
      fragment.append(node);
      node = next;
    }
  }
  let is_updating_effect = false;
  function set_is_updating_effect(value) {
    is_updating_effect = value;
  }
  let is_destroying_effect = false;
  function set_is_destroying_effect(value) {
    is_destroying_effect = value;
  }
  let active_reaction = null;
  let untracking = false;
  function set_active_reaction(reaction) {
    active_reaction = reaction;
  }
  let active_effect = null;
  function set_active_effect(effect2) {
    active_effect = effect2;
  }
  let current_sources = null;
  function push_reaction_value(value) {
    if (active_reaction !== null && true) {
      if (current_sources === null) {
        current_sources = [value];
      } else {
        current_sources.push(value);
      }
    }
  }
  let new_deps = null;
  let skipped_deps = 0;
  let untracked_writes = null;
  function set_untracked_writes(value) {
    untracked_writes = value;
  }
  let write_version = 1;
  let read_version = 0;
  let update_version = read_version;
  function set_update_version(value) {
    update_version = value;
  }
  function increment_write_version() {
    return ++write_version;
  }
  function is_dirty(reaction) {
    var flags2 = reaction.f;
    if ((flags2 & DIRTY) !== 0) {
      return true;
    }
    if (flags2 & DERIVED) {
      reaction.f &= ~WAS_MARKED;
    }
    if ((flags2 & MAYBE_DIRTY) !== 0) {
      var dependencies = reaction.deps;
      if (dependencies !== null) {
        var length = dependencies.length;
        for (var i = 0; i < length; i++) {
          var dependency = dependencies[i];
          if (is_dirty(
dependency
          )) {
            update_derived(
dependency
            );
          }
          if (dependency.wv > reaction.wv) {
            return true;
          }
        }
      }
      if ((flags2 & CONNECTED) !== 0 &&

batch_values === null) {
        set_signal_status(reaction, CLEAN);
      }
    }
    return false;
  }
  function schedule_possible_effect_self_invalidation(signal, effect2, root2 = true) {
    var reactions = signal.reactions;
    if (reactions === null) return;
    if (current_sources?.includes(signal)) {
      return;
    }
    for (var i = 0; i < reactions.length; i++) {
      var reaction = reactions[i];
      if ((reaction.f & DERIVED) !== 0) {
        schedule_possible_effect_self_invalidation(
reaction,
          effect2,
          false
        );
      } else if (effect2 === reaction) {
        if (root2) {
          set_signal_status(reaction, DIRTY);
        } else if ((reaction.f & CLEAN) !== 0) {
          set_signal_status(reaction, MAYBE_DIRTY);
        }
        schedule_effect(
reaction
        );
      }
    }
  }
  function update_reaction(reaction) {
    var previous_deps = new_deps;
    var previous_skipped_deps = skipped_deps;
    var previous_untracked_writes = untracked_writes;
    var previous_reaction = active_reaction;
    var previous_sources = current_sources;
    var previous_component_context = component_context;
    var previous_untracking = untracking;
    var previous_update_version = update_version;
    var flags2 = reaction.f;
    new_deps =
null;
    skipped_deps = 0;
    untracked_writes = null;
    active_reaction = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
    current_sources = null;
    set_component_context(reaction.ctx);
    untracking = false;
    update_version = ++read_version;
    if (reaction.ac !== null) {
      without_reactive_context(() => {
        reaction.ac.abort(STALE_REACTION);
      });
      reaction.ac = null;
    }
    try {
      reaction.f |= REACTION_IS_UPDATING;
      var fn = (
reaction.fn
      );
      var result = fn();
      var deps = reaction.deps;
      if (new_deps !== null) {
        var i;
        remove_reactions(reaction, skipped_deps);
        if (deps !== null && skipped_deps > 0) {
          deps.length = skipped_deps + new_deps.length;
          for (i = 0; i < new_deps.length; i++) {
            deps[skipped_deps + i] = new_deps[i];
          }
        } else {
          reaction.deps = deps = new_deps;
        }
        if (is_updating_effect && effect_tracking() && (reaction.f & CONNECTED) !== 0) {
          for (i = skipped_deps; i < deps.length; i++) {
            (deps[i].reactions ??= []).push(reaction);
          }
        }
      } else if (deps !== null && skipped_deps < deps.length) {
        remove_reactions(reaction, skipped_deps);
        deps.length = skipped_deps;
      }
      if (is_runes() && untracked_writes !== null && !untracking && deps !== null && (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0) {
        for (i = 0; i <
untracked_writes.length; i++) {
          schedule_possible_effect_self_invalidation(
            untracked_writes[i],
reaction
          );
        }
      }
      if (previous_reaction !== null && previous_reaction !== reaction) {
        read_version++;
        if (untracked_writes !== null) {
          if (previous_untracked_writes === null) {
            previous_untracked_writes = untracked_writes;
          } else {
            previous_untracked_writes.push(...
untracked_writes);
          }
        }
      }
      if ((reaction.f & ERROR_VALUE) !== 0) {
        reaction.f ^= ERROR_VALUE;
      }
      return result;
    } catch (error) {
      return handle_error(error);
    } finally {
      reaction.f ^= REACTION_IS_UPDATING;
      new_deps = previous_deps;
      skipped_deps = previous_skipped_deps;
      untracked_writes = previous_untracked_writes;
      active_reaction = previous_reaction;
      current_sources = previous_sources;
      set_component_context(previous_component_context);
      untracking = previous_untracking;
      update_version = previous_update_version;
    }
  }
  function remove_reaction(signal, dependency) {
    let reactions = dependency.reactions;
    if (reactions !== null) {
      var index2 = index_of.call(reactions, signal);
      if (index2 !== -1) {
        var new_length = reactions.length - 1;
        if (new_length === 0) {
          reactions = dependency.reactions = null;
        } else {
          reactions[index2] = reactions[new_length];
          reactions.pop();
        }
      }
    }
    if (reactions === null && (dependency.f & DERIVED) !== 0 &&


(new_deps === null || !new_deps.includes(dependency))) {
      set_signal_status(dependency, MAYBE_DIRTY);
      if ((dependency.f & CONNECTED) !== 0) {
        dependency.f ^= CONNECTED;
        dependency.f &= ~WAS_MARKED;
      }
      destroy_derived_effects(
dependency
      );
      remove_reactions(
dependency,
        0
      );
    }
  }
  function remove_reactions(signal, start_index) {
    var dependencies = signal.deps;
    if (dependencies === null) return;
    for (var i = start_index; i < dependencies.length; i++) {
      remove_reaction(signal, dependencies[i]);
    }
  }
  function update_effect(effect2) {
    var flags2 = effect2.f;
    if ((flags2 & DESTROYED) !== 0) {
      return;
    }
    set_signal_status(effect2, CLEAN);
    var previous_effect = active_effect;
    var was_updating_effect = is_updating_effect;
    active_effect = effect2;
    is_updating_effect = true;
    try {
      if ((flags2 & BLOCK_EFFECT) !== 0) {
        destroy_block_effect_children(effect2);
      } else {
        destroy_effect_children(effect2);
      }
      execute_effect_teardown(effect2);
      var teardown2 = update_reaction(effect2);
      effect2.teardown = typeof teardown2 === "function" ? teardown2 : null;
      effect2.wv = write_version;
      var dep;
      if (DEV && tracing_mode_flag && (effect2.f & DIRTY) !== 0 && effect2.deps !== null) ;
    } finally {
      is_updating_effect = was_updating_effect;
      active_effect = previous_effect;
    }
  }
  async function tick() {
    await Promise.resolve();
    flushSync();
  }
  function get(signal) {
    var flags2 = signal.f;
    var is_derived = (flags2 & DERIVED) !== 0;
    if (active_reaction !== null && !untracking) {
      var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;
      if (!destroyed && !current_sources?.includes(signal)) {
        var deps = active_reaction.deps;
        if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
          if (signal.rv < read_version) {
            signal.rv = read_version;
            if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
              skipped_deps++;
            } else if (new_deps === null) {
              new_deps = [signal];
            } else if (!new_deps.includes(signal)) {
              new_deps.push(signal);
            }
          }
        } else {
          (active_reaction.deps ??= []).push(signal);
          var reactions = signal.reactions;
          if (reactions === null) {
            signal.reactions = [active_reaction];
          } else if (!reactions.includes(active_reaction)) {
            reactions.push(active_reaction);
          }
        }
      }
    }
    if (is_destroying_effect) {
      if (old_values.has(signal)) {
        return old_values.get(signal);
      }
      if (is_derived) {
        var derived2 = (
signal
        );
        var value = derived2.v;
        if ((derived2.f & CLEAN) === 0 && derived2.reactions !== null || depends_on_old_values(derived2)) {
          value = execute_derived(derived2);
        }
        old_values.set(derived2, value);
        return value;
      }
    } else if (is_derived) {
      derived2 =
signal;
      if (batch_values?.has(derived2)) {
        return batch_values.get(derived2);
      }
      if (is_dirty(derived2)) {
        update_derived(derived2);
      }
      if (is_updating_effect && effect_tracking() && (derived2.f & CONNECTED) === 0) {
        reconnect(derived2);
      }
    } else if (batch_values?.has(signal)) {
      return batch_values.get(signal);
    }
    if ((signal.f & ERROR_VALUE) !== 0) {
      throw signal.v;
    }
    return signal.v;
  }
  function reconnect(derived2) {
    if (derived2.deps === null) return;
    derived2.f ^= CONNECTED;
    for (const dep of derived2.deps) {
      (dep.reactions ??= []).push(derived2);
      if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
        reconnect(
dep
        );
      }
    }
  }
  function depends_on_old_values(derived2) {
    if (derived2.v === UNINITIALIZED) return true;
    if (derived2.deps === null) return false;
    for (const dep of derived2.deps) {
      if (old_values.has(dep)) {
        return true;
      }
      if ((dep.f & DERIVED) !== 0 && depends_on_old_values(
dep
      )) {
        return true;
      }
    }
    return false;
  }
  function untrack(fn) {
    var previous_untracking = untracking;
    try {
      untracking = true;
      return fn();
    } finally {
      untracking = previous_untracking;
    }
  }
  const STATUS_MASK = -7169;
  function set_signal_status(signal, status) {
    signal.f = signal.f & STATUS_MASK | status;
  }
  function deep_read_state(value) {
    if (typeof value !== "object" || !value || value instanceof EventTarget) {
      return;
    }
    if (STATE_SYMBOL in value) {
      deep_read(value);
    } else if (!Array.isArray(value)) {
      for (let key2 in value) {
        const prop2 = value[key2];
        if (typeof prop2 === "object" && prop2 && STATE_SYMBOL in prop2) {
          deep_read(prop2);
        }
      }
    }
  }
  function deep_read(value, visited = new Set()) {
    if (typeof value === "object" && value !== null &&
!(value instanceof EventTarget) && !visited.has(value)) {
      visited.add(value);
      if (value instanceof Date) {
        value.getTime();
      }
      for (let key2 in value) {
        try {
          deep_read(value[key2], visited);
        } catch (e) {
        }
      }
      const proto = get_prototype_of(value);
      if (proto !== Object.prototype && proto !== Array.prototype && proto !== Map.prototype && proto !== Set.prototype && proto !== Date.prototype) {
        const descriptors = get_descriptors(proto);
        for (let key2 in descriptors) {
          const get2 = descriptors[key2].get;
          if (get2) {
            try {
              get2.call(value);
            } catch (e) {
            }
          }
        }
      }
    }
  }
  const PASSIVE_EVENTS = ["touchstart", "touchmove"];
  function is_passive_event(name) {
    return PASSIVE_EVENTS.includes(name);
  }
  const all_registered_events = new Set();
  const root_event_handles = new Set();
  function create_event(event_name, dom, handler, options = {}) {
    function target_handler(event2) {
      if (!options.capture) {
        handle_event_propagation.call(dom, event2);
      }
      if (!event2.cancelBubble) {
        return without_reactive_context(() => {
          return handler?.call(this, event2);
        });
      }
    }
    if (event_name.startsWith("pointer") || event_name.startsWith("touch") || event_name === "wheel") {
      queue_micro_task(() => {
        dom.addEventListener(event_name, target_handler, options);
      });
    } else {
      dom.addEventListener(event_name, target_handler, options);
    }
    return target_handler;
  }
  function event(event_name, dom, handler, capture2, passive) {
    var options = { capture: capture2, passive };
    var target_handler = create_event(event_name, dom, handler, options);
    if (dom === document.body ||
dom === window ||
dom === document ||
dom instanceof HTMLMediaElement) {
      teardown(() => {
        dom.removeEventListener(event_name, target_handler, options);
      });
    }
  }
  function delegate(events) {
    for (var i = 0; i < events.length; i++) {
      all_registered_events.add(events[i]);
    }
    for (var fn of root_event_handles) {
      fn(events);
    }
  }
  let last_propagated_event = null;
  function handle_event_propagation(event2) {
    var handler_element = this;
    var owner_document = (
handler_element.ownerDocument
    );
    var event_name = event2.type;
    var path = event2.composedPath?.() || [];
    var current_target = (
path[0] || event2.target
    );
    last_propagated_event = event2;
    var path_idx = 0;
    var handled_at = last_propagated_event === event2 && event2.__root;
    if (handled_at) {
      var at_idx = path.indexOf(handled_at);
      if (at_idx !== -1 && (handler_element === document || handler_element ===
window)) {
        event2.__root = handler_element;
        return;
      }
      var handler_idx = path.indexOf(handler_element);
      if (handler_idx === -1) {
        return;
      }
      if (at_idx <= handler_idx) {
        path_idx = at_idx;
      }
    }
    current_target =
path[path_idx] || event2.target;
    if (current_target === handler_element) return;
    define_property(event2, "currentTarget", {
      configurable: true,
      get() {
        return current_target || owner_document;
      }
    });
    var previous_reaction = active_reaction;
    var previous_effect = active_effect;
    set_active_reaction(null);
    set_active_effect(null);
    try {
      var throw_error;
      var other_errors = [];
      while (current_target !== null) {
        var parent_element = current_target.assignedSlot || current_target.parentNode ||
current_target.host || null;
        try {
          var delegated = current_target["__" + event_name];
          if (delegated != null && (!
current_target.disabled ||

event2.target === current_target)) {
            delegated.call(current_target, event2);
          }
        } catch (error) {
          if (throw_error) {
            other_errors.push(error);
          } else {
            throw_error = error;
          }
        }
        if (event2.cancelBubble || parent_element === handler_element || parent_element === null) {
          break;
        }
        current_target = parent_element;
      }
      if (throw_error) {
        for (let error of other_errors) {
          queueMicrotask(() => {
            throw error;
          });
        }
        throw throw_error;
      }
    } finally {
      event2.__root = handler_element;
      delete event2.currentTarget;
      set_active_reaction(previous_reaction);
      set_active_effect(previous_effect);
    }
  }
  function create_fragment_from_html(html2) {
    var elem = document.createElement("template");
    elem.innerHTML = html2.replaceAll("<!>", "<!---->");
    return elem.content;
  }
  function assign_nodes(start, end) {
    var effect2 = (
active_effect
    );
    if (effect2.nodes_start === null) {
      effect2.nodes_start = start;
      effect2.nodes_end = end;
    }
  }
function from_html(content, flags2) {
    var is_fragment = (flags2 & TEMPLATE_FRAGMENT) !== 0;
    var use_import_node = (flags2 & TEMPLATE_USE_IMPORT_NODE) !== 0;
    var node;
    var has_start = !content.startsWith("<!>");
    return () => {
      if (node === void 0) {
        node = create_fragment_from_html(has_start ? content : "<!>" + content);
        if (!is_fragment) node =

get_first_child(node);
      }
      var clone = (
use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
      );
      if (is_fragment) {
        var start = (

get_first_child(clone)
        );
        var end = (
clone.lastChild
        );
        assign_nodes(start, end);
      } else {
        assign_nodes(clone, clone);
      }
      return clone;
    };
  }
  function comment() {
    var frag = document.createDocumentFragment();
    var start = document.createComment("");
    var anchor = create_text();
    frag.append(start, anchor);
    assign_nodes(start, anchor);
    return frag;
  }
  function append(anchor, dom) {
    if (anchor === null) {
      return;
    }
    anchor.before(
dom
    );
  }
  let should_intro = true;
  function set_text(text, value) {
    var str = value == null ? "" : typeof value === "object" ? value + "" : value;
    if (str !== (text.__t ??= text.nodeValue)) {
      text.__t = str;
      text.nodeValue = str + "";
    }
  }
  function mount(component, options) {
    return _mount(component, options);
  }
  const document_listeners = new Map();
  function _mount(Component, { target, anchor, props = {}, events, context, intro = true }) {
    init_operations();
    var registered_events = new Set();
    var event_handle = (events2) => {
      for (var i = 0; i < events2.length; i++) {
        var event_name = events2[i];
        if (registered_events.has(event_name)) continue;
        registered_events.add(event_name);
        var passive = is_passive_event(event_name);
        target.addEventListener(event_name, handle_event_propagation, { passive });
        var n = document_listeners.get(event_name);
        if (n === void 0) {
          document.addEventListener(event_name, handle_event_propagation, { passive });
          document_listeners.set(event_name, 1);
        } else {
          document_listeners.set(event_name, n + 1);
        }
      }
    };
    event_handle(array_from(all_registered_events));
    root_event_handles.add(event_handle);
    var component = void 0;
    var unmount2 = component_root(() => {
      var anchor_node = anchor ?? target.appendChild(create_text());
      boundary(
anchor_node,
        {
          pending: () => {
          }
        },
        (anchor_node2) => {
          if (context) {
            push({});
            var ctx = (
component_context
            );
            ctx.c = context;
          }
          if (events) {
            props.$$events = events;
          }
          should_intro = intro;
          component = Component(anchor_node2, props) || {};
          should_intro = true;
          if (context) {
            pop();
          }
        }
      );
      return () => {
        for (var event_name of registered_events) {
          target.removeEventListener(event_name, handle_event_propagation);
          var n = (
document_listeners.get(event_name)
          );
          if (--n === 0) {
            document.removeEventListener(event_name, handle_event_propagation);
            document_listeners.delete(event_name);
          } else {
            document_listeners.set(event_name, n);
          }
        }
        root_event_handles.delete(event_handle);
        if (anchor_node !== anchor) {
          anchor_node.parentNode?.removeChild(anchor_node);
        }
      };
    });
    mounted_components.set(component, unmount2);
    return component;
  }
  let mounted_components = new WeakMap();
  function unmount(component, options) {
    const fn = mounted_components.get(component);
    if (fn) {
      mounted_components.delete(component);
      return fn(options);
    }
    return Promise.resolve();
  }
  class BranchManager {
anchor;
#batches = new Map();
#onscreen = new Map();
#offscreen = new Map();
#transition = true;
constructor(anchor, transition2 = true) {
      this.anchor = anchor;
      this.#transition = transition2;
    }
    #commit = () => {
      var batch = (
current_batch
      );
      if (!this.#batches.has(batch)) return;
      var key2 = (
this.#batches.get(batch)
      );
      var onscreen = this.#onscreen.get(key2);
      if (onscreen) {
        resume_effect(onscreen);
      } else {
        var offscreen = this.#offscreen.get(key2);
        if (offscreen) {
          this.#onscreen.set(key2, offscreen.effect);
          this.#offscreen.delete(key2);
          offscreen.fragment.lastChild.remove();
          this.anchor.before(offscreen.fragment);
          onscreen = offscreen.effect;
        }
      }
      for (const [b, k] of this.#batches) {
        this.#batches.delete(b);
        if (b === batch) {
          break;
        }
        const offscreen2 = this.#offscreen.get(k);
        if (offscreen2) {
          destroy_effect(offscreen2.effect);
          this.#offscreen.delete(k);
        }
      }
      for (const [k, effect2] of this.#onscreen) {
        if (k === key2) continue;
        const on_destroy = () => {
          const keys = Array.from(this.#batches.values());
          if (keys.includes(k)) {
            var fragment = document.createDocumentFragment();
            move_effect(effect2, fragment);
            fragment.append(create_text());
            this.#offscreen.set(k, { effect: effect2, fragment });
          } else {
            destroy_effect(effect2);
          }
          this.#onscreen.delete(k);
        };
        if (this.#transition || !onscreen) {
          pause_effect(effect2, on_destroy, false);
        } else {
          on_destroy();
        }
      }
    };
#discard = (batch) => {
      this.#batches.delete(batch);
      const keys = Array.from(this.#batches.values());
      for (const [k, branch2] of this.#offscreen) {
        if (!keys.includes(k)) {
          destroy_effect(branch2.effect);
          this.#offscreen.delete(k);
        }
      }
    };
ensure(key2, fn) {
      var batch = (
current_batch
      );
      if (fn && !this.#onscreen.has(key2) && !this.#offscreen.has(key2)) {
        {
          this.#onscreen.set(
            key2,
            branch(() => fn(this.anchor))
          );
        }
      }
      this.#batches.set(batch, key2);
      {
        this.#commit();
      }
    }
  }
  const PENDING = 0;
  const THEN = 1;
  function await_block(node, get_input, pending_fn, then_fn, catch_fn) {
    var runes = is_runes();
    var v = (
UNINITIALIZED
    );
    var value = runes ? source(v) : mutable_source(v, false, false);
    var error = runes ? source(v) : mutable_source(v, false, false);
    var branches = new BranchManager(node);
    block(() => {
      var input = get_input();
      var destroyed = false;
      if (is_promise(input)) {
        var restore = capture();
        var resolved = false;
        const resolve = (fn) => {
          if (destroyed) return;
          resolved = true;
          restore(false);
          Batch.ensure();
          try {
            fn();
          } finally {
            unset_context();
            if (!is_flushing_sync) flushSync();
          }
        };
        input.then(
          (v2) => {
            resolve(() => {
              internal_set(value, v2);
              branches.ensure(THEN, then_fn && ((target) => then_fn(target, value)));
            });
          },
          (e) => {
            resolve(() => {
              internal_set(error, e);
              branches.ensure(THEN, catch_fn && ((target) => catch_fn(target, error)));
              if (!catch_fn) {
                throw error.v;
              }
            });
          }
        );
        {
          queue_micro_task(() => {
            if (!resolved) {
              resolve(() => {
                branches.ensure(PENDING, pending_fn);
              });
            }
          });
        }
      } else {
        internal_set(value, input);
        branches.ensure(THEN, then_fn && ((target) => then_fn(target, value)));
      }
      return () => {
        destroyed = true;
      };
    });
  }
  function if_block(node, fn, elseif = false) {
    var branches = new BranchManager(node);
    var flags2 = elseif ? EFFECT_TRANSPARENT : 0;
    function update_branch(condition, fn2) {
      branches.ensure(condition, fn2);
    }
    block(() => {
      var has_branch = false;
      fn((fn2, flag = true) => {
        has_branch = true;
        update_branch(flag, fn2);
      });
      if (!has_branch) {
        update_branch(false, null);
      }
    }, flags2);
  }
  function key(node, get_key, render_fn) {
    var branches = new BranchManager(node);
    var legacy = !is_runes();
    block(() => {
      var key2 = get_key();
      if (legacy && key2 !== null && typeof key2 === "object") {
        key2 =
{};
      }
      branches.ensure(key2, render_fn);
    });
  }
  function index(_, i) {
    return i;
  }
  function pause_effects(state2, items, controlled_anchor) {
    var items_map = state2.items;
    var transitions = [];
    var length = items.length;
    for (var i = 0; i < length; i++) {
      pause_children(items[i].e, transitions, true);
    }
    var is_controlled = length > 0 && transitions.length === 0 && controlled_anchor !== null;
    if (is_controlled) {
      var parent_node = (

controlled_anchor.parentNode
      );
      clear_text_content(parent_node);
      parent_node.append(
controlled_anchor
      );
      items_map.clear();
      link(state2, items[0].prev, items[length - 1].next);
    }
    run_out_transitions(transitions, () => {
      for (var i2 = 0; i2 < length; i2++) {
        var item = items[i2];
        if (!is_controlled) {
          items_map.delete(item.k);
          link(state2, item.prev, item.next);
        }
        destroy_effect(item.e, !is_controlled);
      }
    });
  }
  function each(node, flags2, get_collection, get_key, render_fn, fallback_fn = null) {
    var anchor = node;
    var state2 = { flags: flags2, items: new Map(), first: null };
    var is_controlled = (flags2 & EACH_IS_CONTROLLED) !== 0;
    if (is_controlled) {
      var parent_node = (
node
      );
      anchor = parent_node.appendChild(create_text());
    }
    var fallback = null;
    var was_empty = false;
    var offscreen_items = new Map();
    var each_array = derived_safe_equal(() => {
      var collection = get_collection();
      return is_array(collection) ? collection : collection == null ? [] : array_from(collection);
    });
    var array;
    var each_effect;
    function commit() {
      reconcile(
        each_effect,
        array,
        state2,
        offscreen_items,
        anchor,
        render_fn,
        flags2,
        get_key,
        get_collection
      );
      if (fallback_fn !== null) {
        if (array.length === 0) {
          if (fallback) {
            resume_effect(fallback);
          } else {
            fallback = branch(() => fallback_fn(anchor));
          }
        } else if (fallback !== null) {
          pause_effect(fallback, () => {
            fallback = null;
          });
        }
      }
    }
    block(() => {
      each_effect ??=
active_effect;
      array =
get(each_array);
      var length = array.length;
      if (was_empty && length === 0) {
        return;
      }
      was_empty = length === 0;
      {
        {
          commit();
        }
      }
      get(each_array);
    });
  }
  function reconcile(each_effect, array, state2, offscreen_items, anchor, render_fn, flags2, get_key, get_collection) {
    var is_animated = (flags2 & EACH_IS_ANIMATED) !== 0;
    var should_update = (flags2 & (EACH_ITEM_REACTIVE | EACH_INDEX_REACTIVE)) !== 0;
    var length = array.length;
    var items = state2.items;
    var first = state2.first;
    var current = first;
    var seen;
    var prev = null;
    var to_animate;
    var matched = [];
    var stashed = [];
    var value;
    var key2;
    var item;
    var i;
    if (is_animated) {
      for (i = 0; i < length; i += 1) {
        value = array[i];
        key2 = get_key(value, i);
        item = items.get(key2);
        if (item !== void 0) {
          item.a?.measure();
          (to_animate ??= new Set()).add(item);
        }
      }
    }
    for (i = 0; i < length; i += 1) {
      value = array[i];
      key2 = get_key(value, i);
      item = items.get(key2);
      if (item === void 0) {
        var pending = offscreen_items.get(key2);
        if (pending !== void 0) {
          offscreen_items.delete(key2);
          items.set(key2, pending);
          var next = prev ? prev.next : current;
          link(state2, prev, pending);
          link(state2, pending, next);
          move(pending, next, anchor);
          prev = pending;
        } else {
          var child_anchor = current ? (
current.e.nodes_start
          ) : anchor;
          prev = create_item(
            child_anchor,
            state2,
            prev,
            prev === null ? state2.first : prev.next,
            value,
            key2,
            i,
            render_fn,
            flags2,
            get_collection
          );
        }
        items.set(key2, prev);
        matched = [];
        stashed = [];
        current = prev.next;
        continue;
      }
      if (should_update) {
        update_item(item, value, i, flags2);
      }
      if ((item.e.f & INERT) !== 0) {
        resume_effect(item.e);
        if (is_animated) {
          item.a?.unfix();
          (to_animate ??= new Set()).delete(item);
        }
      }
      if (item !== current) {
        if (seen !== void 0 && seen.has(item)) {
          if (matched.length < stashed.length) {
            var start = stashed[0];
            var j;
            prev = start.prev;
            var a = matched[0];
            var b = matched[matched.length - 1];
            for (j = 0; j < matched.length; j += 1) {
              move(matched[j], start, anchor);
            }
            for (j = 0; j < stashed.length; j += 1) {
              seen.delete(stashed[j]);
            }
            link(state2, a.prev, b.next);
            link(state2, prev, a);
            link(state2, b, start);
            current = start;
            prev = b;
            i -= 1;
            matched = [];
            stashed = [];
          } else {
            seen.delete(item);
            move(item, current, anchor);
            link(state2, item.prev, item.next);
            link(state2, item, prev === null ? state2.first : prev.next);
            link(state2, prev, item);
            prev = item;
          }
          continue;
        }
        matched = [];
        stashed = [];
        while (current !== null && current.k !== key2) {
          if ((current.e.f & INERT) === 0) {
            (seen ??= new Set()).add(current);
          }
          stashed.push(current);
          current = current.next;
        }
        if (current === null) {
          continue;
        }
        item = current;
      }
      matched.push(item);
      prev = item;
      current = item.next;
    }
    if (current !== null || seen !== void 0) {
      var to_destroy = seen === void 0 ? [] : array_from(seen);
      while (current !== null) {
        if ((current.e.f & INERT) === 0) {
          to_destroy.push(current);
        }
        current = current.next;
      }
      var destroy_length = to_destroy.length;
      if (destroy_length > 0) {
        var controlled_anchor = (flags2 & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;
        if (is_animated) {
          for (i = 0; i < destroy_length; i += 1) {
            to_destroy[i].a?.measure();
          }
          for (i = 0; i < destroy_length; i += 1) {
            to_destroy[i].a?.fix();
          }
        }
        pause_effects(state2, to_destroy, controlled_anchor);
      }
    }
    if (is_animated) {
      queue_micro_task(() => {
        if (to_animate === void 0) return;
        for (item of to_animate) {
          item.a?.apply();
        }
      });
    }
    each_effect.first = state2.first && state2.first.e;
    each_effect.last = prev && prev.e;
    for (var unused of offscreen_items.values()) {
      destroy_effect(unused.e);
    }
    offscreen_items.clear();
  }
  function update_item(item, value, index2, type) {
    if ((type & EACH_ITEM_REACTIVE) !== 0) {
      internal_set(item.v, value);
    }
    if ((type & EACH_INDEX_REACTIVE) !== 0) {
      internal_set(
item.i,
        index2
      );
    } else {
      item.i = index2;
    }
  }
  function create_item(anchor, state2, prev, next, value, key2, index2, render_fn, flags2, get_collection, deferred2) {
    var reactive = (flags2 & EACH_ITEM_REACTIVE) !== 0;
    var mutable = (flags2 & EACH_ITEM_IMMUTABLE) === 0;
    var v = reactive ? mutable ? mutable_source(value, false, false) : source(value) : value;
    var i = (flags2 & EACH_INDEX_REACTIVE) === 0 ? index2 : source(index2);
    var item = {
      i,
      v,
      k: key2,
      a: null,
e: null,
      prev,
      next
    };
    try {
      if (anchor === null) {
        var fragment = document.createDocumentFragment();
        fragment.append(anchor = create_text());
      }
      item.e = branch(() => render_fn(
anchor,
        v,
        i,
        get_collection
      ), hydrating);
      item.e.prev = prev && prev.e;
      item.e.next = next && next.e;
      if (prev === null) {
        if (!deferred2) {
          state2.first = item;
        }
      } else {
        prev.next = item;
        prev.e.next = item.e;
      }
      if (next !== null) {
        next.prev = item;
        next.e.prev = item.e;
      }
      return item;
    } finally {
    }
  }
  function move(item, next, anchor) {
    var end = item.next ? (
item.next.e.nodes_start
    ) : anchor;
    var dest = next ? (
next.e.nodes_start
    ) : anchor;
    var node = (
item.e.nodes_start
    );
    while (node !== null && node !== end) {
      var next_node = (

get_next_sibling(node)
      );
      dest.before(node);
      node = next_node;
    }
  }
  function link(state2, prev, next) {
    if (prev === null) {
      state2.first = next;
    } else {
      prev.next = next;
      prev.e.next = next && next.e;
    }
    if (next !== null) {
      next.prev = prev;
      next.e.prev = prev && prev.e;
    }
  }
  function html(node, get_value, svg = false, mathml = false, skip_warning = false) {
    var anchor = node;
    var value = "";
    template_effect(() => {
      var effect2 = (
active_effect
      );
      if (value === (value = get_value() ?? "")) {
        return;
      }
      if (effect2.nodes_start !== null) {
        remove_effect_dom(
          effect2.nodes_start,
effect2.nodes_end
        );
        effect2.nodes_start = effect2.nodes_end = null;
      }
      if (value === "") return;
      var html2 = value + "";
      if (svg) html2 = `<svg>${html2}</svg>`;
      else if (mathml) html2 = `<math>${html2}</math>`;
      var node2 = create_fragment_from_html(html2);
      if (svg || mathml) {
        node2 =

get_first_child(node2);
      }
      assign_nodes(

get_first_child(node2),
node2.lastChild
      );
      if (svg || mathml) {
        while ( get_first_child(node2)) {
          anchor.before(

get_first_child(node2)
          );
        }
      } else {
        anchor.before(node2);
      }
    });
  }
  function action(dom, action2, get_value) {
    effect(() => {
      var payload = untrack(() => action2(dom, get_value?.()) || {});
      if (get_value && payload?.update) {
        var inited = false;
        var prev = (
{}
        );
        render_effect(() => {
          var value = get_value();
          deep_read_state(value);
          if (inited && safe_not_equal(prev, value)) {
            prev = value;
            payload.update(value);
          }
        });
        inited = true;
      }
      if (payload?.destroy) {
        return () => (
payload.destroy()
        );
      }
    });
  }
  function r(e) {
    var t, f, n = "";
    if ("string" == typeof e || "number" == typeof e) n += e;
    else if ("object" == typeof e) if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
    } else for (f in e) e[f] && (n && (n += " "), n += f);
    return n;
  }
  function clsx$1() {
    for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
    return n;
  }
  function clsx(value) {
    if (typeof value === "object") {
      return clsx$1(value);
    } else {
      return value ?? "";
    }
  }
  const whitespace = [..." 	\n\r\f \v\uFEFF"];
  function to_class(value, hash, directives) {
    var classname = value == null ? "" : "" + value;
    if (hash) {
      classname = classname ? classname + " " + hash : hash;
    }
    if (directives) {
      for (var key2 in directives) {
        if (directives[key2]) {
          classname = classname ? classname + " " + key2 : key2;
        } else if (classname.length) {
          var len = key2.length;
          var a = 0;
          while ((a = classname.indexOf(key2, a)) >= 0) {
            var b = a + len;
            if ((a === 0 || whitespace.includes(classname[a - 1])) && (b === classname.length || whitespace.includes(classname[b]))) {
              classname = (a === 0 ? "" : classname.substring(0, a)) + classname.substring(b + 1);
            } else {
              a = b;
            }
          }
        }
      }
    }
    return classname === "" ? null : classname;
  }
  function to_style(value, styles) {
    return value == null ? null : String(value);
  }
  function set_class(dom, is_html, value, hash, prev_classes, next_classes) {
    var prev = dom.__className;
    if (prev !== value || prev === void 0) {
      var next_class_name = to_class(value, hash, next_classes);
      {
        if (next_class_name == null) {
          dom.removeAttribute("class");
        } else {
          dom.className = next_class_name;
        }
      }
      dom.__className = value;
    } else if (next_classes && prev_classes !== next_classes) {
      for (var key2 in next_classes) {
        var is_present = !!next_classes[key2];
        if (prev_classes == null || is_present !== !!prev_classes[key2]) {
          dom.classList.toggle(key2, is_present);
        }
      }
    }
    return next_classes;
  }
  function set_style(dom, value, prev_styles, next_styles) {
    var prev = dom.__style;
    if (prev !== value) {
      var next_style_attr = to_style(value);
      {
        if (next_style_attr == null) {
          dom.removeAttribute("style");
        } else {
          dom.style.cssText = next_style_attr;
        }
      }
      dom.__style = value;
    }
    return next_styles;
  }
  const IS_CUSTOM_ELEMENT = Symbol("is custom element");
  const IS_HTML = Symbol("is html");
  function set_attribute(element, attribute, value, skip_warning) {
    var attributes = get_attributes(element);
    if (attributes[attribute] === (attributes[attribute] = value)) return;
    if (attribute === "loading") {
      element[LOADING_ATTR_SYMBOL] = value;
    }
    if (value == null) {
      element.removeAttribute(attribute);
    } else if (typeof value !== "string" && get_setters(element).includes(attribute)) {
      element[attribute] = value;
    } else {
      element.setAttribute(attribute, value);
    }
  }
  function get_attributes(element) {
    return (

element.__attributes ??= {
        [IS_CUSTOM_ELEMENT]: element.nodeName.includes("-"),
        [IS_HTML]: element.namespaceURI === NAMESPACE_HTML
      }
    );
  }
  var setters_cache = new Map();
  function get_setters(element) {
    var cache_key = element.getAttribute("is") || element.nodeName;
    var setters = setters_cache.get(cache_key);
    if (setters) return setters;
    setters_cache.set(cache_key, setters = []);
    var descriptors;
    var proto = element;
    var element_proto = Element.prototype;
    while (element_proto !== proto) {
      descriptors = get_descriptors(proto);
      for (var key2 in descriptors) {
        if (descriptors[key2].set) {
          setters.push(key2);
        }
      }
      proto = get_prototype_of(proto);
    }
    return setters;
  }
  const now = () => performance.now();
  const raf = {


tick: (
(_) => requestAnimationFrame(_)
    ),
    now: () => now(),
    tasks: new Set()
  };
  function run_tasks() {
    const now2 = raf.now();
    raf.tasks.forEach((task) => {
      if (!task.c(now2)) {
        raf.tasks.delete(task);
        task.f();
      }
    });
    if (raf.tasks.size !== 0) {
      raf.tick(run_tasks);
    }
  }
  function loop(callback) {
    let task;
    if (raf.tasks.size === 0) {
      raf.tick(run_tasks);
    }
    return {
      promise: new Promise((fulfill) => {
        raf.tasks.add(task = { c: callback, f: fulfill });
      }),
      abort() {
        raf.tasks.delete(task);
      }
    };
  }
  function dispatch_event(element, type) {
    without_reactive_context(() => {
      element.dispatchEvent(new CustomEvent(type));
    });
  }
  function css_property_to_camelcase(style) {
    if (style === "float") return "cssFloat";
    if (style === "offset") return "cssOffset";
    if (style.startsWith("--")) return style;
    const parts = style.split("-");
    if (parts.length === 1) return parts[0];
    return parts[0] + parts.slice(1).map(
(word) => word[0].toUpperCase() + word.slice(1)
    ).join("");
  }
  function css_to_keyframe(css) {
    const keyframe = {};
    const parts = css.split(";");
    for (const part of parts) {
      const [property, value] = part.split(":");
      if (!property || value === void 0) break;
      const formatted_property = css_property_to_camelcase(property.trim());
      keyframe[formatted_property] = value.trim();
    }
    return keyframe;
  }
  const linear$1 = (t) => t;
  function transition(flags2, element, get_fn, get_params) {
    var is_intro = (flags2 & TRANSITION_IN) !== 0;
    var is_outro = (flags2 & TRANSITION_OUT) !== 0;
    var is_both = is_intro && is_outro;
    var is_global = (flags2 & TRANSITION_GLOBAL) !== 0;
    var direction = is_both ? "both" : is_intro ? "in" : "out";
    var current_options;
    var inert = element.inert;
    var overflow = element.style.overflow;
    var intro;
    var outro;
    function get_options() {
      return without_reactive_context(() => {
        return current_options ??= get_fn()(element, get_params?.() ??
{}, {
          direction
        });
      });
    }
    var transition2 = {
      is_global,
      in() {
        element.inert = inert;
        if (!is_intro) {
          outro?.abort();
          outro?.reset?.();
          return;
        }
        if (!is_outro) {
          intro?.abort();
        }
        dispatch_event(element, "introstart");
        intro = animate(element, get_options(), outro, 1, () => {
          dispatch_event(element, "introend");
          intro?.abort();
          intro = current_options = void 0;
          element.style.overflow = overflow;
        });
      },
      out(fn) {
        if (!is_outro) {
          fn?.();
          current_options = void 0;
          return;
        }
        element.inert = true;
        dispatch_event(element, "outrostart");
        outro = animate(element, get_options(), intro, 0, () => {
          dispatch_event(element, "outroend");
          fn?.();
        });
      },
      stop: () => {
        intro?.abort();
        outro?.abort();
      }
    };
    var e = (
active_effect
    );
    (e.transitions ??= []).push(transition2);
    if (is_intro && should_intro) {
      var run2 = is_global;
      if (!run2) {
        var block2 = (
e.parent
        );
        while (block2 && (block2.f & EFFECT_TRANSPARENT) !== 0) {
          while (block2 = block2.parent) {
            if ((block2.f & BLOCK_EFFECT) !== 0) break;
          }
        }
        run2 = !block2 || (block2.f & EFFECT_RAN) !== 0;
      }
      if (run2) {
        effect(() => {
          untrack(() => transition2.in());
        });
      }
    }
  }
  function animate(element, options, counterpart, t2, on_finish) {
    var is_intro = t2 === 1;
    if (is_function(options)) {
      var a;
      var aborted = false;
      queue_micro_task(() => {
        if (aborted) return;
        var o = options({ direction: is_intro ? "in" : "out" });
        a = animate(element, o, counterpart, t2, on_finish);
      });
      return {
        abort: () => {
          aborted = true;
          a?.abort();
        },
        deactivate: () => a.deactivate(),
        reset: () => a.reset(),
        t: () => a.t()
      };
    }
    counterpart?.deactivate();
    if (!options?.duration) {
      on_finish();
      return {
        abort: noop,
        deactivate: noop,
        reset: noop,
        t: () => t2
      };
    }
    const { delay = 0, css, tick: tick2, easing = linear$1 } = options;
    var keyframes = [];
    if (is_intro && counterpart === void 0) {
      if (tick2) {
        tick2(0, 1);
      }
      if (css) {
        var styles = css_to_keyframe(css(0, 1));
        keyframes.push(styles, styles);
      }
    }
    var get_t = () => 1 - t2;
    var animation = element.animate(keyframes, { duration: delay, fill: "forwards" });
    animation.onfinish = () => {
      animation.cancel();
      var t1 = counterpart?.t() ?? 1 - t2;
      counterpart?.abort();
      var delta = t2 - t1;
      var duration = (
options.duration * Math.abs(delta)
      );
      var keyframes2 = [];
      if (duration > 0) {
        var needs_overflow_hidden = false;
        if (css) {
          var n = Math.ceil(duration / (1e3 / 60));
          for (var i = 0; i <= n; i += 1) {
            var t = t1 + delta * easing(i / n);
            var styles2 = css_to_keyframe(css(t, 1 - t));
            keyframes2.push(styles2);
            needs_overflow_hidden ||= styles2.overflow === "hidden";
          }
        }
        if (needs_overflow_hidden) {
          element.style.overflow = "hidden";
        }
        get_t = () => {
          var time = (

animation.currentTime
          );
          return t1 + delta * easing(time / duration);
        };
        if (tick2) {
          loop(() => {
            if (animation.playState !== "running") return false;
            var t3 = get_t();
            tick2(t3, 1 - t3);
            return true;
          });
        }
      }
      animation = element.animate(keyframes2, { duration, fill: "forwards" });
      animation.onfinish = () => {
        get_t = () => t2;
        tick2?.(t2, 1 - t2);
        on_finish();
      };
    };
    return {
      abort: () => {
        if (animation) {
          animation.cancel();
          animation.effect = null;
          animation.onfinish = noop;
        }
      },
      deactivate: () => {
        on_finish = noop;
      },
      reset: () => {
        if (t2 === 0) {
          tick2?.(1, 0);
        }
      },
      t: () => get_t()
    };
  }
  function bind_value(input, get2, set2 = get2) {
    var batches2 = new WeakSet();
    listen_to_event_and_reset_event(input, "input", async (is_reset) => {
      var value = is_reset ? input.defaultValue : input.value;
      value = is_numberlike_input(input) ? to_number(value) : value;
      set2(value);
      if (current_batch !== null) {
        batches2.add(current_batch);
      }
      await tick();
      if (value !== (value = get2())) {
        var start = input.selectionStart;
        var end = input.selectionEnd;
        var length = input.value.length;
        input.value = value ?? "";
        if (end !== null) {
          var new_length = input.value.length;
          if (start === end && end === length && new_length > length) {
            input.selectionStart = new_length;
            input.selectionEnd = new_length;
          } else {
            input.selectionStart = start;
            input.selectionEnd = Math.min(end, new_length);
          }
        }
      }
    });
    if (



untrack(get2) == null && input.value
    ) {
      set2(is_numberlike_input(input) ? to_number(input.value) : input.value);
      if (current_batch !== null) {
        batches2.add(current_batch);
      }
    }
    render_effect(() => {
      var value = get2();
      if (input === document.activeElement) {
        var batch = (
previous_batch ?? current_batch
        );
        if (batches2.has(batch)) {
          return;
        }
      }
      if (is_numberlike_input(input) && value === to_number(input.value)) {
        return;
      }
      if (input.type === "date" && !value && !input.value) {
        return;
      }
      if (value !== input.value) {
        input.value = value ?? "";
      }
    });
  }
  function bind_checked(input, get2, set2 = get2) {
    listen_to_event_and_reset_event(input, "change", (is_reset) => {
      var value = is_reset ? input.defaultChecked : input.checked;
      set2(value);
    });
    if (


untrack(get2) == null
    ) {
      set2(input.checked);
    }
    render_effect(() => {
      var value = get2();
      input.checked = Boolean(value);
    });
  }
  function is_numberlike_input(input) {
    var type = input.type;
    return type === "number" || type === "range";
  }
  function to_number(value) {
    return value === "" ? null : +value;
  }
  function is_bound_this(bound_value, element_or_component) {
    return bound_value === element_or_component || bound_value?.[STATE_SYMBOL] === element_or_component;
  }
  function bind_this(element_or_component = {}, update, get_value, get_parts) {
    effect(() => {
      var old_parts;
      var parts;
      render_effect(() => {
        old_parts = parts;
        parts = [];
        untrack(() => {
          if (element_or_component !== get_value(...parts)) {
            update(element_or_component, ...parts);
            if (old_parts && is_bound_this(get_value(...old_parts), element_or_component)) {
              update(null, ...old_parts);
            }
          }
        });
      });
      return () => {
        queue_micro_task(() => {
          if (parts && is_bound_this(get_value(...parts), element_or_component)) {
            update(null, ...parts);
          }
        });
      };
    });
    return element_or_component;
  }
  function init(immutable = false) {
    const context = (
component_context
    );
    const callbacks = context.l.u;
    if (!callbacks) return;
    let props = () => deep_read_state(context.s);
    if (immutable) {
      let version = 0;
      let prev = (
{}
      );
      const d = derived(() => {
        let changed = false;
        const props2 = context.s;
        for (const key2 in props2) {
          if (props2[key2] !== prev[key2]) {
            prev[key2] = props2[key2];
            changed = true;
          }
        }
        if (changed) version++;
        return version;
      });
      props = () => get(d);
    }
    if (callbacks.b.length) {
      user_pre_effect(() => {
        observe_all(context, props);
        run_all(callbacks.b);
      });
    }
    user_effect(() => {
      const fns = untrack(() => callbacks.m.map(run));
      return () => {
        for (const fn of fns) {
          if (typeof fn === "function") {
            fn();
          }
        }
      };
    });
    if (callbacks.a.length) {
      user_effect(() => {
        observe_all(context, props);
        run_all(callbacks.a);
      });
    }
  }
  function observe_all(context, props) {
    if (context.l.s) {
      for (const signal of context.l.s) get(signal);
    }
    props();
  }
  let is_store_binding = false;
  function capture_store_binding(fn) {
    var previous_is_store_binding = is_store_binding;
    try {
      is_store_binding = false;
      return [fn(), is_store_binding];
    } finally {
      is_store_binding = previous_is_store_binding;
    }
  }
  function prop(props, key2, flags2, fallback) {
    var runes = !legacy_mode_flag || (flags2 & PROPS_IS_RUNES) !== 0;
    var bindable = (flags2 & PROPS_IS_BINDABLE) !== 0;
    var lazy = (flags2 & PROPS_IS_LAZY_INITIAL) !== 0;
    var fallback_value = (
fallback
    );
    var fallback_dirty = true;
    var get_fallback = () => {
      if (fallback_dirty) {
        fallback_dirty = false;
        fallback_value = lazy ? untrack(
fallback
        ) : (
fallback
        );
      }
      return fallback_value;
    };
    var setter;
    if (bindable) {
      var is_entry_props = STATE_SYMBOL in props || LEGACY_PROPS in props;
      setter = get_descriptor(props, key2)?.set ?? (is_entry_props && key2 in props ? (v) => props[key2] = v : void 0);
    }
    var initial_value;
    var is_store_sub = false;
    if (bindable) {
      [initial_value, is_store_sub] = capture_store_binding(() => (
props[key2]
      ));
    } else {
      initial_value =
props[key2];
    }
    if (initial_value === void 0 && fallback !== void 0) {
      initial_value = get_fallback();
      if (setter) {
        if (runes) props_invalid_value();
        setter(initial_value);
      }
    }
    var getter;
    if (runes) {
      getter = () => {
        var value = (
props[key2]
        );
        if (value === void 0) return get_fallback();
        fallback_dirty = true;
        return value;
      };
    } else {
      getter = () => {
        var value = (
props[key2]
        );
        if (value !== void 0) {
          fallback_value =
void 0;
        }
        return value === void 0 ? fallback_value : value;
      };
    }
    if (runes && (flags2 & PROPS_IS_UPDATED) === 0) {
      return getter;
    }
    if (setter) {
      var legacy_parent = props.$$legacy;
      return (
(function(value, mutation) {
          if (arguments.length > 0) {
            if (!runes || !mutation || legacy_parent || is_store_sub) {
              setter(mutation ? getter() : value);
            }
            return value;
          }
          return getter();
        })
      );
    }
    var overridden = false;
    var d = ((flags2 & PROPS_IS_IMMUTABLE) !== 0 ? derived : derived_safe_equal)(() => {
      overridden = false;
      return getter();
    });
    if (bindable) get(d);
    var parent_effect = (
active_effect
    );
    return (
(function(value, mutation) {
        if (arguments.length > 0) {
          const new_value = mutation ? get(d) : runes && bindable ? proxy(value) : value;
          set(d, new_value);
          overridden = true;
          if (fallback_value !== void 0) {
            fallback_value = new_value;
          }
          return value;
        }
        if (is_destroying_effect && overridden || (parent_effect.f & DESTROYED) !== 0) {
          return d.v;
        }
        return get(d);
      })
    );
  }
  function onMount(fn) {
    if (component_context === null) {
      lifecycle_outside_component();
    }
    if (legacy_mode_flag && component_context.l !== null) {
      init_update_callbacks(component_context).m.push(fn);
    } else {
      user_effect(() => {
        const cleanup = untrack(fn);
        if (typeof cleanup === "function") return (
cleanup
        );
      });
    }
  }
  function init_update_callbacks(context) {
    var l = (
context.l
    );
    return l.u ??= { a: [], b: [], m: [] };
  }
  const API_BASE_URL = "https://learnablemeta.com";
  const SITE_BASE_URL = "https://learnablemeta.com";
  const CACHE_NAMESPACE = "";
  const LIVE_CHALLENGE_PATH = /^\/(?:api\/)?live-challenge\/([^/?#]+)\/?$/;
  const PARTY_LOBBY_PATH = /^\/party\/lobby\/[^/?#]+\/?$/;
  let trackedPartyChallenge = null;
  let resourceObserver = null;
  function pathnameFromUrl(url) {
    try {
      return new URL(url, "https://www.geoguessr.com").pathname;
    } catch {
      return null;
    }
  }
  function extractLiveChallengeId(url) {
    const pathname = pathnameFromUrl(url);
    return pathname?.match(LIVE_CHALLENGE_PATH)?.[1] ?? null;
  }
  function isPartyLobbyPath(pathname) {
    return PARTY_LOBBY_PATH.test(pathname);
  }
  function findPartyLiveChallengeId(pathname, resourceUrls, trackedChallenge = null) {
    if (!isPartyLobbyPath(pathname)) {
      return null;
    }
    for (let i = resourceUrls.length - 1; i >= 0; i--) {
      const id = extractLiveChallengeId(resourceUrls[i]);
      if (id) {
        return id;
      }
    }
    return trackedChallenge?.partyLobbyPath === pathname ? trackedChallenge.id : null;
  }
  function trackResource(url) {
    if (!isPartyLobbyPath(location.pathname)) {
      return;
    }
    const id = extractLiveChallengeId(url);
    if (id) {
      trackedPartyChallenge = { id, partyLobbyPath: location.pathname };
    }
  }
  function initLiveChallengeIdTracking() {
    if (resourceObserver || typeof PerformanceObserver === "undefined") {
      return;
    }
    for (const entry of performance.getEntriesByType("resource")) {
      trackResource(entry.name);
    }
    resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trackResource(entry.name);
      }
    });
    resourceObserver.observe({ entryTypes: ["resource"] });
  }
  function getLiveChallengeId(pathname = location.pathname) {
    const routeId = extractLiveChallengeId(pathname);
    if (routeId) {
      return routeId;
    }
    if (!isPartyLobbyPath(pathname)) {
      return null;
    }
    return findPartyLiveChallengeId(
      pathname,
      performance.getEntriesByType("resource").map((entry) => entry.name),
      trackedPartyChallenge
    );
  }
  function waitForElement(selector) {
    return new Promise((resolve) => {
      try {
        const existingElement = document.querySelector(selector);
        if (existingElement) {
          resolve(existingElement);
          return;
        }
      } catch {
      }
      const observer = new MutationObserver(() => {
        try {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            removeUrlChangeListener();
            resolve(element);
            return;
          }
        } catch {
        }
      });
      const handleUrlChange = () => {
        observer.disconnect();
        removeUrlChangeListener();
        resolve(null);
      };
      const removeUrlChangeListener = () => {
        window.removeEventListener("urlchange", handleUrlChange);
      };
      window.addEventListener("urlchange", handleUrlChange);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
      });
    });
  }
  function localStorageGetInt(name) {
    const savedValue = _unsafeWindow.localStorage.getItem(name);
    if (!savedValue) {
      return null;
    }
    const savedInt = parseInt(savedValue, 10);
    if (isNaN(savedInt)) {
      return null;
    }
    return savedInt;
  }
  async function fetchMapInfo(url) {
    return new Promise((resolve, reject) => {
      _GM_xmlhttpRequest({
        method: "GET",
        url,
        onload: (response) => {
          if (response.status === 200 || response.status === 404) {
            try {
              const mapInfo = JSON.parse(response.responseText);
              logInfo("fetched map info", mapInfo);
              resolve(mapInfo);
            } catch (e) {
              logInfo("failed to parse map info response", e);
              reject("Failed to parse response");
            }
          } else {
            logInfo("failed to fetch map info", response);
            reject(`HTTP error! status: ${response.status}`);
          }
        },
        onerror: () => {
          reject("An error occurred while fetching data");
        }
      });
    });
  }
  const MAP_FOUND_CACHE_MS = 24 * 60 * 60 * 1e3;
  const MAP_NOT_FOUND_CACHE_MS = 60 * 60 * 1e3;
  function getCachedMapInfo(key2) {
    const savedMapInfo = _unsafeWindow.localStorage.getItem(key2);
    if (!savedMapInfo) {
      return null;
    }
    try {
      const parsed = JSON.parse(savedMapInfo);
      if (parsed && parsed.mapInfo && typeof parsed.fetchedAt === "number") {
        return parsed;
      }
    } catch {
    }
    return null;
  }
  async function getMapInfo(geoguessrId, forceUpdate) {
    const localStorageMapInfoKey = `geometa:map-info${CACHE_NAMESPACE}:${geoguessrId}`;
    const cached = getCachedMapInfo(localStorageMapInfoKey);
    if (!forceUpdate && cached) {
      const ttl = cached.mapInfo.mapFound ? MAP_FOUND_CACHE_MS : MAP_NOT_FOUND_CACHE_MS;
      if (Date.now() - cached.fetchedAt < ttl) {
        logInfo("using saved map info", cached.mapInfo);
        return cached.mapInfo;
      }
    }
    const url = `${API_BASE_URL}/api/userscript/map/${geoguessrId}`;
    let mapInfo;
    try {
      mapInfo = await fetchMapInfo(url);
    } catch (e) {
      if (cached) {
        logInfo("map info fetch failed - using stale cached map info", e);
        return cached.mapInfo;
      }
      throw e;
    }
    const toCache = { mapInfo, fetchedAt: Date.now() };
    _unsafeWindow.localStorage.setItem(localStorageMapInfoKey, JSON.stringify(toCache));
    _unsafeWindow.localStorage.setItem(
      `geometa:latest-version${CACHE_NAMESPACE}`,
      mapInfo.userscriptVersion
    );
    return mapInfo;
  }
  function getLatestVersionInfo() {
    return _unsafeWindow.localStorage.getItem(`geometa:latest-version${CACHE_NAMESPACE}`);
  }
  function isNewerVersion(candidate, current) {
    const a = candidate.split(".").map(Number);
    const b = current.split(".").map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const diff = (a[i] || 0) - (b[i] || 0);
      if (diff) return diff > 0;
    }
    return false;
  }
  function checkIfOutdated() {
    const latest = getLatestVersionInfo();
    if (!latest) {
      return false;
    }
    return isNewerVersion(latest, _GM_info.script.version);
  }
  function markHelpMessageAsRead() {
    _unsafeWindow.localStorage.setItem("geometa:help-message-read", "true");
  }
  function wasHelpMessageRead() {
    return _unsafeWindow.localStorage.getItem("geometa:help-message-read") == "true";
  }
  const getChallengeId = getLiveChallengeId;
  async function getChallengeInfo(id) {
    const url = `https://game-server.geoguessr.com/api/live-challenge/${id}`;
    const response = await fetch(url, {
      method: "GET",
      credentials: "include"
    });
    const data = await response.json();
    const mapId = data.options.mapSlug;
    const currentRound = data.currentRoundNumber - 1;
    const rounds = data.rounds;
    const panorama = rounds[currentRound].question.panoramaQuestionPayload.panorama;
    const panoIdHex = panorama.panoId;
    const panoId = decodePanoId(panoIdHex);
    return { mapId, panoId };
  }
  function decodePanoId(encoded) {
    let panoId = "";
    for (let i = 0; i + 2 <= encoded.length; i += 2) {
      panoId += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16));
    }
    return panoId;
  }
  function logInfo(name, data) {
    console.log(`ALM: ${name}`, data);
  }
  function extractMapIdFromUrl(url) {
    const match = url.match(/\/maps\/([^\/]+)/);
    return match ? match[1] : null;
  }
  const PUBLIC_VERSION = "5";
  if (typeof window !== "undefined") {
    ((window.__svelte ??= {}).v ??= new Set()).add(PUBLIC_VERSION);
  }
  enable_legacy_mode_flag();
  var root$7 = from_html(`<div class="loadership_ZOJAQ svelte-f4erjd"><div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div> <div class="svelte-f4erjd"></div></div>`);
  function Spinner($$anchor) {
    var div = root$7();
    append($$anchor, div);
  }
  var root_1$3 = from_html(`<img class="fi svelte-tdzec4"/>`);
  function CountryFlag($$anchor, $$props) {
    const countryCodes = {
      Afghanistan: "af",
      Albania: "al",
      Algeria: "dz",
      Andorra: "ad",
      Angola: "ao",
      "Antigua and Barbuda": "ag",
      Argentina: "ar",
      Armenia: "am",
      Australia: "au",
      Austria: "at",
      Azerbaijan: "az",
      Bahamas: "bs",
      Bahrain: "bh",
      Bangladesh: "bd",
      Barbados: "bb",
      Belarus: "by",
      Belgium: "be",
      Belize: "bz",
      Benin: "bj",
      Bhutan: "bt",
      Bolivia: "bo",
      "Bosnia and Herzegovina": "ba",
      Botswana: "bw",
      Brazil: "br",
      Brunei: "bn",
      Bulgaria: "bg",
      "Burkina Faso": "bf",
      Burundi: "bi",
      "Cabo Verde": "cv",
      Cambodia: "kh",
      Cameroon: "cm",
      Canada: "ca",
      "Central African Republic": "cf",
      Chad: "td",
      Chile: "cl",
      China: "cn",
      Colombia: "co",
      Comoros: "km",
      Congo: "cg",
      "Costa Rica": "cr",
      Croatia: "hr",
      Cuba: "cu",
      Curacao: "cw",
      Cyprus: "cy",
      Czechia: "cz",
      "Christmas Island": "cx",
      "Democratic Republic of the Congo": "cd",
      Denmark: "dk",
      Djibouti: "dj",
      Dominica: "dm",
      "Dominican Republic": "do",
      Ecuador: "ec",
      Egypt: "eg",
      "El Salvador": "sv",
      "Equatorial Guinea": "gq",
      Eritrea: "er",
      Estonia: "ee",
      Eswatini: "sz",
      Ethiopia: "et",
      Fiji: "fj",
      Finland: "fi",
      France: "fr",
      Gabon: "ga",
      Gambia: "gm",
      Georgia: "ge",
      Germany: "de",
      Ghana: "gh",
      Greece: "gr",
      Grenada: "gd",
      Guatemala: "gt",
      Guinea: "gn",
      "Guinea-Bissau": "gw",
      Guyana: "gy",
      Haiti: "ht",
      Honduras: "hn",
      Hungary: "hu",
      Iceland: "is",
      India: "in",
      Indonesia: "id",
      Iran: "ir",
      Iraq: "iq",
      Ireland: "ie",
      Israel: "il",
      Italy: "it",
      Jamaica: "jm",
      Japan: "jp",
      Jordan: "jo",
      Kazakhstan: "kz",
      Kenya: "ke",
      Kiribati: "ki",
      Kuwait: "kw",
      Kyrgyzstan: "kg",
      Laos: "la",
      Latvia: "lv",
      Lebanon: "lb",
      Lesotho: "ls",
      Liberia: "lr",
      Libya: "ly",
      Liechtenstein: "li",
      Lithuania: "lt",
      Luxembourg: "lu",
      Madagascar: "mg",
      Malawi: "mw",
      Malaysia: "my",
      Maldives: "mv",
      Mali: "ml",
      Malta: "mt",
      "Marshall Islands": "mh",
      Mauritania: "mr",
      Mauritius: "mu",
      Mexico: "mx",
      Micronesia: "fm",
      Moldova: "md",
      Monaco: "mc",
      Mongolia: "mn",
      Montenegro: "me",
      Morocco: "ma",
      Mozambique: "mz",
      Myanmar: "mm",
      Namibia: "na",
      Nauru: "nr",
      Nepal: "np",
      Netherlands: "nl",
      "New Zealand": "nz",
      Nicaragua: "ni",
      Niger: "ne",
      Nigeria: "ng",
      "North Korea": "kp",
      "North Macedonia": "mk",
      Norway: "no",
      Oman: "om",
      Pakistan: "pk",
      Palau: "pw",
      "Palestine State": "ps",
      Panama: "pa",
      "Papua New Guinea": "pg",
      Paraguay: "py",
      Peru: "pe",
      Philippines: "ph",
      Poland: "pl",
      Portugal: "pt",
      "Puerto Rico": "pr",
      Qatar: "qa",
      Romania: "ro",
      Russia: "ru",
      Rwanda: "rw",
      "Saint Kitts and Nevis": "kn",
      "Saint Lucia": "lc",
      "Saint Vincent and the Grenadines": "vc",
      Samoa: "ws",
      "San Marino": "sm",
      "Sao Tome and Principe": "st",
      "Saudi Arabia": "sa",
      Senegal: "sn",
      Serbia: "rs",
      Seychelles: "sc",
      "Sierra Leone": "sl",
      Singapore: "sg",
      Slovakia: "sk",
      Slovenia: "si",
      "Solomon Islands": "sb",
      Somalia: "so",
      "South Africa": "za",
      "South Korea": "kr",
      "South Sudan": "ss",
      Spain: "es",
      "Sri Lanka": "lk",
      Sudan: "sd",
      Suriname: "sr",
      Sweden: "se",
      Switzerland: "ch",
      Syria: "sy",
      Taiwan: "tw",
      Tajikistan: "tj",
      Tanzania: "tz",
      Thailand: "th",
      "Timor-Leste": "tl",
      Togo: "tg",
      Tonga: "to",
      "Trinidad and Tobago": "tt",
      Tunisia: "tn",
      Turkey: "tr",
      Turkmenistan: "tm",
      Tuvalu: "tv",
      Uganda: "ug",
      Ukraine: "ua",
      "United Arab Emirates": "ae",
      "United Kingdom": "gb",
      "United States of America": "us",
      "United States": "us",
      Uruguay: "uy",
      Uzbekistan: "uz",
      Vanuatu: "vu",
      "Vatican City": "va",
      Venezuela: "ve",
      Vietnam: "vn",
      Yemen: "ye",
      Zambia: "zm",
      Zimbabwe: "zw"
    };
    const countryCode = countryCodes[$$props.countryName];
    var fragment = comment();
    var node = first_child(fragment);
    {
      var consequent = ($$anchor2) => {
        var img = root_1$3();
        template_effect(
          ($0) => {
            set_attribute(img, "alt", $$props.countryName);
            set_attribute(img, "src", `https://purecatamphetamine.github.io/country-flag-icons/3x2/${$0 ?? ""}.svg`);
          },
          [() => countryCode.toUpperCase()]
        );
        append($$anchor2, img);
      };
      if_block(node, ($$render) => {
        if (countryCode) $$render(consequent);
      });
    }
    append($$anchor, fragment);
  }
  const leftKey = "geometa:containerStyleLeft";
  const topKey = "geometa:containerStyleTop";
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  function getSavedPosition(key2) {
    const value = localStorage.getItem(key2);
    if (value && value.startsWith("-")) {
      return null;
    }
    return value;
  }
  function setContainerPosition(container) {
    container.style.left = getSavedPosition(leftKey) ?? container.style.left;
    container.style.top = getSavedPosition(topKey) ?? container.style.top;
  }
  function resetContainerPosition() {
    _unsafeWindow.localStorage.removeItem(leftKey);
    _unsafeWindow.localStorage.removeItem(topKey);
  }
  const onPointerDown = (event2, container) => {
    const target = event2.target;
    if (target.closest("a") || target.closest("button")) {
      return;
    }
    isDragging = true;
    container.setPointerCapture(event2.pointerId);
    dragOffset = {
      x: event2.clientX - container.getBoundingClientRect().left,
      y: event2.clientY - container.getBoundingClientRect().top
    };
    event2.preventDefault();
  };
  const onPointerMove = (event2, container) => {
    if (isDragging) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      let newLeft = event2.clientX - dragOffset.x;
      let newTop = event2.clientY - dragOffset.y;
      if (newLeft < 0) newLeft = 0;
      if (newLeft + containerWidth > windowWidth) {
        newLeft = windowWidth - containerWidth;
      }
      if (newTop < 0) newTop = 0;
      if (newTop + containerHeight > windowHeight) {
        newTop = windowHeight - containerHeight;
      }
      container.style.left = `${newLeft}px`;
      container.style.top = `${newTop}px`;
    }
  };
  const onPointerUp = (event2, container) => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    if (container && container.hasPointerCapture(event2.pointerId)) {
      container.releasePointerCapture(event2.pointerId);
    }
    _unsafeWindow.localStorage.setItem(leftKey, container.style.left);
    _unsafeWindow.localStorage.setItem(topKey, container.style.top);
  };
  const widthKey = "geometa:containerWidth";
  const heightKey = "geometa:containerHeight";
  function setContainerDimensions(container) {
    const containerWidth = localStorageGetInt(widthKey) || 500;
    const containerHeight = localStorageGetInt(heightKey) || 400;
    container.style.width = `${containerWidth}px`;
    container.style.height = `${containerHeight}px`;
  }
  function resetContainerDimensions() {
    _unsafeWindow.localStorage.removeItem(widthKey);
    _unsafeWindow.localStorage.removeItem(heightKey);
  }
  function saveContainerDimensions(entry) {
    const target = entry.target;
    const containerWidth = target.offsetWidth;
    const containerHeight = target.offsetHeight;
    if (containerWidth !== 0 && containerHeight !== 0) {
      _unsafeWindow.localStorage.setItem(widthKey, Math.floor(containerWidth).toString());
      _unsafeWindow.localStorage.setItem(heightKey, Math.floor(containerHeight).toString());
    }
  }
  var root_4$1 = from_html(`<div class="lens svelte-8ojyxu"></div>`);
  var root_3$2 = from_html(`<div class="image-wrapper svelte-8ojyxu" role="img" aria-label="Zoomable image"><img class="responsive-image svelte-8ojyxu"/> <!></div>`);
  var root_6$3 = from_html(`<button></button>`);
  var root_5$3 = from_html(`<div class="controls"><button class="click-area prev-area svelte-8ojyxu" type="button" aria-label="Previous image"><span class="prev svelte-8ojyxu">&#10094;</span></button> <button class="click-area next-area svelte-8ojyxu" type="button" aria-label="Next image"><span class="next svelte-8ojyxu">&#10095;</span></button></div> <div class="indicators svelte-8ojyxu"></div>`, 1);
  var root$6 = from_html(`<div class="carousel svelte-8ojyxu"><!> <!></div>`);
  function Carousel($$anchor, $$props) {
    push($$props, false);
    let images = prop($$props, "images", 24, () => []);
    let currentIndex = mutable_source(0);
    function prev() {
      set(currentIndex, (get(currentIndex) - 1 + images().length) % images().length);
    }
    function next() {
      set(currentIndex, (get(currentIndex) + 1) % images().length);
    }
    let containerRef = mutable_source(null);
    let imageRef = mutable_source(null);
    let isZoomed = mutable_source(false);
    let lensX = mutable_source(0);
    let lensY = mutable_source(0);
    let lensSize = 150;
    let scale = 2;
    function handleMouseEnter() {
      set(isZoomed, true);
    }
    function handleMouseLeave() {
      set(isZoomed, false);
    }
    function handleMouseMove(event2) {
      if (!get(containerRef)) return;
      const rect = get(containerRef).getBoundingClientRect();
      set(lensX, event2.clientX - rect.left);
      set(lensY, event2.clientY - rect.top);
    }
    init();
    var div = root$6();
    var node = child(div);
    {
      var consequent_2 = ($$anchor2) => {
        var fragment = comment();
        var node_1 = first_child(fragment);
        each(node_1, 1, images, index, ($$anchor3, image, index2) => {
          var fragment_1 = comment();
          var node_2 = first_child(fragment_1);
          {
            var consequent_1 = ($$anchor4) => {
              var div_1 = root_3$2();
              div_1.__mousemove = handleMouseMove;
              var img = child(div_1);
              set_attribute(img, "alt", `Image ${index2 + 1}`);
              bind_this(img, ($$value) => set(imageRef, $$value), () => get(imageRef));
              var node_3 = sibling(img, 2);
              {
                var consequent = ($$anchor5) => {
                  var div_2 = root_4$1();
                  template_effect(() => set_style(div_2, `
                /* Position the lens so the mouse is in its center */
                top: ${get(lensY) - lensSize / 2}px;
                left: ${get(lensX) - lensSize / 2}px;
                width: 150px;
                height: 150px;
                background-image: url(${get(image) ?? ""});
                background-repeat: no-repeat;
                background-size: ${(get(imageRef), untrack(() => get(imageRef).width * scale)) ?? ""}px ${(get(imageRef), untrack(() => get(imageRef).height * scale)) ?? ""}px;
                background-position: ${-(get(lensX) * scale - lensSize / 2)}px ${-(get(lensY) * scale - lensSize / 2)}px;
              `));
                  append($$anchor5, div_2);
                };
                if_block(node_3, ($$render) => {
                  if (get(isZoomed) && get(imageRef)) $$render(consequent);
                });
              }
              bind_this(div_1, ($$value) => set(containerRef, $$value), () => get(containerRef));
              template_effect(() => set_attribute(img, "src", get(image)));
              event("mouseenter", div_1, handleMouseEnter);
              event("mouseleave", div_1, handleMouseLeave);
              append($$anchor4, div_1);
            };
            if_block(node_2, ($$render) => {
              if (index2 === get(currentIndex)) $$render(consequent_1);
            });
          }
          append($$anchor3, fragment_1);
        });
        append($$anchor2, fragment);
      };
      if_block(node, ($$render) => {
        if (deep_read_state(images()), untrack(() => images().length)) $$render(consequent_2);
      });
    }
    var node_4 = sibling(node, 2);
    {
      var consequent_3 = ($$anchor2) => {
        var fragment_2 = root_5$3();
        var div_3 = first_child(fragment_2);
        var button = child(div_3);
        button.__click = prev;
        var button_1 = sibling(button, 2);
        button_1.__click = next;
        var div_4 = sibling(div_3, 2);
        each(div_4, 5, images, index, ($$anchor3, _, index2) => {
          var button_2 = root_6$3();
          set_attribute(button_2, "aria-label", `Switch to image ${index2 + 1}`);
          button_2.__click = () => set(currentIndex, index2);
          template_effect(() => set_class(button_2, 1, `indicator ${index2 === get(currentIndex) ? "active" : ""}`, "svelte-8ojyxu"));
          append($$anchor3, button_2);
        });
        append($$anchor2, fragment_2);
      };
      if_block(node_4, ($$render) => {
        if (deep_read_state(images()), untrack(() => images().length > 1)) $$render(consequent_3);
      });
    }
    append($$anchor, div);
    pop();
  }
  delegate(["mousemove", "click"]);
  const ANNOUNCEMENT_CACHE_KEY = `geometa:cached-announcement${CACHE_NAMESPACE}`;
  const ANNOUNCEMENT_CACHE_DURATION_MS = 60 * 60 * 1e3;
  const ANNOUNCEMENT_API_URL = `${API_BASE_URL}/api/userscript/announcement/`;
  async function getAnnouncement() {
    try {
      const cachedItemString = localStorage.getItem(ANNOUNCEMENT_CACHE_KEY);
      if (cachedItemString) {
        const cachedEntry = JSON.parse(cachedItemString);
        const now2 = Date.now();
        if (now2 - cachedEntry.fetchedAt < ANNOUNCEMENT_CACHE_DURATION_MS) {
          return cachedEntry.data;
        } else {
          localStorage.removeItem(ANNOUNCEMENT_CACHE_KEY);
        }
      }
    } catch (e) {
      localStorage.removeItem(ANNOUNCEMENT_CACHE_KEY);
    }
    return new Promise((resolve) => {
      _GM_xmlhttpRequest({
        method: "GET",
        url: ANNOUNCEMENT_API_URL,
        timeout: 3e3,
        onload: (response) => {
          let announcementToCache = null;
          if (response.status === 200) {
            try {
              if (response.responseText && response.responseText.trim().toLowerCase() !== "null") {
                const parsedData = JSON.parse(response.responseText);
                if (parsedData && typeof parsedData.timestamp === "number" && typeof parsedData.htmlMessage === "string") {
                  announcementToCache = parsedData;
                }
              }
            } catch (parseError) {
              console.error(
                "Failed to parse announcement JSON from API:",
                parseError,
                response.responseText
              );
            }
          } else {
            console.error(
              `Error fetching announcement from API: ${response.status} ${response.statusText}`
            );
          }
          const itemToCache = {
            data: announcementToCache,
            fetchedAt: Date.now()
          };
          try {
            localStorage.setItem(ANNOUNCEMENT_CACHE_KEY, JSON.stringify(itemToCache));
            console.log(
              announcementToCache ? "Fetched announcement cached." : "Fetched 'no announcement' state cached."
            );
          } catch (e) {
            console.warn("Error writing announcement state to localStorage cache:", e);
          }
          resolve(announcementToCache);
        },
        onerror: (error) => {
          console.error("Network error fetching announcement from API:", error);
          resolve(null);
        },
        ontimeout: () => {
          console.error("Timeout fetching announcement from API.");
          resolve(null);
        }
      });
    });
  }
  const LAST_DISMISSED_ANNOUNCEMENT_TIMESTAMP_KEY = `geometa:last-dismissed-announcement${CACHE_NAMESPACE}`;
  function getLastDismissedAnnouncementTimestamp() {
    try {
      const storedValue = localStorage.getItem(LAST_DISMISSED_ANNOUNCEMENT_TIMESTAMP_KEY);
      if (storedValue) {
        const timestamp = parseInt(storedValue, 10);
        return !isNaN(timestamp) ? timestamp : null;
      }
      return null;
    } catch (e) {
      console.warn(
        "LocalStorage Error: Could not retrieve last dismissed announcement timestamp.",
        e
      );
      return null;
    }
  }
  function markAnnouncementAsDismissed(announcementTimestamp) {
    if (isNaN(announcementTimestamp)) {
      console.error(
        "Invalid timestamp provided to markAnnouncementAsDismissed. Must be a number.",
        announcementTimestamp
      );
      return;
    }
    try {
      localStorage.setItem(
        LAST_DISMISSED_ANNOUNCEMENT_TIMESTAMP_KEY,
        announcementTimestamp.toString()
      );
    } catch (e) {
      console.warn("LocalStorage Error: Could not save last dismissed announcement timestamp.", e);
    }
  }
  const focusableSelector = [
    "a[href]",
    "button:not(:disabled)",
    "input:not(:disabled)",
    "select:not(:disabled)",
    "textarea:not(:disabled)",
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");
  function focusableElements(node) {
    return Array.from(node.querySelectorAll(focusableSelector)).filter(
      (element) => !element.hidden && element.getClientRects().length > 0
    );
  }
  function modalDialog(node, initialOptions) {
    let options = initialOptions;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    function focusDialog() {
      if (!node.isConnected || node.contains(document.activeElement)) return;
      const initialFocus = node.querySelector("[data-modal-initial-focus]") ?? focusableElements(node)[0];
      if (initialFocus) {
        initialFocus.focus();
      } else {
        node.tabIndex = -1;
        node.focus();
      }
    }
    function handleKeydown(event2) {
      if (event2.key === "Escape" && options.closeOnEscape !== false) {
        event2.preventDefault();
        event2.stopPropagation();
        options.onClose();
        return;
      }
      if (event2.key !== "Tab") return;
      const elements = focusableElements(node);
      if (elements.length === 0) {
        event2.preventDefault();
        node.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const activeElement = document.activeElement;
      if (event2.shiftKey && (activeElement === first || !node.contains(activeElement))) {
        event2.preventDefault();
        last.focus();
      } else if (!event2.shiftKey && (activeElement === last || !node.contains(activeElement))) {
        event2.preventDefault();
        first.focus();
      }
    }
    node.addEventListener("keydown", handleKeydown);
    requestAnimationFrame(focusDialog);
    return {
      update(nextOptions) {
        options = nextOptions;
      },
      destroy() {
        node.removeEventListener("keydown", handleKeydown);
        if (previouslyFocused?.isConnected) previouslyFocused.focus();
      }
    };
  }
  const pageWindow = _unsafeWindow;
  const maps = [];
  const fittedBounds = new WeakMap();
  const wrappedFitBounds = new WeakSet();
  const wrappedMapConstructors = new WeakSet();
  let pendingGeoJson = null;
  let layer = null;
  let layerMap = null;
  let layerBounds = null;
  let renderObserver = null;
  let fittingArea = false;
  function detachLayer() {
    layer?.setMap(null);
    layer = null;
    layerMap = null;
    layerBounds = null;
  }
  function stopWatchingForResultMap() {
    renderObserver?.disconnect();
    renderObserver = null;
  }
  function isVisibleMap(map) {
    try {
      const element = map.getDiv();
      return element.isConnected && element.getClientRects().length > 0;
    } catch {
      return false;
    }
  }
  function mapFromReact(element) {
    if (!element) return null;
    const key2 = Object.keys(element).find((name) => name.startsWith("__reactFiber"));
    const fiber = key2 ? element[key2] : null;
    const map = fiber?.return?.memoizedState?.memoizedState?.current?.instance ?? fiber?.return?.updateQueue?.lastEffect?.deps?.[0];
    return map && typeof map.fitBounds === "function" && typeof map.getBounds === "function" && typeof map.getDiv === "function" ? map : null;
  }
  function currentResultMap() {
    const visibleMaps = maps.filter(isVisibleMap);
    const resultView = pageWindow.document.querySelector('div[data-qa="result-view-top"]');
    if (resultView) {
      const reactMap = mapFromReact(resultView.querySelector('[class*="coordinate-result-map_map"]'));
      if (reactMap && isVisibleMap(reactMap)) {
        wrapFitBounds(reactMap);
        if (!maps.includes(reactMap)) maps.push(reactMap);
        return reactMap;
      }
      return visibleMaps.findLast((map) => resultView.contains(map.getDiv())) ?? null;
    }
    return visibleMaps.at(-1) ?? null;
  }
  function watchForResultMap() {
    if (renderObserver) return;
    renderObserver = new MutationObserver(renderPendingArea);
    renderObserver.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"]
    });
  }
  function wrapFitBounds(map) {
    const originalFitBounds = map.fitBounds;
    if (wrappedFitBounds.has(originalFitBounds)) return;
    const fitBounds = function(...args) {
      const result = originalFitBounds.apply(this, args);
      if (!fittingArea) {
        fittedBounds.set(this, args[0]);
        if (pendingGeoJson && layerMap === this) detachLayer();
      }
      trackMap(this);
      return result;
    };
    wrappedFitBounds.add(fitBounds);
    map.fitBounds = fitBounds;
  }
  function trackMap(map) {
    if (!maps.includes(map)) maps.push(map);
    if (!pendingGeoJson) return;
    watchForResultMap();
    queueMicrotask(renderPendingArea);
    requestAnimationFrame(renderPendingArea);
  }
  function renderPendingArea() {
    if (!pendingGeoJson) return;
    const map = currentResultMap();
    const mapsApi = pageWindow.google?.maps;
    if (!map || !mapsApi?.Data || !mapsApi.LatLngBounds || !mapsApi.SymbolPath) return;
    if (layerMap === map) return;
    detachLayer();
    const currentBounds = fittedBounds.get(map) ?? map.getBounds();
    if (!currentBounds) return;
    const nextLayer = new mapsApi.Data({ map });
    try {
      nextLayer.setStyle({
        clickable: false,
        fillColor: "#057a55",
        fillOpacity: 0.16,
        strokeColor: "#057a55",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        icon: {
          path: mapsApi.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: "#057a55",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        }
      });
      const features = nextLayer.addGeoJson(pendingGeoJson);
      const bounds = new mapsApi.LatLngBounds(currentBounds);
      features.forEach(
        (feature) => feature.getGeometry()?.forEachLatLng((point) => bounds.extend(point))
      );
      fittingArea = true;
      try {
        map.fitBounds(bounds, 48);
      } finally {
        fittingArea = false;
      }
      layer = nextLayer;
      layerMap = map;
      layerBounds = currentBounds;
      stopWatchingForResultMap();
    } catch (error) {
      nextLayer.setMap(null);
      stopWatchingForResultMap();
      console.error("ALM: failed to render map area", error);
    }
  }
  function wrapGoogleMaps() {
    const mapsApi = pageWindow.google?.maps;
    const OriginalMap = mapsApi?.Map;
    if (!mapsApi || !OriginalMap) return false;
    wrapFitBounds(OriginalMap.prototype);
    if (wrappedMapConstructors.has(OriginalMap)) return true;
    const WrappedMap = class extends OriginalMap {
      constructor(...args) {
        super(...args);
        trackMap(this);
      }
    };
    wrappedMapConstructors.add(WrappedMap);
    mapsApi.Map = WrappedMap;
    return true;
  }
  function interceptGoogleCallback(script) {
    const path = new URL(script.src).searchParams.get("callback")?.split(".");
    if (!path?.length) return;
    let owner = pageWindow;
    for (const part of path.slice(0, -1)) {
      owner = owner?.[part];
      if (!owner) return;
    }
    const name = path.at(-1);
    const original = owner[name];
    if (typeof original !== "function") return;
    owner[name] = function(...args) {
      wrapGoogleMaps();
      return original.apply(this, args);
    };
  }
  function interceptGoogleScript(script) {
    if (!script.src.includes("maps.googleapis.com") || script.dataset.geometaObserved) return;
    script.dataset.geometaObserved = "true";
    interceptGoogleCallback(script);
    script.addEventListener("load", wrapGoogleMaps, { once: true });
  }
  function initMapArea() {
    if (wrapGoogleMaps()) return;
    document.querySelectorAll("script[src]").forEach(interceptGoogleScript);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLScriptElement) interceptGoogleScript(node);
        }
      }
      if (wrapGoogleMaps()) observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  }
  function showMapArea(geoJson) {
    clearMapArea();
    if (!geoJson || typeof geoJson !== "object" || Array.isArray(geoJson)) return;
    pendingGeoJson = geoJson;
    watchForResultMap();
    renderPendingArea();
  }
  function clearMapArea() {
    pendingGeoJson = null;
    stopWatchingForResultMap();
    const map = layerMap;
    const bounds = layerBounds;
    detachLayer();
    if (map && bounds) {
      fittingArea = true;
      try {
        map.fitBounds(bounds);
      } finally {
        fittingArea = false;
      }
    }
  }
  const STORAGE_KEY = "learnableMeta_geoJsonEnabled";
  function isGeoJsonEnabled() {
    return _GM_getValue(STORAGE_KEY, true);
  }
  function setGeoJsonEnabled(enabled) {
    _GM_setValue(STORAGE_KEY, enabled);
  }
  var root_2$2 = from_html(`<div class="announcement svelte-1j2rmt2"><div class="svelte-1j2rmt2"><!></div> <button class="vote-close-btn svelte-1j2rmt2" aria-label="Dismiss announcement">Dismiss</button></div>`);
  var root_3$1 = from_html(`<p class="svelte-1j2rmt2"> </p>`);
  var root_7 = from_html(`<button type="button" role="tab"> </button>`);
  var root_6$2 = from_html(`<div class="meta-tabs svelte-1j2rmt2" role="tablist" aria-label="Metas at this location"></div>`);
  var root_8$1 = from_html(`<p class="svelte-1j2rmt2"> </p>`);
  var root_11$1 = from_html(`<p class="geometa-footer svelte-1j2rmt2"><!></p>`);
  var root_12$1 = from_html(`<hr class="svelte-1j2rmt2"/> <!>`, 1);
  var root_10$1 = from_html(`<p class="svelte-1j2rmt2"><!> <strong class="svelte-1j2rmt2"> </strong> </p> <div class="geometa-note svelte-1j2rmt2"><!></div> <!> <!>`, 1);
  var root_5$2 = from_html(`<!> <div class="meta-panel svelte-1j2rmt2"><!></div>`, 1);
  var root_16$1 = from_html(`<div class="learnablemeta-modal-backdrop learnablemeta-ui svelte-1j2rmt2" role="presentation"><div class="learnablemeta-modal svelte-1j2rmt2" role="dialog" aria-modal="true" aria-labelledby="external-link-title"><div class="learnablemeta-modal-header svelte-1j2rmt2"><p class="learnablemeta-modal-eyebrow svelte-1j2rmt2">LearnableMeta</p> <h2 class="learnablemeta-modal-title svelte-1j2rmt2" id="external-link-title">Open external link?</h2> <p class="learnablemeta-modal-description svelte-1j2rmt2">This link will open in a new browser tab.</p></div> <div class="learnablemeta-modal-body svelte-1j2rmt2"><p class="learnablemeta-modal-code svelte-1j2rmt2"> </p></div> <div class="learnablemeta-modal-actions svelte-1j2rmt2"><button type="button" data-modal-initial-focus="" class="learnablemeta-button learnablemeta-button--outline svelte-1j2rmt2">Cancel</button> <button type="button" class="learnablemeta-button learnablemeta-button--primary svelte-1j2rmt2">Continue</button></div></div></div>`);
  var root_18$1 = from_html(`<p class="learnablemeta-modal-alert svelte-1j2rmt2"> </p>`);
  var root_17$1 = from_html(`<div class="learnablemeta-modal-backdrop learnablemeta-ui svelte-1j2rmt2" role="presentation"><div class="learnablemeta-modal learnablemeta-modal--wide svelte-1j2rmt2" role="dialog" aria-modal="true" aria-labelledby="learnablemeta-help-title"><div class="learnablemeta-modal-header svelte-1j2rmt2"><p class="learnablemeta-modal-eyebrow svelte-1j2rmt2">LearnableMeta</p> <h2 class="learnablemeta-modal-title svelte-1j2rmt2" id="learnablemeta-help-title">Userscript guide</h2> <p class="learnablemeta-modal-description svelte-1j2rmt2">Quick tips for using LearnableMeta while you play.</p></div> <div class="learnablemeta-modal-body svelte-1j2rmt2"><!> <ul class="learnablemeta-help-list svelte-1j2rmt2"><li class="svelte-1j2rmt2"><strong class="svelte-1j2rmt2">Drag to move:</strong> Click and drag the top of the note to reposition it anywhere
              on your screen.</li> <li class="svelte-1j2rmt2"><strong class="svelte-1j2rmt2">Resize:</strong> Use the bottom-right corner to resize the note to your liking.</li> <li class="svelte-1j2rmt2"><strong class="svelte-1j2rmt2">View map meta list:</strong> Click the list icon to see all the metas included
              in the map you are currently playing.</li> <li class="svelte-1j2rmt2"><strong class="svelte-1j2rmt2">Join the community:</strong> Click the Discord icon to share feedback, suggest
              improvements, or just say hi!</li> <li class="svelte-1j2rmt2"><strong class="svelte-1j2rmt2">Outdated script:</strong> The question mark icon blinks when an update is available.</li></ul></div> <div class="learnablemeta-modal-actions svelte-1j2rmt2"><button type="button" class="learnablemeta-button learnablemeta-button--primary svelte-1j2rmt2">Close</button></div></div></div>`);
  var root$5 = from_html(`<div class="geometa-container svelte-1j2rmt2"><!> <div class="flex header svelte-1j2rmt2"><h2 class="svelte-1j2rmt2">Learnable Meta</h2> <div class="icons svelte-1j2rmt2"><a target="_blank" aria-label="List of map metas" class="svelte-1j2rmt2"><span class="skill-icons--list svelte-1j2rmt2"></span></a> <a target="_blank" aria-label="Learnable Meta website" class="svelte-1j2rmt2"><span class="flat-color-icons--globe svelte-1j2rmt2"></span></a> <a href="https://discord.gg/AcXEWznYZe" target="_blank" aria-label="Learnable Meta discord" class="svelte-1j2rmt2"><span class="skill-icons--discord svelte-1j2rmt2"></span></a> <button class="help-toggle-button svelte-1j2rmt2" aria-label="More information"><span></span></button></div></div> <!> <!> <!></div>`);
  function App($$anchor, $$props) {
    push($$props, true);
    let metas = state(proxy([]));
    let metaDetails = state(proxy([]));
    let error = state(null);
    let detailError = state(null);
    let selectedMetaIndex = state(0);
    const selectedMeta = user_derived(() => get(metaDetails)[get(selectedMetaIndex)] ?? null);
    const tabIdPrefix = `geometa-${crypto.randomUUID()}`;
    const cacheKey = `${CACHE_NAMESPACE}:${$$props.mapId}_${$$props.panoId}`;
    const geoJsonEnabled2 = isGeoJsonEnabled();
    const loadingMetaIds = new Set();
    function requestJson2(url) {
      return new Promise((resolve, reject) => {
        _GM_xmlhttpRequest({
          method: "GET",
          url,
          timeout: 1e4,
          onload: (response) => {
            if (response.status === 200) {
              try {
                resolve(JSON.parse(response.responseText));
              } catch {
                reject(new Error("Failed to parse response"));
              }
            } else if (response.status === 404) {
              reject(new Error("Meta for this location not found"));
            } else {
              reject(new Error(`HTTP error! status: ${response.status}`));
            }
          },
          onerror: (event2) => {
            console.error("Error:", event2);
            reject(new Error("An error occurred while fetching data"));
          },
          ontimeout: () => reject(new Error("The request timed out - please try again"))
        });
      });
    }
    function setInitialMeta(data) {
      const { metas: summaries, ...primary } = data;
      set(metas, summaries ?? [{ id: primary.id, metaName: primary.metaName }], true);
      set(metaDetails, get(metas).map((_, index2) => index2 === 0 ? primary : null), true);
    }
    async function loadMeta(index2) {
      const summary = get(metas)[index2];
      if (!summary || get(metaDetails)[index2] || loadingMetaIds.has(summary.id)) return;
      const detailCacheKey = `${cacheKey}_${summary.id}`;
      const cached = window.geometaMetaCache?.get(detailCacheKey);
      if (cached) {
        get(metaDetails)[index2] = cached;
        return;
      }
      loadingMetaIds.add(summary.id);
      try {
        const query = new URLSearchParams({
          panoId: $$props.panoId,
          mapId: $$props.mapId,
          includeGeoJson: String(geoJsonEnabled2)
        }).toString();
        const data = await requestJson2(`${API_BASE_URL}/api/userscript/location/meta/${summary.id}?${query}`);
        get(metaDetails)[index2] = data;
        (window.geometaMetaCache ??= new Map()).set(detailCacheKey, data);
      } catch (cause) {
        if (get(selectedMetaIndex) === index2) {
          set(detailError, cause instanceof Error ? cause.message : String(cause), true);
        }
      } finally {
        loadingMetaIds.delete(summary.id);
      }
    }
    function selectMeta(index2) {
      set(selectedMetaIndex, index2, true);
      set(detailError, null);
      void loadMeta(index2);
    }
    function onTabKeydown(event2) {
      const last = get(metas).length - 1;
      let next = null;
      if (event2.key === "ArrowRight") next = get(selectedMetaIndex) >= last ? 0 : get(selectedMetaIndex) + 1;
      else if (event2.key === "ArrowLeft") next = get(selectedMetaIndex) <= 0 ? last : get(selectedMetaIndex) - 1;
      else if (event2.key === "Home") next = 0;
      else if (event2.key === "End") next = last;
      if (next === null) return;
      event2.preventDefault();
      selectMeta(next);
      document.getElementById(`${tabIdPrefix}-tab-${next}`)?.focus();
    }
    let container;
    let header;
    onMount(() => {
      const cachedData = window.geometaMetaCache?.get(cacheKey);
      if (cachedData) {
        setInitialMeta(cachedData);
      } else {
        const urlParams = new URLSearchParams({
          panoId: $$props.panoId,
          mapId: $$props.mapId,
          userscriptVersion: $$props.userscriptVersion,
          source: $$props.source,
          includeGeoJson: String(geoJsonEnabled2)
        }).toString();
        const url = `${API_BASE_URL}/api/userscript/location?${urlParams}`;
        requestJson2(url).then((data) => {
          setInitialMeta(data);
          (window.geometaMetaCache ??= new Map()).set(cacheKey, data);
        }).catch((cause) => {
          set(error, cause instanceof Error ? cause.message : String(cause), true);
        });
      }
      setContainerPosition(container);
      setContainerDimensions(container);
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          saveContainerDimensions(entry);
        }
      });
      resizeObserver.observe(container);
      const handlePointerDown = (event2) => onPointerDown(event2, container);
      const handlePointerMove = (event2) => onPointerMove(event2, container);
      const handlePointerUp = (event2) => onPointerUp(event2, container);
      header.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
      return () => {
        resizeObserver.disconnect();
        header.removeEventListener("pointerdown", handlePointerDown);
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
      };
    });
    function confirmNavigation(event2) {
      event2.preventDefault();
      set(currentUrl, event2.currentTarget.href, true);
      set(showModal, true);
    }
    function proceed() {
      set(showModal, false);
      window.open(get(currentUrl), "_blank");
    }
    function cancel() {
      set(showModal, false);
    }
    let showModal = state(false);
    let currentUrl = state("");
    let showHelpPopup = state(false);
    let helpClass = state("question-mark-icon");
    function shouldBlink() {
      return !wasHelpMessageRead() || checkIfOutdated();
    }
    function updateHelpClass() {
      set(helpClass, shouldBlink() ? "question-mark-icon blink" : "question-mark-icon", true);
    }
    function togglePopup() {
      set(showHelpPopup, !get(showHelpPopup));
      if (get(showHelpPopup)) {
        markHelpMessageAsRead();
        updateHelpClass();
      }
    }
    updateHelpClass();
    user_effect(() => {
      if (get(selectedMeta)) {
        const links = document.querySelectorAll(".geometa-footer a, .geometa-note a");
        links.forEach((link2) => {
          link2.removeEventListener("click", confirmNavigation);
          link2.addEventListener("click", confirmNavigation);
        });
      }
    });
    user_effect(() => {
      if (geoJsonEnabled2 && get(selectedMeta)?.geoJson) showMapArea(get(selectedMeta).geoJson);
      else clearMapArea();
      return clearMapArea;
    });
    let lastDismissedTimestamp = state(proxy(getLastDismissedAnnouncementTimestamp()));
    var div = root$5();
    var node = child(div);
    await_block(node, getAnnouncement, null, ($$anchor2, announcement) => {
      var fragment = comment();
      var node_1 = first_child(fragment);
      {
        var consequent = ($$anchor3) => {
          var div_1 = root_2$2();
          var div_2 = child(div_1);
          var node_2 = child(div_2);
          html(node_2, () => get(announcement).htmlMessage);
          var button = sibling(div_2, 2);
          button.__click = () => {
            markAnnouncementAsDismissed(get(announcement).timestamp);
            set(lastDismissedTimestamp, get(announcement).timestamp, true);
          };
          append($$anchor3, div_1);
        };
        if_block(node_1, ($$render) => {
          if ($$props.roundNumber >= 4 && get(announcement) && (!get(lastDismissedTimestamp) || get(announcement).timestamp > get(lastDismissedTimestamp))) $$render(consequent);
        });
      }
      append($$anchor2, fragment);
    });
    var div_3 = sibling(node, 2);
    var div_4 = sibling(child(div_3), 2);
    var a = child(div_4);
    var a_1 = sibling(a, 2);
    var button_1 = sibling(a_1, 4);
    button_1.__click = togglePopup;
    var span = child(button_1);
    bind_this(div_3, ($$value) => header = $$value, () => header);
    var node_3 = sibling(div_3, 2);
    {
      var consequent_1 = ($$anchor2) => {
        var p = root_3$1();
        var text = child(p);
        template_effect(() => set_text(text, `Error: ${get(error) ?? ""}`));
        append($$anchor2, p);
      };
      var alternate_3 = ($$anchor2) => {
        var fragment_1 = comment();
        var node_4 = first_child(fragment_1);
        {
          var consequent_7 = ($$anchor3) => {
            var fragment_2 = root_5$2();
            var node_5 = first_child(fragment_2);
            {
              var consequent_2 = ($$anchor4) => {
                var div_5 = root_6$2();
                each(div_5, 23, () => get(metas), (meta) => meta.id, ($$anchor5, meta, index2) => {
                  var button_2 = root_7();
                  let classes;
                  button_2.__keydown = onTabKeydown;
                  button_2.__click = () => selectMeta(get(index2));
                  var text_1 = child(button_2);
                  template_effect(() => {
                    set_attribute(button_2, "id", `${tabIdPrefix}-tab-${get(index2)}`);
                    set_attribute(button_2, "aria-controls", `${tabIdPrefix}-panel`);
                    classes = set_class(button_2, 1, "meta-tab svelte-1j2rmt2", null, classes, { active: get(index2) === get(selectedMetaIndex) });
                    set_attribute(button_2, "aria-selected", get(index2) === get(selectedMetaIndex));
                    set_attribute(button_2, "tabindex", get(index2) === get(selectedMetaIndex) ? 0 : -1);
                    set_text(text_1, get(meta).metaName);
                  });
                  append($$anchor5, button_2);
                });
                append($$anchor4, div_5);
              };
              if_block(node_5, ($$render) => {
                if (get(metas).length > 1) $$render(consequent_2);
              });
            }
            var div_6 = sibling(node_5, 2);
            var node_6 = child(div_6);
            {
              var consequent_3 = ($$anchor4) => {
                var p_1 = root_8$1();
                var text_2 = child(p_1);
                template_effect(() => set_text(text_2, `Error: ${get(detailError) ?? ""}`));
                append($$anchor4, p_1);
              };
              var alternate_1 = ($$anchor4) => {
                var fragment_3 = comment();
                var node_7 = first_child(fragment_3);
                {
                  var consequent_6 = ($$anchor5) => {
                    var fragment_4 = root_10$1();
                    var p_2 = first_child(fragment_4);
                    var node_8 = child(p_2);
                    CountryFlag(node_8, {
                      get countryName() {
                        return get(selectedMeta).country;
                      }
                    });
                    var strong = sibling(node_8, 2);
                    var text_3 = child(strong);
                    var text_4 = sibling(strong);
                    var div_7 = sibling(p_2, 2);
                    var node_9 = child(div_7);
                    html(node_9, () => get(selectedMeta).note);
                    var node_10 = sibling(div_7, 2);
                    {
                      var consequent_4 = ($$anchor6) => {
                        var p_3 = root_11$1();
                        var node_11 = child(p_3);
                        html(node_11, () => get(selectedMeta).footer);
                        append($$anchor6, p_3);
                      };
                      if_block(node_10, ($$render) => {
                        if (get(selectedMeta).footer) $$render(consequent_4);
                      });
                    }
                    var node_12 = sibling(node_10, 2);
                    {
                      var consequent_5 = ($$anchor6) => {
                        var fragment_5 = root_12$1();
                        var node_13 = sibling(first_child(fragment_5), 2);
                        key(node_13, () => get(selectedMeta).id, ($$anchor7) => {
                          Carousel($$anchor7, {
                            get images() {
                              return get(selectedMeta).images;
                            }
                          });
                        });
                        append($$anchor6, fragment_5);
                      };
                      if_block(node_12, ($$render) => {
                        if (get(selectedMeta).images && get(selectedMeta).images.length) $$render(consequent_5);
                      });
                    }
                    template_effect(() => {
                      set_text(text_3, get(selectedMeta).country);
                      set_text(text_4, ` - ${get(selectedMeta).metaName ?? ""}`);
                    });
                    append($$anchor5, fragment_4);
                  };
                  var alternate = ($$anchor5) => {
                    Spinner($$anchor5);
                  };
                  if_block(
                    node_7,
                    ($$render) => {
                      if (get(selectedMeta)) $$render(consequent_6);
                      else $$render(alternate, false);
                    },
                    true
                  );
                }
                append($$anchor4, fragment_3);
              };
              if_block(node_6, ($$render) => {
                if (get(detailError)) $$render(consequent_3);
                else $$render(alternate_1, false);
              });
            }
            template_effect(() => {
              set_attribute(div_6, "id", `${tabIdPrefix}-panel`);
              set_attribute(div_6, "role", get(metas).length > 1 ? "tabpanel" : void 0);
              set_attribute(div_6, "aria-labelledby", get(metas).length > 1 ? `${tabIdPrefix}-tab-${get(selectedMetaIndex)}` : void 0);
              set_attribute(div_6, "aria-busy", !get(selectedMeta) && !get(detailError));
            });
            append($$anchor3, fragment_2);
          };
          var alternate_2 = ($$anchor3) => {
            Spinner($$anchor3);
          };
          if_block(
            node_4,
            ($$render) => {
              if (get(metas).length) $$render(consequent_7);
              else $$render(alternate_2, false);
            },
            true
          );
        }
        append($$anchor2, fragment_1);
      };
      if_block(node_3, ($$render) => {
        if (get(error)) $$render(consequent_1);
        else $$render(alternate_3, false);
      });
    }
    var node_14 = sibling(node_3, 2);
    {
      var consequent_8 = ($$anchor2) => {
        var div_8 = root_16$1();
        var div_9 = child(div_8);
        var div_10 = sibling(child(div_9), 2);
        var p_4 = child(div_10);
        var text_5 = child(p_4);
        var div_11 = sibling(div_10, 2);
        var button_3 = child(div_11);
        button_3.__click = cancel;
        var button_4 = sibling(button_3, 2);
        button_4.__click = proceed;
        action(div_9, ($$node, $$action_arg) => modalDialog?.($$node, $$action_arg), () => ({ onClose: cancel }));
        template_effect(() => set_text(text_5, get(currentUrl)));
        append($$anchor2, div_8);
      };
      if_block(node_14, ($$render) => {
        if (get(showModal)) $$render(consequent_8);
      });
    }
    var node_15 = sibling(node_14, 2);
    {
      var consequent_10 = ($$anchor2) => {
        var div_12 = root_17$1();
        var div_13 = child(div_12);
        var div_14 = sibling(child(div_13), 2);
        var node_16 = child(div_14);
        {
          var consequent_9 = ($$anchor3) => {
            var p_5 = root_18$1();
            var text_6 = child(p_5);
            template_effect(($0) => set_text(text_6, `Your userscript is out of date. Install the latest version (${$0 ?? ""}).`), [getLatestVersionInfo]);
            append($$anchor3, p_5);
          };
          if_block(node_16, ($$render) => {
            if (checkIfOutdated()) $$render(consequent_9);
          });
        }
        var div_15 = sibling(div_14, 2);
        var button_5 = child(div_15);
        button_5.__click = togglePopup;
        action(div_13, ($$node, $$action_arg) => modalDialog?.($$node, $$action_arg), () => ({ onClose: togglePopup }));
        append($$anchor2, div_12);
      };
      if_block(node_15, ($$render) => {
        if (get(showHelpPopup)) $$render(consequent_10);
      });
    }
    bind_this(div, ($$value) => container = $$value, () => container);
    template_effect(() => {
      set_attribute(a, "href", `${SITE_BASE_URL}/maps/${$$props.mapId}`);
      set_attribute(a_1, "href", SITE_BASE_URL);
      set_class(span, 1, clsx(get(helpClass)), "svelte-1j2rmt2");
    });
    append($$anchor, div);
    pop();
  }
  delegate(["click", "keydown"]);
  let currentApp = null;
  function unmountSummaryWindow() {
    if (currentApp) {
      unmount(currentApp);
      currentApp = null;
    }
    document.getElementById("geometa-summary")?.remove();
  }
  function mountSummaryWindow(container, props) {
    unmountSummaryWindow();
    const element = document.createElement("div");
    element.id = "geometa-summary";
    container.appendChild(element);
    currentApp = mount(App, { target: element, props });
  }
  function showMetaForRound(panoId, mapId, userscriptVersion, roundNumber) {
    const container = document.querySelector('div[data-qa="result-view-top"]') || document.body;
    mountSummaryWindow(container, {
      roundNumber,
      panoId,
      mapId,
      userscriptVersion,
      source: window.location.href.includes("challenge") ? "challenge" : "map"
    });
  }
  function createPinObserver(panoIds, mapId, userscriptVersion) {
    const observer = new MutationObserver(() => {
      const pins = document.querySelectorAll('[class*="map-pin_mapPin"]');
      pins.forEach((pin) => {
        const pinText = pin.textContent?.trim();
        const roundNumber = parseInt(pinText || "");
        if (roundNumber >= 1 && roundNumber <= panoIds.length && !pin.hasAttribute("data-geometa-pin-processed")) {
          pin.setAttribute("data-geometa-pin-processed", "true");
          const questionIcon = document.createElement("div");
          questionIcon.className = "geometa-pin-question";
          questionIcon.innerHTML = "?";
          questionIcon.title = `View meta for round ${roundNumber}`;
          questionIcon.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showMetaForRound(panoIds[roundNumber - 1], mapId, userscriptVersion, roundNumber);
          });
          const pinElement = pin;
          if (pinElement.style.position === "" || pinElement.style.position === "static") {
            pinElement.style.position = "relative";
          }
          pinElement.appendChild(questionIcon);
        }
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    return observer;
  }
  const GeoGuessrEventFramework = _unsafeWindow.GeoGuessrEventFramework;
  let currentObserver = null;
  let currentPinObserver = null;
  function clearMetaCache() {
    if (window.geometaMetaCache) {
      window.geometaMetaCache.clear();
    }
  }
  function initSinglePlayer() {
    if (!GeoGuessrEventFramework) {
      console.error("ALM: GeoGuessrEventFramework is not available - single player support disabled");
      return;
    }
    GeoGuessrEventFramework.init().then(() => {
      GeoGuessrEventFramework.events.addEventListener("game_start", async (event2) => {
        clearMetaCache();
        await getMapInfo(event2.detail.map.id, true);
      });
      GeoGuessrEventFramework.events.addEventListener("round_start", unmountSummaryWindow);
      GeoGuessrEventFramework.events.addEventListener("round_end", async (event2) => {
        unmountSummaryWindow();
        const mapInfo = await getMapInfo(event2.detail.map.id, false);
        if (!mapInfo.mapFound) {
          logInfo("not supported map - skip");
          return;
        }
        logInfo("waiting for the result view to render");
        waitForElement('div[data-qa="result-view-top"]').then((container) => {
          if (!container) {
            return;
          }
          logInfo("the result view is rendered");
          const lastRound = event2.detail.rounds[event2.detail.rounds.length - 1];
          logInfo("adding app window");
          mountSummaryWindow(container, {
            roundNumber: event2.detail.rounds.length,
            panoId: lastRound.location.panoId,
            mapId: event2.detail.map.id,
            userscriptVersion: mapInfo.userscriptVersion,
            source: window.location.href.includes("challenge") ? "challenge" : "map"
          });
        });
      });
      GeoGuessrEventFramework.events.addEventListener("game_end", async (event2) => {
        logInfo("game ended");
        const mapInfo = await getMapInfo(event2.detail.map.id, false);
        if (!mapInfo.mapFound) {
          logInfo("not supported map for breakdown - skip");
          return;
        }
        const roundData = {
          rounds: event2.detail.rounds,
          mapId: event2.detail.map.id,
          userscriptVersion: mapInfo.userscriptVersion
        };
        waitForElement(".result-list_listWrapper__7SmiM").then((listWrapper) => {
          if (!listWrapper) {
            return;
          }
          addMetaButtonsToRounds(roundData.rounds, roundData.mapId, roundData.userscriptVersion);
        });
        if (currentObserver) {
          currentObserver.disconnect();
        }
        currentObserver = new MutationObserver(() => {
          const listWrapper = document.querySelector(".result-list_listWrapper__7SmiM");
          if (listWrapper && !listWrapper.querySelector(".geometa-meta-btn")) {
            addMetaButtonsToRounds(roundData.rounds, roundData.mapId, roundData.userscriptVersion);
          }
        });
        currentObserver.observe(document.body, {
          childList: true,
          subtree: true
        });
        if (currentPinObserver) {
          currentPinObserver.disconnect();
        }
        currentPinObserver = createPinObserver(
          roundData.rounds.map((round) => round.location.panoId),
          roundData.mapId,
          roundData.userscriptVersion
        );
      });
      window.addEventListener("urlchange", () => {
        clearMetaCache();
        unmountSummaryWindow();
        if (currentObserver) {
          currentObserver.disconnect();
          currentObserver = null;
        }
        if (currentPinObserver) {
          currentPinObserver.disconnect();
          currentPinObserver = null;
        }
      });
    }).catch((e) => {
      console.error("ALM: GeoGuessrEventFramework failed to initialize", e);
    });
  }
  function addMetaButtonsToRounds(rounds, mapId, userscriptVersion) {
    const roundItems = document.querySelectorAll(".result-list_listItemWrapper___XCGn");
    roundItems.forEach((roundItem) => {
      const roundNumberText = roundItem.querySelector(".result-list_roundNumber__RlIKm")?.textContent;
      const roundNumber = parseInt(roundNumberText || "");
      const round = rounds[roundNumber - 1];
      if (!round) return;
      if (roundItem.querySelector(".geometa-meta-btn")) return;
      const metaButton = document.createElement("button");
      metaButton.className = "geometa-meta-btn";
      metaButton.textContent = "Show meta";
      metaButton.title = "View meta for this round";
      metaButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showMetaForRound(round.location.panoId, mapId, userscriptVersion, roundNumber);
      });
      roundItem.appendChild(metaButton);
    });
  }
  function initLiveChallenge() {
    logInfo("live challenge support enabled");
    let pinChanged = false;
    let generation = 0;
    const observer = new MutationObserver(async () => {
      if (!document.querySelector("[class*=result-map_roundPin]")) {
        if (pinChanged) {
          generation += 1;
          unmountSummaryWindow();
        }
        pinChanged = false;
        return;
      }
      if (pinChanged) {
        return;
      }
      pinChanged = true;
      const requestGeneration = ++generation;
      const challengeId = getChallengeId();
      if (!challengeId) {
        pinChanged = false;
        return;
      }
      try {
        const { mapId, panoId } = await getChallengeInfo(challengeId);
        if (requestGeneration !== generation) return;
        const mapInfo = await getMapInfo(mapId, false);
        if (requestGeneration !== generation) return;
        if (!mapInfo.mapFound) return;
        const container = await waitForElement("[class*=game_container]");
        if (!container || requestGeneration !== generation || !document.querySelector("[class*=result-map_roundPin]")) {
          return;
        }
        mountSummaryWindow(container, {
roundNumber: 4,
          panoId,
          mapId,
          userscriptVersion: mapInfo.userscriptVersion,
          source: "liveChallenge"
        });
      } catch (e) {
        logInfo("failed to show live challenge meta", e);
      }
    });
    window.addEventListener("urlchange", () => {
      if (getChallengeId()) {
        return;
      }
      generation += 1;
      pinChanged = false;
      unmountSummaryWindow();
    });
    if (document.body) {
      observer.observe(document.body, { subtree: true, childList: true });
    } else {
      console.error("document.body is not available.");
    }
  }
  function initURLChangeEvent() {
    overrideHistoryMethod("pushState");
    overrideHistoryMethod("replaceState");
    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("urlchange"));
    });
  }
  function overrideHistoryMethod(method) {
    const original = history[method];
    history[method] = function(state2, title, url) {
      const result = original.call(this, state2, title, url);
      window.dispatchEvent(new Event("urlchange"));
      return result;
    };
  }
  var root$4 = from_html(`<div class="geometa-map-label-container svelte-1y99qco"><p class="svelte-1y99qco">LearnableMeta Enabled</p> <a target="_blank"><button class="svelte-1y99qco">Meta List</button></a></div>`);
  function MapLabel($$anchor, $$props) {
    var div = root$4();
    var a = sibling(child(div), 2);
    template_effect(() => set_attribute(a, "href", `${SITE_BASE_URL}/maps/${$$props.mapId}`));
    append($$anchor, div);
  }
  function initMapLabel() {
    addMapLabel();
    window.addEventListener("urlchange", () => {
      addMapLabel();
    });
  }
  let labelApp = null;
  let runToken$2 = 0;
  function removeMapLabel() {
    if (labelApp) {
      unmount(labelApp);
      labelApp = null;
    }
    document.querySelector(".geometa-map-label")?.remove();
  }
  async function addMapLabel() {
    const token = ++runToken$2;
    const mapId = extractMapIdFromUrl(window.location.href);
    if (!mapId) {
      return;
    }
    const mapAvatarContainer = await waitForElement(
      "[class*=map-detail-page_heroImageArea], [class*=map-block_mapImageContainer]"
    );
    if (token !== runToken$2 || !mapAvatarContainer) {
      return;
    }
    const mapInfo = await getMapInfo(mapId, true);
    if (token !== runToken$2 || !mapInfo?.mapFound) {
      return;
    }
    removeMapLabel();
    if (getComputedStyle(mapAvatarContainer).position === "static") {
      mapAvatarContainer.style.position = "relative";
    }
    const element = document.createElement("div");
    element.classList.add("geometa-map-label");
    mapAvatarContainer.appendChild(element);
    labelApp = mount(MapLabel, {
      target: element,
      props: {
        mapId
      }
    });
  }
  class LearnableMetaApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
      this.name = "LearnableMetaApiError";
    }
  }
  function requestJson(url, apiToken) {
    return new Promise((resolve, reject) => {
      _GM_xmlhttpRequest({
        method: "GET",
        url,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        timeout: 15e3,
        onload: (response) => {
          let body;
          try {
            body = response.responseText ? JSON.parse(response.responseText) : null;
          } catch {
            body = response.responseText;
          }
          if (response.status >= 200 && response.status < 300) {
            resolve(body);
            return;
          }
          const apiMessage = body && typeof body === "object" && "message" in body ? String(body.message) : response.statusText || "Request failed";
          reject(
            new LearnableMetaApiError(
              response.status,
              `LearnableMeta API error (${response.status}): ${apiMessage}`
            )
          );
        },
        onerror: () => reject(new LearnableMetaApiError(0, "Could not reach LearnableMeta")),
        ontimeout: () => reject(new LearnableMetaApiError(0, "LearnableMeta request timed out"))
      });
    });
  }
  function fetchMapGroupManifest(groupId, apiToken) {
    return requestJson(`${API_BASE_URL}/api/userscript/map-group/${groupId}/maps`, apiToken);
  }
  async function fetchAccessibleMapGroups(apiToken) {
    const data = await requestJson(
      `${API_BASE_URL}/api/userscript/map-groups`,
      apiToken
    );
    if (!Array.isArray(data.groups)) {
      throw new LearnableMetaApiError(0, "Received invalid map group data");
    }
    return data.groups;
  }
  async function fetchSyncedMapLocations(geoguessrId, apiToken, expectedFingerprint) {
    const query = expectedFingerprint ? `?expectedFingerprint=${encodeURIComponent(expectedFingerprint)}` : "";
    const data = await requestJson(
      `${API_BASE_URL}/api/userscript/map/${geoguessrId}/locations${query}`,
      apiToken
    );
    if (!Array.isArray(data.customCoordinates)) {
      throw new LearnableMetaApiError(0, "Received invalid map location data");
    }
    return data.customCoordinates;
  }
  async function geoguessrAPIFetch(url, options = {}) {
    const { method = "GET", headers: initialHeaders, body, ...restOptions } = options;
    const effectiveHeaders = new Headers(initialHeaders);
    effectiveHeaders.set("Content-Type", "application/json");
    const response = await fetch(url, {
      method,
      headers: effectiveHeaders,
      body,
      ...restOptions
    });
    if (!response.ok) {
      let errorPayload = null;
      let errorMessage = `Request to ${url.substring(0, 100)}... failed with status ${response.status}: ${response.statusText}`;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          errorPayload = await response.json();
          if (errorPayload && errorPayload.message) {
            errorMessage = `API Error (${response.status}): ${errorPayload.message}`;
          } else if (errorPayload) {
            errorMessage = `API Error (${response.status}) for ${url.substring(0, 50)}...: ${JSON.stringify(errorPayload).substring(0, 100)}...`;
          }
        } else {
          const errorText = await response.text();
          errorPayload = errorText;
          if (errorText) {
            errorMessage = `API Error (${response.status}) for ${url.substring(0, 50)}...: ${errorText.substring(0, 100)}...`;
          }
        }
      } catch (e) {
        console.warn("Could not parse error response body from Geoguessr API:", e);
      }
      console.error(
        `geoguessrAPIFetch Error (Status: ${response.status}) for URL ${url}:`,
        errorMessage,
        "Full Payload:",
        errorPayload
      );
      throw new Error(errorMessage);
    }
    return response;
  }
  function draftUrl(geoguessrId) {
    return `https://www.geoguessr.com/api/v4/user-maps/drafts/${geoguessrId}`;
  }
  async function getGeoguessrDraft(geoguessrId) {
    const response = await geoguessrAPIFetch(draftUrl(geoguessrId));
    return response.json();
  }
  async function updateGeoguessrDraft(geoguessrId, draft, customCoordinates) {
    const { avatar, description, highlighted, name, version } = draft;
    await geoguessrAPIFetch(draftUrl(geoguessrId), {
      method: "PUT",
      body: JSON.stringify({
        avatar,
        description,
        highlighted,
        name,
        customCoordinates,
        version: version + 1
      })
    });
  }
  async function publishGeoguessrDraft(geoguessrId) {
    await geoguessrAPIFetch(`${draftUrl(geoguessrId)}/publish`, {
      method: "PUT",
      body: JSON.stringify({})
    });
  }
  async function uploadLocations(geoguessrId, apiKey) {
    let geoguessrMapDetails;
    try {
      geoguessrMapDetails = await getGeoguessrDraft(geoguessrId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to fetch Geoguessr map info:", error);
      throw new Error(`Geoguessr Error: Could not fetch map details. ${errorMessage}`);
    }
    let locationsToUpload;
    try {
      locationsToUpload = await fetchSyncedMapLocations(geoguessrId, apiKey);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to fetch map locations from backend:", error);
      throw new Error(`LearnableMeta Error: ${errorMessage}`);
    }
    if (!locationsToUpload || locationsToUpload.length === 0) {
      const errorMessage = "Cannot publish an empty map. Please add locations via LearnableMeta first.";
      console.warn(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      await updateGeoguessrDraft(geoguessrId, geoguessrMapDetails, locationsToUpload);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to update Geoguessr map draft:", error);
      throw new Error(`Geoguessr Error: Could not update map draft. ${errorMessage}`);
    }
    try {
      console.log("Publishing Geoguessr map...");
      await publishGeoguessrDraft(geoguessrId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to publish Geoguessr map:", error);
      throw new Error(`Geoguessr Error: Could not publish map. ${errorMessage}`);
    }
  }
  const linear = (x) => x;
  function fade(node, { delay = 0, duration = 400, easing = linear } = {}) {
    const o = +getComputedStyle(node).opacity;
    return {
      delay,
      duration,
      easing,
      css: (t) => `opacity: ${t * o}`
    };
  }
  var root_1$2 = from_html(`<span class="toast-detail svelte-w17ltc"> </span>`);
  var root$3 = from_html(`<div role="alert"><div class="toast-content svelte-w17ltc"><span class="toast-message"> </span> <!></div> <button class="toast-close-button svelte-w17ltc" aria-label="Close">×</button></div>`);
  function ToastNotification($$anchor, $$props) {
    let type = prop($$props, "type", 3, "info");
    var div = root$3();
    var div_1 = child(div);
    var span = child(div_1);
    var text = child(span);
    var node = sibling(span, 2);
    {
      var consequent = ($$anchor2) => {
        var span_1 = root_1$2();
        var text_1 = child(span_1);
        template_effect(() => set_text(text_1, $$props.detail));
        append($$anchor2, span_1);
      };
      if_block(node, ($$render) => {
        if ($$props.detail) $$render(consequent);
      });
    }
    var button = sibling(div_1, 2);
    button.__click = function(...$$args) {
      $$props.onClose?.apply(this, $$args);
    };
    template_effect(() => {
      set_class(div, 1, `toast-notification toast-${type() ?? ""}`, "svelte-w17ltc");
      set_text(text, $$props.message);
    });
    transition(1, div, () => fade, () => ({ duration: 200, delay: 50 }));
    transition(2, div, () => fade, () => ({ duration: 300 }));
    append($$anchor, div);
  }
  delegate(["click"]);
  const API_KEY_STORAGE_NAME = "learnableMeta_apiKey";
  const URL_TO_GENERATE_TOKEN = `${SITE_BASE_URL}/profile/token`;
  function getApiKey() {
    const key2 = _GM_getValue(API_KEY_STORAGE_NAME, null);
    return key2?.trim() || null;
  }
  function saveApiKey(key2) {
    _GM_setValue(API_KEY_STORAGE_NAME, key2.trim());
  }
  function clearApiKey() {
    _GM_setValue(API_KEY_STORAGE_NAME, "");
  }
  var root_2$1 = from_html(`<p>An API token is required before locations can be uploaded.</p>`);
  var root_4 = from_html(`<p>A token ending in <code class="saved-key svelte-1plj3lz"> </code> is saved. Paste
            a new token to replace it, or clear the saved token.</p>`);
  var root_5$1 = from_html(`<p>No API token is saved yet.</p>`);
  var root_6$1 = from_html(`<button type="button" class="learnablemeta-button learnablemeta-button--destructive learnablemeta-modal-action-leading">Clear token</button>`);
  var root_1$1 = from_html(`<div class="learnablemeta-modal-backdrop learnablemeta-ui" role="presentation"><div class="learnablemeta-modal" role="dialog" aria-modal="true" aria-labelledby="apiKeyModalTitle"><div class="learnablemeta-modal-header"><p class="learnablemeta-modal-eyebrow">LearnableMeta</p> <h2 class="learnablemeta-modal-title" id="apiKeyModalTitle">API token</h2> <p class="learnablemeta-modal-description">Manage the token used to download synchronized locations.</p></div> <div class="learnablemeta-modal-body"><!> <p>Generate or replace your token on the <a target="_blank" rel="noopener noreferrer">LearnableMeta profile page</a>.</p> <input type="text" placeholder="Paste your API token" aria-label="LearnableMeta API token" data-modal-initial-focus="" class="learnablemeta-modal-input"/> <p class="learnablemeta-modal-note">The token is stored only in your browser's userscript storage.</p></div> <div class="learnablemeta-modal-actions"><!> <button type="button" class="learnablemeta-button learnablemeta-button--outline">Cancel</button> <button type="button" class="learnablemeta-button learnablemeta-button--primary"> </button></div></div></div>`);
  var root$2 = from_html(`<div class="upload-label-container learnablemeta-ui svelte-1plj3lz"><button class="learnablemeta-geoguessr-button"> </button> <button class="learnablemeta-geoguessr-button learnablemeta-geoguessr-button--icon" title="Manage LearnableMeta API key" aria-label="Manage LearnableMeta API key">🔑</button></div> <!> <!>`, 1);
  function UploadLocations($$anchor, $$props) {
    push($$props, true);
    let showApiKeyModal = state(false);
    let modalMode = state("upload");
    let apiKeyInput = state("");
    let currentApiKey = state(null);
    let isLoading = state(false);
    let toastState = state(null);
    let toastTimer = state(void 0);
    function showCustomToast(message, type = "info", duration = 3e3, detail) {
      clearTimeout(get(toastTimer));
      const displayToast = () => {
        set(toastState, { message, detail, type }, true);
        if (duration > 0) {
          set(
            toastTimer,
            window.setTimeout(
              () => {
                hideCustomToast();
              },
              duration
            ),
            true
          );
        }
      };
      if (get(toastState)) {
        hideCustomToast();
        setTimeout(displayToast, 350);
      } else {
        displayToast();
      }
    }
    function hideCustomToast() {
      clearTimeout(get(toastTimer));
      set(toastState, null);
    }
    function getApiKeyFromGM() {
      try {
        return getApiKey();
      } catch (e) {
        console.warn("GM_getValue is not available. API key functionality might be limited.", e);
        showCustomToast("Userscript storage (GM_getValue) is not available. Please ensure Tampermonkey/Violentmonkey is correctly configured.", "error", 0);
        return null;
      }
    }
    function saveApiKeyToGM(key2) {
      try {
        saveApiKey(key2);
      } catch (e) {
        console.warn("GM_setValue is not available. API key functionality might be limited.", e);
        showCustomToast("Userscript storage (GM_setValue) is not available. Please ensure Tampermonkey/Violentmonkey is correctly configured.", "error", 0);
      }
    }
    onMount(() => {
      set(currentApiKey, getApiKeyFromGM(), true);
    });
    async function handleUploadClick() {
      if (get(isLoading)) return;
      set(currentApiKey, getApiKeyFromGM(), true);
      if (!get(currentApiKey) || get(currentApiKey).trim() === "") {
        set(apiKeyInput, "");
        set(modalMode, "upload");
        set(showApiKeyModal, true);
      } else {
        await performUpload(get(currentApiKey));
      }
    }
    function openManageKeyModal() {
      set(currentApiKey, getApiKeyFromGM(), true);
      set(apiKeyInput, "");
      set(modalMode, "manage");
      set(showApiKeyModal, true);
    }
    function handleClearApiKey() {
      clearApiKey();
      set(currentApiKey, null);
      set(showApiKeyModal, false);
      showCustomToast("LearnableMeta API Key cleared.", "success");
    }
    async function performUpload(apiKey) {
      set(isLoading, true);
      try {
        await uploadLocations($$props.mapId, apiKey);
        showCustomToast("Locations uploaded and map published successfully! The page will refresh shortly.", "success", 4500);
        setTimeout(
          () => {
            window.location.reload();
          },
          5e3
        );
      } catch (error) {
        console.error("Upload process failed:", error);
        const detail = error && error.message ? error.message : "An unexpected error occurred during upload.";
        const isAuthError = /401|403|unauthorized|invalid token/i.test(detail);
        const headline = isAuthError ? "Upload failed: your API key was rejected. Use the 🔑 button next to Upload to update it." : "Upload failed. If this keeps happening, please report the error below on our Discord.";
        showCustomToast(headline, "error", 0, detail);
        set(isLoading, false);
      }
    }
    function handleSaveApiKey() {
      const trimmedKey = get(apiKeyInput).trim();
      if (!trimmedKey) {
        showCustomToast("Please enter a valid API key.", "error", 3e3);
        return;
      }
      saveApiKeyToGM(trimmedKey);
      set(currentApiKey, trimmedKey, true);
      set(showApiKeyModal, false);
      showCustomToast("API Key saved!", "success", 2e3);
      if (get(modalMode) === "upload") {
        performUpload(trimmedKey);
      }
    }
    function handleCancelModal() {
      set(showApiKeyModal, false);
      set(apiKeyInput, "");
    }
    var fragment = root$2();
    var div = first_child(fragment);
    var button = child(div);
    button.__click = handleUploadClick;
    var text = child(button);
    var button_1 = sibling(button, 2);
    button_1.__click = openManageKeyModal;
    var node = sibling(div, 2);
    {
      var consequent_3 = ($$anchor2) => {
        var div_1 = root_1$1();
        var div_2 = child(div_1);
        var div_3 = sibling(child(div_2), 2);
        var node_1 = child(div_3);
        {
          var consequent = ($$anchor3) => {
            var p = root_2$1();
            append($$anchor3, p);
          };
          var alternate_1 = ($$anchor3) => {
            var fragment_1 = comment();
            var node_2 = first_child(fragment_1);
            {
              var consequent_1 = ($$anchor4) => {
                var p_1 = root_4();
                var code = sibling(child(p_1));
                var text_1 = child(code);
                template_effect(($0) => set_text(text_1, `…${$0 ?? ""}`), [() => get(currentApiKey).slice(-4)]);
                append($$anchor4, p_1);
              };
              var alternate = ($$anchor4) => {
                var p_2 = root_5$1();
                append($$anchor4, p_2);
              };
              if_block(
                node_2,
                ($$render) => {
                  if (get(currentApiKey)) $$render(consequent_1);
                  else $$render(alternate, false);
                },
                true
              );
            }
            append($$anchor3, fragment_1);
          };
          if_block(node_1, ($$render) => {
            if (get(modalMode) === "upload") $$render(consequent);
            else $$render(alternate_1, false);
          });
        }
        var p_3 = sibling(node_1, 2);
        var a = sibling(child(p_3));
        var input = sibling(p_3, 2);
        var div_4 = sibling(div_3, 2);
        var node_3 = child(div_4);
        {
          var consequent_2 = ($$anchor3) => {
            var button_2 = root_6$1();
            button_2.__click = handleClearApiKey;
            append($$anchor3, button_2);
          };
          if_block(node_3, ($$render) => {
            if (get(modalMode) === "manage" && get(currentApiKey)) $$render(consequent_2);
          });
        }
        var button_3 = sibling(node_3, 2);
        button_3.__click = handleCancelModal;
        var button_4 = sibling(button_3, 2);
        button_4.__click = handleSaveApiKey;
        var text_2 = child(button_4);
        action(div_2, ($$node, $$action_arg) => modalDialog?.($$node, $$action_arg), () => ({ onClose: handleCancelModal }));
        template_effect(() => {
          set_attribute(a, "href", URL_TO_GENERATE_TOKEN);
          set_text(text_2, get(modalMode) === "upload" ? "Save and upload" : "Save");
        });
        bind_value(input, () => get(apiKeyInput), ($$value) => set(apiKeyInput, $$value));
        append($$anchor2, div_1);
      };
      if_block(node, ($$render) => {
        if (get(showApiKeyModal)) $$render(consequent_3);
      });
    }
    var node_4 = sibling(node, 2);
    {
      var consequent_4 = ($$anchor2) => {
        ToastNotification($$anchor2, {
          get message() {
            return get(toastState).message;
          },
          get detail() {
            return get(toastState).detail;
          },
          get type() {
            return get(toastState).type;
          },
          onClose: hideCustomToast
        });
      };
      if_block(node_4, ($$render) => {
        if (get(toastState)) $$render(consequent_4);
      });
    }
    template_effect(() => {
      button.disabled = get(isLoading);
      set_text(text, get(isLoading) ? "Uploading..." : "LearnableMeta - Upload");
      button_1.disabled = get(isLoading);
    });
    append($$anchor, fragment);
    pop();
  }
  delegate(["click"]);
  function extractMapIdFromMapMakerUrl(url) {
    const match = url.match(/\/map-maker\/([^\/]+)/);
    return match ? match[1] : null;
  }
  function initLocationsUpload() {
    addLocationsUploadButtons();
    window.addEventListener("urlchange", () => {
      addLocationsUploadButtons();
    });
  }
  const containerId$1 = "geometa-locations-upload";
  let uploadApp = null;
  let runToken$1 = 0;
  function removeUploadButton() {
    if (uploadApp) {
      unmount(uploadApp);
      uploadApp = null;
    }
    document.getElementById(containerId$1)?.remove();
  }
  async function addLocationsUploadButtons() {
    const token = ++runToken$1;
    removeUploadButton();
    const mapId = extractMapIdFromMapMakerUrl(window.location.href);
    if (!mapId) {
      return;
    }
    const mapInfo = await getMapInfo(mapId, true);
    if (token !== runToken$1 || !mapInfo?.mapFound) {
      return;
    }
    const container = document.querySelector(".top-bar-menu_topBarMenu__kd9zX");
    if (container) {
      const target = document.createElement("div");
      target.id = containerId$1;
      container.insertBefore(target, container.lastElementChild);
      uploadApp = mount(UploadLocations, {
        target,
        props: {
          mapId
        }
      });
    }
  }
  function extractResultsTokenFromUrl(url) {
    const match = url.match(/\/results\/([^\/?#]+)/);
    return match ? match[1] : null;
  }
  let pinObserver = null;
  let runToken = 0;
  function initChallengeResults() {
    addChallengeResultsPins();
    window.addEventListener("urlchange", () => {
      addChallengeResultsPins();
    });
  }
  async function addChallengeResultsPins() {
    const token = ++runToken;
    if (pinObserver) {
      pinObserver.disconnect();
      pinObserver = null;
    }
    const resultsToken = extractResultsTokenFromUrl(window.location.href);
    if (!resultsToken) {
      return;
    }
    try {
      const url = `https://www.geoguessr.com/api/v3/results/highscores/${resultsToken}?friends=false&limit=1`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        logInfo(`failed to fetch challenge results (status ${response.status})`);
        return;
      }
      const data = await response.json();
      const game = data?.items?.[0]?.game;
      if (!game?.map || !Array.isArray(game.rounds) || game.rounds.length === 0) {
        logInfo("no game data in challenge results payload");
        return;
      }
      if (token !== runToken) {
        return;
      }
      const mapInfo = await getMapInfo(game.map, false);
      if (token !== runToken || !mapInfo.mapFound) {
        return;
      }
      const panoIds = game.rounds.map((round) => decodePanoId(round.panoId));
      logInfo(`adding meta pins for challenge results (${panoIds.length} rounds)`);
      pinObserver = createPinObserver(panoIds, game.map, mapInfo.userscriptVersion);
    } catch (e) {
      logInfo("failed to add meta pins on challenge results", e);
    }
  }
  function canonicalizeMapCoordinates(coordinates) {
    const tuples = coordinates.map(
      ({ panoId, lat, lng, heading, pitch, zoom }) => [panoId, lat, lng, heading, pitch, zoom]
    );
    tuples.sort((left, right) => {
      const leftJson = JSON.stringify(left);
      const rightJson = JSON.stringify(right);
      return leftJson < rightJson ? -1 : leftJson > rightJson ? 1 : 0;
    });
    return JSON.stringify(tuples);
  }
  async function fingerprintMapCoordinates(coordinates) {
    const bytes = new TextEncoder().encode(canonicalizeMapCoordinates(coordinates));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  function getGeoguessrDraftCoordinates(draft) {
    if (Array.isArray(draft.coordinates)) return draft.coordinates;
    if (Array.isArray(draft.customCoordinates)) return draft.customCoordinates;
    return [];
  }
  var root_1 = from_html(`<p class="subtitle svelte-axobi4"> </p>`);
  var root_3 = from_html(`<p class="error-text svelte-axobi4"> </p>`);
  var root_2 = from_html(`<div class="token-form svelte-axobi4"><p class="svelte-axobi4">Paste your LearnableMeta API token to load maps you can manage.</p> <p class="small svelte-axobi4">Generate or replace it on your <a target="_blank" rel="noopener noreferrer" class="svelte-axobi4">token page</a>.</p> <input type="password" placeholder="LearnableMeta API token" aria-label="LearnableMeta API token" class="learnablemeta-modal-input" data-modal-initial-focus=""/> <!> <div class="learnablemeta-modal-actions token-actions svelte-axobi4"><button class="learnablemeta-button learnablemeta-button--outline">Cancel</button> <button class="learnablemeta-button learnablemeta-button--primary">Save and continue</button></div></div>`);
  var root_6 = from_html(`<div class="notice svelte-axobi4">Loading your synchronized map groups…</div>`);
  var root_8 = from_html(`<div class="fatal svelte-axobi4"><strong>Could not load your map groups.</strong> <span> </span> <button class="learnablemeta-button learnablemeta-button--outline svelte-axobi4">Try again</button></div>`);
  var root_11 = from_html(`<button class="group-row svelte-axobi4"><span class="group-details svelte-axobi4"><strong class="svelte-axobi4"> </strong> <span class="svelte-axobi4">Synchronized and ready to compare</span></span> <span class="group-count svelte-axobi4"> <svg viewBox="0 0 24 24" aria-hidden="true" class="svelte-axobi4"><path d="m9 18 6-6-6-6"></path></svg></span></button>`);
  var root_10 = from_html(`<div class="notice svelte-axobi4">Select a synchronized LearnableMeta group to compare its maps.</div> <div class="group-list svelte-axobi4"></div>`, 1);
  var root_12 = from_html(`<div class="notice svelte-axobi4">You have no synchronized map groups containing maps.</div>`);
  var root_5 = from_html(`<!> <footer class="learnablemeta-modal-actions"><button class="learnablemeta-button learnablemeta-button--link learnablemeta-modal-action-leading">Change API token</button> <button class="learnablemeta-button learnablemeta-button--outline">Close</button></footer>`, 1);
  var root_14 = from_html(`<div class="notice svelte-axobi4">Loading synchronized maps and comparing GeoGuessr drafts…</div>`);
  var root_15 = from_html(`<div class="fatal svelte-axobi4"><strong>Could not load this group.</strong> <span> </span> <button class="learnablemeta-button learnablemeta-button--outline svelte-axobi4">Try again</button></div>`);
  var root_18 = from_html(`<span class="row-error svelte-axobi4"> </span>`);
  var root_17 = from_html(`<label><input type="checkbox" class="svelte-axobi4"/> <span class="map-details svelte-axobi4"><strong class="svelte-axobi4"> </strong> <span class="svelte-axobi4"> </span> <!></span> <span> </span></label>`);
  var root_16 = from_html(`<div class="toolbar svelte-axobi4"><span> </span> <div class="svelte-axobi4"><button class="learnablemeta-button learnablemeta-button--link">Select changed</button> <button class="learnablemeta-button learnablemeta-button--link">Deselect all</button></div></div> <div class="map-list svelte-axobi4"></div>`, 1);
  var root_20 = from_html(`<div class="notice svelte-axobi4">This group has no maps to update.</div>`);
  var root_21 = from_html(`<div class="summary svelte-axobi4"> </div>`);
  var root_22 = from_html(`<button class="learnablemeta-button learnablemeta-button--link">Change group</button>`);
  var root_23 = from_html(`<button class="learnablemeta-button learnablemeta-button--outline"> </button>`);
  var root_13 = from_html(`<!> <!> <!> <!> <footer class="learnablemeta-modal-actions"><button class="learnablemeta-button learnablemeta-button--link learnablemeta-modal-action-leading">Change API token</button> <!> <button class="learnablemeta-button learnablemeta-button--outline">Close</button> <!> <button class="learnablemeta-button learnablemeta-button--primary"> </button></footer>`, 1);
  var root$1 = from_html(`<div class="learnablemeta-modal-backdrop learnablemeta-ui" role="presentation"><div class="learnablemeta-modal learnablemeta-modal--map-update" role="dialog" aria-modal="true" aria-labelledby="group-update-title"><header class="learnablemeta-modal-header learnablemeta-modal-header--row"><div><p class="learnablemeta-modal-eyebrow">LearnableMeta</p> <h1 class="learnablemeta-modal-title learnablemeta-modal-title--large" id="group-update-title"> </h1> <!></div> <button class="learnablemeta-button learnablemeta-button--ghost map-update-close svelte-axobi4" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true" class="svelte-axobi4"><path d="M18 6 6 18M6 6l12 12"></path></svg></button></header> <!></div></div>`);
  function MapGroupUpdate($$anchor, $$props) {
    push($$props, true);
    const canChooseGroup = $$props.groupId === void 0;
    let activeGroupId = state(proxy($$props.groupId ?? null));
    let phase = state("scanning");
    let apiToken = state("");
    let tokenInput = state("");
    let tokenError = state("");
    let groupName = state("");
    let accessibleGroups = state(proxy([]));
    let groupsLoading = state(false);
    let rows = state(proxy([]));
    let fatalError = state("");
    let finishedRun = state(false);
    let selectedCount = user_derived(() => get(rows).filter((row) => row.status === "changed" && row.selected).length);
    let failureCount = user_derived(() => get(rows).filter((row) => ["scan-error", "update-error", "publish-error"].includes(row.status)).length);
    let successCount = user_derived(() => get(rows).filter((row) => row.status === "success").length);
    let changedCount = user_derived(() => get(rows).filter((row) => row.status === "changed").length);
    onMount(() => {
      try {
        const savedToken = getApiKey();
        if (!savedToken) {
          set(phase, "token");
          return;
        }
        set(apiToken, savedToken, true);
        void continueWithToken();
      } catch (error) {
        set(phase, "token");
        set(tokenError, errorMessage(error), true);
      }
    });
    function errorMessage(error) {
      return error instanceof Error ? error.message : String(error);
    }
    function replaceRow(geoguessrId, update) {
      const index2 = get(rows).findIndex((row) => row.geoguessrId === geoguessrId);
      if (index2 !== -1) get(rows)[index2] = { ...get(rows)[index2], ...update };
    }
    async function saveTokenAndContinue() {
      const trimmed = get(tokenInput).trim();
      if (!trimmed) {
        set(tokenError, "Paste a valid LearnableMeta API token.");
        return;
      }
      saveApiKey(trimmed);
      set(apiToken, trimmed, true);
      set(tokenInput, "");
      set(tokenError, "");
      await continueWithToken();
    }
    function changeToken() {
      set(tokenInput, "");
      set(tokenError, "");
      set(phase, "token");
    }
    async function continueWithToken() {
      if (get(activeGroupId) === null) {
        await loadAccessibleGroups();
      } else {
        await scanGroup();
      }
    }
    async function loadAccessibleGroups() {
      set(phase, "groups");
      set(fatalError, "");
      set(finishedRun, false);
      set(groupName, "");
      set(rows, [], true);
      set(accessibleGroups, [], true);
      set(groupsLoading, true);
      try {
        set(accessibleGroups, await fetchAccessibleMapGroups(get(apiToken)), true);
      } catch (error) {
        if (error instanceof LearnableMetaApiError && error.status === 401) {
          clearApiKey();
          set(apiToken, "");
          set(tokenError, "Your LearnableMeta API token was rejected. Paste a new token.");
          set(phase, "token");
          return;
        }
        set(fatalError, errorMessage(error), true);
      } finally {
        set(groupsLoading, false);
      }
    }
    function selectGroup(groupId) {
      set(activeGroupId, groupId, true);
      void scanGroup();
    }
    function changeGroup() {
      set(activeGroupId, null);
      void loadAccessibleGroups();
    }
    async function scanGroup() {
      if (get(activeGroupId) === null) {
        await loadAccessibleGroups();
        return;
      }
      set(phase, "scanning");
      set(fatalError, "");
      set(finishedRun, false);
      set(groupName, "");
      set(rows, [], true);
      try {
        const manifest = await fetchMapGroupManifest(get(activeGroupId), get(apiToken));
        set(groupName, manifest.group.name, true);
        set(
          rows,
          manifest.maps.map((map) => ({
            ...map,
            status: map.locationCount === 0 ? "empty" : "scanning",
            selected: false
          })),
          true
        );
        let nextIndex = 0;
        async function worker() {
          while (nextIndex < get(rows).length) {
            const row = get(rows)[nextIndex++];
            if (row.status === "scanning") await scanMap(row);
          }
        }
        await Promise.all(Array.from({ length: Math.min(3, get(rows).length) }, () => worker()));
        set(phase, "review");
      } catch (error) {
        if (error instanceof LearnableMetaApiError && error.status === 401) {
          clearApiKey();
          set(apiToken, "");
          set(tokenError, "Your LearnableMeta API token was rejected. Paste a new token.");
          set(phase, "token");
          return;
        }
        set(fatalError, errorMessage(error), true);
        set(phase, "review");
      }
    }
    async function scanMap(row) {
      replaceRow(row.geoguessrId, { status: "scanning", error: void 0, selected: false });
      try {
        const draft = await getGeoguessrDraft(row.geoguessrId);
        const fingerprint = await fingerprintMapCoordinates(getGeoguessrDraftCoordinates(draft));
        const changed = fingerprint !== row.fingerprint;
        replaceRow(row.geoguessrId, { status: changed ? "changed" : "current", selected: changed });
      } catch (error) {
        replaceRow(row.geoguessrId, {
          status: "scan-error",
          selected: false,
          error: errorMessage(error)
        });
      }
    }
    function selectChanged(selected) {
      set(rows, get(rows).map((row) => row.status === "changed" ? { ...row, selected } : row), true);
    }
    async function updateSelected() {
      const selectedIds = get(rows).filter((row) => row.status === "changed" && row.selected).map((row) => row.geoguessrId);
      if (selectedIds.length === 0) return;
      set(phase, "updating");
      set(finishedRun, false);
      for (const geoguessrId of selectedIds) {
        const row = get(rows).find((candidate) => candidate.geoguessrId === geoguessrId);
        if (row) await updateMap(row);
      }
      set(finishedRun, true);
      set(phase, "review");
    }
    async function updateMap(row) {
      replaceRow(row.geoguessrId, { status: "updating", error: void 0 });
      let draft;
      try {
        draft = await getGeoguessrDraft(row.geoguessrId);
        const currentFingerprint = await fingerprintMapCoordinates(getGeoguessrDraftCoordinates(draft));
        if (currentFingerprint === row.fingerprint) {
          replaceRow(row.geoguessrId, { status: "current", selected: false });
          return;
        }
        const coordinates = await fetchSyncedMapLocations(row.geoguessrId, get(apiToken), row.fingerprint);
        if (coordinates.length === 0) throw new Error("Cannot publish an empty map");
        await updateGeoguessrDraft(row.geoguessrId, draft, coordinates);
      } catch (error) {
        replaceRow(row.geoguessrId, { status: "update-error", error: errorMessage(error) });
        return;
      }
      replaceRow(row.geoguessrId, { status: "publishing" });
      try {
        await publishGeoguessrDraft(row.geoguessrId);
        replaceRow(row.geoguessrId, { status: "success", selected: false });
      } catch (error) {
        replaceRow(row.geoguessrId, { status: "publish-error", error: errorMessage(error) });
      }
    }
    async function retryFailures() {
      set(phase, "updating");
      set(finishedRun, false);
      const failedIds = get(rows).filter((row) => ["scan-error", "update-error", "publish-error"].includes(row.status)).map((row) => row.geoguessrId);
      for (const geoguessrId of failedIds) {
        const row = get(rows).find((candidate) => candidate.geoguessrId === geoguessrId);
        if (!row) continue;
        if (row.status === "scan-error") {
          await scanMap(row);
        } else if (row.status === "publish-error") {
          replaceRow(row.geoguessrId, { status: "publishing", error: void 0 });
          try {
            await publishGeoguessrDraft(row.geoguessrId);
            replaceRow(row.geoguessrId, { status: "success", selected: false });
          } catch (error) {
            replaceRow(row.geoguessrId, { status: "publish-error", error: errorMessage(error) });
          }
        } else {
          await updateMap(row);
        }
      }
      set(finishedRun, true);
      set(phase, "review");
    }
    function statusLabel(row) {
      const labels = {
        scanning: "Checking…",
        changed: "Update available",
        current: "Up to date",
        empty: "No synchronized locations",
        "scan-error": "Could not check",
        updating: "Updating draft…",
        publishing: "Publishing…",
        success: "Updated and published",
        "update-error": "Update failed",
        "publish-error": "Draft updated; publish failed"
      };
      return labels[row.status];
    }
    function statusTone(row) {
      if (row.status === "current" || row.status === "success") return "good";
      if (["scan-error", "update-error", "publish-error"].includes(row.status)) return "bad";
      if (["scanning", "updating", "publishing"].includes(row.status)) return "working";
      if (row.status === "empty") return "neutral";
      return "warning";
    }
    var div = root$1();
    var div_1 = child(div);
    var header = child(div_1);
    var div_2 = child(header);
    var h1 = sibling(child(div_2), 2);
    var text = child(h1);
    var node = sibling(h1, 2);
    {
      var consequent = ($$anchor2) => {
        var p = root_1();
        var text_1 = child(p);
        template_effect(() => set_text(text_1, get(groupName)));
        append($$anchor2, p);
      };
      if_block(node, ($$render) => {
        if (get(groupName)) $$render(consequent);
      });
    }
    var button = sibling(div_2, 2);
    button.__click = function(...$$args) {
      $$props.onClose?.apply(this, $$args);
    };
    var node_1 = sibling(header, 2);
    {
      var consequent_2 = ($$anchor2) => {
        var div_3 = root_2();
        var p_1 = sibling(child(div_3), 2);
        var a = sibling(child(p_1));
        var input = sibling(p_1, 2);
        input.__keydown = (event2) => event2.key === "Enter" && void saveTokenAndContinue();
        var node_2 = sibling(input, 2);
        {
          var consequent_1 = ($$anchor3) => {
            var p_2 = root_3();
            var text_2 = child(p_2);
            template_effect(() => set_text(text_2, get(tokenError)));
            append($$anchor3, p_2);
          };
          if_block(node_2, ($$render) => {
            if (get(tokenError)) $$render(consequent_1);
          });
        }
        var div_4 = sibling(node_2, 2);
        var button_1 = child(div_4);
        button_1.__click = function(...$$args) {
          $$props.onClose?.apply(this, $$args);
        };
        var button_2 = sibling(button_1, 2);
        button_2.__click = saveTokenAndContinue;
        template_effect(() => set_attribute(a, "href", URL_TO_GENERATE_TOKEN));
        bind_value(input, () => get(tokenInput), ($$value) => set(tokenInput, $$value));
        append($$anchor2, div_3);
      };
      var alternate_5 = ($$anchor2) => {
        var fragment = comment();
        var node_3 = first_child(fragment);
        {
          var consequent_6 = ($$anchor3) => {
            var fragment_1 = root_5();
            var node_4 = first_child(fragment_1);
            {
              var consequent_3 = ($$anchor4) => {
                var div_5 = root_6();
                append($$anchor4, div_5);
              };
              var alternate_2 = ($$anchor4) => {
                var fragment_2 = comment();
                var node_5 = first_child(fragment_2);
                {
                  var consequent_4 = ($$anchor5) => {
                    var div_6 = root_8();
                    var span = sibling(child(div_6), 2);
                    var text_3 = child(span);
                    var button_3 = sibling(span, 2);
                    button_3.__click = loadAccessibleGroups;
                    template_effect(() => set_text(text_3, get(fatalError)));
                    append($$anchor5, div_6);
                  };
                  var alternate_1 = ($$anchor5) => {
                    var fragment_3 = comment();
                    var node_6 = first_child(fragment_3);
                    {
                      var consequent_5 = ($$anchor6) => {
                        var fragment_4 = root_10();
                        var div_7 = sibling(first_child(fragment_4), 2);
                        each(div_7, 21, () => get(accessibleGroups), (group) => group.id, ($$anchor7, group) => {
                          var button_4 = root_11();
                          button_4.__click = () => selectGroup(get(group).id);
                          var span_1 = child(button_4);
                          var strong = child(span_1);
                          var text_4 = child(strong);
                          var span_2 = sibling(span_1, 2);
                          var text_5 = child(span_2);
                          template_effect(() => {
                            set_text(text_4, get(group).name);
                            set_text(text_5, `${get(group).mapCount ?? ""} map${get(group).mapCount === 1 ? "" : "s"} `);
                          });
                          append($$anchor7, button_4);
                        });
                        append($$anchor6, fragment_4);
                      };
                      var alternate = ($$anchor6) => {
                        var div_8 = root_12();
                        append($$anchor6, div_8);
                      };
                      if_block(
                        node_6,
                        ($$render) => {
                          if (get(accessibleGroups).length > 0) $$render(consequent_5);
                          else $$render(alternate, false);
                        },
                        true
                      );
                    }
                    append($$anchor5, fragment_3);
                  };
                  if_block(
                    node_5,
                    ($$render) => {
                      if (get(fatalError)) $$render(consequent_4);
                      else $$render(alternate_1, false);
                    },
                    true
                  );
                }
                append($$anchor4, fragment_2);
              };
              if_block(node_4, ($$render) => {
                if (get(groupsLoading)) $$render(consequent_3);
                else $$render(alternate_2, false);
              });
            }
            var footer = sibling(node_4, 2);
            var button_5 = child(footer);
            button_5.__click = changeToken;
            var button_6 = sibling(button_5, 2);
            button_6.__click = function(...$$args) {
              $$props.onClose?.apply(this, $$args);
            };
            append($$anchor3, fragment_1);
          };
          var alternate_4 = ($$anchor3) => {
            var fragment_5 = root_13();
            var node_7 = first_child(fragment_5);
            {
              var consequent_7 = ($$anchor4) => {
                var div_9 = root_14();
                append($$anchor4, div_9);
              };
              if_block(node_7, ($$render) => {
                if (get(phase) === "scanning") $$render(consequent_7);
              });
            }
            var node_8 = sibling(node_7, 2);
            {
              var consequent_8 = ($$anchor4) => {
                var div_10 = root_15();
                var span_3 = sibling(child(div_10), 2);
                var text_6 = child(span_3);
                var button_7 = sibling(span_3, 2);
                button_7.__click = scanGroup;
                template_effect(() => set_text(text_6, get(fatalError)));
                append($$anchor4, div_10);
              };
              if_block(node_8, ($$render) => {
                if (get(fatalError)) $$render(consequent_8);
              });
            }
            var node_9 = sibling(node_8, 2);
            {
              var consequent_10 = ($$anchor4) => {
                var fragment_6 = root_16();
                var div_11 = first_child(fragment_6);
                var span_4 = child(div_11);
                var text_7 = child(span_4);
                var div_12 = sibling(span_4, 2);
                var button_8 = child(div_12);
                button_8.__click = () => selectChanged(true);
                var button_9 = sibling(button_8, 2);
                button_9.__click = () => selectChanged(false);
                var div_13 = sibling(div_11, 2);
                each(div_13, 21, () => get(rows), (row) => row.geoguessrId, ($$anchor5, row, $$index_1) => {
                  var label = root_17();
                  let classes;
                  var input_1 = child(label);
                  var span_5 = sibling(input_1, 2);
                  var strong_1 = child(span_5);
                  var text_8 = child(strong_1);
                  var span_6 = sibling(strong_1, 2);
                  var text_9 = child(span_6);
                  var node_10 = sibling(span_6, 2);
                  {
                    var consequent_9 = ($$anchor6) => {
                      var span_7 = root_18();
                      var text_10 = child(span_7);
                      template_effect(() => set_text(text_10, get(row).error));
                      append($$anchor6, span_7);
                    };
                    if_block(node_10, ($$render) => {
                      if (get(row).error) $$render(consequent_9);
                    });
                  }
                  var span_8 = sibling(span_5, 2);
                  var text_11 = child(span_8);
                  template_effect(
                    ($0, $1, $2) => {
                      classes = set_class(label, 1, "map-row svelte-axobi4", null, classes, { "error-row": get(row).error, selected: get(row).selected });
                      input_1.disabled = get(row).status !== "changed" || get(phase) === "updating";
                      set_text(text_8, get(row).name);
                      set_text(text_9, `${$0 ?? ""} synchronized locations`);
                      set_class(span_8, 1, `status ${$1 ?? ""}`, "svelte-axobi4");
                      set_text(text_11, $2);
                    },
                    [
                      () => get(row).locationCount.toLocaleString(),
                      () => statusTone(get(row)),
                      () => statusLabel(get(row))
                    ]
                  );
                  bind_checked(input_1, () => get(row).selected, ($$value) => get(row).selected = $$value);
                  append($$anchor5, label);
                });
                template_effect(() => set_text(text_7, `${get(rows).length ?? ""} map${get(rows).length === 1 ? "" : "s"}`));
                append($$anchor4, fragment_6);
              };
              var alternate_3 = ($$anchor4) => {
                var fragment_7 = comment();
                var node_11 = first_child(fragment_7);
                {
                  var consequent_11 = ($$anchor5) => {
                    var div_14 = root_20();
                    append($$anchor5, div_14);
                  };
                  if_block(
                    node_11,
                    ($$render) => {
                      if (get(phase) === "review" && !get(fatalError)) $$render(consequent_11);
                    },
                    true
                  );
                }
                append($$anchor4, fragment_7);
              };
              if_block(node_9, ($$render) => {
                if (get(rows).length > 0) $$render(consequent_10);
                else $$render(alternate_3, false);
              });
            }
            var node_12 = sibling(node_9, 2);
            {
              var consequent_12 = ($$anchor4) => {
                var div_15 = root_21();
                var text_12 = child(div_15);
                template_effect(() => set_text(text_12, `Finished: ${get(successCount) ?? ""} published, ${get(failureCount) ?? ""} failed, ${get(changedCount) ?? ""} still available.`));
                append($$anchor4, div_15);
              };
              if_block(node_12, ($$render) => {
                if (get(finishedRun)) $$render(consequent_12);
              });
            }
            var footer_1 = sibling(node_12, 2);
            var button_10 = child(footer_1);
            button_10.__click = changeToken;
            var node_13 = sibling(button_10, 2);
            {
              var consequent_13 = ($$anchor4) => {
                var button_11 = root_22();
                button_11.__click = changeGroup;
                template_effect(() => button_11.disabled = get(phase) === "updating");
                append($$anchor4, button_11);
              };
              if_block(node_13, ($$render) => {
                if (canChooseGroup) $$render(consequent_13);
              });
            }
            var button_12 = sibling(node_13, 2);
            button_12.__click = function(...$$args) {
              $$props.onClose?.apply(this, $$args);
            };
            var node_14 = sibling(button_12, 2);
            {
              var consequent_14 = ($$anchor4) => {
                var button_13 = root_23();
                button_13.__click = retryFailures;
                var text_13 = child(button_13);
                template_effect(() => {
                  button_13.disabled = get(phase) === "updating";
                  set_text(text_13, `Retry failed (${get(failureCount) ?? ""})`);
                });
                append($$anchor4, button_13);
              };
              if_block(node_14, ($$render) => {
                if (get(failureCount) > 0) $$render(consequent_14);
              });
            }
            var button_14 = sibling(node_14, 2);
            button_14.__click = updateSelected;
            var text_14 = child(button_14);
            template_effect(() => {
              button_10.disabled = get(phase) === "updating";
              button_12.disabled = get(phase) === "updating";
              button_14.disabled = get(phase) !== "review" || get(selectedCount) === 0;
              set_text(text_14, get(phase) === "updating" ? "Updating…" : `Update and publish (${get(selectedCount)})`);
            });
            append($$anchor3, fragment_5);
          };
          if_block(
            node_3,
            ($$render) => {
              if (get(phase) === "groups") $$render(consequent_6);
              else $$render(alternate_4, false);
            },
            true
          );
        }
        append($$anchor2, fragment);
      };
      if_block(node_1, ($$render) => {
        if (get(phase) === "token") $$render(consequent_2);
        else $$render(alternate_5, false);
      });
    }
    action(div_1, ($$node, $$action_arg) => modalDialog?.($$node, $$action_arg), () => ({
      onClose: $$props.onClose,
      closeOnEscape: get(phase) !== "updating"
    }));
    template_effect(() => {
      set_text(text, get(phase) === "groups" ? "Choose a map group" : "Update GeoGuessr maps");
      button.disabled = get(phase) === "updating";
    });
    append($$anchor, div);
    pop();
  }
  delegate(["click", "keydown"]);
  const queryParameter = "learnableMetaGroupId";
  const containerId = "learnablemeta-map-group-update";
  const launcherButtonId = "learnablemeta-update-maps-button";
  const mapActionsClass = "learnablemeta-map-actions";
  let app = null;
  let launcherObserver = null;
  function clearHandoffParameter() {
    const url = new URL(window.location.href);
    url.searchParams.delete(queryParameter);
    window.history.replaceState(window.history.state, "", url);
  }
  function startMapGroupUpdate(groupId) {
    if (groupId !== void 0 && (!Number.isSafeInteger(groupId) || groupId <= 0) || app) return;
    const target = document.createElement("div");
    target.id = containerId;
    document.body.appendChild(target);
    app = mount(MapGroupUpdate, {
      target,
      props: {
        groupId,
        onClose: () => {
          if (app) unmount(app);
          app = null;
          target.remove();
          clearHandoffParameter();
        }
      }
    });
  }
  function removeLauncherButton() {
    document.getElementById(launcherButtonId)?.remove();
    document.querySelectorAll(`.${mapActionsClass}`).forEach((container) => container.classList.remove(mapActionsClass));
  }
  function ensureLauncherButton() {
    if (!window.location.pathname.startsWith("/creator-hub")) {
      removeLauncherButton();
      return;
    }
    const createMapContainer = document.querySelector('[class*="creators-hub_createMapButton"]');
    const createMapButton = createMapContainer?.querySelector(`button:not(#${launcherButtonId})`);
    if (!createMapContainer || !createMapButton) return;
    createMapContainer.classList.add(mapActionsClass);
    if (document.getElementById(launcherButtonId)) return;
    const launcher = document.createElement("button");
    launcher.id = launcherButtonId;
    launcher.className = "learnablemeta-geoguessr-button";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Update LearnableMeta maps");
    launcher.textContent = "Update maps";
    launcher.addEventListener("click", () => startMapGroupUpdate());
    createMapContainer.insertBefore(launcher, createMapButton);
  }
  function refreshLauncherButton() {
    if (!window.location.pathname.startsWith("/creator-hub")) {
      launcherObserver?.disconnect();
      launcherObserver = null;
      removeLauncherButton();
      return;
    }
    ensureLauncherButton();
    if (launcherObserver) return;
    launcherObserver = new MutationObserver(ensureLauncherButton);
    launcherObserver.observe(document.body, { childList: true, subtree: true });
  }
  function handleCreatorHubNavigation() {
    if (window.location.pathname.startsWith("/creator-hub")) {
      const rawGroupId = new URL(window.location.href).searchParams.get(queryParameter);
      if (rawGroupId) startMapGroupUpdate(Number(rawGroupId));
    }
    refreshLauncherButton();
  }
  function initMapGroupUpdate() {
    handleCreatorHubNavigation();
    window.addEventListener("urlchange", handleCreatorHubNavigation);
  }
  var root = from_html(`<div class="learnablemeta-modal-backdrop learnablemeta-ui" role="presentation"><div class="learnablemeta-modal" role="dialog" aria-modal="true" aria-labelledby="reset-layout-title"><div class="learnablemeta-modal-header"><p class="learnablemeta-modal-eyebrow">LearnableMeta</p> <h2 class="learnablemeta-modal-title" id="reset-layout-title">Reset window layout?</h2> <p class="learnablemeta-modal-description">The meta window will return to its default position and size.</p></div> <div class="learnablemeta-modal-actions"><button type="button" data-modal-initial-focus="" class="learnablemeta-button learnablemeta-button--outline">Cancel</button> <button type="button" class="learnablemeta-button learnablemeta-button--primary">Reset layout</button></div></div></div>`);
  function ResetLayoutConfirmation($$anchor, $$props) {
    var div = root();
    var div_1 = child(div);
    var div_2 = sibling(child(div_1), 2);
    var button = child(div_2);
    button.__click = function(...$$args) {
      $$props.onCancel?.apply(this, $$args);
    };
    var button_1 = sibling(button, 2);
    button_1.__click = function(...$$args) {
      $$props.onConfirm?.apply(this, $$args);
    };
    action(div_1, ($$node, $$action_arg) => modalDialog?.($$node, $$action_arg), () => ({ onClose: $$props.onCancel }));
    append($$anchor, div);
  }
  delegate(["click"]);
  const themeCss = ".learnablemeta-ui{--lm-background: hsl(0 0% 100%);--lm-foreground: hsl(240 10% 3.9%);--lm-card: hsl(0 0% 100%);--lm-card-foreground: hsl(240 10% 3.9%);--lm-primary: hsl(161 92% 25%);--lm-primary-hover: hsl(161 92% 22%);--lm-primary-foreground: hsl(355.7 100% 97.3%);--lm-secondary: hsl(240 4.8% 95.9%);--lm-secondary-foreground: hsl(240 5.9% 10%);--lm-muted: hsl(240 4.8% 95.9%);--lm-muted-foreground: hsl(240 3.8% 46.1%);--lm-accent: hsl(240 4.8% 95.9%);--lm-accent-foreground: hsl(240 5.9% 10%);--lm-destructive: hsl(0 72.22% 50.59%);--lm-border: hsl(240 5.9% 90%);--lm-input: hsl(240 5.9% 90%);--lm-ring: hsl(142.1 76.2% 36.3%);--lm-link: hsl(220.3 82.9% 52.7%);--lm-radius: .5rem;color:var(--lm-foreground);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}@media(prefers-color-scheme:dark){.learnablemeta-ui{--lm-background: hsl(0 0% 10%);--lm-foreground: hsl(0 0% 95%);--lm-card: hsl(24 9.8% 10%);--lm-card-foreground: hsl(0 0% 95%);--lm-primary: hsl(161 92% 25%);--lm-primary-hover: hsl(161 92% 29%);--lm-primary-foreground: hsl(0 0% 98%);--lm-secondary: hsl(240 3.7% 20.9%);--lm-secondary-foreground: hsl(0 0% 98%);--lm-muted: hsl(0 0% 15%);--lm-muted-foreground: hsl(240 5% 64.9%);--lm-accent: hsl(12 6.5% 15.1%);--lm-accent-foreground: hsl(0 0% 98%);--lm-destructive: hsl(0 72% 60%);--lm-border: hsl(240 3.7% 22%);--lm-input: hsl(240 3.7% 25.5%);--lm-ring: hsl(142.4 71.8% 35%);--lm-link: hsl(217.1 92.7% 67.6%);color-scheme:dark}}";
  importCSS(themeCss);
  const buttonsCss = ".learnablemeta-button{display:inline-flex;height:36px;flex:none;align-items:center;justify-content:center;gap:8px;padding:8px 16px;appearance:none;font-family:inherit;font-size:14px;font-weight:500;line-height:20px;white-space:nowrap;border:1px solid transparent;border-radius:var(--lm-radius, .5rem);cursor:pointer;transition:background-color .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease}.learnablemeta-button--primary{background:var(--lm-primary, hsl(161 92% 25%));color:var(--lm-primary-foreground, #fff);box-shadow:0 1px 2px #0000001f}.learnablemeta-button--primary:hover:not(:disabled){background:var(--lm-primary-hover, hsl(161 92% 22%))}.learnablemeta-button--outline{border-color:var(--lm-border, hsl(240 5.9% 90%));background:var(--lm-background, #fff);color:var(--lm-secondary-foreground, hsl(240 5.9% 10%));box-shadow:0 1px 2px #0000000f}.learnablemeta-button--outline:hover:not(:disabled){background:var(--lm-accent, hsl(240 4.8% 95.9%));color:var(--lm-accent-foreground, hsl(240 5.9% 10%))}.learnablemeta-button--ghost{background:transparent;color:var(--lm-muted-foreground, hsl(240 3.8% 46.1%));box-shadow:none}.learnablemeta-button--ghost:hover:not(:disabled){background:var(--lm-accent, hsl(240 4.8% 95.9%));color:var(--lm-accent-foreground, hsl(240 5.9% 10%))}.learnablemeta-button--link{height:auto;padding:5px 7px;background:transparent;color:var(--lm-link, hsl(220.3 82.9% 52.7%));font-size:13px;box-shadow:none}.learnablemeta-button--link:hover:not(:disabled){text-decoration:underline;text-underline-offset:3px}.learnablemeta-button--destructive{background:var(--lm-destructive, hsl(0 72.22% 50.59%));color:#fff;box-shadow:0 1px 2px #0000001f}.learnablemeta-button--destructive:hover:not(:disabled){background:color-mix(in srgb,var(--lm-destructive, #dc2626) 88%,#000)}.learnablemeta-button--icon{width:36px;padding:0}.learnablemeta-button:active:not(:disabled){box-shadow:inset 0 1px 3px #00000040}.learnablemeta-button--ghost:active:not(:disabled),.learnablemeta-button--link:active:not(:disabled){box-shadow:none}.learnablemeta-button:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--lm-ring, #16a34a) 35%,transparent)}.learnablemeta-button:disabled{opacity:.5;cursor:not-allowed}.learnablemeta-geoguessr-button{display:inline-flex;align-items:center;justify-content:center;padding:8px 16px;appearance:none;font-family:inherit;font-size:12px;font-weight:700;line-height:1;white-space:nowrap;background:linear-gradient(180deg,#ffeb99,#f5c542);border:1px solid #e0b000;color:#002147;border-radius:3.75rem;box-shadow:0 2px 4px #00000026,inset 0 1px #fff6;cursor:pointer;transition:background .2s ease-in-out,transform .1s ease,box-shadow .2s ease-in-out}.learnablemeta-geoguessr-button:hover:not(:disabled){background:linear-gradient(180deg,#ffe066,#eab308);box-shadow:0 4px 8px #0003,inset 0 1px #ffffff80;transform:translateY(-1px)}.learnablemeta-geoguessr-button:active:not(:disabled){background:linear-gradient(180deg,#eab308,#d39e00);box-shadow:inset 0 2px 4px #0003;transform:translateY(1px)}.learnablemeta-geoguessr-button:focus-visible{outline:none;box-shadow:0 0 0 3px #eab30880,0 2px 4px #00000026}.learnablemeta-geoguessr-button:disabled{background:#e0e0e0;border-color:#bbb;color:#888;box-shadow:none;cursor:not-allowed;transform:none}.learnablemeta-geoguessr-button--icon{width:30px;height:30px;padding:0;border-radius:50%;font-size:14px}.learnablemeta-geoguessr-button--icon:hover:not(:disabled){box-shadow:0 2px 4px #00000026,inset 0 1px #fff6;transform:none}.learnablemeta-geoguessr-button--icon:active:not(:disabled){transform:none}.learnablemeta-map-actions{display:flex!important;flex-direction:row!important;align-items:center!important;gap:.75rem!important}";
  importCSS(buttonsCss);
  const modalsCss = '.learnablemeta-modal-backdrop{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:24px;background:#000000c2;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}.learnablemeta-modal,.learnablemeta-modal *{box-sizing:border-box}.learnablemeta-modal{position:relative;width:min(460px,100%);max-height:calc(100vh - 48px);overflow-y:auto;border:1px solid var(--lm-border);border-radius:calc(var(--lm-radius) + 4px);background:var(--lm-background);color:var(--lm-foreground);box-shadow:0 24px 70px #00000080;text-align:left}.learnablemeta-modal--wide{width:min(600px,100%)}.learnablemeta-modal--map-update{width:min(780px,100%);max-height:min(760px,calc(100vh - 48px));display:flex;flex-direction:column;overflow:hidden}.learnablemeta-modal:before{position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,#057a55,#0b87c1);content:""}.learnablemeta-modal-header{display:grid;gap:6px;padding:26px 24px 0}.learnablemeta-modal-header--row{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:26px 24px 20px;border-bottom:1px solid var(--lm-border);background:var(--lm-card)}.learnablemeta-modal-eyebrow{margin:0;color:var(--lm-primary);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}.learnablemeta-modal-title{margin:0;color:var(--lm-foreground);font-size:20px;font-weight:650;line-height:1.3;letter-spacing:-.025em}.learnablemeta-modal-title--large{margin-top:4px;color:var(--lm-card-foreground);font-size:22px;line-height:1.25}.learnablemeta-modal-description{margin:0;color:var(--lm-muted-foreground);font-size:14px;line-height:1.5}.learnablemeta-modal-body{display:grid;gap:14px;padding:20px 24px 0;color:var(--lm-foreground);font-size:14px;line-height:1.5}.learnablemeta-modal-body p{margin:0}.learnablemeta-modal-body a{color:var(--lm-link);text-decoration:underline;text-underline-offset:3px}.learnablemeta-modal-input{width:100%;height:38px;border:1px solid var(--lm-input);border-radius:var(--lm-radius);padding:7px 12px;outline:none;background:var(--lm-background);color:var(--lm-foreground);font:inherit;font-size:14px;box-shadow:0 1px 2px #0000000a;transition:border-color .15s ease,box-shadow .15s ease}.learnablemeta-modal-input::placeholder{color:var(--lm-muted-foreground)}.learnablemeta-modal-input:focus-visible{border-color:var(--lm-ring);box-shadow:0 0 0 3px color-mix(in srgb,var(--lm-ring) 25%,transparent)}.learnablemeta-modal-code{overflow-wrap:anywhere;border:1px solid var(--lm-border);border-radius:var(--lm-radius);padding:10px 12px;background:var(--lm-muted);color:var(--lm-link);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;line-height:1.45;-webkit-user-select:text;user-select:text}.learnablemeta-modal-note{color:var(--lm-muted-foreground);font-size:12px;line-height:1.45}.learnablemeta-modal-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:20px;padding:16px 24px;border-top:1px solid var(--lm-border);background:var(--lm-card)}.learnablemeta-modal-action-leading{margin-right:auto}.learnablemeta-modal-alert{border:1px solid rgba(220,38,38,.3);border-radius:var(--lm-radius);padding:12px 14px;background:#dc262617;color:var(--lm-destructive);font-size:13px}.learnablemeta-modal .learnablemeta-modal-body .learnablemeta-help-list{display:grid;gap:10px;margin:0;padding-left:20px;list-style:disc}.learnablemeta-modal .learnablemeta-help-list strong{color:var(--lm-foreground);font-weight:600}@media(max-width:620px){.learnablemeta-modal-backdrop{padding:8px}.learnablemeta-modal{max-height:calc(100vh - 16px)}.learnablemeta-modal-actions{flex-wrap:wrap}.learnablemeta-modal-action-leading{width:100%;margin-right:0}.learnablemeta-modal-actions .learnablemeta-button--primary,.learnablemeta-modal-actions .learnablemeta-button--outline,.learnablemeta-modal-actions .learnablemeta-button--destructive{flex:1}}';
  importCSS(modalsCss);
  let resetDialogApp = null;
  const geoJsonEnabled = isGeoJsonEnabled();
  if (geoJsonEnabled) initMapArea();
  function openResetLayoutDialog() {
    if (resetDialogApp) return;
    const target = document.createElement("div");
    target.id = "learnablemeta-reset-layout-dialog";
    document.body.appendChild(target);
    function closeDialog() {
      if (resetDialogApp) unmount(resetDialogApp);
      resetDialogApp = null;
      target.remove();
    }
    resetDialogApp = mount(ResetLayoutConfirmation, {
      target,
      props: {
        onCancel: closeDialog,
        onConfirm: () => {
          resetContainerPosition();
          resetContainerDimensions();
          closeDialog();
          window.location.reload();
        }
      }
    });
  }
  if (typeof _GM_registerMenuCommand === "function") {
    _GM_registerMenuCommand("LearnableMeta - Reset Meta Window Layout", openResetLayoutDialog);
    _GM_registerMenuCommand(
      `LearnableMeta - GeoJSON overlays: ${geoJsonEnabled ? "On" : "Off"}`,
      () => {
        setGeoJsonEnabled(!geoJsonEnabled);
        window.location.reload();
      }
    );
  }
  initURLChangeEvent();
  initLiveChallengeIdTracking();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLearnableMetaFeatures);
  } else {
    await( setupLearnableMetaFeatures());
  }
  async function setupLearnableMetaFeatures() {
    const features = [
      ["singlePlayer", initSinglePlayer],
      ["liveChallenge", initLiveChallenge],
      ["mapLabel", initMapLabel],
      ["locationsUpload", initLocationsUpload],
      ["challengeResults", initChallengeResults],
      ["mapGroupUpdate", initMapGroupUpdate]
    ];
    for (const [name, init2] of features) {
      try {
        init2();
      } catch (e) {
        console.error(`ALM: failed to initialize ${name}`, e);
      }
    }
  }

})();
