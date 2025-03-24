<script lang="ts">
  import { Badge, Tooltip } from 'flowbite-svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import Icon from '@iconify/svelte';
  import type { PageData } from './$types';

  let {
    map
  }: {
    map: PageData['allMaps'][number];
  } = $props();

  const difficulties: Record<
    number,
    {
      class: string;
      icon: string;
      label: string;
    }
  > = {
    1: {
      class: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300/70',
      icon: 'carbon:skill-level-basic',
      label: 'Beginner'
    },
    2: {
      class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-500/70',
      icon: 'carbon:skill-level-intermediate',
      label: 'Intermediate'
    },
    3: {
      class: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300/70',
      icon: 'carbon:skill-level-advanced',
      label: 'Advanced'
    }
  };
</script>

<Card.Root class="flex flex-col">
  <Card.Header>
    <div class="flex flex-row pb-2">
      {#if map.isVerified}
        <div>
          <Badge
            class="bg-yellow-200 text-yellow-800 dark:bg-yellow-700/50 dark:text-yellow-200/80">
            <Icon icon="ri:star-line" class="inline-block  mr-1" />
            Verified
          </Badge>
        </div>
      {/if}
      <div class="ml-auto">
        {#if map.difficulty in difficulties}
          <Badge class={difficulties[map.difficulty].class}>
            <Icon icon={difficulties[map.difficulty].icon} class="inline-block mr-1" />
            {difficulties[map.difficulty].label}
          </Badge>
        {/if}
        <Badge class="bg-pink-50 text-pink-500 dark:bg-pink-900/50 dark:text-pink-300/70">
          <Icon icon="gravity-ui:map-pin" class="inline-block  mr-1" />
          {map.locationsCount}
        </Badge>
        <Tooltip>Number of locations in the map.</Tooltip>
        <Badge class="bg-indigo-50 text-indigo-500 dark:bg-indigo-900/50 dark:text-indigo-300">
          <Icon icon="cil:list" class="inline-block  mr-1" />
          {map.metasCount}</Badge>
        <Tooltip>Number of metas in the map.</Tooltip>
      </div>
    </div>
    <Card.Title>{map.name}</Card.Title>
    <Card.Description>by <strong>{map.authors}</strong></Card.Description>
  </Card.Header>
  <Card.Content class="pt-0 flex flex-col h-full">
    <p
      class="mt-6 text-base text-gray-600 dark:text-gray-300 whitespace-pre-line leading-snug break-words flex-grow">
      {map.description}
    </p>
    <div class="mt-7 flex gap-4">
      <!-- Play Button -->
      <Button
        class="flex-1"
        href={'https://www.geoguessr.com/maps/' + map.geoguessrId}
        target="_blank">
        Play
      </Button>
      <!-- Meta List Button -->
      <Button variant="outline" class="flex-1" href={'/maps/' + map.geoguessrId} target="_blank">
        <Icon icon="cil:list" class="inline-block  mr-1" />
        Meta List
      </Button>
    </div>
  </Card.Content>
</Card.Root>
