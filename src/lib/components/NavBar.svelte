<script>
	import { Navbar, NavBrand, NavHamburger, NavLi, NavUl } from 'flowbite-svelte';
  import { page } from '$app/stores';
  $: activeUrl = $page.url.pathname;
</script>

<Navbar class="px-2 sm:px-4 py-2.5 fixed w-full z-20 top-0 start-0 border-b" >
  <NavBrand href="/">
<!--    <img src="/images/flowbite-svelte-icon-logo.svg" class="me-3 h-6 sm:h-9" alt="Flowbite Logo" />-->
    <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">GeoMeta</span>
  </NavBrand>
  <NavHamburger  />
  <NavUl {activeUrl}>
    <NavLi href="/">Home</NavLi>
    <NavLi href="/about">How To</NavLi>
    <NavLi href="/submissions">Community Submissions</NavLi>
  </NavUl>
</Navbar>