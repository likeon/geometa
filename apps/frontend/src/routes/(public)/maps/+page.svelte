<script lang="ts">
  import MapCard from './MapCard.svelte';
  import MapListItem from './MapListItem.svelte';
  import { Input } from '$lib/components/ui/input';
  import * as Popover from '$lib/components/ui/popover';
  import * as Select from '$lib/components/ui/select';
  import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import ArrowDownWideNarrowIcon from '@lucide/svelte/icons/arrow-down-wide-narrow';
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import ListIcon from '@lucide/svelte/icons/list';
  import FilterFilledIcon from '~icons/tabler/filter-filled';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const difficultyMap = [
    { value: 1, label: 'Beginner' },
    { value: 2, label: 'Intermediate' },
    { value: 3, label: 'Advanced' }
  ] as const;
  type DifficultyValue = (typeof difficultyMap)[number]['value'];
  type MapItem = Awaited<PageData['allMaps']>[number];

  const sortOptions = [
    { value: 'default', label: 'Popularity' },
    { value: 'metas', label: 'Meta Count' },
    { value: 'locations', label: 'Location Count' },
    { value: 'games', label: 'Games Played' },
    { value: 'name', label: 'Name' }
  ] as const;
  type SortOption = (typeof sortOptions)[number]['value'];

  const regionButtonClass =
    'h-9 shrink-0 rounded-md border border-border/60 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-hidden';
  const iconButtonClass =
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-200 hover:text-foreground dark:hover:bg-gray-700';
  const sortTriggerClass = `${iconButtonClass} !h-6 !w-6 border-0 bg-transparent !p-0 shadow-none dark:bg-transparent [&>svg:last-child]:hidden`;
  const viewToggleItemClass =
    'h-6 min-w-6 !rounded-md px-1.5 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs';

  let activeRegion = $state('');
  let searchText = $state('');
  let selectedDifficulties = $state(difficultyMap.map((d) => d.value));
  let sharedFilter = $state(false);
  let sortBy = $state<SortOption>('default');
  let viewMode = $state<'cards' | 'list'>('cards');

  let allMaps = $state<MapItem[]>([]);

  // Load maps once
  $effect(() => {
    data.allMaps.then((maps) => {
      allMaps = maps;
    });
  });

  let filteredMaps = $derived(
    allMaps.filter(
      (map) =>
        map.regions?.includes(activeRegion) &&
        (map.name.toLowerCase().includes(searchText.toLowerCase()) ||
          map.authors?.toLowerCase().includes(searchText.toLowerCase())) &&
        selectedDifficulties.includes(map.difficulty as DifficultyValue) &&
        (!sharedFilter || map.isShared)
    )
  );

  let sortedMaps = $derived.by(() => {
    if (sortBy === 'default') {
      return filteredMaps;
    }

    const maps = [...filteredMaps];

    if (sortBy === 'name') {
      return maps.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }

    const getSortValue = (map: MapItem) => {
      if (sortBy === 'metas') return map.metasCount;
      if (sortBy === 'locations') return map.locationsCount;
      return map.numberOfGamesPlayed;
    };

    return maps.sort((a, b) => toNumber(getSortValue(b)) - toNumber(getSortValue(a)));
  });

  let selectedSortLabel = $derived(
    sortOptions.find((option) => option.value === sortBy)?.label ?? 'Popularity'
  );

  function toNumber(value: number | string | null | undefined) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  function handleDifficultyChange(difficultyValue: DifficultyValue, checked: boolean) {
    if (checked) {
      if (!selectedDifficulties.includes(difficultyValue)) {
        selectedDifficulties = [...selectedDifficulties, difficultyValue];
      }
    } else {
      selectedDifficulties = selectedDifficulties.filter((d) => d !== difficultyValue);
    }
  }
</script>

<svelte:head>
  <title>Maps</title>
</svelte:head>

<div class="container">
  <div class="flex flex-col gap-3 py-2 lg:flex-row lg:items-center lg:justify-between">
    <div class="scroll-container flex min-w-0 gap-1 overflow-x-auto lg:flex-1">
      {#await data.regionList then regionList}
        <button
          class={regionButtonClass}
          class:selected={activeRegion === ''}
          onclick={() => (activeRegion = '')}>
          All
        </button>
        {#each regionList as region (region.id)}
          <button
            class={regionButtonClass}
            class:selected={activeRegion === region.name}
            onclick={() => (activeRegion = region.name)}>
            {region.name}
          </button>
        {/each}
      {/await}
    </div>

    <div class="flex w-full items-center gap-1 lg:w-auto lg:shrink-0">
      <Input placeholder="Search maps" bind:value={searchText} class="max-w-xs grow lg:grow-0" />

      <Popover.Root>
        <Popover.Trigger class={iconButtonClass} aria-label="Filter maps" title="Filter maps">
          <FilterFilledIcon class="h-4 w-4" />
        </Popover.Trigger>
        <Popover.Content sideOffset={8} class="w-56 p-4">
          <div class="grid gap-4">
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <Checkbox id="shared-checkbox" bind:checked={sharedFilter}></Checkbox>
                <Label for="shared-checkbox" class="text-sm font-medium capitalize">
                  Show only shared maps
                </Label>
              </div>
            </div>
            <div class="space-y-2">
              <h4 class="font-medium leading-none">Difficulty</h4>
              <p class="text-sm text-muted-foreground">Filter maps by difficulty level.</p>
            </div>
            <div class="grid gap-2">
              {#each difficultyMap as difficulty (difficulty.value)}
                <div class="flex items-center space-x-2">
                  <Checkbox
                    id={`difficulty-${difficulty.value}`}
                    checked={selectedDifficulties.includes(difficulty.value)}
                    onCheckedChange={(checked) => {
                      if (typeof checked === 'boolean') {
                        handleDifficultyChange(difficulty.value, checked);
                      }
                    }} />
                  <Label
                    for={`difficulty-${difficulty.value}`}
                    class="text-sm font-medium capitalize">
                    {difficulty.label}
                  </Label>
                </div>
              {/each}
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>

      <Select.Root type="single" bind:value={sortBy}>
        <Select.Trigger
          class={sortTriggerClass}
          aria-label={`Sort maps by ${selectedSortLabel}`}
          title={`Sort by ${selectedSortLabel}`}>
          <ArrowDownWideNarrowIcon class="size-4" />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.Label>Sort maps</Select.Label>
            {#each sortOptions as option (option.value)}
              <Select.Item value={option.value} label={option.label} />
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>

      <ToggleGroup.Root
        type="single"
        bind:value={viewMode}
        size="sm"
        class="gap-0.5 bg-muted/60 p-0.5"
        aria-label="Map view">
        <ToggleGroup.Item
          value="cards"
          class={viewToggleItemClass}
          aria-label="Card view"
          title="Card view">
          <LayoutGridIcon class="size-4" />
        </ToggleGroup.Item>
        <ToggleGroup.Item
          value="list"
          class={viewToggleItemClass}
          aria-label="List view"
          title="List view">
          <ListIcon class="size-4" />
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </div>
  </div>
  <div>
    {#if allMaps.length === 0}
      <!-- Show loading spinner -->
      <div
        class="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-[1500px] items-center justify-center rounded-lg bg-background shadow-lg">
        <div class="loadership_RHKDA">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    {:else}
      {#if viewMode === 'list'}
        <div class="grid gap-2">
          {#each sortedMaps as map (map.id)}
            <MapListItem {map} />
          {/each}
        </div>
      {:else}
        <div class="grid grid-cols-1 gap-2 xl:grid-cols-3">
          {#each sortedMaps as map (map.id)}
            <MapCard {map} />
          {/each}
        </div>
      {/if}
      {#if filteredMaps.length === 0}
        <p class="text-center text-muted-foreground py-8">No maps match the current filters.</p>
      {/if}
    {/if}
  </div>
</div>

<style lang="postcss">
  @reference "../../../app.css";
  .selected {
    @apply bg-primary text-primary-foreground;
  }

  .scroll-container {
    overflow-x: auto;
    padding-bottom: 1px; /* Adds space below the content for the scrollbar */
  }

  ::-webkit-scrollbar {
    height: 6px;
  }

  ::-webkit-scrollbar-thumb {
    background-color: #cbd5e1; /* Tailwind slate-300 */
    border-radius: 3px;
  }

  .loadership_RHKDA {
    display: flex;
    position: relative;
    width: 186.5px;
    height: 186.5px;
  }

  .loadership_RHKDA div {
    position: absolute;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    background: #057a55;
    animation:
      loadership_RHKDA_scale 1.2s infinite,
      loadership_RHKDA_fade 1.2s infinite;
    animation-timing-function: linear;
  }

  .loadership_RHKDA div:nth-child(1) {
    animation-delay: 0s;
    top: 163px;
    left: 84px;
  }
  .loadership_RHKDA div:nth-child(2) {
    animation-delay: -0.1s;
    top: 152px;
    left: 123px;
  }
  .loadership_RHKDA div:nth-child(3) {
    animation-delay: -0.2s;
    top: 123px;
    left: 152px;
  }
  .loadership_RHKDA div:nth-child(4) {
    animation-delay: -0.3s;
    top: 84px;
    left: 163px;
  }
  .loadership_RHKDA div:nth-child(5) {
    animation-delay: -0.4s;
    top: 44px;
    left: 152px;
  }
  .loadership_RHKDA div:nth-child(6) {
    animation-delay: -0.5s;
    top: 15px;
    left: 123px;
  }
  .loadership_RHKDA div:nth-child(7) {
    animation-delay: -0.6s;
    top: 5px;
    left: 84px;
  }
  .loadership_RHKDA div:nth-child(8) {
    animation-delay: -0.7s;
    top: 15px;
    left: 44px;
  }
  .loadership_RHKDA div:nth-child(9) {
    animation-delay: -0.8s;
    top: 44px;
    left: 15px;
  }
  .loadership_RHKDA div:nth-child(10) {
    animation-delay: -0.9s;
    top: 84px;
    left: 5px;
  }
  .loadership_RHKDA div:nth-child(11) {
    animation-delay: -1s;
    top: 123px;
    left: 15px;
  }
  .loadership_RHKDA div:nth-child(12) {
    animation-delay: -1.1s;
    top: 152px;
    left: 44px;
  }

  @keyframes loadership_RHKDA_scale {
    0%,
    20%,
    80%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.5);
    }
  }

  @keyframes loadership_RHKDA_fade {
    0%,
    20%,
    80%,
    100% {
      opacity: 0.8;
    }
    50% {
      opacity: 1;
    }
  }
</style>
