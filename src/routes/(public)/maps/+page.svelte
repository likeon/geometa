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
  <div class="flex items-center justify-between py-5">
    <Tabs tabStyle="pill" contentClass="pt-4">
      <TabItem
        title="All"
        on:click={() => {
          activeRegion = '';
        }}
        open />
      {#each data.regionsList as region}
        <TabItem
          title={region.name}
          on:click={() => {
            activeRegion = region.name;
          }} />
      {/each}
    </Tabs>
    <input
      type="text"
      class="ml-4 border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring focus:ring-blue-300"
      placeholder="Search maps"
      bind:value={searchText} />
  </div>
  <div>
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {#each filterMaps as map}
        <MapCard {map} />
      {/each}
    </div>
  </div>
</div>
