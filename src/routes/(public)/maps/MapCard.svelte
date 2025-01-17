<script lang="ts">
  import { Badge, Button, Tooltip } from 'flowbite-svelte';
  import Icon from '@iconify/svelte';
  import type { PageData } from './$types';
  let {
    map
  }: {
    map: PageData['allMaps'];
  } = $props();
</script>

<div
  class="flex flex-col justify-between rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-900/10">
  <div>
    <div class="flex flex-row pb-2">
      {#if map.isVerified}
        <div>
          <Badge class="bg-yellow-200 text-yellow-800">
            <Icon icon="ri:star-line" class="inline-block  mr-1" /> Verified</Badge>
        </div>
      {/if}
      <div class="ml-auto">
        {#if map.difficulty == 1}
          <Badge color="green" size="sm">
            <Icon icon="carbon:skill-level-basic" class="inline-block mr-1" />
            Beginner
          </Badge>
        {/if}
        {#if map.difficulty == 2}
          <Badge color="yellow" size="sm">
            <Icon icon="carbon:skill-level-intermediate" class="inline-block mr-1" />
            Intermediate
          </Badge>
        {/if}
        {#if map.difficulty == 3}
          <Badge color="red" size="sm">
            <Icon icon="carbon:skill-level-advanced" class="inline-block mr-1" />
            Advanced
          </Badge>
        {/if}
        <Badge class="bg-pink-50 text-pink-500" size="sm">
          <Icon icon="gravity-ui:map-pin" class="inline-block  mr-1" />
          {map.locationsCount}
        </Badge>
        <Tooltip>Number of locations in the map.</Tooltip>
        <Badge class="bg-indigo-50 text-indigo-500" size="sm">
          <Icon icon="cil:list" class="inline-block  mr-1" />
          {map.metasCount}</Badge>
        <Tooltip>Number of metas in the map.</Tooltip>
      </div>
    </div>
    <h3 class="text-xl font-semibold leading-7 text-green-600">{map.name}</h3>
    <p>by <strong>{map.authors}</strong></p>

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
      <Icon icon="cil:list" class="inline-block  mr-1" /> Meta List
    </Button>
  </div>
</div>
