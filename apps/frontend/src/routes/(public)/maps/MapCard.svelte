<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import RaStarlineIcon from '~icons/ri/star-line';
  import SkillLevelBasicIcon from '~icons/carbon/skill-level-basic';
  import SkillLevelIntermediateIcon from '~icons/carbon/skill-level-intermediate';
  import SkillLevelAdvancedIcon from '~icons/carbon/skill-level-advanced';
  import MapPinIcon from '~icons/gravity-ui/map-pin';
  import CliListIcon from '~icons/cil/list';
  import type { PageData } from './$types';
  import type { Component } from 'svelte';
  import { Badge } from '$lib/components/ui/badge';
  import Tooltip from '$lib/components/Tooltip.svelte';

  let {
    map
  }: {
    map: Awaited<PageData['allMaps']>[number];
  } = $props();

  const difficulties: Record<
    number,
    {
      class: string;
      icon: Component;
      label: string;
    }
  > = {
    1: {
      class: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300/70',
      icon: SkillLevelBasicIcon,
      label: 'Beginner'
    },
    2: {
      class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-500/70',
      icon: SkillLevelIntermediateIcon,
      label: 'Intermediate'
    },
    3: {
      class: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300/70',
      icon: SkillLevelAdvancedIcon,
      label: 'Advanced'
    }
  };
</script>

<Card.Root class="flex flex-col">
  <Card.Header>
    <div class="flex flex-row pb-2">
      {#if map.isShared}
        <div>
          <Tooltip content="You can add metas from this map to personal map!:)">
            <Badge
              class="bg-amber-500 text-amber-900 dark:bg-amber-400 dark:text-amber-950 font-semibold px-2.5 py-0.5 rounded-md">
              <RaStarlineIcon class="inline-block mr-1" />
              Shared
            </Badge>
          </Tooltip>
        </div>
      {/if}
      <div class="ml-auto flex items-center gap-2 whitespace-nowrap">
        {#if map.difficulty in difficulties}
          <Badge class={difficulties[map.difficulty].class}>
            {@const IconComponent = difficulties[map.difficulty].icon}
            <IconComponent class="inline-block mr-1" />
            {difficulties[map.difficulty].label}
          </Badge>
        {/if}
        <Tooltip content="Number of locations in the map.">
          <Badge class="bg-pink-50 text-pink-500 dark:bg-pink-900/50 dark:text-pink-300/70">
            <MapPinIcon class="inline-block mr-1" />
            {map.locationsCount}
          </Badge>
        </Tooltip>
        <Tooltip content="Number of metas in the map.">
          <Badge class="bg-indigo-50 text-indigo-500 dark:bg-indigo-900/50 dark:text-indigo-300">
            <CliListIcon class="inline-block mr-1" />
            {map.metasCount}</Badge>
        </Tooltip>
      </div>
    </div>
    <Card.Title>{map.name}</Card.Title>
    <Card.Description>by <strong>{map.authors}</strong></Card.Description>
  </Card.Header>
  <Card.Content class="pt-0 flex flex-col h-full">
    <p
      class="mt-6 text-base text-gray-600 dark:text-gray-300 whitespace-pre-line leading-snug break-words grow">
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
        <CliListIcon class="inline-block mr-1" />
        Meta List
      </Button>
    </div>
  </Card.Content>
</Card.Root>
