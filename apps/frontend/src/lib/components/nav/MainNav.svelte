<script lang="ts">
  import { page } from '$app/state';
  import logo from '$lib/assets/logo.png?enhanced';
  import DiscordFillIcon from '~icons/mingcute/discord-fill';

  type NavLink = {
    url: string;
    name: string;
  };

  interface Props {
    navLinks: NavLink[];
  }
  let { navLinks }: Props = $props();

  let linkHref = $derived(
    page.url.pathname.startsWith('/map-making')
      ? '/map-making'
      : page.url.pathname.startsWith('/personal')
        ? '/personal'
        : '/'
  );
</script>

<div class="mr-4 hidden md:flex">
  <a href={linkHref} class="mr-4 flex items-center gap-0 lg:mr-6">
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
    class="flex text-zinc-300 hover:text-white data-[active=true]:text-white items-center justify-center rounded-full px-2 text-center text-sm tracking-tight"
    data-active={isActive}>
    <span>{navLink.name}</span>
  </a>
{/snippet}
