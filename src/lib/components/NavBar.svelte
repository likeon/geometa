<script>
  import { Navbar, NavBrand, NavHamburger, NavLi, NavUl } from 'flowbite-svelte';
  import logo from '$lib/assets/logo.png?enhanced';
  import { page } from '$app/state';
  import Icon from '@iconify/svelte';
  import { toggleMode } from 'mode-watcher';
  import { dev } from '$app/environment';

  let activeUrl = $derived(page.url.pathname);
  let admin = $derived(activeUrl.startsWith('/dev/dash'));

  const activeClass =
    'text-white bg-primary-700 md:bg-transparent md:text-primary-700 md:dark:text-white dark:bg-primary-600 md:dark:bg-transparent';
  const nonActiveClass =
    'text-gray-700 hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-primary-700 dark:text-zinc-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent';
</script>

<Navbar
  class="px-2 sm:px-4 py-0 w-full bg-gradient-to-r from-green-100 to-sky-100 dark:from-green-900 dark:to-sky-900">
  <NavBrand href={admin ? '/dev/dash' : '/'} class="text-gray-700">
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
        <Icon icon="mingcute:discord-fill" class="w-5 h-5 flex-shrink-0 mr-1" />
        Discord
      </div>
    </NavLi>
    <div class="md:space-x-2 hidden md:flex">
      <div class="md:h-5 md:w-px md:bg-zinc-900/10 md:dark:bg-white/15"></div>
      {#if dev}
        <button onclick={toggleMode} class="text-gray-600 hover:text-gray-900 dark:text-zinc-200">
          <Icon icon="ix:light-dark" class="w-5 h-5 flex-shrink-0" />
        </button>
      {/if}
      <a
        href="/dev/dash"
        title="Creator dashboard"
        class="hidden md:flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-white hover:bg-gray-900 transition">
        <Icon icon="fa-solid:tools" color="white" class="w-3 h-3 flex-shrink-0" />
      </a>
    </div>
  </NavUl>
</Navbar>
