<script lang="ts">
  import { resolve } from '$app/paths';
  import logo from '$lib/assets/logo.png?enhanced';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import * as Sheet from '$lib/components/ui/sheet/index.js';
  import MobileLink from '$lib/components/nav/MobileLink.svelte';

  type NavLink = {
    url: string;
    name: string;
  };

  interface Props {
    navLinks: NavLink[];
  }

  let { navLinks }: Props = $props();
  let open = $state(false);
</script>

<div class="md:hidden">
  <Sheet.Root bind:open>
    <Sheet.Trigger>
      <svg
        stroke-width="1.5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="size-5">
        <path
          d="M3 5H11"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"></path>
        <path
          d="M3 12H16"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"></path>
        <path
          d="M3 19H21"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"></path>
      </svg>
      <span class="sr-only">Toggle Menu</span>
    </Sheet.Trigger>
    <Sheet.Content side="left" class="pr-0">
      <Sheet.Header class="pl-0 landscape:py-2">
        <a
          href={resolve('/')}
          class="flex items-center"
          onclick={() => {
            open = false;
          }}>
          <enhanced:img src={logo} class="pl-1.5 h-6 w-auto ml-1 landscape:h-5" alt="Logo" />
          <span class="font-bold landscape:text-sm">LearnableMeta</span>
        </a>
      </Sheet.Header>
      <ScrollArea
        orientation="both"
        class="h-[calc(100vh-4.5rem-env(safe-area-inset-bottom))] landscape:h-[calc(100vh-3rem-env(safe-area-inset-bottom))] pb-16 landscape:pb-8">
        <div class="flex flex-col space-y-3 landscape:space-y-2">
          {#each navLinks as navItem, index (navItem + index.toString())}
            {#if navItem.url}
              <MobileLink
                href={navItem.url}
                bind:open
                class="text-foreground landscape:text-sm landscape:py-2">
                {navItem.name}
              </MobileLink>
            {/if}
          {/each}
        </div>
      </ScrollArea>
    </Sheet.Content>
  </Sheet.Root>
</div>
