<script lang="ts">
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import SkillLevelBasicIcon from '~icons/carbon/skill-level-basic';
  import SkillLevelIntermediateIcon from '~icons/carbon/skill-level-intermediate';
  import SkillLevelAdvancedIcon from '~icons/carbon/skill-level-advanced';
  import MapPinIcon from '~icons/gravity-ui/map-pin';
  import CliListIcon from '~icons/cil/list';
  import type { Component } from 'svelte';
  import type { PageData } from './$types';

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
