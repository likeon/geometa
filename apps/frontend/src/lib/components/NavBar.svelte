<script lang="ts">
  import { page } from '$app/state';
  import MainNav from '$lib/components/nav/MainNav.svelte';
  import ModeSwitcher from '$lib/components/ModeSwitcher.svelte';
  import { Button } from '$lib/components/ui/button';
  import DiscordFillIcon from '~icons/mingcute/discord-fill';
  import FaSolidToolsIcon from '~icons/fa-solid/tools';
  import FaSolidUserIcon from '~icons/fa-solid/user';
  import MobileNav from '$lib/components/nav/MobileNav.svelte';

  const navLinks = [
    {
      url: '/',
      name: 'Home'
    },
    {
      url: '/about',
      name: 'How To'
    },
    {
      url: '/maps',
      name: 'Maps'
    },
    {
      url: '/for-map-creators',
      name: 'For Map Creators'
    },
    {
      url: '/personal-maps',
      name: 'Personal Maps'
    }
  ];

  const headerIconButtonClass =
    'size-8 rounded-md px-0 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-white/35 data-[active=true]:bg-white/15 data-[active=true]:text-white';
</script>

<header class="px-2 sm:px-4 py-0 w-full bg-gradient-to-r from-green-900 to-sky-900">
  <div class="container-wrapper">
    <div class="container flex h-13 items-center gap-2 md:gap-4">
      <MainNav {navLinks} />
      <MobileNav {navLinks} />
      <div class="ml-auto flex flex-1 items-center gap-2 justify-end">
        <nav class="flex items-center gap-0.5">
          <Button
            variant="dark-ghost"
            size="icon"
            class={headerIconButtonClass}
            href="https://discord.gg/AcXEWznYZe"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Discord">
            <DiscordFillIcon class="size-5 flex-shrink-0" />
          </Button>
          <Button
            variant="dark-ghost"
            size="icon"
            class={headerIconButtonClass}
            href="/personal"
            aria-label="Profile"
            data-active={page.url.pathname.startsWith('/personal')}>
            <FaSolidUserIcon class="w-5 h-5 flex-shrink-0" />
          </Button>
          <Button
            variant="dark-ghost"
            size="icon"
            class={headerIconButtonClass}
            href="/map-making"
            aria-label="Map making"
            data-active={page.url.pathname.startsWith('/map-making')}>
            <FaSolidToolsIcon class="w-5 h-5 flex-shrink-0" />
          </Button>

          <ModeSwitcher />
        </nav>
      </div>
    </div>
  </div>
</header>
