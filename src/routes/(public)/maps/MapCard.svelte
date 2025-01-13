<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import type { PageData } from './$types';
  let {
    map
  }: {
    map: PageData['allMaps'][number];
  } = $props();
</script>

<div
  class="flex flex-col justify-between rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-900/10 sm:p-8">
  <div>
    <h3 class="text-xl font-semibold leading-7 text-green-600">{map.name}</h3>
    <p>by <strong>{map.authors}</strong></p>
    <div class="mt-4 flex items-baseline gap-x-2">
      <span class="text-xl font-bold tracking-tight text-gray-900"
        >{map.locationsCount} locations</span>
    </div>
    <p class="mt-6 text-base leading-7 text-gray-600">
      {map.description}
    </p>
  </div>
  <div class="mt-7 flex gap-4">
    <!-- Play Button -->
    <Button
      class="flex-1 bg-green-600 text-white hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium rounded-lg px-5 py-3 text-center"
      href={'https://www.geoguessr.com/maps/' + map.geoguessrId}
      target="_blank">
      Play
    </Button>
    <!-- Meta List Button -->
    <Button
      class="flex-1 bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg px-5 py-3 text-center"
      href={'/maps/' + map.geoguessrId}
      target="_blank">
      Meta List
    </Button>
  </div>
</div>
