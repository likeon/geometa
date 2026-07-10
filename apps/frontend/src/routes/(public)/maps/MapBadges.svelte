<script lang="ts">
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import type { Component } from 'svelte';
  import SkillLevelBasicIcon from '~icons/carbon/skill-level-basic';
  import SkillLevelIntermediateIcon from '~icons/carbon/skill-level-intermediate';
  import SkillLevelAdvancedIcon from '~icons/carbon/skill-level-advanced';
  import CliListIcon from '~icons/cil/list';
  import UserFriendsIcon from '~icons/fa-solid/user-friends';
  import MapPinIcon from '~icons/gravity-ui/map-pin';
  import type { PageData } from './$types';

  let {
    map,
    split = false,
    class: className = ''
  }: {
    map: Awaited<PageData['allMaps']>[number];
    split?: boolean;
    class?: string;
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

{#snippet sharedBadge()}
  <Tooltip content="You can add metas from this map to personal map!:)">
    <Badge
      aria-label="Shared map"
      class="w-6 rounded-md bg-amber-500 px-0 text-amber-900 dark:bg-amber-400 dark:text-amber-950 [&>svg]:size-4">
      <UserFriendsIcon class="inline-block" />
    </Badge>
  </Tooltip>
{/snippet}

{#snippet statBadges()}
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
      {map.metasCount}
    </Badge>
  </Tooltip>
{/snippet}

{#if split}
  <div class="flex flex-row {className}">
    {#if map.isShared}
      <div>
        {@render sharedBadge()}
      </div>
    {/if}
    <div class="ml-auto flex items-center gap-2 whitespace-nowrap">
      {@render statBadges()}
    </div>
  </div>
{:else}
  <div class="flex flex-wrap items-center gap-2 {className}">
    {#if map.isShared}
      {@render sharedBadge()}
    {/if}
    {@render statBadges()}
  </div>
{/if}
