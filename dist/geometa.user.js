// ==UserScript==
// @name         GeoGuessr Learnable Meta
// @namespace    geometa
// @version      0.2
// @author       monkey
// @description  UserScript for GeoGuessr Learnable Meta map
// @icon         https://www.google.com/s2/favicons?domain=geoguessr.com
// @downloadURL  https://github.com/likeon/geometa/raw/main/dist/geometa.user.js
// @updateURL    https://github.com/likeon/geometa/raw/main/dist/geometa.user.js
// @match        *://*.geoguessr.com/*
// @require      https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/3d3dcb7084098be16fa510b17294a5a3140dfa70/geoguessr-event-framework.min.js
// @connect      geometa-info-service.i-a38.workers.dev
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(t=>{if(typeof GM_addStyle=="function"){GM_addStyle(t);return}const e=document.createElement("style");e.textContent=t,document.head.append(e)})(" .loadership_ZOJAQ.svelte-1fzfwt6.svelte-1fzfwt6{display:flex;position:relative;width:72px;height:72px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6{position:absolute;width:8px;height:8px;border-radius:50%;background:#fff;animation:svelte-1fzfwt6-loadership_ZOJAQ_scale 1.2s infinite,svelte-1fzfwt6-loadership_ZOJAQ_fade 1.2s infinite;animation-timing-function:linear}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(1){animation-delay:0s;top:62px;left:32px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(2){animation-delay:-.1s;top:58px;left:47px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(3){animation-delay:-.2s;top:47px;left:58px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(4){animation-delay:-.3s;top:32px;left:62px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(5){animation-delay:-.4s;top:17px;left:58px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(6){animation-delay:-.5s;top:6px;left:47px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(7){animation-delay:-.6s;top:2px;left:32px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(8){animation-delay:-.7s;top:6px;left:17px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(9){animation-delay:-.8s;top:17px;left:6px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(10){animation-delay:-.9s;top:32px;left:2px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(11){animation-delay:-1s;top:47px;left:6px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(12){animation-delay:-1.1s;top:58px;left:17px}@keyframes svelte-1fzfwt6-loadership_ZOJAQ_scale{0%,20%,80%,to{transform:scale(1)}50%{transform:scale(1.5)}}@keyframes svelte-1fzfwt6-loadership_ZOJAQ_fade{0%,20%,80%,to{opacity:.8}50%{opacity:1}}.fi.svelte-7lhsry{width:1.5em;height:1em;display:inline-block;vertical-align:middle;padding-right:3px}.geometa-container.svelte-achwc1{position:absolute;top:50%;transform:translateY(-50%);left:1rem;z-index:9;display:flex;flex-direction:column;gap:5px;align-items:flex-start;background:var(--ds-color-purple-100);padding:6px 10px;border-radius:5px;font-size:17px;width:min(25%,500px);max-width:min(25%,500px)} ");

(function () {
  'use strict';

  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  function noop() {
  }
  function run(fn) {
    return fn();
  }
  function blank_object() {
    return /* @__PURE__ */ Object.create(null);
  }
  function run_all(fns) {
    fns.forEach(run);
  }
  function is_function(thing) {
    return typeof thing === "function";
  }
  function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || a && typeof a === "object" || typeof a === "function";
  }
  let src_url_equal_anchor;
  function src_url_equal(element_src, url) {
    if (element_src === url) return true;
    if (!src_url_equal_anchor) {
      src_url_equal_anchor = document.createElement("a");
    }
    src_url_equal_anchor.href = url;
    return element_src === src_url_equal_anchor.href;
  }
  function is_empty(obj) {
    return Object.keys(obj).length === 0;
  }
  function append(target, node) {
    target.appendChild(node);
  }
  function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
  }
  function detach(node) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
  function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
      if (iterations[i]) iterations[i].d(detaching);
    }
  }
  function element(name) {
    return document.createElement(name);
  }
  function text(data) {
    return document.createTextNode(data);
  }
  function space() {
    return text(" ");
  }
  function empty() {
    return text("");
  }
  function attr(node, attribute, value) {
    if (value == null) node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
  }
  function children(element2) {
    return Array.from(element2.childNodes);
  }
  function set_data(text2, data) {
    data = "" + data;
    if (text2.data === data) return;
    text2.data = /** @type {string} */
    data;
  }
  let current_component;
  function set_current_component(component) {
    current_component = component;
  }
  function get_current_component() {
    if (!current_component) throw new Error("Function called outside component initialization");
    return current_component;
  }
  function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
  }
  const dirty_components = [];
  const binding_callbacks = [];
  let render_callbacks = [];
  const flush_callbacks = [];
  const resolved_promise = /* @__PURE__ */ Promise.resolve();
  let update_scheduled = false;
  function schedule_update() {
    if (!update_scheduled) {
      update_scheduled = true;
      resolved_promise.then(flush);
    }
  }
  function add_render_callback(fn) {
    render_callbacks.push(fn);
  }
  const seen_callbacks = /* @__PURE__ */ new Set();
  let flushidx = 0;
  function flush() {
    if (flushidx !== 0) {
      return;
    }
    const saved_component = current_component;
    do {
      try {
        while (flushidx < dirty_components.length) {
          const component = dirty_components[flushidx];
          flushidx++;
          set_current_component(component);
          update(component.$$);
        }
      } catch (e) {
        dirty_components.length = 0;
        flushidx = 0;
        throw e;
      }
      set_current_component(null);
      dirty_components.length = 0;
      flushidx = 0;
      while (binding_callbacks.length) binding_callbacks.pop()();
      for (let i = 0; i < render_callbacks.length; i += 1) {
        const callback = render_callbacks[i];
        if (!seen_callbacks.has(callback)) {
          seen_callbacks.add(callback);
          callback();
        }
      }
      render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
      flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
  }
  function update($$) {
    if ($$.fragment !== null) {
      $$.update();
      run_all($$.before_update);
      const dirty = $$.dirty;
      $$.dirty = [-1];
      $$.fragment && $$.fragment.p($$.ctx, dirty);
      $$.after_update.forEach(add_render_callback);
    }
  }
  function flush_render_callbacks(fns) {
    const filtered = [];
    const targets = [];
    render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
    targets.forEach((c) => c());
    render_callbacks = filtered;
  }
  const outroing = /* @__PURE__ */ new Set();
  let outros;
  function group_outros() {
    outros = {
      r: 0,
      c: [],
      p: outros
      // parent group
    };
  }
  function check_outros() {
    if (!outros.r) {
      run_all(outros.c);
    }
    outros = outros.p;
  }
  function transition_in(block, local) {
    if (block && block.i) {
      outroing.delete(block);
      block.i(local);
    }
  }
  function transition_out(block, local, detach2, callback) {
    if (block && block.o) {
      if (outroing.has(block)) return;
      outroing.add(block);
      outros.c.push(() => {
        outroing.delete(block);
        if (callback) {
          if (detach2) block.d(1);
          callback();
        }
      });
      block.o(local);
    } else if (callback) {
      callback();
    }
  }
  function ensure_array_like(array_like_or_iterator) {
    return (array_like_or_iterator == null ? void 0 : array_like_or_iterator.length) !== void 0 ? array_like_or_iterator : Array.from(array_like_or_iterator);
  }
  function create_component(block) {
    block && block.c();
  }
  function mount_component(component, target, anchor) {
    const { fragment, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    add_render_callback(() => {
      const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
      if (component.$$.on_destroy) {
        component.$$.on_destroy.push(...new_on_destroy);
      } else {
        run_all(new_on_destroy);
      }
      component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
  }
  function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
      flush_render_callbacks($$.after_update);
      run_all($$.on_destroy);
      $$.fragment && $$.fragment.d(detaching);
      $$.on_destroy = $$.fragment = null;
      $$.ctx = [];
    }
  }
  function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
      dirty_components.push(component);
      schedule_update();
      component.$$.dirty.fill(0);
    }
    component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
  }
  function init(component, options, instance2, create_fragment2, not_equal, props, append_styles = null, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
      fragment: null,
      ctx: [],
      // state
      props,
      update: noop,
      not_equal,
      bound: blank_object(),
      // lifecycle
      on_mount: [],
      on_destroy: [],
      on_disconnect: [],
      before_update: [],
      after_update: [],
      context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
      // everything else
      callbacks: blank_object(),
      dirty,
      skip_bound: false,
      root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance2 ? instance2(component, options.props || {}, (i, ret, ...rest) => {
      const value = rest.length ? rest[0] : ret;
      if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
        if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
        if (ready) make_dirty(component, i);
      }
      return ret;
    }) : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    $$.fragment = create_fragment2 ? create_fragment2($$.ctx) : false;
    if (options.target) {
      if (options.hydrate) {
        const nodes = children(options.target);
        $$.fragment && $$.fragment.l(nodes);
        nodes.forEach(detach);
      } else {
        $$.fragment && $$.fragment.c();
      }
      if (options.intro) transition_in(component.$$.fragment);
      mount_component(component, options.target, options.anchor);
      flush();
    }
    set_current_component(parent_component);
  }
  class SvelteComponent {
    constructor() {
      /**
       * ### PRIVATE API
       *
       * Do not use, may change at any time
       *
       * @type {any}
       */
      __publicField(this, "$$");
      /**
       * ### PRIVATE API
       *
       * Do not use, may change at any time
       *
       * @type {any}
       */
      __publicField(this, "$$set");
    }
    /** @returns {void} */
    $destroy() {
      destroy_component(this, 1);
      this.$destroy = noop;
    }
    /**
     * @template {Extract<keyof Events, string>} K
     * @param {K} type
     * @param {((e: Events[K]) => void) | null | undefined} callback
     * @returns {() => void}
     */
    $on(type, callback) {
      if (!is_function(callback)) {
        return noop;
      }
      const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
      };
    }
    /**
     * @param {Partial<Props>} props
     * @returns {void}
     */
    $set(props) {
      if (this.$$set && !is_empty(props)) {
        this.$$.skip_bound = true;
        this.$$set(props);
        this.$$.skip_bound = false;
      }
    }
  }
  const PUBLIC_VERSION = "4";
  if (typeof window !== "undefined")
    (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add(PUBLIC_VERSION);
  var _GM_xmlhttpRequest = /* @__PURE__ */ (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
  var _unsafeWindow = /* @__PURE__ */ (() => typeof unsafeWindow != "undefined" ? unsafeWindow : void 0)();
  function create_fragment$2(ctx) {
    let div12;
    return {
      c() {
        div12 = element("div");
        div12.innerHTML = `<div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div> <div class="svelte-1fzfwt6"></div>`;
        attr(div12, "class", "loadership_ZOJAQ svelte-1fzfwt6");
      },
      m(target, anchor) {
        insert(target, div12, anchor);
      },
      p: noop,
      i: noop,
      o: noop,
      d(detaching) {
        if (detaching) {
          detach(div12);
        }
      }
    };
  }
  class Spinner extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, null, create_fragment$2, safe_not_equal, {});
    }
  }
  function create_if_block$1(ctx) {
    let img;
    let img_src_value;
    return {
      c() {
        img = element("img");
        attr(img, "class", "fi svelte-7lhsry");
        attr(
          img,
          "alt",
          /*countryName*/
          ctx[0]
        );
        if (!src_url_equal(img.src, img_src_value = "https://purecatamphetamine.github.io/country-flag-icons/3x2/" + /*countryCode*/
        ctx[1].toUpperCase() + ".svg")) attr(img, "src", img_src_value);
      },
      m(target, anchor) {
        insert(target, img, anchor);
      },
      p(ctx2, dirty) {
        if (dirty & /*countryName*/
        1) {
          attr(
            img,
            "alt",
            /*countryName*/
            ctx2[0]
          );
        }
      },
      d(detaching) {
        if (detaching) {
          detach(img);
        }
      }
    };
  }
  function create_fragment$1(ctx) {
    let if_block_anchor;
    let if_block = (
      /*countryCode*/
      ctx[1] && create_if_block$1(ctx)
    );
    return {
      c() {
        if (if_block) if_block.c();
        if_block_anchor = empty();
      },
      m(target, anchor) {
        if (if_block) if_block.m(target, anchor);
        insert(target, if_block_anchor, anchor);
      },
      p(ctx2, [dirty]) {
        if (
          /*countryCode*/
          ctx2[1]
        ) if_block.p(ctx2, dirty);
      },
      i: noop,
      o: noop,
      d(detaching) {
        if (detaching) {
          detach(if_block_anchor);
        }
        if (if_block) if_block.d(detaching);
      }
    };
  }
  function instance$1($$self, $$props, $$invalidate) {
    let { countryName } = $$props;
    const countryCodes = {
      "Afghanistan": "af",
      "Albania": "al",
      "Algeria": "dz",
      "Andorra": "ad",
      "Angola": "ao",
      "Antigua and Barbuda": "ag",
      "Argentina": "ar",
      "Armenia": "am",
      "Australia": "au",
      "Austria": "at",
      "Azerbaijan": "az",
      "Bahamas": "bs",
      "Bahrain": "bh",
      "Bangladesh": "bd",
      "Barbados": "bb",
      "Belarus": "by",
      "Belgium": "be",
      "Belize": "bz",
      "Benin": "bj",
      "Bhutan": "bt",
      "Bolivia": "bo",
      "Bosnia and Herzegovina": "ba",
      "Botswana": "bw",
      "Brazil": "br",
      "Brunei": "bn",
      "Bulgaria": "bg",
      "Burkina Faso": "bf",
      "Burundi": "bi",
      "Cabo Verde": "cv",
      "Cambodia": "kh",
      "Cameroon": "cm",
      "Canada": "ca",
      "Central African Republic": "cf",
      "Chad": "td",
      "Chile": "cl",
      "China": "cn",
      "Colombia": "co",
      "Comoros": "km",
      "Congo (Congo-Brazzaville)": "cg",
      "Costa Rica": "cr",
      "Croatia": "hr",
      "Cuba": "cu",
      "Cyprus": "cy",
      "Czechia (Czech Republic)": "cz",
      "Democratic Republic of the Congo": "cd",
      "Denmark": "dk",
      "Djibouti": "dj",
      "Dominica": "dm",
      "Dominican Republic": "do",
      "Ecuador": "ec",
      "Egypt": "eg",
      "El Salvador": "sv",
      "Equatorial Guinea": "gq",
      "Eritrea": "er",
      "Estonia": "ee",
      'Eswatini (fmr. "Swaziland")': "sz",
      "Ethiopia": "et",
      "Fiji": "fj",
      "Finland": "fi",
      "France": "fr",
      "Gabon": "ga",
      "Gambia": "gm",
      "Georgia": "ge",
      "Germany": "de",
      "Ghana": "gh",
      "Greece": "gr",
      "Grenada": "gd",
      "Guatemala": "gt",
      "Guinea": "gn",
      "Guinea-Bissau": "gw",
      "Guyana": "gy",
      "Haiti": "ht",
      "Honduras": "hn",
      "Hungary": "hu",
      "Iceland": "is",
      "India": "in",
      "Indonesia": "id",
      "Iran": "ir",
      "Iraq": "iq",
      "Ireland": "ie",
      "Israel": "il",
      "Italy": "it",
      "Jamaica": "jm",
      "Japan": "jp",
      "Jordan": "jo",
      "Kazakhstan": "kz",
      "Kenya": "ke",
      "Kiribati": "ki",
      "Kuwait": "kw",
      "Kyrgyzstan": "kg",
      "Laos": "la",
      "Latvia": "lv",
      "Lebanon": "lb",
      "Lesotho": "ls",
      "Liberia": "lr",
      "Libya": "ly",
      "Liechtenstein": "li",
      "Lithuania": "lt",
      "Luxembourg": "lu",
      "Madagascar": "mg",
      "Malawi": "mw",
      "Malaysia": "my",
      "Maldives": "mv",
      "Mali": "ml",
      "Malta": "mt",
      "Marshall Islands": "mh",
      "Mauritania": "mr",
      "Mauritius": "mu",
      "Mexico": "mx",
      "Micronesia": "fm",
      "Moldova": "md",
      "Monaco": "mc",
      "Mongolia": "mn",
      "Montenegro": "me",
      "Morocco": "ma",
      "Mozambique": "mz",
      "Myanmar (formerly Burma)": "mm",
      "Namibia": "na",
      "Nauru": "nr",
      "Nepal": "np",
      "Netherlands": "nl",
      "New Zealand": "nz",
      "Nicaragua": "ni",
      "Niger": "ne",
      "Nigeria": "ng",
      "North Korea": "kp",
      "North Macedonia (formerly Macedonia)": "mk",
      "Norway": "no",
      "Oman": "om",
      "Pakistan": "pk",
      "Palau": "pw",
      "Palestine State": "ps",
      "Panama": "pa",
      "Papua New Guinea": "pg",
      "Paraguay": "py",
      "Peru": "pe",
      "Philippines": "ph",
      "Poland": "pl",
      "Portugal": "pt",
      "Qatar": "qa",
      "Romania": "ro",
      "Russia": "ru",
      "Rwanda": "rw",
      "Saint Kitts and Nevis": "kn",
      "Saint Lucia": "lc",
      "Saint Vincent and the Grenadines": "vc",
      "Samoa": "ws",
      "San Marino": "sm",
      "Sao Tome and Principe": "st",
      "Saudi Arabia": "sa",
      "Senegal": "sn",
      "Serbia": "rs",
      "Seychelles": "sc",
      "Sierra Leone": "sl",
      "Singapore": "sg",
      "Slovakia": "sk",
      "Slovenia": "si",
      "Solomon Islands": "sb",
      "Somalia": "so",
      "South Africa": "za",
      "South Korea": "kr",
      "South Sudan": "ss",
      "Spain": "es",
      "Sri Lanka": "lk",
      "Sudan": "sd",
      "Suriname": "sr",
      "Sweden": "se",
      "Switzerland": "ch",
      "Syria": "sy",
      "Taiwan": "tw",
      "Tajikistan": "tj",
      "Tanzania": "tz",
      "Thailand": "th",
      "Timor-Leste": "tl",
      "Togo": "tg",
      "Tonga": "to",
      "Trinidad and Tobago": "tt",
      "Tunisia": "tn",
      "Turkey": "tr",
      "Turkmenistan": "tm",
      "Tuvalu": "tv",
      "Uganda": "ug",
      "Ukraine": "ua",
      "United Arab Emirates": "ae",
      "United Kingdom": "gb",
      "United States of America": "us",
      "Uruguay": "uy",
      "Uzbekistan": "uz",
      "Vanuatu": "vu",
      "Vatican City": "va",
      "Venezuela": "ve",
      "Vietnam": "vn",
      "Yemen": "ye",
      "Zambia": "zm",
      "Zimbabwe": "zw"
    };
    const countryCode = countryCodes[countryName];
    $$self.$$set = ($$props2) => {
      if ("countryName" in $$props2) $$invalidate(0, countryName = $$props2.countryName);
    };
    return [countryName, countryCode];
  }
  class CountryFlag extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance$1, create_fragment$1, safe_not_equal, { countryName: 0 });
    }
  }
  function waitForElement(selector) {
    return new Promise((resolve) => {
      const existingElement = document.querySelector(selector);
      if (existingElement) {
        resolve(existingElement);
        return;
      }
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            const element2 = document.querySelector(selector);
            if (element2) {
              observer.disconnect();
              resolve(element2);
              return;
            }
          }
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }
  function cutToTwoDecimals(num) {
    const fixed = num.toFixed(2);
    return fixed.replace(/\.?0+$/, "");
  }
  function get_each_context(ctx, list, i) {
    const child_ctx = ctx.slice();
    child_ctx[4] = list[i];
    child_ctx[6] = i;
    return child_ctx;
  }
  function create_else_block(ctx) {
    let spinner;
    let current;
    spinner = new Spinner({});
    return {
      c() {
        create_component(spinner.$$.fragment);
      },
      m(target, anchor) {
        mount_component(spinner, target, anchor);
        current = true;
      },
      p: noop,
      i(local) {
        if (current) return;
        transition_in(spinner.$$.fragment, local);
        current = true;
      },
      o(local) {
        transition_out(spinner.$$.fragment, local);
        current = false;
      },
      d(detaching) {
        destroy_component(spinner, detaching);
      }
    };
  }
  function create_if_block_1(ctx) {
    let each_1_anchor;
    let current;
    let each_value = ensure_array_like(
      /*geoInfo*/
      ctx[0]
    );
    let each_blocks = [];
    for (let i = 0; i < each_value.length; i += 1) {
      each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    }
    const out = (i) => transition_out(each_blocks[i], 1, 1, () => {
      each_blocks[i] = null;
    });
    return {
      c() {
        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].c();
        }
        each_1_anchor = empty();
      },
      m(target, anchor) {
        for (let i = 0; i < each_blocks.length; i += 1) {
          if (each_blocks[i]) {
            each_blocks[i].m(target, anchor);
          }
        }
        insert(target, each_1_anchor, anchor);
        current = true;
      },
      p(ctx2, dirty) {
        if (dirty & /*geoInfo*/
        1) {
          each_value = ensure_array_like(
            /*geoInfo*/
            ctx2[0]
          );
          let i;
          for (i = 0; i < each_value.length; i += 1) {
            const child_ctx = get_each_context(ctx2, each_value, i);
            if (each_blocks[i]) {
              each_blocks[i].p(child_ctx, dirty);
              transition_in(each_blocks[i], 1);
            } else {
              each_blocks[i] = create_each_block(child_ctx);
              each_blocks[i].c();
              transition_in(each_blocks[i], 1);
              each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
            }
          }
          group_outros();
          for (i = each_value.length; i < each_blocks.length; i += 1) {
            out(i);
          }
          check_outros();
        }
      },
      i(local) {
        if (current) return;
        for (let i = 0; i < each_value.length; i += 1) {
          transition_in(each_blocks[i]);
        }
        current = true;
      },
      o(local) {
        each_blocks = each_blocks.filter(Boolean);
        for (let i = 0; i < each_blocks.length; i += 1) {
          transition_out(each_blocks[i]);
        }
        current = false;
      },
      d(detaching) {
        if (detaching) {
          detach(each_1_anchor);
        }
        destroy_each(each_blocks, detaching);
      }
    };
  }
  function create_if_block(ctx) {
    let p;
    let t0;
    let t1;
    return {
      c() {
        p = element("p");
        t0 = text("Error: ");
        t1 = text(
          /*error*/
          ctx[1]
        );
      },
      m(target, anchor) {
        insert(target, p, anchor);
        append(p, t0);
        append(p, t1);
      },
      p(ctx2, dirty) {
        if (dirty & /*error*/
        2) set_data(
          t1,
          /*error*/
          ctx2[1]
        );
      },
      i: noop,
      o: noop,
      d(detaching) {
        if (detaching) {
          detach(p);
        }
      }
    };
  }
  function create_if_block_2(ctx) {
    let hr;
    return {
      c() {
        hr = element("hr");
      },
      m(target, anchor) {
        insert(target, hr, anchor);
      },
      d(detaching) {
        if (detaching) {
          detach(hr);
        }
      }
    };
  }
  function create_each_block(ctx) {
    let t0;
    let p0;
    let t1;
    let countryflag;
    let t2;
    let strong0;
    let t3_value = (
      /*geoItem*/
      ctx[4].country + ""
    );
    let t3;
    let t4;
    let p1;
    let t5;
    let strong1;
    let t6_value = (
      /*geoItem*/
      ctx[4].type + ""
    );
    let t6;
    let t7;
    let p2;
    let t8;
    let t9_value = (
      /*geoItem*/
      ctx[4].notes + ""
    );
    let t9;
    let current;
    let if_block = (
      /*index*/
      ctx[6] !== 0 && create_if_block_2()
    );
    countryflag = new CountryFlag({
      props: { countryName: (
        /*geoItem*/
        ctx[4].country
      ) }
    });
    return {
      c() {
        if (if_block) if_block.c();
        t0 = space();
        p0 = element("p");
        t1 = text("Country:\n        ");
        create_component(countryflag.$$.fragment);
        t2 = space();
        strong0 = element("strong");
        t3 = text(t3_value);
        t4 = space();
        p1 = element("p");
        t5 = text("Meta type: ");
        strong1 = element("strong");
        t6 = text(t6_value);
        t7 = space();
        p2 = element("p");
        t8 = text("Notes: ");
        t9 = text(t9_value);
      },
      m(target, anchor) {
        if (if_block) if_block.m(target, anchor);
        insert(target, t0, anchor);
        insert(target, p0, anchor);
        append(p0, t1);
        mount_component(countryflag, p0, null);
        append(p0, t2);
        append(p0, strong0);
        append(strong0, t3);
        insert(target, t4, anchor);
        insert(target, p1, anchor);
        append(p1, t5);
        append(p1, strong1);
        append(strong1, t6);
        insert(target, t7, anchor);
        insert(target, p2, anchor);
        append(p2, t8);
        append(p2, t9);
        current = true;
      },
      p(ctx2, dirty) {
        const countryflag_changes = {};
        if (dirty & /*geoInfo*/
        1) countryflag_changes.countryName = /*geoItem*/
        ctx2[4].country;
        countryflag.$set(countryflag_changes);
        if ((!current || dirty & /*geoInfo*/
        1) && t3_value !== (t3_value = /*geoItem*/
        ctx2[4].country + "")) set_data(t3, t3_value);
        if ((!current || dirty & /*geoInfo*/
        1) && t6_value !== (t6_value = /*geoItem*/
        ctx2[4].type + "")) set_data(t6, t6_value);
        if ((!current || dirty & /*geoInfo*/
        1) && t9_value !== (t9_value = /*geoItem*/
        ctx2[4].notes + "")) set_data(t9, t9_value);
      },
      i(local) {
        if (current) return;
        transition_in(countryflag.$$.fragment, local);
        current = true;
      },
      o(local) {
        transition_out(countryflag.$$.fragment, local);
        current = false;
      },
      d(detaching) {
        if (detaching) {
          detach(t0);
          detach(p0);
          detach(t4);
          detach(p1);
          detach(t7);
          detach(p2);
        }
        if (if_block) if_block.d(detaching);
        destroy_component(countryflag);
      }
    };
  }
  function create_fragment(ctx) {
    let div;
    let h2;
    let t1;
    let current_block_type_index;
    let if_block;
    let current;
    const if_block_creators = [create_if_block, create_if_block_1, create_else_block];
    const if_blocks = [];
    function select_block_type(ctx2, dirty) {
      if (
        /*error*/
        ctx2[1]
      ) return 0;
      if (
        /*geoInfo*/
        ctx2[0]
      ) return 1;
      return 2;
    }
    current_block_type_index = select_block_type(ctx);
    if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    return {
      c() {
        div = element("div");
        h2 = element("h2");
        h2.textContent = "GeoMeta";
        t1 = space();
        if_block.c();
        attr(div, "class", "geometa-container svelte-achwc1");
      },
      m(target, anchor) {
        insert(target, div, anchor);
        append(div, h2);
        append(div, t1);
        if_blocks[current_block_type_index].m(div, null);
        current = true;
      },
      p(ctx2, [dirty]) {
        let previous_block_index = current_block_type_index;
        current_block_type_index = select_block_type(ctx2);
        if (current_block_type_index === previous_block_index) {
          if_blocks[current_block_type_index].p(ctx2, dirty);
        } else {
          group_outros();
          transition_out(if_blocks[previous_block_index], 1, 1, () => {
            if_blocks[previous_block_index] = null;
          });
          check_outros();
          if_block = if_blocks[current_block_type_index];
          if (!if_block) {
            if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
            if_block.c();
          } else {
            if_block.p(ctx2, dirty);
          }
          transition_in(if_block, 1);
          if_block.m(div, null);
        }
      },
      i(local) {
        if (current) return;
        transition_in(if_block);
        current = true;
      },
      o(local) {
        transition_out(if_block);
        current = false;
      },
      d(detaching) {
        if (detaching) {
          detach(div);
        }
        if_blocks[current_block_type_index].d();
      }
    };
  }
  function instance($$self, $$props, $$invalidate) {
    let { lat = 0 } = $$props;
    let { lng = 0 } = $$props;
    let geoInfo = null;
    let error = null;
    onMount(() => {
      const cutLat = cutToTwoDecimals(lat);
      const cutLng = cutToTwoDecimals(lng);
      const url = `https://geometa-info-service.i-a38.workers.dev/?coordinates=${cutLat},${cutLng}`;
      _GM_xmlhttpRequest({
        method: "GET",
        url,
        onload: (response) => {
          if (response.status === 200) {
            try {
              $$invalidate(0, geoInfo = JSON.parse(response.responseText));
            } catch (e) {
              $$invalidate(1, error = "Failed to parse response");
            }
          } else if (response.status === 404) {
            $$invalidate(1, error = "Meta for this location not found");
          } else {
            $$invalidate(1, error = `HTTP error! status: ${response.status}`);
          }
        },
        onerror: (e) => {
          $$invalidate(1, error = "An error occurred while fetching data");
          console.error("Error:", e);
        }
      });
    });
    $$self.$$set = ($$props2) => {
      if ("lat" in $$props2) $$invalidate(2, lat = $$props2.lat);
      if ("lng" in $$props2) $$invalidate(3, lng = $$props2.lng);
    };
    return [geoInfo, error, lat, lng];
  }
  class App extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance, create_fragment, safe_not_equal, { lat: 2, lng: 3 });
    }
  }
  const GeoGuessrEventFramework = _unsafeWindow.GeoGuessrEventFramework;
  const metaMapId = "66c0d3feff4dbe492e06174e";
  GeoGuessrEventFramework.init().then(() => {
    GeoGuessrEventFramework.events.addEventListener("round_end", (event) => {
      if (event.detail.map.id != metaMapId) return;
      waitForElement('div[data-qa="result-view-top"]').then((container) => {
        const element2 = document.createElement("div");
        element2.id = "geometa-summary";
        container.appendChild(element2);
        const lastRound = event.detail.rounds[event.detail.rounds.length - 1];
        new App({
          target: element2,
          props: {
            lat: lastRound.location.lat,
            lng: lastRound.location.lng
          }
        });
      });
    });
  });

})();