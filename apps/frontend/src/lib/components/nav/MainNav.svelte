<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import logo from '$lib/assets/logo.png?enhanced';

  type NavLink = {
    url: string;
    name: string;
  };

  interface Props {
    navLinks: NavLink[];
  }
  let { navLinks }: Props = $props();

  let linkHref: '/' | '/map-making' | '/personal' = $derived.by(() => {
    if (page.url.pathname.startsWith('/map-making')) {
      return '/map-making';
    }
    if (page.url.pathname.startsWith('/personal')) {
      return '/personal';
    }
    return '/';
  });
</script>

<div class="mr-4 hidden md:flex">
  <a href={resolve(linkHref)} class="mr-4 flex items-center gap-0 hover:no-underline lg:mr-6">
    <enhanced:img src={logo} class="h-6 sm:h-9 w-auto" alt="Logo" />
    <span class="self-center whitespace-nowrap text-xl font-semibold text-white">
      LearnableMeta
    </span>
  </a>
  <nav class="flex items-center gap-2 text-sm">
    {#each navLinks as navLink (navLink.url)}
      {@render NavLink({
        navLink,
        isActive: page.url.pathname.endsWith(navLink.url)
      })}
    {/each}
  </nav>
</div>

{#snippet NavLink({ navLink, isActive }: { navLink: (typeof navLinks)[number]; isActive: boolean })}
  <a
    href={navLink.url}
    class="flex items-center justify-center rounded-md px-2.5 py-1.5 text-center text-sm font-medium tracking-tight text-white/70 transition-colors hover:bg-white/10 hover:text-white hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 data-[active=true]:bg-white/15 data-[active=true]:text-white"
    data-active={isActive}>
    <span>{navLink.name}</span>
  </a>
{/snippet}
