<script lang="ts">
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
</script>

<header class="px-2 sm:px-4 py-0 w-full bg-gradient-to-r from-green-900 to-sky-900">
  <div class="container-wrapper">
    <div class="container flex h-13 items-center gap-2 md:gap-4">
      <MainNav {navLinks} />
      <MobileNav {navLinks} />
      <div class="ml-auto flex flex-1 items-center gap-2 justify-end">
        <nav class="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            class="size-8 px-0"
            href="https://discord.gg/AcXEWznYZe"
            target="_blank"
          >
            <DiscordFillIcon class="size-5 flex-shrink-0" />
          </Button>
          <Button variant="ghost" size="icon" class="size-8 px-0" href="/personal">
            <FaSolidUserIcon class="w-5 h-5 flex-shrink-0" />
          </Button>
          <Button variant="ghost" size="icon" class="size-8 px-0" href="/map-making">
            <FaSolidToolsIcon class="w-5 h-5 flex-shrink-0" />
          </Button>

          <ModeSwitcher />
        </nav>
      </div>
    </div>
  </div>
</header>
