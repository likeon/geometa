<script lang="ts">
  import { Badge, type ColorVariant, Tooltip } from 'flowbite-svelte';
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
      color: ColorVariant;
      icon: string;
      label: string;
    }
  > = {
    1: { color: 'green', icon: 'carbon:skill-level-basic', label: 'Beginner' },
    2: { color: 'yellow', icon: 'carbon:skill-level-intermediate', label: 'Intermediate' },
    3: { color: 'red', icon: 'carbon:skill-level-advanced', label: 'Advanced' }
  };
</script>

<Card.Root class="flex flex-col">
  <Card.Header>
    <div class="flex flex-row pb-2">
      {#if map.isVerified}
        <div>
          <Badge class="bg-yellow-200 text-yellow-800">
            <Icon icon="ri:star-line" class="inline-block  mr-1" />
            Verified
          </Badge>
        </div>
      {/if}
      <div class="ml-auto">
        {#if map.difficulty in difficulties}
          <Badge color={difficulties[map.difficulty].color} size="sm">
            <Icon icon={difficulties[map.difficulty].icon} class="inline-block mr-1" />
            {difficulties[map.difficulty].label}
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
    <Card.Title>{map.name}</Card.Title>
    <Card.Description>by <strong>{map.authors}</strong></Card.Description>
  </Card.Header>
  <Card.Content class="pt-0 flex flex-col h-full">
    <p class="mt-6 text-base text-gray-600 whitespace-pre-line leading-snug break-words flex-grow">
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
