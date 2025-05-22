<script lang="ts">
  import {
    Dropdown,
    DropdownItem,
    Navbar,
    NavBrand,
    NavHamburger,
    NavLi,
    NavUl
  } from 'flowbite-svelte';
  import logo from '$lib/assets/logo.png?enhanced';
  import { page } from '$app/state';
  import { setMode } from 'mode-watcher';
  import { browser } from '$app/environment';
  import DiscordFillIcon from '~icons/mingcute/discord-fill';
  import LightDarkIcon from '~icons/ix/light-dark';
  import FaSolidToolsIcon from '~icons/fa-solid/tools';

  let modeWatcherDropdownOpen = $state(false);

  function setModeAndCloseDropdown(mode: Parameters<typeof setMode>[0]) {
    setMode(mode);
    modeWatcherDropdownOpen = false;
  }

  let activeUrl = $derived(page.url.pathname);
  let admin = $derived(activeUrl.startsWith('/dev/dash'));

  // keep both dark and non-dark
  // otherwise it will use default
  const activeClass =
    'text-white bg-primary-600 md:bg-transparent md:text-white md:dark:text-white dark:bg-primary-600 md:dark:bg-transparent';
  const nonActiveClass =
    'text-zinc-400 md:hover:text-white hover:bg-gray-700 hover:text-white md:hover:bg-transparent dark:text-zinc-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent';
</script>

<Navbar class="px-2 sm:px-4 py-0 w-full bg-gradient-to-r from-green-900 to-sky-900">
  <NavBrand href={admin ? '/dev/dash' : '/'} class="text-white">
    <enhanced:img src={logo} class="h-6 sm:h-9 w-auto" alt="Logo" />
    <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white"
      >LearnableMeta</span>
  </NavBrand>
  <NavHamburger />
  <NavUl {activeUrl} {activeClass} {nonActiveClass} slideParams={{ delay: 0, duration: 100 }}>
    <NavLi href="/">Home</NavLi>
    <NavLi href="/about">How To</NavLi>
    <NavLi href="/maps">Maps</NavLi>
    <NavLi href="/for-map-creators">For Map Creators</NavLi>
    <NavLi href="https://discord.gg/AcXEWznYZe" target="_blank">
      <div class="flex">
        <DiscordFillIcon class="w-5 h-5 flex-shrink-0 mr-1" />
        Discord
      </div>
    </NavLi>
    <div class="md:space-x-2 hidden md:flex">
      <div class="md:h-5 md:w-px md:bg-white/15"></div>
      <button class="text-zinc-400 hover:text-white">
        <LightDarkIcon class="w-5 h-5 flex-shrink-0 " />
      </button>
      {#if browser}
        <Dropdown bind:open={modeWatcherDropdownOpen}>
          <DropdownItem onclick={() => setModeAndCloseDropdown('light')}>Light</DropdownItem>
          <DropdownItem onclick={() => setModeAndCloseDropdown('dark')}>Dark</DropdownItem>
          <DropdownItem onclick={() => setModeAndCloseDropdown('system')}>System</DropdownItem>
        </Dropdown>
      {/if}
      <a
        href="/dev/dash"
        title="Creator dashboard"
        class="hidden md:flex items-center justify-center text-zinc-400 dark:text-zinc-400 hover:text-white">
        <FaSolidToolsIcon class="w-4 h-4 flex-shrink-0" />
      </a>
    </div>
  </NavUl>
</Navbar>
