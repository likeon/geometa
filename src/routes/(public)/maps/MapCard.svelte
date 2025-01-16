<script lang="ts">
  import { Badge, Button, Tooltip } from 'flowbite-svelte';
  import Icon from '@iconify/svelte';
  import type { PageData } from './$types';
  let {
    map
  }: {
    map: PageData['allMaps'];
  } = $props();

  const difficultyDetails = {
    1: { text: 'Beginner', color: 'green', icon: 'carbon:skill-level-basic', tooltip: '' },
    2: {
      text: 'Intermediate',
      color: 'yellow',
      icon: 'carbon:skill-level-intermediate',
      tooltip: ''
    },
    3: { text: 'Advanced', color: 'red', icon: 'carbon:skill-level-advanced', tooltip: '' }
  };

  const badge = difficultyDetails[map.difficulty];
</script>

<div
  class="flex flex-col justify-between rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-900/10">
  <div>
    <div class="flex flex-row pb-2">
      {#if map.isVerified}
        <div>
          <Badge class="bg-amber-500 text-white">
            <Icon icon="ri:star-line" class="inline-block  mr-1" /> Verified</Badge>
        </div>
      {/if}
      <div class="ml-auto">
        {#if map.difficulty != 0}
          <Badge color={badge.color} size="sm">
            <Icon icon={badge.icon} class="inline-block mr-1" />
            {badge.text}
          </Badge>
        {/if}
        <Badge color="pink" size="sm">
          <Icon icon="gravity-ui:map-pin" class="inline-block  mr-1" />
          {map.locationsCount}
        </Badge>
        <Tooltip>Number of locations in the map.</Tooltip>
        <Badge color="indigo" size="sm">
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
