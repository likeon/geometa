// ==UserScript==
// @name         GeoGuessr Learnable Meta
// @namespace    geometa
// @version      0.84
// @author       monkey
// @description  UserScript for GeoGuessr Learnable Meta maps
// @icon         https://learnablemeta.com/favicon.png
// @downloadURL  https://github.com/likeon/geometa/raw/main/dist/geometa.user.js
// @updateURL    https://github.com/likeon/geometa/raw/main/dist/geometa.user.js
// @match        *://*.geoguessr.com/*
// @require      https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/b0c7492f4f346d4acb594a2015d592616a665096/geoguessr-event-framework.js
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

(e=>{if(typeof GM_addStyle=="function"){GM_addStyle(e);return}const o=document.createElement("style");o.textContent=e,document.head.append(o)})(` .loadership_ZOJAQ.svelte-i1jlc0{display:flex;position:relative;width:72px;height:72px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0){position:absolute;width:8px;height:8px;border-radius:50%;background:#fff;animation:svelte-i1jlc0-loadership_ZOJAQ_scale 1.2s infinite,svelte-i1jlc0-loadership_ZOJAQ_fade 1.2s infinite;animation-timing-function:linear}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(1){animation-delay:0s;top:62px;left:32px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(2){animation-delay:-.1s;top:58px;left:47px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(3){animation-delay:-.2s;top:47px;left:58px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(4){animation-delay:-.3s;top:32px;left:62px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(5){animation-delay:-.4s;top:17px;left:58px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(6){animation-delay:-.5s;top:6px;left:47px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(7){animation-delay:-.6s;top:2px;left:32px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(8){animation-delay:-.7s;top:6px;left:17px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(9){animation-delay:-.8s;top:17px;left:6px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(10){animation-delay:-.9s;top:32px;left:2px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(11){animation-delay:-1s;top:47px;left:6px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(12){animation-delay:-1.1s;top:58px;left:17px}@keyframes svelte-i1jlc0-loadership_ZOJAQ_scale{0%,20%,80%,to{transform:scale(1)}50%{transform:scale(1.5)}}@keyframes svelte-i1jlc0-loadership_ZOJAQ_fade{0%,20%,80%,to{opacity:.8}50%{opacity:1}}.fi.svelte-7lhsry{width:1.5em;height:1em;display:inline-block;vertical-align:middle;padding-right:3px}.carousel.svelte-fofh7f{position:relative;overflow:hidden;margin:0 auto}.image-wrapper.svelte-fofh7f{width:100%;height:100%;display:flex;justify-content:center;align-items:center;cursor:zoom-in}.responsive-image.svelte-fofh7f{max-width:100%;height:100%;display:block;object-fit:contain}.lens.svelte-fofh7f{position:absolute;pointer-events:none;border:2px solid #aaa;border-radius:50%;box-shadow:0 0 8px #00000080}.click-area.svelte-fofh7f{position:absolute;top:0;bottom:0;width:1.4em;cursor:pointer}.prev-area.svelte-fofh7f{left:0}.next-area.svelte-fofh7f{right:0}.prev.svelte-fofh7f,.next.svelte-fofh7f{background-color:#00000080;color:#fff;border:none;font-size:1.2em;padding:.2em;cursor:pointer;pointer-events:auto;position:absolute;top:50%;transform:translateY(-50%)}.prev.svelte-fofh7f{left:0}.next.svelte-fofh7f{right:0}.indicators.svelte-fofh7f{position:absolute;bottom:15px;left:50%;transform:translate(-50%);display:flex;justify-content:center;align-items:center;gap:8px}.indicator.svelte-fofh7f{width:12px;height:12px;background-color:#ffffff80;border-radius:50%;cursor:pointer;border:none;padding:0;flex-shrink:0}.indicator.active.svelte-fofh7f{background-color:#fff}.geometa-footer a{color:#188bd2;text-decoration:none}.geometa-footer a:hover{text-decoration:underline}.geometa-container.svelte-z0rh71{position:absolute;top:13rem;left:1rem;z-index:50;display:flex;flex-direction:column;gap:5px;align-items:flex-start;background:var(--ds-color-purple-100);padding:6px 10px;border-radius:5px;font-size:17px;width:min(25%,500px);resize:both;overflow:auto}.geometa-container.svelte-z0rh71>.header:where(.svelte-z0rh71){margin-top:0}.geometa-footer.svelte-z0rh71{color:#d3d3d3;font-size:small}.announcement.svelte-z0rh71{background-color:#e6f7ff;color:#0050b3;padding:8px 12px;border-radius:4px;font-size:14px;display:flex;justify-content:space-between;align-items:center;width:100%;box-sizing:border-box;margin-bottom:8px;border:1px solid #91d5ff}.announcement a{color:#0050b3;font-weight:700;text-decoration:underline}.announcement a:hover{color:#003a8c}.vote-close-btn.svelte-z0rh71{background:none;border:none;color:#0050b3;font-size:18px;font-weight:700;cursor:pointer;padding:0 5px;line-height:1;opacity:.7}.vote-close-btn.svelte-z0rh71:hover{opacity:1}a.svelte-z0rh71{color:#188bd2}a.svelte-z0rh71:hover{text-decoration:underline}.skill-icons--discord.svelte-z0rh71{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cg fill='none'%3E%3Crect width='256' height='256' fill='%235865f2' rx='60'/%3E%3Cg clip-path='url(%23skillIconsDiscord0)'%3E%3Cpath fill='%23ffffff' d='M197.308 64.797a165 165 0 0 0-40.709-12.627a.62.62 0 0 0-.654.31c-1.758 3.126-3.706 7.206-5.069 10.412c-15.373-2.302-30.666-2.302-45.723 0c-1.364-3.278-3.382-7.286-5.148-10.412a.64.64 0 0 0-.655-.31a164.5 164.5 0 0 0-40.709 12.627a.6.6 0 0 0-.268.23c-25.928 38.736-33.03 76.52-29.546 113.836a.7.7 0 0 0 .26.468c17.106 12.563 33.677 20.19 49.94 25.245a.65.65 0 0 0 .702-.23c3.847-5.254 7.276-10.793 10.217-16.618a.633.633 0 0 0-.347-.881c-5.44-2.064-10.619-4.579-15.601-7.436a.642.642 0 0 1-.063-1.064a86 86 0 0 0 3.098-2.428a.62.62 0 0 1 .646-.088c32.732 14.944 68.167 14.944 100.512 0a.62.62 0 0 1 .655.08a80 80 0 0 0 3.106 2.436a.642.642 0 0 1-.055 1.064a102.6 102.6 0 0 1-15.609 7.428a.64.64 0 0 0-.339.889a133 133 0 0 0 10.208 16.61a.64.64 0 0 0 .702.238c16.342-5.055 32.913-12.682 50.02-25.245a.65.65 0 0 0 .26-.46c4.17-43.141-6.985-80.616-29.571-113.836a.5.5 0 0 0-.26-.238M94.834 156.142c-9.855 0-17.975-9.047-17.975-20.158s7.963-20.158 17.975-20.158c10.09 0 18.131 9.127 17.973 20.158c0 11.111-7.962 20.158-17.973 20.158m66.456 0c-9.855 0-17.974-9.047-17.974-20.158s7.962-20.158 17.974-20.158c10.09 0 18.131 9.127 17.974 20.158c0 11.111-7.884 20.158-17.974 20.158'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='skillIconsDiscord0'%3E%3Cpath fill='%23ffffff' d='M28 51h200v154.93H28z'/%3E%3C/clipPath%3E%3C/defs%3E%3C/g%3E%3C/svg%3E")}.flat-color-icons--globe.svelte-z0rh71{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%237cb342' d='M24 4C13 4 4 13 4 24s9 20 20 20s20-9 20-20S35 4 24 4'/%3E%3Cpath fill='%230277bd' d='M45 24c0 11.7-9.5 21-21 21S3 35.7 3 24S12.3 3 24 3s21 9.3 21 21m-21.2 9.7c0-.4-.2-.6-.6-.8c-1.3-.4-2.5-.4-3.6-1.5c-.2-.4-.2-.8-.4-1.3c-.4-.4-1.5-.6-2.1-.8h-4.2c-.6-.2-1.1-1.1-1.5-1.7c0-.2 0-.6-.4-.6c-.4-.2-.8.2-1.3 0c-.2-.2-.2-.4-.2-.6c0-.6.4-1.3.8-1.7c.6-.4 1.3.2 1.9.2c.2 0 .2 0 .4.2c.6.2.8 1 .8 1.7v.4c0 .2.2.2.4.2c.2-1.1.2-2.1.4-3.2c0-1.3 1.3-2.5 2.3-2.9c.4-.2.6.2 1.1 0c1.3-.4 4.4-1.7 3.8-3.4c-.4-1.5-1.7-2.9-3.4-2.7c-.4.2-.6.4-1 .6c-.6.4-1.9 1.7-2.5 1.7c-1.1-.2-1.1-1.7-.8-2.3c.2-.8 2.1-3.6 3.4-3.1l.8.8c.4.2 1.1.2 1.7.2c.2 0 .4 0 .6-.2s.2-.2.2-.4c0-.6-.6-1.3-1-1.7s-1.1-.8-1.7-1.1c-2.1-.6-5.5.2-7.1 1.7s-2.9 4-3.8 6.1c-.4 1.3-.8 2.9-1 4.4c-.2 1-.4 1.9.2 2.9c.6 1.3 1.9 2.5 3.2 3.4c.8.6 2.5.6 3.4 1.7c.6.8.4 1.9.4 2.9c0 1.3.8 2.3 1.3 3.4c.2.6.4 1.5.6 2.1c0 .2.2 1.5.2 1.7c1.3.6 2.3 1.3 3.8 1.7c.2 0 1-1.3 1-1.5c.6-.6 1.1-1.5 1.7-1.9c.4-.2.8-.4 1.3-.8c.4-.4.6-1.3.8-1.9c.1-.5.3-1.3.1-1.9m.4-19.4c.2 0 .4-.2.8-.4c.6-.4 1.3-1.1 1.9-1.5s1.3-1.1 1.7-1.5c.6-.4 1.1-1.3 1.3-1.9c.2-.4.8-1.3.6-1.9c-.2-.4-1.3-.6-1.7-.8c-1.7-.4-3.1-.6-4.8-.6c-.6 0-1.5.2-1.7.8c-.2 1.1.6.8 1.5 1.1c0 0 .2 1.7.2 1.9c.2 1-.4 1.7-.4 2.7c0 .6 0 1.7.4 2.1zM41.8 29c.2-.4.2-1.1.4-1.5c.2-1 .2-2.1.2-3.1c0-2.1-.2-4.2-.8-6.1c-.4-.6-.6-1.3-.8-1.9c-.4-1.1-1-2.1-1.9-2.9c-.8-1.1-1.9-4-3.8-3.1c-.6.2-1 1-1.5 1.5c-.4.6-.8 1.3-1.3 1.9c-.2.2-.4.6-.2.8c0 .2.2.2.4.2c.4.2.6.2 1 .4c.2 0 .4.2.2.4c0 0 0 .2-.2.2c-1 1.1-2.1 1.9-3.1 2.9c-.2.2-.4.6-.4.8s.2.2.2.4s-.2.2-.4.4c-.4.2-.8.4-1.1.6c-.2.4 0 1.1-.2 1.5c-.2 1.1-.8 1.9-1.3 2.9c-.4.6-.6 1.3-1 1.9c0 .8-.2 1.5.2 2.1c1 1.5 2.9.6 4.4 1.3c.4.2.8.2 1.1.6c.6.6.6 1.7.8 2.3c.2.8.4 1.7.8 2.5c.2 1 .6 2.1.8 2.9c1.9-1.5 3.6-3.1 4.8-5.2c1.5-1.3 2.1-3 2.7-4.7'/%3E%3C/svg%3E")}.skill-icons--list.svelte-z0rh71{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%235865f2' d='M4 3h13.17c.41 0 .8.16 1.09.44l3.3 3.3c.29.29.44.68.44 1.09V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'/%3E%3Cpath fill='%23ffffff' d='M14 2v4h4l-4-4zM7 9h10v2H7V9zm0 4h7v2H7v-2z'/%3E%3C/svg%3E")}.question-mark-icon.svelte-z0rh71{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23188bd2' d='M21 2H3c-.55 0-1 .45-1 1v18c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1ZM12 18a1 1 0 1 1 1-1a1 1 0 0 1-1 1Zm2.07-5.25c-.9.52-.98 1.26-.98 1.75h-2c0-1.12.46-2.21 1.78-2.91c.9-.52 1.22-.87 1.22-1.34a1.5 1.5 0 0 0-3 0H9a3.5 3.5 0 0 1 7 0c0 1.63-1.28 2.41-1.93 2.75Z'/%3E%3C/svg%3E");cursor:pointer}.icons.svelte-z0rh71{display:inline-block;vertical-align:middle}.flex.svelte-z0rh71{display:flex;align-items:center}.icons.svelte-z0rh71 a:where(.svelte-z0rh71) span:where(.svelte-z0rh71){align-items:center;justify-content:center}hr.svelte-z0rh71{border:0;border-top:1px solid white;width:100%}.header.svelte-z0rh71{cursor:move;border-bottom:1px solid #aaa;width:100%;display:flex;justify-content:space-between;align-items:center;touch-action:none;-webkit-user-select:none;user-select:none}.geometa-note a{color:#188bd2}.geometa-note a:hover{text-decoration:underline}.geometa-note ul li{list-style-type:disc;margin-left:1rem}.geometa-note ol li{list-style-type:decimal;margin-left:1rem}.modal-backdrop.svelte-z0rh71{position:fixed;top:0;left:0;width:100vw;height:100vh;background:#1e1e1ecc;display:flex;justify-content:center;align-items:center;z-index:1000}.modal.svelte-z0rh71{background:var(--ds-color-purple-100);padding:15px 25px;border-radius:8px;text-align:center;width:90%;max-width:600px;box-shadow:0 4px 6px #0003;color:#d3d3d3}.modal.svelte-z0rh71 p:where(.svelte-z0rh71){margin:0 0 10px;font-size:17px}.modal-url.svelte-z0rh71{font-size:15px;font-weight:700;color:#188bd2;word-break:break-word;margin:10px 0}.modal-buttons.svelte-z0rh71{display:flex;justify-content:center;gap:15px;margin-top:20px}.proceed-btn.svelte-z0rh71{background:#188bd2;color:#fff;padding:8px 16px;border:none;border-radius:5px;cursor:pointer;font-size:15px;transition:background-color .2s ease-in-out}.proceed-btn.svelte-z0rh71:hover{background:#0056b3}.close-btn.svelte-z0rh71{background:transparent;color:#d3d3d3;padding:8px 16px;border:1px solid #d3d3d3;border-radius:5px;cursor:pointer;font-size:15px;transition:background-color .2s ease-in-out,color .2s ease-in-out}.close-btn.svelte-z0rh71:hover{background:#d3d3d3;color:var(--ds-color-purple-100)}button.svelte-z0rh71{cursor:pointer;background:none;border:none;padding:0}.blink.svelte-z0rh71{animation:svelte-z0rh71-blink-animation 1s infinite}.help-message.svelte-z0rh71{padding:12px;font-size:16px;line-height:1.5;text-align:left}.help-message.svelte-z0rh71 strong:where(.svelte-z0rh71){color:#007bff;font-weight:700}@keyframes svelte-z0rh71-blink-animation{0%{filter:brightness(1)}50%{filter:brightness(2);background-color:#004779}to{filter:brightness(1)}}.outdated.svelte-z0rh71 strong:where(.svelte-z0rh71){color:red!important}.geometa-map-label-container.svelte-1mmcvqu{background-color:#0003;color:#fff;text-align:center;z-index:999999;position:absolute;bottom:4px;right:4px;box-sizing:border-box;border-radius:8px;padding:8px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;align-items:center;gap:8px;text-shadow:0 0 10px rgba(255,255,255,.1)}p.svelte-1mmcvqu{font-size:14px;font-weight:700}button.svelte-1mmcvqu{padding:6px 12px;font-size:12px;color:#fff;background-color:#4caf50;border:none;border-radius:4px;cursor:pointer}.toast-notification.svelte-1rq8lsd{z-index:10001;min-width:250px;max-width:400px;padding:14px 22px;border-radius:8px;box-shadow:0 5px 15px #0003;color:#fff;display:flex;align-items:center;justify-content:space-between;font-size:.95em;line-height:1.4}.toast-success.svelte-1rq8lsd{background-color:#28a745;border-left:5px solid #1e7e34}.toast-error.svelte-1rq8lsd{background-color:#dc3545;border-left:5px solid #b02a37}.toast-info.svelte-1rq8lsd{background-color:#17a2b8;border-left:5px solid #117a8b}.toast-warning.svelte-1rq8lsd{background-color:#ffc107;color:#212529;border-left:5px solid #d39e00}.toast-message.svelte-1rq8lsd{flex-grow:1;margin-right:10px}.toast-close-button.svelte-1rq8lsd{background:transparent;border:none;color:inherit;font-size:1.6em;font-weight:700;margin-left:10px;cursor:pointer;padding:0;line-height:1;opacity:.7;transition:opacity .2s ease}.toast-close-button.svelte-1rq8lsd:hover{opacity:1}.custom-yellow-button.svelte-17or0cf{background:linear-gradient(180deg,#ffeb99,#f5c542);border:1px solid #e0b000;color:#002147;border-radius:3.75rem;box-shadow:0 2px 4px #00000026,inset 0 1px #fff6;cursor:pointer;transition:background .2s ease-in-out,transform .1s ease,box-shadow .2s ease-in-out}.custom-yellow-button.svelte-17or0cf:hover:not(:where(.svelte-17or0cf):disabled){background:linear-gradient(180deg,#ffe066,#eab308);box-shadow:0 4px 8px #0003,inset 0 1px #ffffff80;transform:translateY(-1px)}.custom-yellow-button.svelte-17or0cf:active:not(:where(.svelte-17or0cf):disabled){background:linear-gradient(180deg,#eab308,#d39e00);box-shadow:0 2px 4px #0003 inset;transform:translateY(1px)}.custom-yellow-button.svelte-17or0cf:focus{outline:none;box-shadow:0 0 0 3px #eab30880,0 2px 4px #00000026}.custom-yellow-button.svelte-17or0cf:disabled{background:#e0e0e0;border-color:#bbb;color:#888;box-shadow:none;cursor:not-allowed;transform:none}.modal-overlay.svelte-17or0cf{position:fixed;top:0;left:0;width:100%;height:100%;background-color:#0009;display:flex;justify-content:center;align-items:center;z-index:10000}.modal-content.svelte-17or0cf{background-color:#fff;padding:25px 30px;border-radius:8px;box-shadow:0 5px 15px #0000004d;width:90%;max-width:450px;color:#333}.modal-content.svelte-17or0cf h2:where(.svelte-17or0cf){margin-top:0;margin-bottom:15px;color:#2c3e50}.modal-content.svelte-17or0cf p:where(.svelte-17or0cf){margin-bottom:15px;line-height:1.6}.modal-content.svelte-17or0cf p:where(.svelte-17or0cf) a:where(.svelte-17or0cf){color:#007bff;text-decoration:underline}.modal-content.svelte-17or0cf p:where(.svelte-17or0cf) a:where(.svelte-17or0cf):hover{color:#0056b3}.modal-input.svelte-17or0cf{width:calc(100% - 20px);padding:10px;margin-bottom:20px;border:1px solid #ccc;border-radius:4px;font-size:1em}.modal-actions.svelte-17or0cf{display:flex;justify-content:flex-end;gap:10px}.modal-button.svelte-17or0cf{padding:10px 18px;border:none;border-radius:4px;cursor:pointer;font-weight:700;transition:background-color .2s ease}.modal-button-save.svelte-17or0cf{background-color:#28a745;color:#fff}.modal-button-save.svelte-17or0cf:hover{background-color:#218838}.modal-button-cancel.svelte-17or0cf{background-color:#6c757d;color:#fff}.modal-button-cancel.svelte-17or0cf:hover{background-color:#5a6268}.modal-note.svelte-17or0cf{font-size:.85em;color:#555;margin-top:15px;text-align:center} `);

(async function () {
  'use strict';

  var _GM_getValue = /* @__PURE__ */ (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
  var _GM_info = /* @__PURE__ */ (() => typeof GM_info != "undefined" ? GM_info : void 0)();
  var _GM_registerMenuCommand = /* @__PURE__ */ (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
  var _GM_setValue = /* @__PURE__ */ (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
  var _GM_xmlhttpRequest = /* @__PURE__ */ (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
  var _unsafeWindow = /* @__PURE__ */ (() => typeof unsafeWindow != "undefined" ? unsafeWindow : void 0)();
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
  async function getMapInfo(geoguessrId, forceUpdate) {
    const localStorageMapInfoKey = `geometa:map-info:${geoguessrId}`;
    if (!forceUpdate) {
      const savedMapInfo = _unsafeWindow.localStorage.getItem(localStorageMapInfoKey);
      if (savedMapInfo) {
        const mapInfo2 = JSON.parse(savedMapInfo);
        logInfo("using saved map info", mapInfo2);
        return mapInfo2;
      }
    }
    const url = `https://learnablemeta.com/api/userscript/map/${geoguessrId}`;
    const mapInfo = await fetchMapInfo(url);
    _unsafeWindow.localStorage.setItem(localStorageMapInfoKey, JSON.stringify(mapInfo));
    _unsafeWindow.localStorage.setItem("geometa:latest-version", mapInfo.userscriptVersion);
    return mapInfo;
  }
  function getLatestVersionInfo() {
    return _unsafeWindow.localStorage.getItem("geometa:latest-version");
  }
  function checkIfOutdated() {
    return _GM_info.script.version != getLatestVersionInfo();
  }
  function markHelpMessageAsRead() {
    _unsafeWindow.localStorage.setItem("geometa:help-message-read", "true");
  }
  function wasHelpMessageRead() {
    return _unsafeWindow.localStorage.getItem("geometa:help-message-read") == "true";
  }
  const getChallengeId = () => {
    const regexp = /.*\/live-challenge\/(.*)/;
    const matches = location.pathname.match(regexp);
    if (matches && matches.length > 1) {
      return matches[1];
    }
    return null;
  };
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
    const len = Math.floor(encoded.length / 2);
    let panoId = [];
    for (let i = 0; i < len; i++) {
      const code = parseInt(encoded.slice(i * 2, i * 2 + 2), 16);
      const char = String.fromCharCode(code);
      panoId = [...panoId, char];
    }
    return panoId.join("");
  }
  function logInfo(name, data) {
    console.log(`ALM: ${name}`, data);
  }
  function extractMapIdFromUrl(url) {
    const match = url.match(/\/maps\/([^\/]+)/);
    return match ? match[1] : null;
  }
  const DEV = false;
  var is_array = Array.isArray;
  var array_from = Array.from;
  var define_property = Object.defineProperty;
  var get_descriptor = Object.getOwnPropertyDescriptor;
  var get_descriptors = Object.getOwnPropertyDescriptors;
  var object_prototype = Object.prototype;
  var array_prototype = Array.prototype;
  var get_prototype_of = Object.getPrototypeOf;
  function is_function(thing) {
    return typeof thing === "function";
  }
  const noop = () => {
  };
  function is_promise(value) {
    return typeof (value == null ? void 0 : value.then) === "function";
  }
  function run(fn) {
    return fn();
  }
  function run_all(arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i]();
    }
  }
  const DERIVED = 1 << 1;
  const EFFECT = 1 << 2;
  const RENDER_EFFECT = 1 << 3;
  const BLOCK_EFFECT = 1 << 4;
  const BRANCH_EFFECT = 1 << 5;
  const ROOT_EFFECT = 1 << 6;
  const UNOWNED = 1 << 7;
  const DISCONNECTED = 1 << 8;
  const CLEAN = 1 << 9;
  const DIRTY = 1 << 10;
  const MAYBE_DIRTY = 1 << 11;
  const INERT = 1 << 12;
  const DESTROYED = 1 << 13;
  const EFFECT_RAN = 1 << 14;
  const EFFECT_TRANSPARENT = 1 << 15;
  const LEGACY_DERIVED_PROP = 1 << 16;
  const HEAD_EFFECT = 1 << 18;
  const EFFECT_HAS_DERIVED = 1 << 19;
  const STATE_SYMBOL = Symbol("$state");
  const LOADING_ATTR_SYMBOL = Symbol("");
  function equals(value) {
    return value === this.v;
  }
  function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
  }
  function safe_equals(value) {
    return !safe_not_equal(value, this.v);
  }
  function effect_in_teardown(rune) {
    {
      throw new Error("effect_in_teardown");
    }
  }
  function effect_in_unowned_derived() {
    {
      throw new Error("effect_in_unowned_derived");
    }
  }
  function effect_orphan(rune) {
    {
      throw new Error("effect_orphan");
    }
  }
  function effect_update_depth_exceeded() {
    {
      throw new Error("effect_update_depth_exceeded");
    }
  }
  function props_invalid_value(key) {
    {
      throw new Error("props_invalid_value");
    }
  }
  function state_descriptors_fixed() {
    {
      throw new Error("state_descriptors_fixed");
    }
  }
  function state_prototype_fixed() {
    {
      throw new Error("state_prototype_fixed");
    }
  }
  function state_unsafe_local_read() {
    {
      throw new Error("state_unsafe_local_read");
    }
  }
  function state_unsafe_mutation() {
    {
      throw new Error("state_unsafe_mutation");
    }
  }
  function source(v) {
    return {
      f: 0,
      // TODO ideally we could skip this altogether, but it causes type errors
      v,
      reactions: null,
      equals,
      version: 0
    };
  }
  function state(v) {
    return /* @__PURE__ */ push_derived_source(source(v));
  }
  // @__NO_SIDE_EFFECTS__
  function mutable_source(initial_value, immutable = false) {
    var _a;
    const s = source(initial_value);
    if (!immutable) {
      s.equals = safe_equals;
    }
    if (component_context !== null && component_context.l !== null) {
      ((_a = component_context.l).s ?? (_a.s = [])).push(s);
    }
    return s;
  }
  function mutable_state(v, immutable = false) {
    return /* @__PURE__ */ push_derived_source(/* @__PURE__ */ mutable_source(v, immutable));
  }
  // @__NO_SIDE_EFFECTS__
  function push_derived_source(source2) {
    if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0) {
      if (derived_sources === null) {
        set_derived_sources([source2]);
      } else {
        derived_sources.push(source2);
      }
    }
    return source2;
  }
  function set(source2, value) {
    if (active_reaction !== null && is_runes() && (active_reaction.f & (DERIVED | BLOCK_EFFECT)) !== 0 && // If the source was created locally within the current derived, then
    // we allow the mutation.
    (derived_sources === null || !derived_sources.includes(source2))) {
      state_unsafe_mutation();
    }
    return internal_set(source2, value);
  }
  function internal_set(source2, value) {
    if (!source2.equals(value)) {
      source2.v = value;
      source2.version = increment_version();
      mark_reactions(source2, DIRTY);
      if (is_runes() && active_effect !== null && (active_effect.f & CLEAN) !== 0 && (active_effect.f & BRANCH_EFFECT) === 0) {
        if (new_deps !== null && new_deps.includes(source2)) {
          set_signal_status(active_effect, DIRTY);
          schedule_effect(active_effect);
        } else {
          if (untracked_writes === null) {
            set_untracked_writes([source2]);
          } else {
            untracked_writes.push(source2);
          }
        }
      }
    }
    return value;
  }
  function mark_reactions(signal, status) {
    var reactions = signal.reactions;
    if (reactions === null) return;
    var runes = is_runes();
    var length = reactions.length;
    for (var i = 0; i < length; i++) {
      var reaction = reactions[i];
      var flags = reaction.f;
      if ((flags & DIRTY) !== 0) continue;
      if (!runes && reaction === active_effect) continue;
      set_signal_status(reaction, status);
      if ((flags & (CLEAN | UNOWNED)) !== 0) {
        if ((flags & DERIVED) !== 0) {
          mark_reactions(
            /** @type {Derived} */
            reaction,
            MAYBE_DIRTY
          );
        } else {
          schedule_effect(
            /** @type {Effect} */
            reaction
          );
        }
      }
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
  let hydrating = false;
  function proxy(value, parent = null, prev2) {
    if (typeof value !== "object" || value === null || STATE_SYMBOL in value) {
      return value;
    }
    const prototype = get_prototype_of(value);
    if (prototype !== object_prototype && prototype !== array_prototype) {
      return value;
    }
    var sources = /* @__PURE__ */ new Map();
    var is_proxied_array = is_array(value);
    var version = source(0);
    if (is_proxied_array) {
      sources.set("length", source(
        /** @type {any[]} */
        value.length
      ));
    }
    var metadata;
    return new Proxy(
      /** @type {any} */
      value,
      {
        defineProperty(_, prop2, descriptor) {
          if (!("value" in descriptor) || descriptor.configurable === false || descriptor.enumerable === false || descriptor.writable === false) {
            state_descriptors_fixed();
          }
          var s = sources.get(prop2);
          if (s === void 0) {
            s = source(descriptor.value);
            sources.set(prop2, s);
          } else {
            set(s, proxy(descriptor.value, metadata));
          }
          return true;
        },
        deleteProperty(target, prop2) {
          var s = sources.get(prop2);
          if (s === void 0) {
            if (prop2 in target) {
              sources.set(prop2, source(UNINITIALIZED));
            }
          } else {
            if (is_proxied_array && typeof prop2 === "string") {
              var ls = (
                /** @type {Source<number>} */
                sources.get("length")
              );
              var n = Number(prop2);
              if (Number.isInteger(n) && n < ls.v) {
                set(ls, n);
              }
            }
            set(s, UNINITIALIZED);
            update_version(version);
          }
          return true;
        },
        get(target, prop2, receiver) {
          var _a;
          if (prop2 === STATE_SYMBOL) {
            return value;
          }
          var s = sources.get(prop2);
          var exists = prop2 in target;
          if (s === void 0 && (!exists || ((_a = get_descriptor(target, prop2)) == null ? void 0 : _a.writable))) {
            s = source(proxy(exists ? target[prop2] : UNINITIALIZED, metadata));
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
            var value2 = source2 == null ? void 0 : source2.v;
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
          var _a;
          if (prop2 === STATE_SYMBOL) {
            return true;
          }
          var s = sources.get(prop2);
          var has = s !== void 0 && s.v !== UNINITIALIZED || Reflect.has(target, prop2);
          if (s !== void 0 || active_effect !== null && (!has || ((_a = get_descriptor(target, prop2)) == null ? void 0 : _a.writable))) {
            if (s === void 0) {
              s = source(has ? proxy(target[prop2], metadata) : UNINITIALIZED);
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
          var _a;
          var s = sources.get(prop2);
          var has = prop2 in target;
          if (is_proxied_array && prop2 === "length") {
            for (var i = value2; i < /** @type {Source<number>} */
            s.v; i += 1) {
              var other_s = sources.get(i + "");
              if (other_s !== void 0) {
                set(other_s, UNINITIALIZED);
              } else if (i in target) {
                other_s = source(UNINITIALIZED);
                sources.set(i + "", other_s);
              }
            }
          }
          if (s === void 0) {
            if (!has || ((_a = get_descriptor(target, prop2)) == null ? void 0 : _a.writable)) {
              s = source(void 0);
              set(s, proxy(value2, metadata));
              sources.set(prop2, s);
            }
          } else {
            has = s.v !== UNINITIALIZED;
            set(s, proxy(value2, metadata));
          }
          var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
          if (descriptor == null ? void 0 : descriptor.set) {
            descriptor.set.call(receiver, value2);
          }
          if (!has) {
            if (is_proxied_array && typeof prop2 === "string") {
              var ls = (
                /** @type {Source<number>} */
                sources.get("length")
              );
              var n = Number(prop2);
              if (Number.isInteger(n) && n >= ls.v) {
                set(ls, n + 1);
              }
            }
            update_version(version);
          }
          return true;
        },
        ownKeys(target) {
          get(version);
          var own_keys = Reflect.ownKeys(target).filter((key2) => {
            var source3 = sources.get(key2);
            return source3 === void 0 || source3.v !== UNINITIALIZED;
          });
          for (var [key, source2] of sources) {
            if (source2.v !== UNINITIALIZED && !(key in target)) {
              own_keys.push(key);
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
  function update_version(signal, d = 1) {
    set(signal, signal.v + d);
  }
  var $window;
  var first_child_getter;
  var next_sibling_getter;
  function init_operations() {
    if ($window !== void 0) {
      return;
    }
    $window = window;
    var element_prototype = Element.prototype;
    var node_prototype = Node.prototype;
    first_child_getter = get_descriptor(node_prototype, "firstChild").get;
    next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
    element_prototype.__click = void 0;
    element_prototype.__className = "";
    element_prototype.__attributes = null;
    element_prototype.__styles = null;
    element_prototype.__e = void 0;
    Text.prototype.__t = void 0;
  }
  function create_text(value = "") {
    return document.createTextNode(value);
  }
  // @__NO_SIDE_EFFECTS__
  function get_first_child(node) {
    return first_child_getter.call(node);
  }
  // @__NO_SIDE_EFFECTS__
  function get_next_sibling(node) {
    return next_sibling_getter.call(node);
  }
  function child(node, is_text) {
    {
      return /* @__PURE__ */ get_first_child(node);
    }
  }
  function first_child(fragment, is_text) {
    {
      var first = (
        /** @type {DocumentFragment} */
        /* @__PURE__ */ get_first_child(
          /** @type {Node} */
          fragment
        )
      );
      if (first instanceof Comment && first.data === "") return /* @__PURE__ */ get_next_sibling(first);
      return first;
    }
  }
  function sibling(node, count = 1, is_text = false) {
    let next_sibling = node;
    while (count--) {
      next_sibling = /** @type {TemplateNode} */
      /* @__PURE__ */ get_next_sibling(next_sibling);
    }
    {
      return next_sibling;
    }
  }
  function clear_text_content(node) {
    node.textContent = "";
  }
  // @__NO_SIDE_EFFECTS__
  function derived(fn) {
    var flags = DERIVED | DIRTY;
    if (active_effect === null) {
      flags |= UNOWNED;
    } else {
      active_effect.f |= EFFECT_HAS_DERIVED;
    }
    const signal = {
      children: null,
      ctx: component_context,
      deps: null,
      equals,
      f: flags,
      fn,
      reactions: null,
      v: (
        /** @type {V} */
        null
      ),
      version: 0,
      parent: active_effect
    };
    if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0) {
      var derived2 = (
        /** @type {Derived} */
        active_reaction
      );
      (derived2.children ?? (derived2.children = [])).push(signal);
    }
    return signal;
  }
  // @__NO_SIDE_EFFECTS__
  function derived_safe_equal(fn) {
    const signal = /* @__PURE__ */ derived(fn);
    signal.equals = safe_equals;
    return signal;
  }
  function destroy_derived_children(derived2) {
    var children = derived2.children;
    if (children !== null) {
      derived2.children = null;
      for (var i = 0; i < children.length; i += 1) {
        var child2 = children[i];
        if ((child2.f & DERIVED) !== 0) {
          destroy_derived(
            /** @type {Derived} */
            child2
          );
        } else {
          destroy_effect(
            /** @type {Effect} */
            child2
          );
        }
      }
    }
  }
  function execute_derived(derived2) {
    var value;
    var prev_active_effect = active_effect;
    set_active_effect(derived2.parent);
    {
      try {
        destroy_derived_children(derived2);
        value = update_reaction(derived2);
      } finally {
        set_active_effect(prev_active_effect);
      }
    }
    return value;
  }
  function update_derived(derived2) {
    var value = execute_derived(derived2);
    var status = (skip_reaction || (derived2.f & UNOWNED) !== 0) && derived2.deps !== null ? MAYBE_DIRTY : CLEAN;
    set_signal_status(derived2, status);
    if (!derived2.equals(value)) {
      derived2.v = value;
      derived2.version = increment_version();
    }
  }
  function destroy_derived(signal) {
    destroy_derived_children(signal);
    remove_reactions(signal, 0);
    set_signal_status(signal, DESTROYED);
    signal.v = signal.children = signal.deps = signal.ctx = signal.reactions = null;
  }
  function validate_effect(rune) {
    if (active_effect === null && active_reaction === null) {
      effect_orphan();
    }
    if (active_reaction !== null && (active_reaction.f & UNOWNED) !== 0) {
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
    var is_root = (type & ROOT_EFFECT) !== 0;
    var parent_effect = active_effect;
    var effect2 = {
      ctx: component_context,
      deps: null,
      deriveds: null,
      nodes_start: null,
      nodes_end: null,
      f: type | DIRTY,
      first: null,
      fn,
      last: null,
      next: null,
      parent: is_root ? null : parent_effect,
      prev: null,
      teardown: null,
      transitions: null,
      version: 0
    };
    if (sync) {
      var previously_flushing_effect = is_flushing_effect;
      try {
        set_is_flushing_effect(true);
        update_effect(effect2);
        effect2.f |= EFFECT_RAN;
      } catch (e) {
        destroy_effect(effect2);
        throw e;
      } finally {
        set_is_flushing_effect(previously_flushing_effect);
      }
    } else if (fn !== null) {
      schedule_effect(effect2);
    }
    var inert = sync && effect2.deps === null && effect2.first === null && effect2.nodes_start === null && effect2.teardown === null && (effect2.f & EFFECT_HAS_DERIVED) === 0;
    if (!inert && !is_root && push2) {
      if (parent_effect !== null) {
        push_effect(effect2, parent_effect);
      }
      if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0) {
        var derived2 = (
          /** @type {Derived} */
          active_reaction
        );
        (derived2.children ?? (derived2.children = [])).push(effect2);
      }
    }
    return effect2;
  }
  function teardown(fn) {
    const effect2 = create_effect(RENDER_EFFECT, null, false);
    set_signal_status(effect2, CLEAN);
    effect2.teardown = fn;
    return effect2;
  }
  function user_effect(fn) {
    validate_effect();
    var defer = active_effect !== null && (active_effect.f & BRANCH_EFFECT) !== 0 && component_context !== null && !component_context.m;
    if (defer) {
      var context = (
        /** @type {ComponentContext} */
        component_context
      );
      (context.e ?? (context.e = [])).push({
        fn,
        effect: active_effect,
        reaction: active_reaction
      });
    } else {
      var signal = effect(fn);
      return signal;
    }
  }
  function user_pre_effect(fn) {
    validate_effect();
    return render_effect(fn);
  }
  function effect_root(fn) {
    const effect2 = create_effect(ROOT_EFFECT, fn, true);
    return () => {
      destroy_effect(effect2);
    };
  }
  function effect(fn) {
    return create_effect(EFFECT, fn, false);
  }
  function render_effect(fn) {
    return create_effect(RENDER_EFFECT, fn, true);
  }
  function template_effect(fn) {
    return block(fn);
  }
  function block(fn, flags = 0) {
    return create_effect(RENDER_EFFECT | BLOCK_EFFECT | flags, fn, true);
  }
  function branch(fn, push2 = true) {
    return create_effect(RENDER_EFFECT | BRANCH_EFFECT, fn, true, push2);
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
  function destroy_effect_deriveds(signal) {
    var deriveds = signal.deriveds;
    if (deriveds !== null) {
      signal.deriveds = null;
      for (var i = 0; i < deriveds.length; i += 1) {
        destroy_derived(deriveds[i]);
      }
    }
  }
  function destroy_effect_children(signal, remove_dom = false) {
    var effect2 = signal.first;
    signal.first = signal.last = null;
    while (effect2 !== null) {
      var next2 = effect2.next;
      destroy_effect(effect2, remove_dom);
      effect2 = next2;
    }
  }
  function destroy_block_effect_children(signal) {
    var effect2 = signal.first;
    while (effect2 !== null) {
      var next2 = effect2.next;
      if ((effect2.f & BRANCH_EFFECT) === 0) {
        destroy_effect(effect2);
      }
      effect2 = next2;
    }
  }
  function destroy_effect(effect2, remove_dom = true) {
    var removed = false;
    if ((remove_dom || (effect2.f & HEAD_EFFECT) !== 0) && effect2.nodes_start !== null) {
      var node = effect2.nodes_start;
      var end = effect2.nodes_end;
      while (node !== null) {
        var next2 = node === end ? null : (
          /** @type {TemplateNode} */
          /* @__PURE__ */ get_next_sibling(node)
        );
        node.remove();
        node = next2;
      }
      removed = true;
    }
    destroy_effect_deriveds(effect2);
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
    effect2.next = effect2.prev = effect2.teardown = effect2.ctx = effect2.deps = effect2.parent = effect2.fn = effect2.nodes_start = effect2.nodes_end = null;
  }
  function unlink_effect(effect2) {
    var parent = effect2.parent;
    var prev2 = effect2.prev;
    var next2 = effect2.next;
    if (prev2 !== null) prev2.next = next2;
    if (next2 !== null) next2.prev = prev2;
    if (parent !== null) {
      if (parent.first === effect2) parent.first = next2;
      if (parent.last === effect2) parent.last = prev2;
    }
  }
  function pause_effect(effect2, callback) {
    var transitions = [];
    pause_children(effect2, transitions, true);
    run_out_transitions(transitions, () => {
      destroy_effect(effect2);
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
      var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
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
    if (check_dirtiness(effect2)) {
      update_effect(effect2);
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
  let is_micro_task_queued$1 = false;
  let current_queued_micro_tasks = [];
  function process_micro_tasks() {
    is_micro_task_queued$1 = false;
    const tasks = current_queued_micro_tasks.slice();
    current_queued_micro_tasks = [];
    run_all(tasks);
  }
  function queue_micro_task(fn) {
    if (!is_micro_task_queued$1) {
      is_micro_task_queued$1 = true;
      queueMicrotask(process_micro_tasks);
    }
    current_queued_micro_tasks.push(fn);
  }
  function flush_tasks() {
    if (is_micro_task_queued$1) {
      process_micro_tasks();
    }
  }
  function lifecycle_outside_component(name) {
    {
      throw new Error("lifecycle_outside_component");
    }
  }
  const FLUSH_MICROTASK = 0;
  const FLUSH_SYNC = 1;
  let scheduler_mode = FLUSH_MICROTASK;
  let is_micro_task_queued = false;
  let is_flushing_effect = false;
  let is_destroying_effect = false;
  function set_is_flushing_effect(value) {
    is_flushing_effect = value;
  }
  function set_is_destroying_effect(value) {
    is_destroying_effect = value;
  }
  let queued_root_effects = [];
  let flush_count = 0;
  let active_reaction = null;
  function set_active_reaction(reaction) {
    active_reaction = reaction;
  }
  let active_effect = null;
  function set_active_effect(effect2) {
    active_effect = effect2;
  }
  let derived_sources = null;
  function set_derived_sources(sources) {
    derived_sources = sources;
  }
  let new_deps = null;
  let skipped_deps = 0;
  let untracked_writes = null;
  function set_untracked_writes(value) {
    untracked_writes = value;
  }
  let current_version = 0;
  let skip_reaction = false;
  let component_context = null;
  function set_component_context(context) {
    component_context = context;
  }
  function increment_version() {
    return ++current_version;
  }
  function is_runes() {
    return component_context !== null && component_context.l === null;
  }
  function check_dirtiness(reaction) {
    var _a, _b;
    var flags = reaction.f;
    if ((flags & DIRTY) !== 0) {
      return true;
    }
    if ((flags & MAYBE_DIRTY) !== 0) {
      var dependencies = reaction.deps;
      var is_unowned = (flags & UNOWNED) !== 0;
      if (dependencies !== null) {
        var i;
        if ((flags & DISCONNECTED) !== 0) {
          for (i = 0; i < dependencies.length; i++) {
            ((_a = dependencies[i]).reactions ?? (_a.reactions = [])).push(reaction);
          }
          reaction.f ^= DISCONNECTED;
        }
        for (i = 0; i < dependencies.length; i++) {
          var dependency = dependencies[i];
          if (check_dirtiness(
            /** @type {Derived} */
            dependency
          )) {
            update_derived(
              /** @type {Derived} */
              dependency
            );
          }
          if (is_unowned && active_effect !== null && !skip_reaction && !((_b = dependency == null ? void 0 : dependency.reactions) == null ? void 0 : _b.includes(reaction))) {
            (dependency.reactions ?? (dependency.reactions = [])).push(reaction);
          }
          if (dependency.version > reaction.version) {
            return true;
          }
        }
      }
      if (!is_unowned) {
        set_signal_status(reaction, CLEAN);
      }
    }
    return false;
  }
  function handle_error(error, effect2, component_context2) {
    {
      throw error;
    }
  }
  function update_reaction(reaction) {
    var _a;
    var previous_deps = new_deps;
    var previous_skipped_deps = skipped_deps;
    var previous_untracked_writes = untracked_writes;
    var previous_reaction = active_reaction;
    var previous_skip_reaction = skip_reaction;
    var prev_derived_sources = derived_sources;
    var previous_component_context = component_context;
    var flags = reaction.f;
    new_deps = /** @type {null | Value[]} */
    null;
    skipped_deps = 0;
    untracked_writes = null;
    active_reaction = (flags & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
    skip_reaction = !is_flushing_effect && (flags & UNOWNED) !== 0;
    derived_sources = null;
    component_context = reaction.ctx;
    try {
      var result = (
        /** @type {Function} */
        (0, reaction.fn)()
      );
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
        if (!skip_reaction) {
          for (i = skipped_deps; i < deps.length; i++) {
            ((_a = deps[i]).reactions ?? (_a.reactions = [])).push(reaction);
          }
        }
      } else if (deps !== null && skipped_deps < deps.length) {
        remove_reactions(reaction, skipped_deps);
        deps.length = skipped_deps;
      }
      return result;
    } finally {
      new_deps = previous_deps;
      skipped_deps = previous_skipped_deps;
      untracked_writes = previous_untracked_writes;
      active_reaction = previous_reaction;
      skip_reaction = previous_skip_reaction;
      derived_sources = prev_derived_sources;
      component_context = previous_component_context;
    }
  }
  function remove_reaction(signal, dependency) {
    let reactions = dependency.reactions;
    if (reactions !== null) {
      var index2 = reactions.indexOf(signal);
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
    if (reactions === null && (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
    // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
    // allows us to skip the expensive work of disconnecting and immediately reconnecting it
    (new_deps === null || !new_deps.includes(dependency))) {
      set_signal_status(dependency, MAYBE_DIRTY);
      if ((dependency.f & (UNOWNED | DISCONNECTED)) === 0) {
        dependency.f ^= DISCONNECTED;
      }
      remove_reactions(
        /** @type {Derived} **/
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
    var flags = effect2.f;
    if ((flags & DESTROYED) !== 0) {
      return;
    }
    set_signal_status(effect2, CLEAN);
    var previous_effect = active_effect;
    active_effect = effect2;
    try {
      destroy_effect_deriveds(effect2);
      if ((flags & BLOCK_EFFECT) !== 0) {
        destroy_block_effect_children(effect2);
      } else {
        destroy_effect_children(effect2);
      }
      execute_effect_teardown(effect2);
      var teardown2 = update_reaction(effect2);
      effect2.teardown = typeof teardown2 === "function" ? teardown2 : null;
      effect2.version = current_version;
      if (DEV) ;
    } catch (error) {
      handle_error(
        /** @type {Error} */
        error
      );
    } finally {
      active_effect = previous_effect;
    }
  }
  function infinite_loop_guard() {
    if (flush_count > 1e3) {
      flush_count = 0;
      {
        effect_update_depth_exceeded();
      }
    }
    flush_count++;
  }
  function flush_queued_root_effects(root_effects) {
    var length = root_effects.length;
    if (length === 0) {
      return;
    }
    infinite_loop_guard();
    var previously_flushing_effect = is_flushing_effect;
    is_flushing_effect = true;
    try {
      for (var i = 0; i < length; i++) {
        var effect2 = root_effects[i];
        if ((effect2.f & CLEAN) === 0) {
          effect2.f ^= CLEAN;
        }
        var collected_effects = [];
        process_effects(effect2, collected_effects);
        flush_queued_effects(collected_effects);
      }
    } finally {
      is_flushing_effect = previously_flushing_effect;
    }
  }
  function flush_queued_effects(effects) {
    var length = effects.length;
    if (length === 0) return;
    for (var i = 0; i < length; i++) {
      var effect2 = effects[i];
      if ((effect2.f & (DESTROYED | INERT)) === 0 && check_dirtiness(effect2)) {
        update_effect(effect2);
        if (effect2.deps === null && effect2.first === null && effect2.nodes_start === null) {
          if (effect2.teardown === null) {
            unlink_effect(effect2);
          } else {
            effect2.fn = null;
          }
        }
      }
    }
  }
  function process_deferred() {
    is_micro_task_queued = false;
    if (flush_count > 1001) {
      return;
    }
    const previous_queued_root_effects = queued_root_effects;
    queued_root_effects = [];
    flush_queued_root_effects(previous_queued_root_effects);
    if (!is_micro_task_queued) {
      flush_count = 0;
    }
  }
  function schedule_effect(signal) {
    if (scheduler_mode === FLUSH_MICROTASK) {
      if (!is_micro_task_queued) {
        is_micro_task_queued = true;
        queueMicrotask(process_deferred);
      }
    }
    var effect2 = signal;
    while (effect2.parent !== null) {
      effect2 = effect2.parent;
      var flags = effect2.f;
      if ((flags & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
        if ((flags & CLEAN) === 0) return;
        effect2.f ^= CLEAN;
      }
    }
    queued_root_effects.push(effect2);
  }
  function process_effects(effect2, collected_effects) {
    var current_effect = effect2.first;
    var effects = [];
    main_loop: while (current_effect !== null) {
      var flags = current_effect.f;
      var is_branch = (flags & BRANCH_EFFECT) !== 0;
      var is_skippable_branch = is_branch && (flags & CLEAN) !== 0;
      if (!is_skippable_branch && (flags & INERT) === 0) {
        if ((flags & RENDER_EFFECT) !== 0) {
          if (is_branch) {
            current_effect.f ^= CLEAN;
          } else if (check_dirtiness(current_effect)) {
            update_effect(current_effect);
          }
          var child2 = current_effect.first;
          if (child2 !== null) {
            current_effect = child2;
            continue;
          }
        } else if ((flags & EFFECT) !== 0) {
          effects.push(current_effect);
        }
      }
      var sibling2 = current_effect.next;
      if (sibling2 === null) {
        let parent = current_effect.parent;
        while (parent !== null) {
          if (effect2 === parent) {
            break main_loop;
          }
          var parent_sibling = parent.next;
          if (parent_sibling !== null) {
            current_effect = parent_sibling;
            continue main_loop;
          }
          parent = parent.parent;
        }
      }
      current_effect = sibling2;
    }
    for (var i = 0; i < effects.length; i++) {
      child2 = effects[i];
      collected_effects.push(child2);
      process_effects(child2, collected_effects);
    }
  }
  function flush_sync(fn) {
    var previous_scheduler_mode = scheduler_mode;
    var previous_queued_root_effects = queued_root_effects;
    try {
      infinite_loop_guard();
      const root_effects = [];
      scheduler_mode = FLUSH_SYNC;
      queued_root_effects = root_effects;
      is_micro_task_queued = false;
      flush_queued_root_effects(previous_queued_root_effects);
      var result = fn == null ? void 0 : fn();
      flush_tasks();
      if (queued_root_effects.length > 0 || root_effects.length > 0) {
        flush_sync();
      }
      flush_count = 0;
      if (DEV) ;
      return result;
    } finally {
      scheduler_mode = previous_scheduler_mode;
      queued_root_effects = previous_queued_root_effects;
    }
  }
  function get(signal) {
    var _a;
    var flags = signal.f;
    var is_derived = (flags & DERIVED) !== 0;
    if (is_derived && (flags & DESTROYED) !== 0) {
      var value = execute_derived(
        /** @type {Derived} */
        signal
      );
      destroy_derived(
        /** @type {Derived} */
        signal
      );
      return value;
    }
    if (active_reaction !== null) {
      if (derived_sources !== null && derived_sources.includes(signal)) {
        state_unsafe_local_read();
      }
      var deps = active_reaction.deps;
      if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
        skipped_deps++;
      } else if (new_deps === null) {
        new_deps = [signal];
      } else {
        new_deps.push(signal);
      }
      if (untracked_writes !== null && active_effect !== null && (active_effect.f & CLEAN) !== 0 && (active_effect.f & BRANCH_EFFECT) === 0 && untracked_writes.includes(signal)) {
        set_signal_status(active_effect, DIRTY);
        schedule_effect(active_effect);
      }
    } else if (is_derived && /** @type {Derived} */
    signal.deps === null) {
      var derived2 = (
        /** @type {Derived} */
        signal
      );
      var parent = derived2.parent;
      if (parent !== null && !((_a = parent.deriveds) == null ? void 0 : _a.includes(derived2))) {
        (parent.deriveds ?? (parent.deriveds = [])).push(derived2);
      }
    }
    if (is_derived) {
      derived2 = /** @type {Derived} */
      signal;
      if (check_dirtiness(derived2)) {
        update_derived(derived2);
      }
    }
    return signal.v;
  }
  function untrack(fn) {
    const previous_reaction = active_reaction;
    try {
      active_reaction = null;
      return fn();
    } finally {
      active_reaction = previous_reaction;
    }
  }
  const STATUS_MASK = ~(DIRTY | MAYBE_DIRTY | CLEAN);
  function set_signal_status(signal, status) {
    signal.f = signal.f & STATUS_MASK | status;
  }
  function push(props, runes = false, fn) {
    component_context = {
      p: component_context,
      c: null,
      e: null,
      m: false,
      s: props,
      x: null,
      l: null
    };
    if (!runes) {
      component_context.l = {
        s: null,
        u: null,
        r1: [],
        r2: source(false)
      };
    }
  }
  function pop(component) {
    const context_stack_item = component_context;
    if (context_stack_item !== null) {
      const component_effects = context_stack_item.e;
      if (component_effects !== null) {
        var previous_effect = active_effect;
        var previous_reaction = active_reaction;
        context_stack_item.e = null;
        try {
          for (var i = 0; i < component_effects.length; i++) {
            var component_effect = component_effects[i];
            set_active_effect(component_effect.effect);
            set_active_reaction(component_effect.reaction);
            effect(component_effect.fn);
          }
        } finally {
          set_active_effect(previous_effect);
          set_active_reaction(previous_reaction);
        }
      }
      component_context = context_stack_item.p;
      context_stack_item.m = true;
    }
    return (
      /** @type {T} */
      {}
    );
  }
  function deep_read_state(value) {
    if (typeof value !== "object" || !value || value instanceof EventTarget) {
      return;
    }
    if (STATE_SYMBOL in value) {
      deep_read(value);
    } else if (!Array.isArray(value)) {
      for (let key in value) {
        const prop2 = value[key];
        if (typeof prop2 === "object" && prop2 && STATE_SYMBOL in prop2) {
          deep_read(prop2);
        }
      }
    }
  }
  function deep_read(value, visited = /* @__PURE__ */ new Set()) {
    if (typeof value === "object" && value !== null && // We don't want to traverse DOM elements
    !(value instanceof EventTarget) && !visited.has(value)) {
      visited.add(value);
      if (value instanceof Date) {
        value.getTime();
      }
      for (let key in value) {
        try {
          deep_read(value[key], visited);
        } catch (e) {
        }
      }
      const proto = get_prototype_of(value);
      if (proto !== Object.prototype && proto !== Array.prototype && proto !== Map.prototype && proto !== Set.prototype && proto !== Date.prototype) {
        const descriptors = get_descriptors(proto);
        for (let key in descriptors) {
          const get2 = descriptors[key].get;
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
  const all_registered_events = /* @__PURE__ */ new Set();
  const root_event_handles = /* @__PURE__ */ new Set();
  function create_event(event_name, dom, handler, options) {
    function target_handler(event2) {
      if (!options.capture) {
        handle_event_propagation.call(dom, event2);
      }
      if (!event2.cancelBubble) {
        var previous_reaction = active_reaction;
        var previous_effect = active_effect;
        set_active_reaction(null);
        set_active_effect(null);
        try {
          return handler.call(this, event2);
        } finally {
          set_active_reaction(previous_reaction);
          set_active_effect(previous_effect);
        }
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
  function event(event_name, dom, handler, capture, passive) {
    var options = { capture, passive };
    var target_handler = create_event(event_name, dom, handler, options);
    if (dom === document.body || dom === window || dom === document) {
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
  function handle_event_propagation(event2) {
    var _a;
    var handler_element = this;
    var owner_document = (
      /** @type {Node} */
      handler_element.ownerDocument
    );
    var event_name = event2.type;
    var path = ((_a = event2.composedPath) == null ? void 0 : _a.call(event2)) || [];
    var current_target = (
      /** @type {null | Element} */
      path[0] || event2.target
    );
    var path_idx = 0;
    var handled_at = event2.__root;
    if (handled_at) {
      var at_idx = path.indexOf(handled_at);
      if (at_idx !== -1 && (handler_element === document || handler_element === /** @type {any} */
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
    current_target = /** @type {Element} */
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
        var parent_element = current_target.assignedSlot || current_target.parentNode || /** @type {any} */
        current_target.host || null;
        try {
          var delegated = current_target["__" + event_name];
          if (delegated !== void 0 && !/** @type {any} */
          current_target.disabled) {
            if (is_array(delegated)) {
              var [fn, ...data] = delegated;
              fn.apply(current_target, [event2, ...data]);
            } else {
              delegated.call(current_target, event2);
            }
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
    elem.innerHTML = html2;
    return elem.content;
  }
  function assign_nodes(start, end) {
    var effect2 = (
      /** @type {Effect} */
      active_effect
    );
    if (effect2.nodes_start === null) {
      effect2.nodes_start = start;
      effect2.nodes_end = end;
    }
  }
  // @__NO_SIDE_EFFECTS__
  function template(content, flags) {
    var is_fragment = (flags & TEMPLATE_FRAGMENT) !== 0;
    var use_import_node = (flags & TEMPLATE_USE_IMPORT_NODE) !== 0;
    var node;
    var has_start = !content.startsWith("<!>");
    return () => {
      if (node === void 0) {
        node = create_fragment_from_html(has_start ? content : "<!>" + content);
        if (!is_fragment) node = /** @type {Node} */
        /* @__PURE__ */ get_first_child(node);
      }
      var clone = (
        /** @type {TemplateNode} */
        use_import_node ? document.importNode(node, true) : node.cloneNode(true)
      );
      if (is_fragment) {
        var start = (
          /** @type {TemplateNode} */
          /* @__PURE__ */ get_first_child(clone)
        );
        var end = (
          /** @type {TemplateNode} */
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
      /** @type {Node} */
      dom
    );
  }
  const PASSIVE_EVENTS = ["touchstart", "touchmove"];
  function is_passive_event(name) {
    return PASSIVE_EVENTS.includes(name);
  }
  let should_intro = true;
  function set_text(text, value) {
    var str = value == null ? "" : typeof value === "object" ? value + "" : value;
    if (str !== (text.__t ?? (text.__t = text.nodeValue))) {
      text.__t = str;
      text.nodeValue = str == null ? "" : str + "";
    }
  }
  function mount(component, options) {
    return _mount(component, options);
  }
  const document_listeners = /* @__PURE__ */ new Map();
  function _mount(Component, { target, anchor, props = {}, events, context, intro = true }) {
    init_operations();
    var registered_events = /* @__PURE__ */ new Set();
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
    var unmount = effect_root(() => {
      var anchor_node = anchor ?? target.appendChild(create_text());
      branch(() => {
        if (context) {
          push({});
          var ctx = (
            /** @type {ComponentContext} */
            component_context
          );
          ctx.c = context;
        }
        if (events) {
          props.$$events = events;
        }
        should_intro = intro;
        component = Component(anchor_node, props) || {};
        should_intro = true;
        if (context) {
          pop();
        }
      });
      return () => {
        var _a;
        for (var event_name of registered_events) {
          target.removeEventListener(event_name, handle_event_propagation);
          var n = (
            /** @type {number} */
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
        mounted_components.delete(component);
        if (anchor_node !== anchor) {
          (_a = anchor_node.parentNode) == null ? void 0 : _a.removeChild(anchor_node);
        }
      };
    });
    mounted_components.set(component, unmount);
    return component;
  }
  let mounted_components = /* @__PURE__ */ new WeakMap();
  const PENDING = 0;
  const THEN = 1;
  const CATCH = 2;
  function await_block(node, get_input, pending_fn, then_fn, catch_fn) {
    var anchor = node;
    var runes = is_runes();
    var active_component_context = component_context;
    var input;
    var pending_effect;
    var then_effect;
    var catch_effect;
    var input_source = (runes ? source : mutable_source)(
      /** @type {V} */
      void 0
    );
    var error_source = (runes ? source : mutable_source)(void 0);
    var resolved = false;
    function update(state2, restore) {
      resolved = true;
      if (restore) {
        set_active_effect(effect2);
        set_active_reaction(effect2);
        set_component_context(active_component_context);
      }
      if (state2 === PENDING && pending_fn) {
        if (pending_effect) resume_effect(pending_effect);
        else pending_effect = branch(() => pending_fn(anchor));
      }
      if (state2 === THEN && then_fn) {
        if (then_effect) resume_effect(then_effect);
        else then_effect = branch(() => then_fn(anchor, input_source));
      }
      if (state2 === CATCH && catch_fn) {
        if (catch_effect) resume_effect(catch_effect);
        else catch_effect = branch(() => catch_fn(anchor, error_source));
      }
      if (state2 !== PENDING && pending_effect) {
        pause_effect(pending_effect, () => pending_effect = null);
      }
      if (state2 !== THEN && then_effect) {
        pause_effect(then_effect, () => then_effect = null);
      }
      if (state2 !== CATCH && catch_effect) {
        pause_effect(catch_effect, () => catch_effect = null);
      }
      if (restore) {
        set_component_context(null);
        set_active_reaction(null);
        set_active_effect(null);
        flush_sync();
      }
    }
    var effect2 = block(() => {
      if (input === (input = get_input())) return;
      if (is_promise(input)) {
        var promise = input;
        resolved = false;
        promise.then(
          (value) => {
            if (promise !== input) return;
            internal_set(input_source, value);
            update(THEN, true);
          },
          (error) => {
            if (promise !== input) return;
            internal_set(error_source, error);
            update(CATCH, true);
            {
              throw error_source.v;
            }
          }
        );
        {
          queue_micro_task(() => {
            if (!resolved) update(PENDING, true);
          });
        }
      } else {
        internal_set(input_source, input);
        update(THEN, false);
      }
      return () => input = null;
    });
  }
  function if_block(node, get_condition, consequent_fn, alternate_fn = null, elseif = false) {
    var anchor = node;
    var consequent_effect = null;
    var alternate_effect = null;
    var condition = null;
    var flags = elseif ? EFFECT_TRANSPARENT : 0;
    block(() => {
      if (condition === (condition = !!get_condition())) return;
      if (condition) {
        if (consequent_effect) {
          resume_effect(consequent_effect);
        } else {
          consequent_effect = branch(() => consequent_fn(anchor));
        }
        if (alternate_effect) {
          pause_effect(alternate_effect, () => {
            alternate_effect = null;
          });
        }
      } else {
        if (alternate_effect) {
          resume_effect(alternate_effect);
        } else if (alternate_fn) {
          alternate_effect = branch(() => alternate_fn(anchor));
        }
        if (consequent_effect) {
          pause_effect(consequent_effect, () => {
            consequent_effect = null;
          });
        }
      }
    }, flags);
  }
  let current_each_item = null;
  function index(_, i) {
    return i;
  }
  function pause_effects(state2, items, controlled_anchor, items_map) {
    var transitions = [];
    var length = items.length;
    for (var i = 0; i < length; i++) {
      pause_children(items[i].e, transitions, true);
    }
    var is_controlled = length > 0 && transitions.length === 0 && controlled_anchor !== null;
    if (is_controlled) {
      var parent_node = (
        /** @type {Element} */
        /** @type {Element} */
        controlled_anchor.parentNode
      );
      clear_text_content(parent_node);
      parent_node.append(
        /** @type {Element} */
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
  function each(node, flags, get_collection, get_key, render_fn, fallback_fn = null) {
    var anchor = node;
    var state2 = { flags, items: /* @__PURE__ */ new Map(), first: null };
    var is_controlled = (flags & EACH_IS_CONTROLLED) !== 0;
    if (is_controlled) {
      var parent_node = (
        /** @type {Element} */
        node
      );
      anchor = parent_node.appendChild(create_text());
    }
    var fallback = null;
    var was_empty = false;
    block(() => {
      var collection = get_collection();
      var array = is_array(collection) ? collection : collection == null ? [] : array_from(collection);
      var length = array.length;
      if (was_empty && length === 0) {
        return;
      }
      was_empty = length === 0;
      {
        reconcile(array, state2, anchor, render_fn, flags, get_key);
      }
      if (fallback_fn !== null) {
        if (length === 0) {
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
      get_collection();
    });
  }
  function reconcile(array, state2, anchor, render_fn, flags, get_key) {
    var _a, _b, _c, _d;
    var is_animated = (flags & EACH_IS_ANIMATED) !== 0;
    var should_update = (flags & (EACH_ITEM_REACTIVE | EACH_INDEX_REACTIVE)) !== 0;
    var length = array.length;
    var items = state2.items;
    var first = state2.first;
    var current = first;
    var seen;
    var prev2 = null;
    var to_animate;
    var matched = [];
    var stashed = [];
    var value;
    var key;
    var item;
    var i;
    if (is_animated) {
      for (i = 0; i < length; i += 1) {
        value = array[i];
        key = get_key(value, i);
        item = items.get(key);
        if (item !== void 0) {
          (_a = item.a) == null ? void 0 : _a.measure();
          (to_animate ?? (to_animate = /* @__PURE__ */ new Set())).add(item);
        }
      }
    }
    for (i = 0; i < length; i += 1) {
      value = array[i];
      key = get_key(value, i);
      item = items.get(key);
      if (item === void 0) {
        var child_anchor = current ? (
          /** @type {TemplateNode} */
          current.e.nodes_start
        ) : anchor;
        prev2 = create_item(
          child_anchor,
          state2,
          prev2,
          prev2 === null ? state2.first : prev2.next,
          value,
          key,
          i,
          render_fn,
          flags
        );
        items.set(key, prev2);
        matched = [];
        stashed = [];
        current = prev2.next;
        continue;
      }
      if (should_update) {
        update_item(item, value, i, flags);
      }
      if ((item.e.f & INERT) !== 0) {
        resume_effect(item.e);
        if (is_animated) {
          (_b = item.a) == null ? void 0 : _b.unfix();
          (to_animate ?? (to_animate = /* @__PURE__ */ new Set())).delete(item);
        }
      }
      if (item !== current) {
        if (seen !== void 0 && seen.has(item)) {
          if (matched.length < stashed.length) {
            var start = stashed[0];
            var j;
            prev2 = start.prev;
            var a = matched[0];
            var b = matched[matched.length - 1];
            for (j = 0; j < matched.length; j += 1) {
              move(matched[j], start, anchor);
            }
            for (j = 0; j < stashed.length; j += 1) {
              seen.delete(stashed[j]);
            }
            link(state2, a.prev, b.next);
            link(state2, prev2, a);
            link(state2, b, start);
            current = start;
            prev2 = b;
            i -= 1;
            matched = [];
            stashed = [];
          } else {
            seen.delete(item);
            move(item, current, anchor);
            link(state2, item.prev, item.next);
            link(state2, item, prev2 === null ? state2.first : prev2.next);
            link(state2, prev2, item);
            prev2 = item;
          }
          continue;
        }
        matched = [];
        stashed = [];
        while (current !== null && current.k !== key) {
          if ((current.e.f & INERT) === 0) {
            (seen ?? (seen = /* @__PURE__ */ new Set())).add(current);
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
      prev2 = item;
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
        var controlled_anchor = (flags & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;
        if (is_animated) {
          for (i = 0; i < destroy_length; i += 1) {
            (_c = to_destroy[i].a) == null ? void 0 : _c.measure();
          }
          for (i = 0; i < destroy_length; i += 1) {
            (_d = to_destroy[i].a) == null ? void 0 : _d.fix();
          }
        }
        pause_effects(state2, to_destroy, controlled_anchor, items);
      }
    }
    if (is_animated) {
      queue_micro_task(() => {
        var _a2;
        if (to_animate === void 0) return;
        for (item of to_animate) {
          (_a2 = item.a) == null ? void 0 : _a2.apply();
        }
      });
    }
    active_effect.first = state2.first && state2.first.e;
    active_effect.last = prev2 && prev2.e;
  }
  function update_item(item, value, index2, type) {
    if ((type & EACH_ITEM_REACTIVE) !== 0) {
      internal_set(item.v, value);
    }
    if ((type & EACH_INDEX_REACTIVE) !== 0) {
      internal_set(
        /** @type {Value<number>} */
        item.i,
        index2
      );
    } else {
      item.i = index2;
    }
  }
  function create_item(anchor, state2, prev2, next2, value, key, index2, render_fn, flags) {
    var previous_each_item = current_each_item;
    try {
      var reactive = (flags & EACH_ITEM_REACTIVE) !== 0;
      var mutable = (flags & EACH_ITEM_IMMUTABLE) === 0;
      var v = reactive ? mutable ? /* @__PURE__ */ mutable_source(value) : source(value) : value;
      var i = (flags & EACH_INDEX_REACTIVE) === 0 ? index2 : source(index2);
      var item = {
        i,
        v,
        k: key,
        a: null,
        // @ts-expect-error
        e: null,
        prev: prev2,
        next: next2
      };
      current_each_item = item;
      item.e = branch(() => render_fn(anchor, v, i), hydrating);
      item.e.prev = prev2 && prev2.e;
      item.e.next = next2 && next2.e;
      if (prev2 === null) {
        state2.first = item;
      } else {
        prev2.next = item;
        prev2.e.next = item.e;
      }
      if (next2 !== null) {
        next2.prev = item;
        next2.e.prev = item.e;
      }
      return item;
    } finally {
      current_each_item = previous_each_item;
    }
  }
  function move(item, next2, anchor) {
    var end = item.next ? (
      /** @type {TemplateNode} */
      item.next.e.nodes_start
    ) : anchor;
    var dest = next2 ? (
      /** @type {TemplateNode} */
      next2.e.nodes_start
    ) : anchor;
    var node = (
      /** @type {TemplateNode} */
      item.e.nodes_start
    );
    while (node !== end) {
      var next_node = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ get_next_sibling(node)
      );
      dest.before(node);
      node = next_node;
    }
  }
  function link(state2, prev2, next2) {
    if (prev2 === null) {
      state2.first = next2;
    } else {
      prev2.next = next2;
      prev2.e.next = next2 && next2.e;
    }
    if (next2 !== null) {
      next2.prev = prev2;
      next2.e.prev = prev2 && prev2.e;
    }
  }
  function html(node, get_value, svg, mathml, skip_warning) {
    var anchor = node;
    var value = "";
    var effect2;
    block(() => {
      if (value === (value = get_value() ?? "")) {
        return;
      }
      if (effect2 !== void 0) {
        destroy_effect(effect2);
        effect2 = void 0;
      }
      if (value === "") return;
      effect2 = branch(() => {
        var html2 = value + "";
        var node2 = create_fragment_from_html(html2);
        assign_nodes(
          /** @type {TemplateNode} */
          /* @__PURE__ */ get_first_child(node2),
          /** @type {TemplateNode} */
          node2.lastChild
        );
        {
          anchor.before(node2);
        }
      });
    });
  }
  let listening_to_form_reset = false;
  function add_form_reset_listener() {
    if (!listening_to_form_reset) {
      listening_to_form_reset = true;
      document.addEventListener(
        "reset",
        (evt) => {
          Promise.resolve().then(() => {
            var _a;
            if (!evt.defaultPrevented) {
              for (
                const e of
                /**@type {HTMLFormElement} */
                evt.target.elements
              ) {
                (_a = e.__on_r) == null ? void 0 : _a.call(e);
              }
            }
          });
        },
        // In the capture phase to guarantee we get noticed of it (no possiblity of stopPropagation)
        { capture: true }
      );
    }
  }
  function set_attribute(element, attribute, value, skip_warning) {
    var attributes = element.__attributes ?? (element.__attributes = {});
    if (attributes[attribute] === (attributes[attribute] = value)) return;
    if (attribute === "style" && "__styles" in element) {
      element.__styles = {};
    }
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
  var setters_cache = /* @__PURE__ */ new Map();
  function get_setters(element) {
    var setters = setters_cache.get(element.nodeName);
    if (setters) return setters;
    setters_cache.set(element.nodeName, setters = []);
    var descriptors;
    var proto = get_prototype_of(element);
    var element_proto = Element.prototype;
    while (element_proto !== proto) {
      descriptors = get_descriptors(proto);
      for (var key in descriptors) {
        if (descriptors[key].set) {
          setters.push(key);
        }
      }
      proto = get_prototype_of(proto);
    }
    return setters;
  }
  function set_class(dom, value) {
    var prev_class_name = dom.__className;
    var next_class_name = to_class(value);
    if (prev_class_name !== next_class_name || hydrating) {
      if (value == null) {
        dom.removeAttribute("class");
      } else {
        dom.className = next_class_name;
      }
      dom.__className = next_class_name;
    }
  }
  function to_class(value) {
    return value == null ? "" : value;
  }
  function set_style(dom, key, value, important) {
    var styles = dom.__styles ?? (dom.__styles = {});
    if (styles[key] === value) {
      return;
    }
    styles[key] = value;
    if (value == null) {
      dom.style.removeProperty(key);
    } else {
      dom.style.setProperty(key, value, "");
    }
  }
  const request_animation_frame = requestAnimationFrame;
  const now = () => performance.now();
  const raf = {
    tick: (
      /** @param {any} _ */
      (_) => request_animation_frame(_)
    ),
    now: () => now(),
    tasks: /* @__PURE__ */ new Set()
  };
  function run_tasks(now2) {
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
    element.dispatchEvent(new CustomEvent(type));
  }
  function css_property_to_camelcase(style) {
    if (style === "float") return "cssFloat";
    if (style === "offset") return "cssOffset";
    if (style.startsWith("--")) return style;
    const parts = style.split("-");
    if (parts.length === 1) return parts[0];
    return parts[0] + parts.slice(1).map(
      /** @param {any} word */
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
  function transition(flags, element, get_fn, get_params) {
    var is_intro = (flags & TRANSITION_IN) !== 0;
    var is_outro = (flags & TRANSITION_OUT) !== 0;
    var is_both = is_intro && is_outro;
    var is_global = (flags & TRANSITION_GLOBAL) !== 0;
    var direction = is_both ? "both" : is_intro ? "in" : "out";
    var current_options;
    var inert = element.inert;
    var intro;
    var outro;
    function get_options() {
      var previous_reaction = active_reaction;
      var previous_effect = active_effect;
      set_active_reaction(null);
      set_active_effect(null);
      try {
        return current_options ?? (current_options = get_fn()(element, (get_params == null ? void 0 : get_params()) ?? /** @type {P} */
        {}, {
          direction
        }));
      } finally {
        set_active_reaction(previous_reaction);
        set_active_effect(previous_effect);
      }
    }
    var transition2 = {
      is_global,
      in() {
        var _a;
        element.inert = inert;
        if (!is_intro) {
          outro == null ? void 0 : outro.abort();
          (_a = outro == null ? void 0 : outro.reset) == null ? void 0 : _a.call(outro);
          return;
        }
        if (!is_outro) {
          intro == null ? void 0 : intro.abort();
        }
        dispatch_event(element, "introstart");
        intro = animate(element, get_options(), outro, 1, () => {
          dispatch_event(element, "introend");
          intro == null ? void 0 : intro.abort();
          intro = current_options = void 0;
        });
      },
      out(fn) {
        if (!is_outro) {
          fn == null ? void 0 : fn();
          current_options = void 0;
          return;
        }
        element.inert = true;
        dispatch_event(element, "outrostart");
        outro = animate(element, get_options(), intro, 0, () => {
          dispatch_event(element, "outroend");
          fn == null ? void 0 : fn();
        });
      },
      stop: () => {
        intro == null ? void 0 : intro.abort();
        outro == null ? void 0 : outro.abort();
      }
    };
    var e = (
      /** @type {Effect} */
      active_effect
    );
    (e.transitions ?? (e.transitions = [])).push(transition2);
    if (is_intro && should_intro) {
      var run2 = is_global;
      if (!run2) {
        var block2 = (
          /** @type {Effect | null} */
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
          a == null ? void 0 : a.abort();
        },
        deactivate: () => a.deactivate(),
        reset: () => a.reset(),
        t: () => a.t()
      };
    }
    counterpart == null ? void 0 : counterpart.deactivate();
    if (!(options == null ? void 0 : options.duration)) {
      on_finish();
      return {
        abort: noop,
        deactivate: noop,
        reset: noop,
        t: () => t2
      };
    }
    const { delay = 0, css, tick, easing = linear$1 } = options;
    var keyframes = [];
    if (is_intro && counterpart === void 0) {
      if (tick) {
        tick(0, 1);
      }
      if (css) {
        var styles = css_to_keyframe(css(0, 1));
        keyframes.push(styles, styles);
      }
    }
    var get_t = () => 1 - t2;
    var animation = element.animate(keyframes, { duration: delay });
    animation.onfinish = () => {
      var t1 = (counterpart == null ? void 0 : counterpart.t()) ?? 1 - t2;
      counterpart == null ? void 0 : counterpart.abort();
      var delta = t2 - t1;
      var duration = (
        /** @type {number} */
        options.duration * Math.abs(delta)
      );
      var keyframes2 = [];
      if (duration > 0) {
        if (css) {
          var n = Math.ceil(duration / (1e3 / 60));
          for (var i = 0; i <= n; i += 1) {
            var t = t1 + delta * easing(i / n);
            var styles2 = css(t, 1 - t);
            keyframes2.push(css_to_keyframe(styles2));
          }
        }
        get_t = () => {
          var time = (
            /** @type {number} */
            /** @type {globalThis.Animation} */
            animation.currentTime
          );
          return t1 + delta * easing(time / duration);
        };
        if (tick) {
          loop(() => {
            if (animation.playState !== "running") return false;
            var t3 = get_t();
            tick(t3, 1 - t3);
            return true;
          });
        }
      }
      animation = element.animate(keyframes2, { duration, fill: "forwards" });
      animation.onfinish = () => {
        get_t = () => t2;
        tick == null ? void 0 : tick(t2, 1 - t2);
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
          tick == null ? void 0 : tick(1, 0);
        }
      },
      t: () => get_t()
    };
  }
  function listen_to_event_and_reset_event(element, event2, handler, on_reset = handler) {
    element.addEventListener(event2, handler);
    const prev2 = element.__on_r;
    if (prev2) {
      element.__on_r = () => {
        prev2();
        on_reset();
      };
    } else {
      element.__on_r = on_reset;
    }
    add_form_reset_listener();
  }
  function bind_value(input, get2, set2 = get2) {
    var runes = is_runes();
    listen_to_event_and_reset_event(input, "input", () => {
      var value = is_numberlike_input(input) ? to_number(input.value) : input.value;
      set2(value);
      if (runes && value !== (value = get2())) {
        input.value = value ?? "";
      }
    });
    render_effect(() => {
      var value = get2();
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
  function is_numberlike_input(input) {
    var type = input.type;
    return type === "number" || type === "range";
  }
  function to_number(value) {
    return value === "" ? null : +value;
  }
  function is_bound_this(bound_value, element_or_component) {
    return bound_value === element_or_component || (bound_value == null ? void 0 : bound_value[STATE_SYMBOL]) === element_or_component;
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
      /** @type {ComponentContextLegacy} */
      component_context
    );
    const callbacks = context.l.u;
    if (!callbacks) return;
    let props = () => deep_read_state(context.s);
    if (immutable) {
      let version = 0;
      let prev2 = (
        /** @type {Record<string, any>} */
        {}
      );
      const d = /* @__PURE__ */ derived(() => {
        let changed = false;
        const props2 = context.s;
        for (const key in props2) {
          if (props2[key] !== prev2[key]) {
            prev2[key] = props2[key];
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
  function with_parent_branch(fn) {
    var effect2 = active_effect;
    var previous_effect = active_effect;
    while (effect2 !== null && (effect2.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0) {
      effect2 = effect2.parent;
    }
    try {
      set_active_effect(effect2);
      return fn();
    } finally {
      set_active_effect(previous_effect);
    }
  }
  function prop(props, key, flags, fallback) {
    var _a;
    var immutable = (flags & PROPS_IS_IMMUTABLE) !== 0;
    var runes = (flags & PROPS_IS_RUNES) !== 0;
    var bindable = (flags & PROPS_IS_BINDABLE) !== 0;
    var lazy = (flags & PROPS_IS_LAZY_INITIAL) !== 0;
    var is_store_sub = false;
    var prop_value;
    if (bindable) {
      [prop_value, is_store_sub] = capture_store_binding(() => (
        /** @type {V} */
        props[key]
      ));
    } else {
      prop_value = /** @type {V} */
      props[key];
    }
    var setter = (_a = get_descriptor(props, key)) == null ? void 0 : _a.set;
    var fallback_value = (
      /** @type {V} */
      fallback
    );
    var fallback_dirty = true;
    var fallback_used = false;
    var get_fallback = () => {
      fallback_used = true;
      if (fallback_dirty) {
        fallback_dirty = false;
        if (lazy) {
          fallback_value = untrack(
            /** @type {() => V} */
            fallback
          );
        } else {
          fallback_value = /** @type {V} */
          fallback;
        }
      }
      return fallback_value;
    };
    if (prop_value === void 0 && fallback !== void 0) {
      if (setter && runes) {
        props_invalid_value();
      }
      prop_value = get_fallback();
      if (setter) setter(prop_value);
    }
    var getter;
    if (runes) {
      getter = () => {
        var value = (
          /** @type {V} */
          props[key]
        );
        if (value === void 0) return get_fallback();
        fallback_dirty = true;
        fallback_used = false;
        return value;
      };
    } else {
      var derived_getter = with_parent_branch(
        () => (immutable ? derived : derived_safe_equal)(() => (
          /** @type {V} */
          props[key]
        ))
      );
      derived_getter.f |= LEGACY_DERIVED_PROP;
      getter = () => {
        var value = get(derived_getter);
        if (value !== void 0) fallback_value = /** @type {V} */
        void 0;
        return value === void 0 ? fallback_value : value;
      };
    }
    if ((flags & PROPS_IS_UPDATED) === 0) {
      return getter;
    }
    if (setter) {
      var legacy_parent = props.$$legacy;
      return function(value, mutation) {
        if (arguments.length > 0) {
          if (!runes || !mutation || legacy_parent || is_store_sub) {
            setter(mutation ? getter() : value);
          }
          return value;
        } else {
          return getter();
        }
      };
    }
    var from_child = false;
    var was_from_child = false;
    var inner_current_value = /* @__PURE__ */ mutable_source(prop_value);
    var current_value = with_parent_branch(
      () => /* @__PURE__ */ derived(() => {
        var parent_value = getter();
        var child_value = get(inner_current_value);
        var current_derived = (
          /** @type {Derived} */
          active_reaction
        );
        if (from_child || parent_value === void 0 && (current_derived.f & DESTROYED) !== 0) {
          from_child = false;
          was_from_child = true;
          return child_value;
        }
        was_from_child = false;
        return inner_current_value.v = parent_value;
      })
    );
    if (!immutable) current_value.equals = safe_equals;
    return function(value, mutation) {
      if (arguments.length > 0) {
        const new_value = mutation ? get(current_value) : runes && bindable ? proxy(value) : value;
        if (!current_value.equals(new_value)) {
          from_child = true;
          set(inner_current_value, new_value);
          if (fallback_used && fallback_value !== void 0) {
            fallback_value = new_value;
          }
          untrack(() => get(current_value));
        }
        return value;
      }
      return get(current_value);
    };
  }
  function onMount(fn) {
    if (component_context === null) {
      lifecycle_outside_component();
    }
    if (component_context.l !== null) {
      init_update_callbacks(component_context).m.push(fn);
    } else {
      user_effect(() => {
        const cleanup = untrack(fn);
        if (typeof cleanup === "function") return (
          /** @type {() => void} */
          cleanup
        );
      });
    }
  }
  function init_update_callbacks(context) {
    var l = (
      /** @type {ComponentContextLegacy} */
      context.l
    );
    return l.u ?? (l.u = { a: [], b: [], m: [] });
  }
  const PUBLIC_VERSION = "5";
  if (typeof window !== "undefined")
    (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add(PUBLIC_VERSION);
  var root$5 = /* @__PURE__ */ template(`<div class="loadership_ZOJAQ svelte-i1jlc0"><div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div></div>`);
  function Spinner($$anchor) {
    var div = root$5();
    append($$anchor, div);
  }
  var root_1$1 = /* @__PURE__ */ template(`<img class="fi svelte-7lhsry">`);
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
    if_block(node, () => countryCode, ($$anchor2) => {
      var img = root_1$1();
      template_effect(() => set_attribute(img, "src", `https://purecatamphetamine.github.io/country-flag-icons/3x2/${countryCode.toUpperCase() ?? ""}.svg`));
      template_effect(() => set_attribute(img, "alt", $$props.countryName));
      append($$anchor2, img);
    });
    append($$anchor, fragment);
  }
  const leftKey = "geometa:containerStyleLeft";
  const topKey = "geometa:containerStyleTop";
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  function getSavedPosition(key) {
    const value = localStorage.getItem(key);
    if (value && value.startsWith("-")) {
      return null;
    }
    return value;
  }
  function setContainerPosition(container) {
    container.style.left = getSavedPosition(leftKey) ?? container.style.left;
    container.style.top = getSavedPosition(topKey) ?? container.style.top;
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
  function saveContainerDimensions(entry) {
    const containerWidth = entry.contentRect.width;
    const containerHeight = entry.contentRect.height;
    if (containerWidth !== 0 && containerHeight !== 0) {
      _unsafeWindow.localStorage.setItem(widthKey, Math.floor(containerWidth).toString());
      _unsafeWindow.localStorage.setItem(heightKey, Math.floor(containerHeight).toString());
    }
  }
  function prev(__1, currentIndex, images) {
    set(currentIndex, (get(currentIndex) - 1 + images().length) % images().length);
  }
  function next(__2, currentIndex, images) {
    set(currentIndex, (get(currentIndex) + 1) % images().length);
  }
  function handleMouseMove(event2, containerRef, lensX, lensY) {
    if (!get(containerRef)) return;
    const rect = get(containerRef).getBoundingClientRect();
    set(lensX, event2.clientX - rect.left);
    set(lensY, event2.clientY - rect.top);
  }
  var root_4 = /* @__PURE__ */ template(`<div class="lens svelte-fofh7f"></div>`);
  var root_3$1 = /* @__PURE__ */ template(`<div class="image-wrapper svelte-fofh7f" role="img" aria-label="Zoomable image"><img class="responsive-image svelte-fofh7f"> <!></div>`);
  var root_6$1 = /* @__PURE__ */ template(`<button></button>`);
  var root_5$1 = /* @__PURE__ */ template(`<div class="controls"><button class="click-area prev-area svelte-fofh7f" type="button" aria-label="Previous image"><span class="prev svelte-fofh7f">&#10094;</span></button> <button class="click-area next-area svelte-fofh7f" type="button" aria-label="Next image"><span class="next svelte-fofh7f">&#10095;</span></button></div> <div class="indicators svelte-fofh7f"></div>`, 1);
  var root$4 = /* @__PURE__ */ template(`<div class="carousel svelte-fofh7f"><!> <!></div>`);
  function Carousel($$anchor, $$props) {
    push($$props, false);
    let images = prop($$props, "images", 24, () => []);
    let currentIndex = mutable_state(0);
    let containerRef = mutable_state(null);
    let imageRef = mutable_state(null);
    let isZoomed = mutable_state(false);
    let lensX = mutable_state(0);
    let lensY = mutable_state(0);
    let lensSize = 150;
    let scale = 2;
    function handleMouseEnter() {
      set(isZoomed, true);
    }
    function handleMouseLeave() {
      set(isZoomed, false);
    }
    init();
    var div = root$4();
    var node = child(div);
    if_block(node, () => images().length, ($$anchor2) => {
      var fragment = comment();
      var node_1 = first_child(fragment);
      each(node_1, 1, images, index, ($$anchor3, image, index2) => {
        var fragment_1 = comment();
        var node_2 = first_child(fragment_1);
        if_block(node_2, () => index2 === get(currentIndex), ($$anchor4) => {
          var div_1 = root_3$1();
          bind_this(div_1, ($$value) => set(containerRef, $$value), () => get(containerRef));
          div_1.__mousemove = [handleMouseMove, containerRef, lensX, lensY];
          var img = child(div_1);
          bind_this(img, ($$value) => set(imageRef, $$value), () => get(imageRef));
          set_attribute(img, "alt", `Image ${index2 + 1}`);
          var node_3 = sibling(img, 2);
          if_block(node_3, () => get(isZoomed) && get(imageRef), ($$anchor5) => {
            var div_2 = root_4();
            template_effect(() => set_attribute(div_2, "style", `
                /* Position the lens so the mouse is in its center */
                top: ${get(lensY) - lensSize / 2}px;
                left: ${get(lensX) - lensSize / 2}px;
                width: ${lensSize}px;
                height: ${lensSize}px;
                background-image: url(${get(image) ?? ""});
                background-repeat: no-repeat;
                background-size: ${get(imageRef).width * scale}px ${get(imageRef).height * scale}px;
                background-position: ${-(get(lensX) * scale - lensSize / 2)}px ${-(get(lensY) * scale - lensSize / 2)}px;
              `));
            append($$anchor5, div_2);
          });
          template_effect(() => set_attribute(img, "src", get(image)));
          event("mouseenter", div_1, handleMouseEnter);
          event("mouseleave", div_1, handleMouseLeave);
          append($$anchor4, div_1);
        });
        append($$anchor3, fragment_1);
      });
      append($$anchor2, fragment);
    });
    var node_4 = sibling(node, 2);
    if_block(node_4, () => images().length > 1, ($$anchor2) => {
      var fragment_2 = root_5$1();
      var div_3 = first_child(fragment_2);
      var button = child(div_3);
      button.__click = [prev, currentIndex, images];
      var button_1 = sibling(button, 2);
      button_1.__click = [next, currentIndex, images];
      var div_4 = sibling(div_3, 2);
      each(div_4, 5, images, index, ($$anchor3, _, index2) => {
        var button_2 = root_6$1();
        set_attribute(button_2, "aria-label", `Switch to image ${index2 + 1}`);
        button_2.__click = () => set(currentIndex, index2);
        template_effect(() => set_class(button_2, `indicator ${(index2 === get(currentIndex) ? "active" : "") ?? ""} svelte-fofh7f`));
        append($$anchor3, button_2);
      });
      append($$anchor2, fragment_2);
    });
    append($$anchor, div);
    pop();
  }
  delegate(["mousemove", "click"]);
  const ANNOUNCEMENT_CACHE_KEY = "geometa:cached-announcement";
  const ANNOUNCEMENT_CACHE_DURATION_MS = 60 * 60 * 1e3;
  const ANNOUNCEMENT_API_URL = "https://learnablemeta.com/api/userscript/announcement/";
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
              console.error("Failed to parse announcement JSON from API:", parseError, response.responseText);
            }
          } else {
            console.error(`Error fetching announcement from API: ${response.status} ${response.statusText}`);
          }
          const itemToCache = {
            data: announcementToCache,
            fetchedAt: Date.now()
          };
          try {
            localStorage.setItem(ANNOUNCEMENT_CACHE_KEY, JSON.stringify(itemToCache));
            console.log(announcementToCache ? "Fetched announcement cached." : "Fetched 'no announcement' state cached.");
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
  const LAST_DISMISSED_ANNOUNCEMENT_TIMESTAMP_KEY = "geometa:last-dismissed-announcement";
  function getLastDismissedAnnouncementTimestamp() {
    try {
      const storedValue = localStorage.getItem(LAST_DISMISSED_ANNOUNCEMENT_TIMESTAMP_KEY);
      if (storedValue) {
        const timestamp = parseInt(storedValue, 10);
        return !isNaN(timestamp) ? timestamp : null;
      }
      return null;
    } catch (e) {
      console.warn("LocalStorage Error: Could not retrieve last dismissed announcement timestamp.", e);
      return null;
    }
  }
  function markAnnouncementAsDismissed(announcementTimestamp) {
    if (isNaN(announcementTimestamp)) {
      console.error("Invalid timestamp provided to markAnnouncementAsDismissed. Must be a number.", announcementTimestamp);
      return;
    }
    try {
      localStorage.setItem(LAST_DISMISSED_ANNOUNCEMENT_TIMESTAMP_KEY, announcementTimestamp.toString());
    } catch (e) {
      console.warn("LocalStorage Error: Could not save last dismissed announcement timestamp.", e);
    }
  }
  function proceed(_, showModal, currentUrl) {
    set(showModal, false);
    window.open(get(currentUrl), "_blank");
  }
  function cancel(__1, showModal) {
    set(showModal, false);
  }
  function togglePopup(__2, showHelpPopup, updateHelpClass) {
    set(showHelpPopup, !get(showHelpPopup));
    if (get(showHelpPopup)) {
      markHelpMessageAsRead();
      updateHelpClass();
    }
  }
  var on_click = (__3, announcement, lastDismissedTimestamp) => {
    markAnnouncementAsDismissed(get(announcement).timestamp);
    set(lastDismissedTimestamp, proxy(get(announcement).timestamp));
  };
  var root_2 = /* @__PURE__ */ template(`<div class="announcement svelte-z0rh71"><div class="svelte-z0rh71"><!></div> <button class="vote-close-btn svelte-z0rh71" aria-label="Dismiss announcement">×</button></div>`);
  var root_3 = /* @__PURE__ */ template(`<p class="svelte-z0rh71"> </p>`);
  var root_6 = /* @__PURE__ */ template(`<p class="geometa-footer svelte-z0rh71"><!></p>`);
  var root_7 = /* @__PURE__ */ template(`<hr class="svelte-z0rh71"> <!>`, 1);
  var root_5 = /* @__PURE__ */ template(`<p class="svelte-z0rh71"><!> <strong class="svelte-z0rh71"> </strong> </p> <div class="geometa-note svelte-z0rh71"><!></div> <!> <!>`, 1);
  var root_9 = /* @__PURE__ */ template(`<div class="modal-backdrop svelte-z0rh71"><div class="modal svelte-z0rh71"><p class="svelte-z0rh71">You are about to open this site in a new tab:</p> <p class="modal-url svelte-z0rh71"> </p> <div class="modal-buttons svelte-z0rh71"><button class="proceed-btn svelte-z0rh71">Continue</button> <button class="close-btn svelte-z0rh71">Cancel</button></div></div></div>`);
  var root_11 = /* @__PURE__ */ template(`<p class="outdated svelte-z0rh71"><strong class="svelte-z0rh71"> </strong></p>`);
  var root_10 = /* @__PURE__ */ template(`<div class="modal-backdrop svelte-z0rh71"><div class="modal svelte-z0rh71"><div class="help-message svelte-z0rh71"><!> <p class="svelte-z0rh71">Welcome to LearnableMeta, we hope you are enjoying it, some quick info:</p> <ul class="svelte-z0rh71"><li class="svelte-z0rh71"><strong class="svelte-z0rh71">Drag to Move:</strong> Click and drag the top of the note to reposition it anywhere on your
              screen.</li> <li class="svelte-z0rh71"><strong class="svelte-z0rh71">Resize:</strong> Use the bottom-right corner to resize the note to your liking.</li> <li class="svelte-z0rh71"><strong class="svelte-z0rh71">View Map metalist:</strong> Click the list icon to see all the metas included in the map you
              are currently playing.</li> <li class="svelte-z0rh71"><strong class="svelte-z0rh71">Join the Community:</strong> Click the Discord icon to share feedback, suggest improvements, or
              just say hi!</li> <li class="svelte-z0rh71"><strong class="svelte-z0rh71">Outdated Script:</strong> The question mark icon will blink if the script is outdated.</li></ul></div> <button class="close-btn svelte-z0rh71">Close</button></div></div>`);
  var root$3 = /* @__PURE__ */ template(`<div class="geometa-container svelte-z0rh71"><!> <div class="flex header svelte-z0rh71"><h2 class="svelte-z0rh71">Learnable Meta</h2> <div class="icons svelte-z0rh71"><a target="_blank" aria-label="List of map metas" class="svelte-z0rh71"><span class="skill-icons--list svelte-z0rh71"></span></a> <a href="https://learnablemeta.com/" target="_blank" aria-label="Learnable Meta website" class="svelte-z0rh71"><span class="flat-color-icons--globe svelte-z0rh71"></span></a> <a href="https://discord.gg/AcXEWznYZe" target="_blank" aria-label="Learnable Meta discord" class="svelte-z0rh71"><span class="skill-icons--discord svelte-z0rh71"></span></a> <button aria-label="More information" style="background: none; border: none; padding: 0;" class="svelte-z0rh71"><span></span></button></div></div> <!> <!> <!></div>`);
  function App($$anchor, $$props) {
    push($$props, true);
    let geoInfo = state(null);
    let error = state(null);
    let container;
    let header;
    onMount(() => {
      const urlParams = new URLSearchParams({
        panoId: $$props.panoId,
        mapId: $$props.mapId,
        userscriptVersion: $$props.userscriptVersion,
        source: $$props.source
      }).toString();
      const url = `https://learnablemeta.com/api/userscript/location?${urlParams}`;
      _GM_xmlhttpRequest({
        method: "GET",
        url,
        onload: (response) => {
          if (response.status === 200) {
            try {
              set(geoInfo, proxy(JSON.parse(response.responseText)));
            } catch (e) {
              set(error, "Failed to parse response");
            }
          } else if (response.status === 404) {
            set(error, "Meta for this location not found");
          } else {
            set(error, `HTTP error! status: ${response.status}`);
          }
        },
        onerror: (e) => {
          set(error, "An error occurred while fetching data");
          console.error("Error:", e);
        }
      });
      setContainerPosition(container);
      setContainerDimensions(container);
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          saveContainerDimensions(entry);
        }
      });
      resizeObserver.observe(container);
      header.addEventListener("pointerdown", (event2) => onPointerDown(event2, container));
      document.addEventListener("pointermove", (event2) => onPointerMove(event2, container));
      document.addEventListener("pointerup", (event2) => onPointerUp(event2, container));
      return () => {
        resizeObserver.disconnect();
        header.removeEventListener("pointerdown", (event2) => onPointerDown(event2, container));
        document.removeEventListener("pointermove", (event2) => onPointerMove(event2, container));
        document.removeEventListener("pointerup", (event2) => onPointerUp(event2, container));
      };
    });
    function confirmNavigation(event2) {
      event2.preventDefault();
      set(currentUrl, proxy(event2.currentTarget.href));
      set(showModal, true);
    }
    let showModal = state(false);
    let currentUrl = state("");
    let showHelpPopup = state(false);
    let helpClass = state("question-mark-icon");
    function shouldBlink() {
      return !wasHelpMessageRead() || checkIfOutdated();
    }
    function updateHelpClass() {
      set(helpClass, proxy(shouldBlink() ? "question-mark-icon blink" : "question-mark-icon"));
    }
    updateHelpClass();
    user_effect(() => {
      if (get(geoInfo)) {
        const links = document.querySelectorAll(".geometa-footer a, .geometa-note a");
        links.forEach((link2) => {
          link2.removeEventListener("click", confirmNavigation);
          link2.addEventListener("click", confirmNavigation);
        });
      }
    });
    let lastDismissedTimestamp = state(proxy(getLastDismissedAnnouncementTimestamp()));
    var div = root$3();
    bind_this(div, ($$value) => container = $$value, () => container);
    var node = child(div);
    await_block(node, getAnnouncement, null, ($$anchor2, announcement) => {
      var fragment = comment();
      var node_1 = first_child(fragment);
      if_block(node_1, () => $$props.roundNumber >= 4 && get(announcement) && (!get(lastDismissedTimestamp) || get(announcement).timestamp > get(lastDismissedTimestamp)), ($$anchor3) => {
        var div_1 = root_2();
        var div_2 = child(div_1);
        var node_2 = child(div_2);
        html(node_2, () => get(announcement).htmlMessage);
        var button = sibling(div_2, 2);
        button.__click = [
          on_click,
          announcement,
          lastDismissedTimestamp
        ];
        append($$anchor3, div_1);
      });
      append($$anchor2, fragment);
    });
    var div_3 = sibling(node, 2);
    bind_this(div_3, ($$value) => header = $$value, () => header);
    var div_4 = sibling(child(div_3), 2);
    var a = child(div_4);
    var button_1 = sibling(a, 6);
    button_1.__click = [togglePopup, showHelpPopup, updateHelpClass];
    var span = child(button_1);
    var node_3 = sibling(div_3, 2);
    if_block(
      node_3,
      () => get(error),
      ($$anchor2) => {
        var p = root_3();
        var text = child(p);
        template_effect(() => set_text(text, `Error: ${get(error) ?? ""}`));
        append($$anchor2, p);
      },
      ($$anchor2) => {
        var fragment_1 = comment();
        var node_4 = first_child(fragment_1);
        if_block(
          node_4,
          () => get(geoInfo),
          ($$anchor3) => {
            var fragment_2 = root_5();
            var p_1 = first_child(fragment_2);
            var node_5 = child(p_1);
            CountryFlag(node_5, {
              get countryName() {
                return get(geoInfo).country;
              }
            });
            var strong = sibling(node_5, 2);
            var text_1 = child(strong);
            var text_2 = sibling(strong);
            var div_5 = sibling(p_1, 2);
            var node_6 = child(div_5);
            html(node_6, () => get(geoInfo).note);
            var node_7 = sibling(div_5, 2);
            if_block(node_7, () => get(geoInfo).footer, ($$anchor4) => {
              var p_2 = root_6();
              var node_8 = child(p_2);
              html(node_8, () => get(geoInfo).footer);
              append($$anchor4, p_2);
            });
            var node_9 = sibling(node_7, 2);
            if_block(node_9, () => get(geoInfo).images && get(geoInfo).images.length, ($$anchor4) => {
              var fragment_3 = root_7();
              var node_10 = sibling(first_child(fragment_3), 2);
              Carousel(node_10, {
                get images() {
                  return get(geoInfo).images;
                }
              });
              append($$anchor4, fragment_3);
            });
            template_effect(() => {
              set_text(text_1, get(geoInfo).country);
              set_text(text_2, ` - ${get(geoInfo).metaName ?? ""}`);
            });
            append($$anchor3, fragment_2);
          },
          ($$anchor3) => {
            Spinner($$anchor3);
          },
          true
        );
        append($$anchor2, fragment_1);
      }
    );
    var node_11 = sibling(node_3, 2);
    if_block(node_11, () => get(showModal), ($$anchor2) => {
      var div_6 = root_9();
      var div_7 = child(div_6);
      var p_3 = sibling(child(div_7), 2);
      var text_3 = child(p_3);
      var div_8 = sibling(p_3, 2);
      var button_2 = child(div_8);
      button_2.__click = [proceed, showModal, currentUrl];
      var button_3 = sibling(button_2, 2);
      button_3.__click = [cancel, showModal];
      template_effect(() => set_text(text_3, get(currentUrl)));
      append($$anchor2, div_6);
    });
    var node_12 = sibling(node_11, 2);
    if_block(node_12, () => get(showHelpPopup), ($$anchor2) => {
      var div_9 = root_10();
      var div_10 = child(div_9);
      var div_11 = child(div_10);
      var node_13 = child(div_11);
      if_block(node_13, checkIfOutdated, ($$anchor3) => {
        var p_4 = root_11();
        var strong_1 = child(p_4);
        var text_4 = child(strong_1);
        template_effect(() => set_text(text_4, `Your script version is out of date - please install the latest
              version (${getLatestVersionInfo() ?? ""})!`));
        append($$anchor3, p_4);
      });
      var button_4 = sibling(div_11, 2);
      button_4.__click = [togglePopup, showHelpPopup, updateHelpClass];
      append($$anchor2, div_9);
    });
    template_effect(() => {
      set_attribute(a, "href", "https://learnablemeta.com/maps/" + $$props.mapId);
      set_class(span, `${get(helpClass) ?? ""} svelte-z0rh71`);
    });
    append($$anchor, div);
    pop();
  }
  delegate(["click"]);
  const GeoGuessrEventFramework = _unsafeWindow.GeoGuessrEventFramework;
  function initSinglePlayer() {
    GeoGuessrEventFramework.init().then(() => {
      GeoGuessrEventFramework.events.addEventListener("game_start", async (event2) => {
        await getMapInfo(event2.detail.map.id, true);
      });
      GeoGuessrEventFramework.events.addEventListener("round_end", async (event2) => {
        var _a;
        (_a = document.getElementById("geometa-summary")) == null ? void 0 : _a.remove();
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
          const element = document.createElement("div");
          element.id = "geometa-summary";
          container.appendChild(element);
          const lastRound = event2.detail.rounds[event2.detail.rounds.length - 1];
          logInfo("adding app window");
          mount(App, {
            target: element,
            props: {
              roundNumber: event2.detail.rounds.length,
              panoId: lastRound.location.panoId,
              mapId: event2.detail.map.id,
              userscriptVersion: mapInfo.userscriptVersion,
              source: window.location.href.includes("challenge") ? "challenge" : "map"
            }
          });
        });
      });
    });
  }
  function initLiveChallenge() {
    logInfo("live challenge support enabled");
    let pinChanged = false;
    const observer = new MutationObserver(async (mutations) => {
      if (!document.querySelector("[class*=result-map_roundPin]")) {
        pinChanged = false;
        return;
      }
      if (pinChanged) {
        return;
      }
      pinChanged = true;
      const challengeId = getChallengeId();
      if (challengeId) {
        const { mapId, panoId } = await getChallengeInfo(challengeId);
        const mapInfo = await getMapInfo(mapId, false);
        if (!mapInfo.mapFound) return;
        waitForElement("[class*=game_container]").then((container) => {
          if (!container) {
            return;
          }
          const element = document.createElement("div");
          element.id = "geometa-summary";
          container.appendChild(element);
          mount(App, {
            target: element,
            props: {
              // this is to display announcements and there is not easy way to calculate which round it is
              roundNumber: 4,
              panoId,
              mapId,
              userscriptVersion: mapInfo.userscriptVersion,
              source: "liveChallenge"
            }
          });
        });
      }
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
  var root$2 = /* @__PURE__ */ template(`<div class="geometa-map-label-container svelte-1mmcvqu"><p class="svelte-1mmcvqu">LearnableMeta Enabled</p> <a target="_blank"><button class="svelte-1mmcvqu">Meta List</button></a></div>`);
  function MapLabel($$anchor, $$props) {
    var div = root$2();
    var a = sibling(child(div), 2);
    template_effect(() => set_attribute(a, "href", `https://learnablemeta.com/maps/${$$props.mapId}`));
    append($$anchor, div);
  }
  function initMapLabel() {
    addMapLabel();
    window.addEventListener("urlchange", () => {
      addMapLabel();
    });
  }
  async function addMapLabel() {
    const mapId = extractMapIdFromUrl(window.location.href);
    if (!mapId) {
      return;
    }
    const mapAvatarContainer = await waitForElement("[class*=map-block_mapImageContainer]");
    if (!mapAvatarContainer) {
      return;
    }
    const existingLabel = mapAvatarContainer.querySelector(".map-label");
    if (existingLabel) {
      existingLabel.remove();
    }
    const mapInfo = await getMapInfo(mapId, true);
    if (!(mapInfo == null ? void 0 : mapInfo.mapFound)) {
      return;
    }
    const element = document.createElement("div");
    element.classList.add("map-label");
    mapAvatarContainer.appendChild(element);
    mount(MapLabel, {
      target: element,
      props: {
        mapId
      }
    });
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
      console.error(`geoguessrAPIFetch Error (Status: ${response.status}) for URL ${url}:`, errorMessage, "Full Payload:", errorPayload);
      throw new Error(errorMessage);
    }
    return response;
  }
  async function uploadLocations(geoguessrId, apiKey) {
    const geoguessrDraftApiUrl = `https://www.geoguessr.com/api/v4/user-maps/drafts/${geoguessrId}`;
    let geoguessrMapDetails;
    try {
      const response = await geoguessrAPIFetch(geoguessrDraftApiUrl);
      geoguessrMapDetails = await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to fetch Geoguessr map info:", error);
      throw new Error(`Geoguessr Error: Could not fetch map details. ${errorMessage}`);
    }
    const { avatar, description, highlighted, name, version } = geoguessrMapDetails;
    let locationsToUpload;
    try {
      locationsToUpload = await fetchMapLocationsGM(geoguessrId, apiKey);
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
    const mapDataToUpload = {
      avatar,
      description,
      highlighted,
      name,
      customCoordinates: locationsToUpload,
      version: version + 1
    };
    try {
      await geoguessrAPIFetch(geoguessrDraftApiUrl, {
        method: "PUT",
        body: JSON.stringify(mapDataToUpload)
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to update Geoguessr map draft:", error);
      throw new Error(`Geoguessr Error: Could not update map draft. ${errorMessage}`);
    }
    try {
      console.log("Publishing Geoguessr map...");
      await geoguessrAPIFetch(`${geoguessrDraftApiUrl}/publish`, {
        method: "PUT",
        body: JSON.stringify({})
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to publish Geoguessr map:", error);
      throw new Error(`Geoguessr Error: Could not publish map. ${errorMessage}`);
    }
  }
  function fetchMapLocationsGM(geoguessrId, apiToken) {
    return new Promise((resolve, reject) => {
      const apiUrl = `https://learnablemeta.com/api/userscript/map/${geoguessrId}/locations`;
      _GM_xmlhttpRequest({
        method: "GET",
        url: apiUrl,
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        timeout: 15e3,
        // Add a timeout (e.g., 15 seconds)
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            try {
              const data = JSON.parse(response.responseText);
              if (data && Array.isArray(data.customCoordinates)) {
                resolve(data.customCoordinates);
              } else {
                console.error("Unexpected data structure from backend:", data);
                reject(new Error("Received invalid location data structure from backend."));
              }
            } catch (parseError) {
              console.error("Error parsing JSON response from backend:", parseError, response.responseText);
              reject(new Error(`Backend Error: Failed to parse location data: ${parseError.message.substring(0, 100)}`));
            }
          } else {
            let errorMessage = `Backend Error (${response.status}): ${response.statusText || "Failed to fetch locations"}`;
            let rawErrorResponse = response.responseText;
            try {
              const parsedJsonError = JSON.parse(response.responseText);
              if (parsedJsonError && parsedJsonError.message) {
                errorMessage = `Backend Error (${response.status}): ${parsedJsonError.message}`;
              } else if (parsedJsonError) {
                errorMessage = `Backend Error (${response.status}): ${JSON.stringify(parsedJsonError).substring(0, 100)}...`;
              }
              rawErrorResponse = parsedJsonError;
            } catch (e) {
              if (response.responseText) {
                errorMessage = `Backend Error (${response.status}): ${response.responseText.substring(0, 100)}...`;
              }
            }
            console.error(`Error fetching map locations from backend (Status: ${response.status}):`, rawErrorResponse);
            reject(new Error(errorMessage));
          }
        },
        onerror: (error) => {
          console.error("Failed to fetch map locations (XHR onerror):", error);
          let detail = error.error || error.statusText || "Network request failed";
          reject(new Error(`Network Error: Could not reach backend to fetch locations. ${detail}`));
        },
        ontimeout: () => {
          console.error("Failed to fetch map locations: Request timed out", apiUrl);
          reject(new Error("Backend Timeout: Request to fetch locations timed out."));
        }
      });
    });
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
  var root$1 = /* @__PURE__ */ template(`<div role="alert"><span class="toast-message svelte-1rq8lsd"> </span> <button class="toast-close-button svelte-1rq8lsd" aria-label="Close">×</button></div>`);
  function ToastNotification($$anchor, $$props) {
    let type = prop($$props, "type", 3, "info");
    var div = root$1();
    var span = child(div);
    var text = child(span);
    var button = sibling(span, 2);
    button.__click = function(...$$args) {
      var _a;
      (_a = $$props.onClose) == null ? void 0 : _a.apply(this, $$args);
    };
    template_effect(() => {
      set_class(div, `toast-notification toast-${type() ?? ""} svelte-1rq8lsd`);
      set_style(div, "position", "absolute");
      set_style(div, "top", "100%");
      set_style(div, "transform", "translateX(-75%) translateY(-10px)");
      set_style(div, "margin-top", "10px");
      set_text(text, $$props.message);
    });
    transition(1, div, () => fade, () => ({ duration: 200, delay: 50 }));
    transition(2, div, () => fade, () => ({ duration: 300 }));
    append($$anchor, div);
  }
  delegate(["click"]);
  async function handleUploadClick(_, isLoading, currentApiKey, getApiKeyFromGM, apiKeyInput, showApiKeyModal, performUpload) {
    if (get(isLoading)) return;
    set(currentApiKey, proxy(getApiKeyFromGM()));
    if (!get(currentApiKey) || get(currentApiKey).trim() === "") {
      set(apiKeyInput, "");
      set(showApiKeyModal, true);
    } else {
      await performUpload(get(currentApiKey));
    }
  }
  function handleSaveApiKey(__1, apiKeyInput, saveApiKeyToGM, currentApiKey, showApiKeyModal, showCustomToast, performUpload) {
    const trimmedKey = get(apiKeyInput).trim();
    if (trimmedKey) {
      saveApiKeyToGM(trimmedKey);
      set(currentApiKey, proxy(trimmedKey));
      set(showApiKeyModal, false);
      showCustomToast("API Key saved!", "success", 2e3);
      performUpload(trimmedKey);
    } else {
      showCustomToast("Please enter a valid API key.", "error", 3e3);
    }
  }
  function handleCancelModal(__2, showApiKeyModal, apiKeyInput) {
    set(showApiKeyModal, false);
    set(apiKeyInput, "");
  }
  var root_1 = /* @__PURE__ */ template(`<div class="modal-overlay svelte-17or0cf" role="dialog" aria-modal="true" aria-labelledby="apiKeyModalTitle"><div class="modal-content svelte-17or0cf"><h2 id="apiKeyModalTitle" class="svelte-17or0cf">Enter LearnableMeta API Key</h2> <p class="svelte-17or0cf">An API key is required to upload locations. Please paste your key below.</p> <p class="svelte-17or0cf">You can generate your API token by visiting <a target="_blank" rel="noopener noreferrer" class="svelte-17or0cf">profile page</a> on LearnableMeta and generating it there.</p> <input type="text" placeholder="Paste your API key here" aria-label="API Key Input" class="modal-input svelte-17or0cf"> <div class="modal-actions svelte-17or0cf"><button class="modal-button modal-button-save svelte-17or0cf">Save & Upload</button> <button class="modal-button modal-button-cancel svelte-17or0cf">Cancel</button></div> <p class="modal-note svelte-17or0cf">Your API key will be stored securely in your browser's userscript storage for future
        use.</p></div></div>`);
  var root = /* @__PURE__ */ template(`<div class="upload-label-container"><button class="button_button__aR6_e button_sizeSmall__MB_qj custom-yellow-button svelte-17or0cf"> </button></div> <!> <!>`, 1);
  function UploadLocations($$anchor, $$props) {
    push($$props, true);
    const API_KEY_STORAGE_NAME = "learnableMeta_apiKey";
    const URL_TO_GENERATE_TOKEN = "https://learnablemeta.com/profile/token";
    let showApiKeyModal = state(false);
    let apiKeyInput = state("");
    let currentApiKey = state(null);
    let isLoading = state(false);
    let toastState = state(null);
    let toastTimer = state(void 0);
    function showCustomToast(message, type = "info", duration = 3e3) {
      clearTimeout(get(toastTimer));
      const displayToast = () => {
        set(toastState, proxy({ message, type }));
        if (duration > 0) {
          set(toastTimer, proxy(setTimeout(
            () => {
              hideCustomToast();
            },
            duration
          )));
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
        return _GM_getValue(API_KEY_STORAGE_NAME, null);
      } catch (e) {
        console.warn("GM_getValue is not available. API key functionality might be limited.", e);
        showCustomToast("Userscript storage (GM_getValue) is not available. Please ensure Tampermonkey/Violentmonkey is correctly configured.", "error", 0);
        return null;
      }
    }
    function saveApiKeyToGM(key) {
      try {
        _GM_setValue(API_KEY_STORAGE_NAME, key);
      } catch (e) {
        console.warn("GM_setValue is not available. API key functionality might be limited.", e);
        showCustomToast("Userscript storage (GM_setValue) is not available. Please ensure Tampermonkey/Violentmonkey is correctly configured.", "error", 0);
      }
    }
    onMount(() => {
      set(currentApiKey, proxy(getApiKeyFromGM()));
      if (typeof _GM_registerMenuCommand === "function") {
        _GM_registerMenuCommand("LearnableMeta - Set/Update API Key", () => {
          set(currentApiKey, null);
          const newKey = prompt("Enter your new LearnableMeta API Key:");
          if (newKey && newKey.trim() !== "") {
            saveApiKeyToGM(newKey.trim());
            set(currentApiKey, proxy(newKey.trim()));
            showCustomToast("LearnableMeta API Key updated!", "success");
          } else if (newKey !== null) {
            showCustomToast("API Key not updated (empty value provided).", "info");
          }
        });
        _GM_registerMenuCommand("LearnableMeta - Clear API Key", () => {
          if (confirm("Are you sure you want to clear your LearnableMeta API Key?")) {
            saveApiKeyToGM("");
            set(currentApiKey, null);
            showCustomToast("LearnableMeta API Key cleared.", "success");
          }
        });
      }
    });
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
        let toastMessage = "An unexpected error occurred during upload.";
        if (error && error.message) {
          toastMessage = error.message;
        }
        if (toastMessage.includes("401") || toastMessage.includes("403") || toastMessage.toLowerCase().includes("unauthorized") || toastMessage.toLowerCase().includes("invalid token")) {
          showCustomToast(`Upload failed: ${toastMessage}. Please check your API Key.`, "error", 0);
        } else {
          showCustomToast(`Upload failed: ${toastMessage}`, "error", 0);
        }
        set(isLoading, false);
      }
    }
    var fragment = root();
    var div = first_child(fragment);
    var button = child(div);
    button.__click = [
      handleUploadClick,
      isLoading,
      currentApiKey,
      getApiKeyFromGM,
      apiKeyInput,
      showApiKeyModal,
      performUpload
    ];
    var text = child(button);
    var node = sibling(div, 2);
    if_block(node, () => get(showApiKeyModal), ($$anchor2) => {
      var div_1 = root_1();
      var div_2 = child(div_1);
      var p = sibling(child(div_2), 4);
      var a = sibling(child(p));
      set_attribute(a, "href", URL_TO_GENERATE_TOKEN);
      var input = sibling(p, 2);
      var div_3 = sibling(input, 2);
      var button_1 = child(div_3);
      button_1.__click = [
        handleSaveApiKey,
        apiKeyInput,
        saveApiKeyToGM,
        currentApiKey,
        showApiKeyModal,
        showCustomToast,
        performUpload
      ];
      var button_2 = sibling(button_1, 2);
      button_2.__click = [
        handleCancelModal,
        showApiKeyModal,
        apiKeyInput
      ];
      bind_value(input, () => get(apiKeyInput), ($$value) => set(apiKeyInput, $$value));
      append($$anchor2, div_1);
    });
    var node_1 = sibling(node, 2);
    if_block(node_1, () => get(toastState), ($$anchor2) => {
      ToastNotification($$anchor2, {
        get message() {
          return get(toastState).message;
        },
        get type() {
          return get(toastState).type;
        },
        onClose: hideCustomToast
      });
    });
    template_effect(() => {
      button.disabled = get(isLoading);
      set_text(text, get(isLoading) ? "Uploading..." : "LearnableMeta - Upload");
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
  const containerId = "geometa-locations-upload";
  async function addLocationsUploadButtons() {
    var _a;
    const mapId = extractMapIdFromMapMakerUrl(window.location.href);
    if (!mapId) {
      return;
    }
    (_a = document.getElementById(containerId)) == null ? void 0 : _a.remove();
    const mapInfo = await getMapInfo(mapId, true);
    if (!(mapInfo == null ? void 0 : mapInfo.mapFound)) {
      return;
    }
    const container = document.querySelector(".top-bar-menu_topBarMenu__kd9zX");
    if (container) {
      const target = document.createElement("div");
      target.id = containerId;
      container.insertBefore(target, container.lastElementChild);
      mount(UploadLocations, {
        target,
        props: {
          mapId
        }
      });
    }
  }
  function changelog() {
    return [
      { "0.84": "Fixed multiple instances of upload button, adjusted styles" },
      { "0.83": "Added uploading locations and announcements system" },
      { "0.82": "Changed position of LearnableMeta map label for new Geoguessr UI" },
      { "0.81": "Fixed live challenge support. Added information about userscript version and source of a call (map, challenge, liveChallenge) to location info request to help us with debugging issues." },
      { "0.80": "Adjusted window dragging to work on mobile. Improved selection mechanism of elements with dynamic class names. Removed special handling of challenges." },
      { "0.79": "Fixed ALM meta list panel when switching to non-ALM map" },
      { "0.78": "Added info window with version check" },
      { "0.77": "Added custom footer to the note and clicking on link warning" },
      { "0.76": "Redesign note and added meta list link" },
      { "0.75": "Added basic logging to help with debugging issues" },
      { "0.74": "Fixed window appearance when for some reason a negative position value is saved" },
      { "0.73": "Fixed live challenge support and updated framework to newest version" },
      { "0.72": "Adjusted images to fit vertically to the container to avoid scrolling and added magnifying glass effect on mouse hover" },
      { "0.71": "Added beta support for live challenges" },
      { "0.70": "Fixed carousel controls jumping and colored the note links" },
      { "0.69": "Display multiple images with carousel" },
      { "0.68": "Use panoId as unique location identifier, allow html in note" },
      { "0.67": "Updated to Svelte 5" },
      { "0.66": "Made note movable" },
      { "0.65": "Check map ids via API" },
      { "0.64": "Added more placeholder map ids" },
      { "0.63": "Added container resizing." },
      { "0.62": "Added images to metas." },
      { "0.61": "Added new/placehoder map ids." },
      { "0.6": "Bugfixes" },
      { "0.5": "New note format and prepared for multiple maps support" },
      {
        "0.4": "Updated GeoGuessr Event Framework version. Fixes the disappearing daily challenge from GeoGuessr home page."
      }
    ];
  }
  if (_unsafeWindow.notAValidVariable) {
    console.log(changelog());
  }
  initURLChangeEvent();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLearnableMetaFeatures);
  } else {
    await( setupLearnableMetaFeatures());
  }
  async function setupLearnableMetaFeatures() {
    initSinglePlayer();
    initLiveChallenge();
    initMapLabel();
    initLocationsUpload();
  }

})();