<script>
  import { Navbar, NavBrand, NavHamburger, NavLi, NavUl } from 'flowbite-svelte';
  import logo from '$lib/assets/logo.png?enhanced';
  import { page } from '$app/state';
  import Icon from '@iconify/svelte';

  let activeUrl = $derived(page.url.pathname);
  let admin = $derived(activeUrl.startsWith('/dev/dash'));
</script>

<Navbar class="px-2 sm:px-4 py-0 w-full bg-gradient-to-r from-green-100 to-sky-100">
  <NavBrand href={admin ? '/dev/dash' : '/'} class="text-gray-700">
    <enhanced:img src={logo} class="h-6 sm:h-9 w-auto" alt="Logo" />
    <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white"
      >LearnableMeta</span>
  </NavBrand>
  <NavHamburger />
  <NavUl {activeUrl}>
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
    <div class="hidden md:block md:h-5 md:w-px md:bg-zinc-900/10 md:dark:bg-white/15"></div>
    <a
      href="/dev/dash"
      title="Creator dashboard"
      class="hidden md:flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-white hover:bg-gray-900 transition">
      <Icon icon="fa-solid:tools" color="white" class="w-3 h-3 flex-shrink-0" />
    </a>
  </NavUl>
</Navbar>
