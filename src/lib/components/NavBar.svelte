<script>
	import { Navbar, NavBrand, NavHamburger, NavLi, NavUl } from 'flowbite-svelte';
  import logo from '$lib/assets/logo.png?enhanced'
  import { page } from '$app/stores';

  $: activeUrl = $page.url.pathname;
</script>

<Navbar class="px-2 sm:px-4 py-2.5 fixed w-full z-20 top-0 start-0 border-b" >
  <NavBrand href="/" class="text-gray-700">
    <enhanced:img src={logo} class="h-6 sm:h-9 w-auto" alt="Logo" />
    <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">LearnableMeta</span>
  </NavBrand>
  <NavHamburger  />
  <NavUl {activeUrl}>
    <NavLi href="/">Home</NavLi>
    <NavLi href="/about">How To</NavLi>
    <!-- <NavLi href="/submissions">Community Submissions</NavLi> -->
  </NavUl>
</Navbar>
