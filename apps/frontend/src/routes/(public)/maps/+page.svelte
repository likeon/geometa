<script lang="ts">
  import MapCard from './MapCard.svelte';
  import { Input } from '$lib/components/ui/input';
  import * as Popover from '$lib/components/ui/popover';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import FilterFielledIcon from '~icons/tabler/filter-filled';

  let { data } = $props();

  const difficultyMap = [
    { value: 1, label: 'Beginner' },
    { value: 2, label: 'Intermediate' },
    { value: 3, label: 'Advanced' }
  ] as const;
  type DifficultyValue = (typeof difficultyMap)[number]['value'];

  const regionButtonClass =
    'px-4 py-1 rounded-lg border focus:outline-none hover:bg-gray-200 dark:hover:bg-gray-900';

  let activeRegion = $state('');
  let searchText = $state('');
  let selectedDifficulties = $state(difficultyMap.map((d) => d.value));
  let sharedFilter = $state(false);

  let allMaps = $state<any[]>([]);

  // Load maps once
  $effect(() => {
    data.allMaps.then((maps) => {
      allMaps = maps;
      console.log(maps[0]);
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
  <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2 gap-4">
    <div class="flex overflow-x-auto space-x-2 lg:space-x-2 scroll-container flex-shrink">
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

    <div class="flex items-center w-full lg:w-auto relative">
      <Input
        placeholder="Search maps"
        bind:value={searchText}
        class="max-w-xs flex-grow lg:flex-grow-0 pr-10" />
      <div class="absolute right-2">
        <Popover.Root>
          <Popover.Trigger
            class="flex items-center justify-center h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Filter by difficulty">
            <FilterFielledIcon class="h-4 w-4" />
          </Popover.Trigger>
          <Popover.Content class="w-56 p-4">
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
      </div>
    </div>
  </div>
  <div>
    {#if allMaps.length === 0}
      <!-- Show loading spinner -->
      <div
        class="mx-auto flex justify-center bg-background shadow-lg rounded-lg w-full max-w-[1500px] lg:h-[calc(100vh-90px)] h-[calc(100vh-80px)]">
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
      <div class="grid grid-cols-1 gap-2 xl:grid-cols-3">
        {#each filteredMaps as map}
          <MapCard {map} />
        {/each}
      </div>
      {#if filteredMaps.length === 0}
        <p class="text-center text-muted-foreground py-8">No maps match the current filters.</p>
      {/if}
    {/if}
  </div>
</div>

<style lang="postcss">
  .selected {
    @apply bg-primary text-primary-foreground;
    /* Updated for better contrast */
    font-weight: bold;
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
