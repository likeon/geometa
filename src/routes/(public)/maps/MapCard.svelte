<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import type { PageData } from './$types';
  let {
    map,
    withAuthors
  }: {
    map: PageData['officialMaps'][number];
    withAuthors: boolean;
  } = $props();
</script>

<div
  class="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-900/10 sm:p-10">
  <div>
    <h3 class="text-xl font-semibold leading-7 text-green-600">{map.name}</h3>
    {#if withAuthors}
      <p>by <strong>{map.authors}</strong></p>
    {/if}
    <div class="mt-4 flex items-baseline gap-x-2">
      <span class="text-xl font-bold tracking-tight text-gray-900"
        >{map.locationsCount}+ locations</span>
    </div>
    <p class="mt-6 text-base leading-7 text-gray-600">
      {map.description}
    </p>
  </div>
  <Button class="mt-7" href={'https://www.geoguessr.com/maps/' + map.geoguessrId} target="_blank"
    >Play
  </Button>
</div>
