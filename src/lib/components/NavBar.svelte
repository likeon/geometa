<script>
  import { Navbar, NavBrand, NavHamburger, NavLi, NavUl } from 'flowbite-svelte';
  import logo from '$lib/assets/logo.png?enhanced';
  import { page } from '$app/stores';
  import Icon from '@iconify/svelte';

  export let admin;

  $: activeUrl = $page.url.pathname;
</script>

<Navbar
  class="px-2 sm:px-4 py-2.5 w-full border-b border-green-800 bg-gradient-to-r from-green-100 to-sky-100">
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
    <NavLi href="https://discord.gg/AcXEWznYZe" target="_blank"
      ><div class="flex">
        <Icon icon="skill-icons:discord" class="w-5 h-5 flex-shrink-0 mr-1" />Discord
      </div></NavLi>
  </NavUl>
</Navbar>
