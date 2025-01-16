<script lang="ts">
  import { TabItem, Tabs } from 'flowbite-svelte';
  import MapCard from './MapCard.svelte';

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
</script>

<svelte:head>
  <title>Maps</title>
</svelte:head>

<div class="container">
  <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2 bg-white">
    <!-- Scrollable Buttons -->
    <div class="flex overflow-x-auto space-x-2 lg:space-x-2 scroll-container">
      <button
        class="px-4 py-2 rounded-lg border focus:outline-none hover:bg-gray-200"
        class:selected={activeRegion === ''}
        onclick={() => (activeRegion = '')}>
        All
      </button>
      {#each data.regionsList as region}
        <button
          class="px-4 py-2 rounded-lg border focus:outline-none hover:bg-gray-200"
          class:selected={activeRegion === region.name}
          onclick={() => (activeRegion = region.name)}>
          {region.name}
        </button>
      {/each}
    </div>

    <!-- Search Box -->
    <div class="mt-4 lg:mt-0 lg:ml-6 w-full lg:w-auto">
      <input
        type="text"
        class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
        placeholder="Search maps"
        bind:value={searchText} />
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

<style>
  .selected {
    background-color: #2563eb; /* Tailwind's blue-600 */
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
