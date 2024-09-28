// ==UserScript==
// @name         GeoGuessr Learnable Meta
// @namespace    geometa
// @version      0.5
// @author       monkey
// @description  UserScript for GeoGuessr Learnable Meta maps
// @icon         https://learnablemeta.com/favicon.png
// @downloadURL  https://github.com/likeon/geometa/raw/main/dist/geometa.user.js
// @updateURL    https://github.com/likeon/geometa/raw/main/dist/geometa.user.js
// @match        *://*.geoguessr.com/*
// @require      https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/dbbeb296542ad6c171767e43638c1ecf7adc3bc1/geoguessr-event-framework.js
// @connect      learnablemeta.com
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(e=>{if(typeof GM_addStyle=="function"){GM_addStyle(e);return}const t=document.createElement("style");t.textContent=e,document.head.append(t)})(` .loadership_ZOJAQ.svelte-1fzfwt6.svelte-1fzfwt6{display:flex;position:relative;width:72px;height:72px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6{position:absolute;width:8px;height:8px;border-radius:50%;background:#fff;animation:svelte-1fzfwt6-loadership_ZOJAQ_scale 1.2s infinite,svelte-1fzfwt6-loadership_ZOJAQ_fade 1.2s infinite;animation-timing-function:linear}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(1){animation-delay:0s;top:62px;left:32px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(2){animation-delay:-.1s;top:58px;left:47px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(3){animation-delay:-.2s;top:47px;left:58px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(4){animation-delay:-.3s;top:32px;left:62px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(5){animation-delay:-.4s;top:17px;left:58px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(6){animation-delay:-.5s;top:6px;left:47px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(7){animation-delay:-.6s;top:2px;left:32px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(8){animation-delay:-.7s;top:6px;left:17px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(9){animation-delay:-.8s;top:17px;left:6px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(10){animation-delay:-.9s;top:32px;left:2px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(11){animation-delay:-1s;top:47px;left:6px}.loadership_ZOJAQ.svelte-1fzfwt6 div.svelte-1fzfwt6:nth-child(12){animation-delay:-1.1s;top:58px;left:17px}@keyframes svelte-1fzfwt6-loadership_ZOJAQ_scale{0%,20%,80%,to{transform:scale(1)}50%{transform:scale(1.5)}}@keyframes svelte-1fzfwt6-loadership_ZOJAQ_fade{0%,20%,80%,to{opacity:.8}50%{opacity:1}}.fi.svelte-7lhsry{width:1.5em;height:1em;display:inline-block;vertical-align:middle;padding-right:3px}.geometa-container.svelte-w42zs8.svelte-w42zs8{position:absolute;top:50%;transform:translateY(-50%);left:1rem;z-index:9;display:flex;flex-direction:column;gap:5px;align-items:flex-start;background:var(--ds-color-purple-100);padding:6px 10px;border-radius:5px;font-size:17px;width:min(25%,500px);max-width:min(25%,500px)}.plonkit-note.svelte-w42zs8.svelte-w42zs8{color:#d3d3d3;font-size:small}a.svelte-w42zs8.svelte-w42zs8{color:#188bd2}a.svelte-w42zs8.svelte-w42zs8:hover{text-decoration:underline}.skill-icons--discord.svelte-w42zs8.svelte-w42zs8{display:inline-block;width:1.2rem;height:1.2rem;margin-left:2px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cg fill='none'%3E%3Crect width='256' height='256' fill='%235865f2' rx='60'/%3E%3Cg clip-path='url(%23skillIconsDiscord0)'%3E%3Cpath fill='%23ffffff' d='M197.308 64.797a165 165 0 0 0-40.709-12.627a.62.62 0 0 0-.654.31c-1.758 3.126-3.706 7.206-5.069 10.412c-15.373-2.302-30.666-2.302-45.723 0c-1.364-3.278-3.382-7.286-5.148-10.412a.64.64 0 0 0-.655-.31a164.5 164.5 0 0 0-40.709 12.627a.6.6 0 0 0-.268.23c-25.928 38.736-33.03 76.52-29.546 113.836a.7.7 0 0 0 .26.468c17.106 12.563 33.677 20.19 49.94 25.245a.65.65 0 0 0 .702-.23c3.847-5.254 7.276-10.793 10.217-16.618a.633.633 0 0 0-.347-.881c-5.44-2.064-10.619-4.579-15.601-7.436a.642.642 0 0 1-.063-1.064a86 86 0 0 0 3.098-2.428a.62.62 0 0 1 .646-.088c32.732 14.944 68.167 14.944 100.512 0a.62.62 0 0 1 .655.08a80 80 0 0 0 3.106 2.436a.642.642 0 0 1-.055 1.064a102.6 102.6 0 0 1-15.609 7.428a.64.64 0 0 0-.339.889a133 133 0 0 0 10.208 16.61a.64.64 0 0 0 .702.238c16.342-5.055 32.913-12.682 50.02-25.245a.65.65 0 0 0 .26-.46c4.17-43.141-6.985-80.616-29.571-113.836a.5.5 0 0 0-.26-.238M94.834 156.142c-9.855 0-17.975-9.047-17.975-20.158s7.963-20.158 17.975-20.158c10.09 0 18.131 9.127 17.973 20.158c0 11.111-7.962 20.158-17.973 20.158m66.456 0c-9.855 0-17.974-9.047-17.974-20.158s7.962-20.158 17.974-20.158c10.09 0 18.131 9.127 17.974 20.158c0 11.111-7.884 20.158-17.974 20.158'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='skillIconsDiscord0'%3E%3Cpath fill='%23ffffff' d='M28 51h200v154.93H28z'/%3E%3C/clipPath%3E%3C/defs%3E%3C/g%3E%3C/svg%3E")}.flat-color-icons--globe.svelte-w42zs8.svelte-w42zs8{display:inline-block;width:1.2rem;height:1.2rem;margin-left:5px;background-repeat:no-repeat;background-size:100% 100%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%237cb342' d='M24 4C13 4 4 13 4 24s9 20 20 20s20-9 20-20S35 4 24 4'/%3E%3Cpath fill='%230277bd' d='M45 24c0 11.7-9.5 21-21 21S3 35.7 3 24S12.3 3 24 3s21 9.3 21 21m-21.2 9.7c0-.4-.2-.6-.6-.8c-1.3-.4-2.5-.4-3.6-1.5c-.2-.4-.2-.8-.4-1.3c-.4-.4-1.5-.6-2.1-.8h-4.2c-.6-.2-1.1-1.1-1.5-1.7c0-.2 0-.6-.4-.6c-.4-.2-.8.2-1.3 0c-.2-.2-.2-.4-.2-.6c0-.6.4-1.3.8-1.7c.6-.4 1.3.2 1.9.2c.2 0 .2 0 .4.2c.6.2.8 1 .8 1.7v.4c0 .2.2.2.4.2c.2-1.1.2-2.1.4-3.2c0-1.3 1.3-2.5 2.3-2.9c.4-.2.6.2 1.1 0c1.3-.4 4.4-1.7 3.8-3.4c-.4-1.5-1.7-2.9-3.4-2.7c-.4.2-.6.4-1 .6c-.6.4-1.9 1.7-2.5 1.7c-1.1-.2-1.1-1.7-.8-2.3c.2-.8 2.1-3.6 3.4-3.1l.8.8c.4.2 1.1.2 1.7.2c.2 0 .4 0 .6-.2s.2-.2.2-.4c0-.6-.6-1.3-1-1.7s-1.1-.8-1.7-1.1c-2.1-.6-5.5.2-7.1 1.7s-2.9 4-3.8 6.1c-.4 1.3-.8 2.9-1 4.4c-.2 1-.4 1.9.2 2.9c.6 1.3 1.9 2.5 3.2 3.4c.8.6 2.5.6 3.4 1.7c.6.8.4 1.9.4 2.9c0 1.3.8 2.3 1.3 3.4c.2.6.4 1.5.6 2.1c0 .2.2 1.5.2 1.7c1.3.6 2.3 1.3 3.8 1.7c.2 0 1-1.3 1-1.5c.6-.6 1.1-1.5 1.7-1.9c.4-.2.8-.4 1.3-.8c.4-.4.6-1.3.8-1.9c.1-.5.3-1.3.1-1.9m.4-19.4c.2 0 .4-.2.8-.4c.6-.4 1.3-1.1 1.9-1.5s1.3-1.1 1.7-1.5c.6-.4 1.1-1.3 1.3-1.9c.2-.4.8-1.3.6-1.9c-.2-.4-1.3-.6-1.7-.8c-1.7-.4-3.1-.6-4.8-.6c-.6 0-1.5.2-1.7.8c-.2 1.1.6.8 1.5 1.1c0 0 .2 1.7.2 1.9c.2 1-.4 1.7-.4 2.7c0 .6 0 1.7.4 2.1zM41.8 29c.2-.4.2-1.1.4-1.5c.2-1 .2-2.1.2-3.1c0-2.1-.2-4.2-.8-6.1c-.4-.6-.6-1.3-.8-1.9c-.4-1.1-1-2.1-1.9-2.9c-.8-1.1-1.9-4-3.8-3.1c-.6.2-1 1-1.5 1.5c-.4.6-.8 1.3-1.3 1.9c-.2.2-.4.6-.2.8c0 .2.2.2.4.2c.4.2.6.2 1 .4c.2 0 .4.2.2.4c0 0 0 .2-.2.2c-1 1.1-2.1 1.9-3.1 2.9c-.2.2-.4.6-.4.8s.2.2.2.4s-.2.2-.4.4c-.4.2-.8.4-1.1.6c-.2.4 0 1.1-.2 1.5c-.2 1.1-.8 1.9-1.3 2.9c-.4.6-.6 1.3-1 1.9c0 .8-.2 1.5.2 2.1c1 1.5 2.9.6 4.4 1.3c.4.2.8.2 1.1.6c.6.6.6 1.7.8 2.3c.2.8.4 1.7.8 2.5c.2 1 .6 2.1.8 2.9c1.9-1.5 3.6-3.1 4.8-5.2c1.5-1.3 2.1-3 2.7-4.7'/%3E%3C/svg%3E")}.skill-icons--discord.svelte-w42zs8.svelte-w42zs8,.flat-color-icons--globe.svelte-w42zs8.svelte-w42zs8{display:inline-block;vertical-align:middle}.flex.svelte-w42zs8.svelte-w42zs8{display:flex;align-items:center}.icons.svelte-w42zs8 a span.svelte-w42zs8{align-items:center;justify-content:center} `);

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
      "Congo": "cg",
      "Costa Rica": "cr",
      "Croatia": "hr",
      "Cuba": "cu",
      "Curacao": "cw",
      "Cyprus": "cy",
      "Czechia": "cz",
      "Christmas Island": "cx",
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
      "Eswatini": "sz",
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
      "Myanmar": "mm",
      "Namibia": "na",
      "Nauru": "nr",
      "Nepal": "np",
      "Netherlands": "nl",
      "New Zealand": "nz",
      "Nicaragua": "ni",
      "Niger": "ne",
      "Nigeria": "ng",
      "North Korea": "kp",
      "North Macedonia": "mk",
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
      "Puerto Rico": "pr",
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
      "United States": "us",
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
    let p0;
    let t0;
    let countryflag;
    let t1;
    let strong0;
    let t2_value = (
      /*geoInfo*/
      ctx[0].country + ""
    );
    let t2;
    let t3;
    let p1;
    let t4;
    let strong1;
    let t5_value = (
      /*geoInfo*/
      ctx[0].metaName + ""
    );
    let t5;
    let t6;
    let p2;
    let t7;
    let t8_value = (
      /*geoInfo*/
      ctx[0].note + ""
    );
    let t8;
    let t9;
    let p3;
    let t10;
    let a;
    let t11;
    let t12_value = (
      /*geoInfo*/
      ctx[0].country + ""
    );
    let t12;
    let t13;
    let a_href_value;
    let current;
    countryflag = new CountryFlag({
      props: { countryName: (
        /*geoInfo*/
        ctx[0].country
      ) }
    });
    return {
      c() {
        p0 = element("p");
        t0 = text("Country:\n      ");
        create_component(countryflag.$$.fragment);
        t1 = space();
        strong0 = element("strong");
        t2 = text(t2_value);
        t3 = space();
        p1 = element("p");
        t4 = text("Meta type: ");
        strong1 = element("strong");
        t5 = text(t5_value);
        t6 = space();
        p2 = element("p");
        t7 = text("Note: ");
        t8 = text(t8_value);
        t9 = space();
        p3 = element("p");
        t10 = text("Check out more ");
        a = element("a");
        t11 = text("country clues\n      about ");
        t12 = text(t12_value);
        t13 = text(" on Plonk\n      It");
        attr(a, "href", a_href_value = /*geoInfo*/
        ctx[0].plonkitCountryUrl);
        attr(a, "target", "_blank");
        attr(a, "class", "svelte-w42zs8");
        attr(p3, "class", "plonkit-note svelte-w42zs8");
      },
      m(target, anchor) {
        insert(target, p0, anchor);
        append(p0, t0);
        mount_component(countryflag, p0, null);
        append(p0, t1);
        append(p0, strong0);
        append(strong0, t2);
        insert(target, t3, anchor);
        insert(target, p1, anchor);
        append(p1, t4);
        append(p1, strong1);
        append(strong1, t5);
        insert(target, t6, anchor);
        insert(target, p2, anchor);
        append(p2, t7);
        append(p2, t8);
        insert(target, t9, anchor);
        insert(target, p3, anchor);
        append(p3, t10);
        append(p3, a);
        append(a, t11);
        append(a, t12);
        append(a, t13);
        current = true;
      },
      p(ctx2, dirty) {
        const countryflag_changes = {};
        if (dirty & /*geoInfo*/
        1) countryflag_changes.countryName = /*geoInfo*/
        ctx2[0].country;
        countryflag.$set(countryflag_changes);
        if ((!current || dirty & /*geoInfo*/
        1) && t2_value !== (t2_value = /*geoInfo*/
        ctx2[0].country + "")) set_data(t2, t2_value);
        if ((!current || dirty & /*geoInfo*/
        1) && t5_value !== (t5_value = /*geoInfo*/
        ctx2[0].metaName + "")) set_data(t5, t5_value);
        if ((!current || dirty & /*geoInfo*/
        1) && t8_value !== (t8_value = /*geoInfo*/
        ctx2[0].note + "")) set_data(t8, t8_value);
        if ((!current || dirty & /*geoInfo*/
        1) && t12_value !== (t12_value = /*geoInfo*/
        ctx2[0].country + "")) set_data(t12, t12_value);
        if (!current || dirty & /*geoInfo*/
        1 && a_href_value !== (a_href_value = /*geoInfo*/
        ctx2[0].plonkitCountryUrl)) {
          attr(a, "href", a_href_value);
        }
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
          detach(p0);
          detach(t3);
          detach(p1);
          detach(t6);
          detach(p2);
          detach(t9);
          detach(p3);
        }
        destroy_component(countryflag);
      }
    };
  }
  function create_if_block(ctx) {
    let p;
    return {
      c() {
        p = element("p");
        p.textContent = `Error: ${error}`;
      },
      m(target, anchor) {
        insert(target, p, anchor);
      },
      p: noop,
      i: noop,
      o: noop,
      d(detaching) {
        if (detaching) {
          detach(p);
        }
      }
    };
  }
  function create_fragment(ctx) {
    let div2;
    let div1;
    let t3;
    let current_block_type_index;
    let if_block;
    let t4;
    let current;
    const if_block_creators = [create_if_block, create_if_block_1, create_else_block];
    const if_blocks = [];
    function select_block_type(ctx2, dirty) {
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
        div2 = element("div");
        div1 = element("div");
        div1.innerHTML = `<h2>Learnable Meta</h2> <div class="icons svelte-w42zs8"><a href="https://learnablemeta.com/" target="_blank" class="svelte-w42zs8"><span class="flat-color-icons--globe svelte-w42zs8"></span></a> <a href="https://discord.gg/AcXEWznYZe" target="_blank" class="svelte-w42zs8"><span class="skill-icons--discord svelte-w42zs8"></span></a></div>`;
        t3 = space();
        if_block.c();
        t4 = text("\n\n1");
        attr(div1, "class", "flex svelte-w42zs8");
        attr(div2, "class", "geometa-container svelte-w42zs8");
      },
      m(target, anchor) {
        insert(target, div2, anchor);
        append(div2, div1);
        append(div2, t3);
        if_blocks[current_block_type_index].m(div2, null);
        insert(target, t4, anchor);
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
          if_block.m(div2, null);
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
          detach(div2);
          detach(t4);
        }
        if_blocks[current_block_type_index].d();
      }
    };
  }
  let error = null;
  function instance($$self, $$props, $$invalidate) {
    let { lat } = $$props;
    let { lng } = $$props;
    let { mapId } = $$props;
    let geoInfo = null;
    onMount(() => {
      cutToTwoDecimals(lat);
      cutToTwoDecimals(lng);
      $$invalidate(0, geoInfo = {
        country: "Test",
        metaName: "Bollard",
        note: "Addwweq qwdgr rreg",
        plonkitCountryUrl: "https://www.plonkit.net/united-states"
      });
    });
    $$self.$$set = ($$props2) => {
      if ("lat" in $$props2) $$invalidate(1, lat = $$props2.lat);
      if ("lng" in $$props2) $$invalidate(2, lng = $$props2.lng);
      if ("mapId" in $$props2) $$invalidate(3, mapId = $$props2.mapId);
    };
    return [geoInfo, lat, lng, mapId];
  }
  class App extends SvelteComponent {
    constructor(options) {
      super();
      init(this, options, instance, create_fragment, safe_not_equal, { lat: 1, lng: 2, mapId: 3 });
    }
  }
  function changelog() {
    return [
      { "0.5": "New note format and prepared for multiple maps support" },
      {
        "0.4": "Updated GeoGuessr Event Framework version. Fixes the disappearing daily challenge from GeoGuessr home page."
      }
    ];
  }
  if (_unsafeWindow.notAValidVariable) {
    console.log(changelog());
  }
  const GeoGuessrEventFramework = _unsafeWindow.GeoGuessrEventFramework;
  const metaMapIds = /* @__PURE__ */ new Set(["66c0d3feff4dbe492e06174e"]);
  GeoGuessrEventFramework.init().then(() => {
    GeoGuessrEventFramework.events.addEventListener("round_end", (event) => {
      if (!metaMapIds.has(event.detail.map.id)) return;
      waitForElement('div[data-qa="result-view-top"]').then((container) => {
        const element2 = document.createElement("div");
        element2.id = "geometa-summary";
        container.appendChild(element2);
        const lastRound = event.detail.rounds[event.detail.rounds.length - 1];
        new App({
          target: element2,
          props: {
            lat: lastRound.location.lat,
            lng: lastRound.location.lng,
            mapId: event.detail.map.id
          }
        });
      });
    });
  });

})();