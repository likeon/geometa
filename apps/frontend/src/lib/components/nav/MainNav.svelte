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
  <a href={linkHref} class="mr-4 flex items-center gap-2 lg:mr-6">
    <enhanced:img src={logo} class="h-6 sm:h-9 w-auto" alt="Logo" />
    <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
      LearnableMeta
    </span>
  </a>
  <nav class="flex items-center gap-4 text-sm xl:gap-6">
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
    class="flex text-zinc-400 hover:text-primary data-[active=true]:text-white h-7 items-center justify-center rounded-full px-4 text-center text-sm font-medium transition-colors"
    data-active={isActive}>
    {#if navLink.name === 'Discord'}
      <DiscordFillIcon class="w-5 h-5 flex-shrink-0 mr-1" />
    {/if}
    <span>{navLink.name}</span>
  </a>
{/snippet}
