<script lang="ts">
  import { page } from '$app/state';
  import Tooltip from '$lib/components/Tooltip.svelte';

  type NavItem = {
    name: string;
    slug?: string;
    tooltipText?: string;
  };

  let { basePath, items }: { basePath: string; items: NavItem[] } = $props();

  let activeRoute = $derived(page.url.pathname);

  function isActive(route: string) {
    return activeRoute === route
      ? 'border-green-500 text-green-600'
      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:border-gray-700 hover:text-gray-300';
  }
</script>

<nav class="-mb-px flex space-x-8" aria-label="Tabs">
  {#each items as item (item.name)}
    {@const url = basePath + (item.slug ? `/${item.slug}` : '')}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a
      href={url}
      class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium dark:text-gray-300 {isActive(
        url
      )}">
      {#if item.tooltipText}
        <Tooltip content={item.tooltipText}>{item.name}</Tooltip>
      {:else}
        <div class="mb-1">
          <span class="inline-flex items-center">{item.name}</span>
        </div>
      {/if}
    </a>
  {/each}
</nav>

<style>
  a {
    transition: all 0.3s ease;
  }
</style>
