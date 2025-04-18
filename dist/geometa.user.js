// ==UserScript==
// @name         GeoGuessr Learnable Meta
// @namespace    geometa
// @version      0.80
// @author       monkey
// @description  UserScript for GeoGuessr Learnable Meta maps
// @icon         https://learnablemeta.com/favicon.png
// @downloadURL  https://github.com/likeon/geometa/raw/main/dist/geometa.user.js
// @updateURL    https://github.com/likeon/geometa/raw/main/dist/geometa.user.js
// @match        *://*.geoguessr.com/*
// @require      https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/b0c7492f4f346d4acb594a2015d592616a665096/geoguessr-event-framework.js
// @connect      learnablemeta.com
// @grant        GM_addStyle
// @grant        GM_info
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(e=>{if(typeof GM_addStyle=="function"){GM_addStyle(e);return}const t=document.createElement("style");t.textContent=e,document.head.append(t)})(` .loadership_ZOJAQ.svelte-i1jlc0{display:flex;position:relative;width:72px;height:72px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0){position:absolute;width:8px;height:8px;border-radius:50%;background:#fff;animation:svelte-i1jlc0-loadership_ZOJAQ_scale 1.2s infinite,svelte-i1jlc0-loadership_ZOJAQ_fade 1.2s infinite;animation-timing-function:linear}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(1){animation-delay:0s;top:62px;left:32px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(2){animation-delay:-.1s;top:58px;left:47px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(3){animation-delay:-.2s;top:47px;left:58px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(4){animation-delay:-.3s;top:32px;left:62px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(5){animation-delay:-.4s;top:17px;left:58px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(6){animation-delay:-.5s;top:6px;left:47px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(7){animation-delay:-.6s;top:2px;left:32px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(8){animation-delay:-.7s;top:6px;left:17px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(9){animation-delay:-.8s;top:17px;left:6px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(10){animation-delay:-.9s;top:32px;left:2px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(11){animation-delay:-1s;top:47px;left:6px}.loadership_ZOJAQ.svelte-i1jlc0 div:where(.svelte-i1jlc0):nth-child(12){animation-delay:-1.1s;top:58px;left:17px}@keyframes svelte-i1jlc0-loadership_ZOJAQ_scale{0%,20%,80%,to{transform:scale(1)}50%{transform:scale(1.5)}}@keyframes svelte-i1jlc0-loadership_ZOJAQ_fade{0%,20%,80%,to{opacity:.8}50%{opacity:1}}.fi.svelte-7lhsry{width:1.5em;height:1em;display:inline-block;vertical-align:middle;padding-right:3px}.carousel.svelte-fofh7f{position:relative;overflow:hidden;margin:0 auto}.image-wrapper.svelte-fofh7f{width:100%;height:100%;display:flex;justify-content:center;align-items:center;cursor:zoom-in}.responsive-image.svelte-fofh7f{max-width:100%;height:100%;display:block;object-fit:contain}.lens.svelte-fofh7f{position:absolute;pointer-events:none;border:2px solid #aaa;border-radius:50%;box-shadow:0 0 8px #00000080}.click-area.svelte-fofh7f{position:absolute;top:0;bottom:0;width:1.4em;cursor:pointer}.prev-area.svelte-fofh7f{left:0}.next-area.svelte-fofh7f{right:0}.prev.svelte-fofh7f,.next.svelte-fofh7f{background-color:#00000080;color:#fff;border:none;font-size:1.2em;padding:.2em;cursor:pointer;pointer-events:auto;position:absolute;top:50%;transform:translateY(-50%)}.prev.svelte-fofh7f{left:0}.next.svelte-fofh7f{right:0}.indicators.svelte-fofh7f{position:absolute;bottom:15px;left:50%;transform:translate(-50%);display:flex;justify-content:center;align-items:center;gap:8px}.indicator.svelte-fofh7f{width:12px;height:12px;background-color:#ffffff80;border-radius:50%;cursor:pointer;border:none;padding:0;flex-shrink:0}.indicator.active.svelte-fofh7f{background-color:#fff}.geometa-footer a{color:#188bd2;text-decoration:none}.geometa-footer a:hover{text-decoration:underline}.geometa-container.svelte-46slld{position:absolute;top:13rem;left:1rem;z-index:50;display:flex;flex-direction:column;gap:5px;align-items:flex-start;background:var(--ds-color-purple-100);padding:6px 10px;border-radius:5px;font-size:17px;width:min(25%,500px);resize:both;overflow:auto}.geometa-footer.svelte-46slld{color:#d3d3d3;font-size:small}a.svelte-46slld{color:#188bd2}a.svelte-46slld:hover{text-decoration:underline}.skill-icons--discord.svelte-46slld{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cg fill='none'%3E%3Crect width='256' height='256' fill='%235865f2' rx='60'/%3E%3Cg clip-path='url(%23skillIconsDiscord0)'%3E%3Cpath fill='%23ffffff' d='M197.308 64.797a165 165 0 0 0-40.709-12.627a.62.62 0 0 0-.654.31c-1.758 3.126-3.706 7.206-5.069 10.412c-15.373-2.302-30.666-2.302-45.723 0c-1.364-3.278-3.382-7.286-5.148-10.412a.64.64 0 0 0-.655-.31a164.5 164.5 0 0 0-40.709 12.627a.6.6 0 0 0-.268.23c-25.928 38.736-33.03 76.52-29.546 113.836a.7.7 0 0 0 .26.468c17.106 12.563 33.677 20.19 49.94 25.245a.65.65 0 0 0 .702-.23c3.847-5.254 7.276-10.793 10.217-16.618a.633.633 0 0 0-.347-.881c-5.44-2.064-10.619-4.579-15.601-7.436a.642.642 0 0 1-.063-1.064a86 86 0 0 0 3.098-2.428a.62.62 0 0 1 .646-.088c32.732 14.944 68.167 14.944 100.512 0a.62.62 0 0 1 .655.08a80 80 0 0 0 3.106 2.436a.642.642 0 0 1-.055 1.064a102.6 102.6 0 0 1-15.609 7.428a.64.64 0 0 0-.339.889a133 133 0 0 0 10.208 16.61a.64.64 0 0 0 .702.238c16.342-5.055 32.913-12.682 50.02-25.245a.65.65 0 0 0 .26-.46c4.17-43.141-6.985-80.616-29.571-113.836a.5.5 0 0 0-.26-.238M94.834 156.142c-9.855 0-17.975-9.047-17.975-20.158s7.963-20.158 17.975-20.158c10.09 0 18.131 9.127 17.973 20.158c0 11.111-7.962 20.158-17.973 20.158m66.456 0c-9.855 0-17.974-9.047-17.974-20.158s7.962-20.158 17.974-20.158c10.09 0 18.131 9.127 17.974 20.158c0 11.111-7.884 20.158-17.974 20.158'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='skillIconsDiscord0'%3E%3Cpath fill='%23ffffff' d='M28 51h200v154.93H28z'/%3E%3C/clipPath%3E%3C/defs%3E%3C/g%3E%3C/svg%3E")}.flat-color-icons--globe.svelte-46slld{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%237cb342' d='M24 4C13 4 4 13 4 24s9 20 20 20s20-9 20-20S35 4 24 4'/%3E%3Cpath fill='%230277bd' d='M45 24c0 11.7-9.5 21-21 21S3 35.7 3 24S12.3 3 24 3s21 9.3 21 21m-21.2 9.7c0-.4-.2-.6-.6-.8c-1.3-.4-2.5-.4-3.6-1.5c-.2-.4-.2-.8-.4-1.3c-.4-.4-1.5-.6-2.1-.8h-4.2c-.6-.2-1.1-1.1-1.5-1.7c0-.2 0-.6-.4-.6c-.4-.2-.8.2-1.3 0c-.2-.2-.2-.4-.2-.6c0-.6.4-1.3.8-1.7c.6-.4 1.3.2 1.9.2c.2 0 .2 0 .4.2c.6.2.8 1 .8 1.7v.4c0 .2.2.2.4.2c.2-1.1.2-2.1.4-3.2c0-1.3 1.3-2.5 2.3-2.9c.4-.2.6.2 1.1 0c1.3-.4 4.4-1.7 3.8-3.4c-.4-1.5-1.7-2.9-3.4-2.7c-.4.2-.6.4-1 .6c-.6.4-1.9 1.7-2.5 1.7c-1.1-.2-1.1-1.7-.8-2.3c.2-.8 2.1-3.6 3.4-3.1l.8.8c.4.2 1.1.2 1.7.2c.2 0 .4 0 .6-.2s.2-.2.2-.4c0-.6-.6-1.3-1-1.7s-1.1-.8-1.7-1.1c-2.1-.6-5.5.2-7.1 1.7s-2.9 4-3.8 6.1c-.4 1.3-.8 2.9-1 4.4c-.2 1-.4 1.9.2 2.9c.6 1.3 1.9 2.5 3.2 3.4c.8.6 2.5.6 3.4 1.7c.6.8.4 1.9.4 2.9c0 1.3.8 2.3 1.3 3.4c.2.6.4 1.5.6 2.1c0 .2.2 1.5.2 1.7c1.3.6 2.3 1.3 3.8 1.7c.2 0 1-1.3 1-1.5c.6-.6 1.1-1.5 1.7-1.9c.4-.2.8-.4 1.3-.8c.4-.4.6-1.3.8-1.9c.1-.5.3-1.3.1-1.9m.4-19.4c.2 0 .4-.2.8-.4c.6-.4 1.3-1.1 1.9-1.5s1.3-1.1 1.7-1.5c.6-.4 1.1-1.3 1.3-1.9c.2-.4.8-1.3.6-1.9c-.2-.4-1.3-.6-1.7-.8c-1.7-.4-3.1-.6-4.8-.6c-.6 0-1.5.2-1.7.8c-.2 1.1.6.8 1.5 1.1c0 0 .2 1.7.2 1.9c.2 1-.4 1.7-.4 2.7c0 .6 0 1.7.4 2.1zM41.8 29c.2-.4.2-1.1.4-1.5c.2-1 .2-2.1.2-3.1c0-2.1-.2-4.2-.8-6.1c-.4-.6-.6-1.3-.8-1.9c-.4-1.1-1-2.1-1.9-2.9c-.8-1.1-1.9-4-3.8-3.1c-.6.2-1 1-1.5 1.5c-.4.6-.8 1.3-1.3 1.9c-.2.2-.4.6-.2.8c0 .2.2.2.4.2c.4.2.6.2 1 .4c.2 0 .4.2.2.4c0 0 0 .2-.2.2c-1 1.1-2.1 1.9-3.1 2.9c-.2.2-.4.6-.4.8s.2.2.2.4s-.2.2-.4.4c-.4.2-.8.4-1.1.6c-.2.4 0 1.1-.2 1.5c-.2 1.1-.8 1.9-1.3 2.9c-.4.6-.6 1.3-1 1.9c0 .8-.2 1.5.2 2.1c1 1.5 2.9.6 4.4 1.3c.4.2.8.2 1.1.6c.6.6.6 1.7.8 2.3c.2.8.4 1.7.8 2.5c.2 1 .6 2.1.8 2.9c1.9-1.5 3.6-3.1 4.8-5.2c1.5-1.3 2.1-3 2.7-4.7'/%3E%3C/svg%3E")}.skill-icons--list.svelte-46slld{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%235865f2' d='M4 3h13.17c.41 0 .8.16 1.09.44l3.3 3.3c.29.29.44.68.44 1.09V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'/%3E%3Cpath fill='%23ffffff' d='M14 2v4h4l-4-4zM7 9h10v2H7V9zm0 4h7v2H7v-2z'/%3E%3C/svg%3E")}.question-mark-icon.svelte-46slld{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23188bd2' d='M21 2H3c-.55 0-1 .45-1 1v18c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1ZM12 18a1 1 0 1 1 1-1a1 1 0 0 1-1 1Zm2.07-5.25c-.9.52-.98 1.26-.98 1.75h-2c0-1.12.46-2.21 1.78-2.91c.9-.52 1.22-.87 1.22-1.34a1.5 1.5 0 0 0-3 0H9a3.5 3.5 0 0 1 7 0c0 1.63-1.28 2.41-1.93 2.75Z'/%3E%3C/svg%3E");cursor:pointer}.icons.svelte-46slld{display:inline-block;vertical-align:middle}.flex.svelte-46slld{display:flex;align-items:center}.icons.svelte-46slld a:where(.svelte-46slld) span:where(.svelte-46slld){align-items:center;justify-content:center}hr.svelte-46slld{border:0;border-top:1px solid white;width:100%}.header.svelte-46slld{cursor:move;border-bottom:1px solid #aaa;width:100%;display:flex;justify-content:space-between;align-items:center;touch-action:none;-webkit-user-select:none;user-select:none}.geometa-note a{color:#188bd2}.geometa-note a:hover{text-decoration:underline}.geometa-note ul li{list-style-type:disc;margin-left:1rem}.geometa-note ol li{list-style-type:decimal;margin-left:1rem}.modal-backdrop.svelte-46slld{position:fixed;top:0;left:0;width:100vw;height:100vh;background:#1e1e1ecc;display:flex;justify-content:center;align-items:center;z-index:1000}.modal.svelte-46slld{background:var(--ds-color-purple-100);padding:15px 25px;border-radius:8px;text-align:center;width:90%;max-width:600px;box-shadow:0 4px 6px #0003;color:#d3d3d3}.modal.svelte-46slld p:where(.svelte-46slld){margin:0 0 10px;font-size:17px}.modal-url.svelte-46slld{font-size:15px;font-weight:700;color:#188bd2;word-break:break-word;margin:10px 0}.modal-buttons.svelte-46slld{display:flex;justify-content:center;gap:15px;margin-top:20px}.proceed-btn.svelte-46slld{background:#188bd2;color:#fff;padding:8px 16px;border:none;border-radius:5px;cursor:pointer;font-size:15px;transition:background-color .2s ease-in-out}.proceed-btn.svelte-46slld:hover{background:#0056b3}.close-btn.svelte-46slld{background:transparent;color:#d3d3d3;padding:8px 16px;border:1px solid #d3d3d3;border-radius:5px;cursor:pointer;font-size:15px;transition:background-color .2s ease-in-out,color .2s ease-in-out}.close-btn.svelte-46slld:hover{background:#d3d3d3;color:var(--ds-color-purple-100)}button.svelte-46slld{cursor:pointer;background:none;border:none;padding:0}.blink.svelte-46slld{animation:svelte-46slld-blink-animation 1s infinite}.help-message.svelte-46slld{padding:12px;font-size:16px;line-height:1.5;text-align:left}.help-message.svelte-46slld strong:where(.svelte-46slld){color:#007bff;font-weight:700}@keyframes svelte-46slld-blink-animation{0%{filter:brightness(1)}50%{filter:brightness(2);background-color:#004779}to{filter:brightness(1)}}.outdated.svelte-46slld strong:where(.svelte-46slld){color:red!important}.geometa-map-label-container.svelte-coney7{background-color:#252541;color:#fff;text-align:center;z-index:999999;position:absolute;bottom:-1px;left:0;width:220px;height:50%;box-sizing:border-box;border-radius:0 0 110px 110px;clip-path:inset(40% 0 0 0)}p.svelte-coney7{font-size:14px;margin-top:48px;font-weight:700}button.svelte-coney7{margin-top:6px;padding:6px 12px;font-size:12px;color:#fff;background-color:#4caf50;border:none;border-radius:4px;cursor:pointer} `);

(async function () {
  'use strict';

  var _GM_info = /* @__PURE__ */ (() => typeof GM_info != "undefined" ? GM_info : void 0)();
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
    const url = `https://learnablemeta.com/api/map-info/${geoguessrId}`;
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
  function logInfo(name, data) {
    console.log(`ALM: ${name}`, data);
  }
  function extractMapIdFromUrl(url) {
    const match = url.match(/\/maps\/(.+)/);
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
      for (const transition of transitions) {
        transition.stop();
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
      for (var transition of transitions) {
        transition.out(check);
      }
    } else {
      fn();
    }
  }
  function pause_children(effect2, transitions, local) {
    if ((effect2.f & INERT) !== 0) return;
    effect2.f ^= INERT;
    if (effect2.transitions !== null) {
      for (const transition of effect2.transitions) {
        if (transition.is_global || local) {
          transitions.push(transition);
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
      for (const transition of effect2.transitions) {
        if (transition.is_global || local) {
          transition.in();
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
  function lifecycle_outside_component(name) {
    {
      throw new Error("lifecycle_outside_component");
    }
  }
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
    {
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
        component = Component(anchor_node, props) || {};
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
    var is_store_sub = false;
    var prop_value;
    {
      [prop_value, is_store_sub] = capture_store_binding(() => (
        /** @type {V} */
        props[key]
      ));
    }
    var setter = (_a = get_descriptor(props, key)) == null ? void 0 : _a.set;
    var fallback_value = (
      /** @type {V} */
      fallback
    );
    var fallback_dirty = true;
    var get_fallback = () => {
      if (fallback_dirty) {
        fallback_dirty = false;
        {
          fallback_value = untrack(
            /** @type {() => V} */
            fallback
          );
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
    {
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
    {
      return getter;
    }
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
  var root$3 = /* @__PURE__ */ template(`<div class="loadership_ZOJAQ svelte-i1jlc0"><div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div> <div class="svelte-i1jlc0"></div></div>`);
  function Spinner($$anchor) {
    var div = root$3();
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
  var root_4$1 = /* @__PURE__ */ template(`<div class="lens svelte-fofh7f"></div>`);
  var root_3$1 = /* @__PURE__ */ template(`<div class="image-wrapper svelte-fofh7f" role="img" aria-label="Zoomable image"><img class="responsive-image svelte-fofh7f"> <!></div>`);
  var root_6 = /* @__PURE__ */ template(`<button></button>`);
  var root_5$1 = /* @__PURE__ */ template(`<div class="controls"><button class="click-area prev-area svelte-fofh7f" type="button" aria-label="Previous image"><span class="prev svelte-fofh7f">&#10094;</span></button> <button class="click-area next-area svelte-fofh7f" type="button" aria-label="Next image"><span class="next svelte-fofh7f">&#10095;</span></button></div> <div class="indicators svelte-fofh7f"></div>`, 1);
  var root$2 = /* @__PURE__ */ template(`<div class="carousel svelte-fofh7f"><!> <!></div>`);
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
    var div = root$2();
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
            var div_2 = root_4$1();
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
        var button_2 = root_6();
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
  var root_1 = /* @__PURE__ */ template(`<p class="svelte-46slld"> </p>`);
  var root_4 = /* @__PURE__ */ template(`<p class="geometa-footer svelte-46slld"><!></p>`);
  var root_5 = /* @__PURE__ */ template(`<hr class="svelte-46slld"> <!>`, 1);
  var root_3 = /* @__PURE__ */ template(`<p class="svelte-46slld"><!> <strong class="svelte-46slld"> </strong> </p> <div class="geometa-note svelte-46slld"><!></div> <!> <!>`, 1);
  var root_7 = /* @__PURE__ */ template(`<div class="modal-backdrop svelte-46slld"><div class="modal svelte-46slld"><p class="svelte-46slld">You are about to open this site in a new tab:</p> <p class="modal-url svelte-46slld"> </p> <div class="modal-buttons svelte-46slld"><button class="proceed-btn svelte-46slld">Continue</button> <button class="close-btn svelte-46slld">Cancel</button></div></div></div>`);
  var root_9 = /* @__PURE__ */ template(`<p class="outdated svelte-46slld"><strong class="svelte-46slld"> </strong></p>`);
  var root_8 = /* @__PURE__ */ template(`<div class="modal-backdrop svelte-46slld"><div class="modal svelte-46slld"><div class="help-message svelte-46slld"><!> <p class="svelte-46slld">Welcome to LearnableMeta, we hope you are enjoying it, some quick info:</p> <ul class="svelte-46slld"><li class="svelte-46slld"><strong class="svelte-46slld">Drag to Move:</strong> Click and drag the top of the note to reposition it anywhere on your
              screen.</li> <li class="svelte-46slld"><strong class="svelte-46slld">Resize:</strong> Use the bottom-right corner to resize the note to your liking.</li> <li class="svelte-46slld"><strong class="svelte-46slld">View Map metalist:</strong> Click the list icon to see all the metas included in the map you
              are currently playing.</li> <li class="svelte-46slld"><strong class="svelte-46slld">Join the Community:</strong> Click the Discord icon to share feedback, suggest improvements, or
              just say hi!</li> <li class="svelte-46slld"><strong class="svelte-46slld">Outdated Script:</strong> The question mark icon will blink if the script is outdated.</li></ul></div> <button class="close-btn svelte-46slld">Close</button></div></div>`);
  var root$1 = /* @__PURE__ */ template(`<div class="geometa-container svelte-46slld"><div class="flex header svelte-46slld"><h2 class="svelte-46slld">Learnable Meta</h2> <div class="icons svelte-46slld"><a target="_blank" aria-label="List of map metas" class="svelte-46slld"><span class="skill-icons--list svelte-46slld"></span></a> <a href="https://learnablemeta.com/" target="_blank" aria-label="Learnable Meta website" class="svelte-46slld"><span class="flat-color-icons--globe svelte-46slld"></span></a> <a href="https://discord.gg/AcXEWznYZe" target="_blank" aria-label="Learnable Meta discord" class="svelte-46slld"><span class="skill-icons--discord svelte-46slld"></span></a> <button aria-label="More information" style="background: none; border: none; padding: 0;" class="svelte-46slld"><span></span></button></div></div> <!> <!> <!></div>`);
  function App($$anchor, $$props) {
    push($$props, true);
    let geoInfo = state(null);
    let error = state(null);
    let container;
    let header;
    onMount(() => {
      const url = `https://learnablemeta.com/location-info?panoId=${$$props.panoId}&mapId=${$$props.mapId}`;
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
    var div = root$1();
    bind_this(div, ($$value) => container = $$value, () => container);
    var div_1 = child(div);
    bind_this(div_1, ($$value) => header = $$value, () => header);
    var div_2 = sibling(child(div_1), 2);
    var a = child(div_2);
    var button = sibling(a, 6);
    button.__click = [togglePopup, showHelpPopup, updateHelpClass];
    var span = child(button);
    var node = sibling(div_1, 2);
    if_block(
      node,
      () => get(error),
      ($$anchor2) => {
        var p = root_1();
        var text = child(p);
        template_effect(() => set_text(text, `Error: ${get(error) ?? ""}`));
        append($$anchor2, p);
      },
      ($$anchor2) => {
        var fragment = comment();
        var node_1 = first_child(fragment);
        if_block(
          node_1,
          () => get(geoInfo),
          ($$anchor3) => {
            var fragment_1 = root_3();
            var p_1 = first_child(fragment_1);
            var node_2 = child(p_1);
            CountryFlag(node_2, {
              get countryName() {
                return get(geoInfo).country;
              }
            });
            var strong = sibling(node_2, 2);
            var text_1 = child(strong);
            var text_2 = sibling(strong);
            var div_3 = sibling(p_1, 2);
            var node_3 = child(div_3);
            html(node_3, () => get(geoInfo).note);
            var node_4 = sibling(div_3, 2);
            if_block(node_4, () => get(geoInfo).footer, ($$anchor4) => {
              var p_2 = root_4();
              var node_5 = child(p_2);
              html(node_5, () => get(geoInfo).footer);
              append($$anchor4, p_2);
            });
            var node_6 = sibling(node_4, 2);
            if_block(node_6, () => get(geoInfo).images && get(geoInfo).images.length, ($$anchor4) => {
              var fragment_2 = root_5();
              var node_7 = sibling(first_child(fragment_2), 2);
              Carousel(node_7, {
                get images() {
                  return get(geoInfo).images;
                }
              });
              append($$anchor4, fragment_2);
            });
            template_effect(() => {
              set_text(text_1, get(geoInfo).country);
              set_text(text_2, ` - ${get(geoInfo).metaName ?? ""}`);
            });
            append($$anchor3, fragment_1);
          },
          ($$anchor3) => {
            Spinner($$anchor3);
          },
          true
        );
        append($$anchor2, fragment);
      }
    );
    var node_8 = sibling(node, 2);
    if_block(node_8, () => get(showModal), ($$anchor2) => {
      var div_4 = root_7();
      var div_5 = child(div_4);
      var p_3 = sibling(child(div_5), 2);
      var text_3 = child(p_3);
      var div_6 = sibling(p_3, 2);
      var button_1 = child(div_6);
      button_1.__click = [proceed, showModal, currentUrl];
      var button_2 = sibling(button_1, 2);
      button_2.__click = [cancel, showModal];
      template_effect(() => set_text(text_3, get(currentUrl)));
      append($$anchor2, div_4);
    });
    var node_9 = sibling(node_8, 2);
    if_block(node_9, () => get(showHelpPopup), ($$anchor2) => {
      var div_7 = root_8();
      var div_8 = child(div_7);
      var div_9 = child(div_8);
      var node_10 = child(div_9);
      if_block(node_10, checkIfOutdated, ($$anchor3) => {
        var p_4 = root_9();
        var strong_1 = child(p_4);
        var text_4 = child(strong_1);
        template_effect(() => set_text(text_4, `Your script version is out of date - please install the latest
              version (${getLatestVersionInfo() ?? ""})!`));
        append($$anchor3, p_4);
      });
      var button_3 = sibling(div_9, 2);
      button_3.__click = [togglePopup, showHelpPopup, updateHelpClass];
      append($$anchor2, div_7);
    });
    template_effect(() => {
      set_attribute(a, "href", "https://learnablemeta.com/maps/" + $$props.mapId);
      set_class(span, `${get(helpClass) ?? ""} svelte-46slld`);
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
              panoId: lastRound.location.panoId,
              mapId: event2.detail.map.id
            }
          });
        });
      });
    });
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
  var root = /* @__PURE__ */ template(`<div class="geometa-map-label-container svelte-coney7"><p class="svelte-coney7">LearnableMeta Enabled</p> <a target="_blank"><button class="svelte-coney7">Meta List</button></a></div>`);
  function MapLabel($$anchor, $$props) {
    var div = root();
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
  function changelog() {
    return [
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
    initMapLabel();
  }

})();