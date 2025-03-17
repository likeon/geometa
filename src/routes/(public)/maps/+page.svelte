<script lang="ts">
  import MapCard from './MapCard.svelte';
  import { Input } from '$lib/components/ui/input';

  let { data } = $props();
  let activeRegion = $state('');
  let searchText = $state('');
  let filterMaps = $derived(
    data.allMaps.filter(
      (map) =>
        map.regions?.includes(activeRegion) &&
        (map.name.toLowerCase().includes(searchText.toLowerCase()) ||
          map.authors?.toLocaleLowerCase().includes(searchText.toLocaleLowerCase()))
    )
  );

  const regionButtonClass = 'px-4 py-1 rounded-lg border focus:outline-none hover:bg-gray-200';
</script>

<svelte:head>
  <title>Maps</title>
</svelte:head>

<div class="container">
  <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2 bg-white">
    <!-- Scrollable Buttons -->
    <div class="flex overflow-x-auto space-x-2 lg:space-x-2 scroll-container">
      <button
        class={regionButtonClass}
        class:selected={activeRegion === ''}
        onclick={() => (activeRegion = '')}>
        All
      </button>
      {#each data.regionsList as region (region.id)}
        <button
          class={regionButtonClass}
          class:selected={activeRegion === region.name}
          onclick={() => (activeRegion = region.name)}>
          {region.name}
        </button>
      {/each}
    </div>

    <!-- Search Box -->
    <div class="mt-4 lg:mt-0 lg:ml-6 w-full lg:w-auto">
      <Input type="email" placeholder="Search maps" bind:value={searchText} class="max-w-xs" />
    </div>
  </div>
  <div>
    <div class="grid grid-cols-1 gap-2 xl:grid-cols-3">
      {#each filterMaps as map}
        <MapCard {map} />
      {/each}
    </div>
  </div>
</div>

<style lang="postcss">
  .selected {
    @apply bg-primary;
    color: white;
    font-weight: bold;
  }

  .scroll-container {
    overflow-x: auto;
    padding-bottom: 1px; /* Adds space below the content for the scrollbar */
  }

  ::-webkit-scrollbar {
    height: 6px;
  }

  ::-webkit-scrollbar-thumb {
    background-color: #cbd5e1; /* Tailwind slate-300 */
    border-radius: 3px;
  }
</style>
