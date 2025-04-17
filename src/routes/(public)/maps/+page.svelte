<script lang="ts">
  import MapCard from './MapCard.svelte';
  import { Input } from '$lib/components/ui/input';
  import * as Popover from '$lib/components/ui/popover';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import Icon from '@iconify/svelte';

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

  let filterMaps = $derived(
    data.allMaps.filter(
      (map) =>
        map.regions?.includes(activeRegion) &&
        (map.name.toLowerCase().includes(searchText.toLowerCase()) ||
          map.authors?.toLocaleLowerCase().includes(searchText.toLocaleLowerCase())) &&
        selectedDifficulties.includes(map.difficulty as DifficultyValue)
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
      <button
        class={regionButtonClass}
        class:selected={activeRegion === ''}
        onclick={() => (activeRegion = '')}>
        All
      </button>
      {#each data.regionsList as region (region.id)}
        <button
          class={regionButtonClass}
          class:selected={activeRegion === region.name}
          onclick={() => (activeRegion = region.name)}>
          {region.name}
        </button>
      {/each}
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
            <Icon icon="tabler:filter-filled" class="h-4 w-4" />
          </Popover.Trigger>
          <Popover.Content class="w-56 p-4">
            <div class="grid gap-4">
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
    <div class="grid grid-cols-1 gap-2 xl:grid-cols-3">
      {#each filterMaps as map}
        <MapCard {map} />
      {/each}
    </div>
    {#if filterMaps.length === 0}
      <p class="text-center text-muted-foreground py-8">No maps match the current filters.</p>
    {/if}
  </div>
</div>

<style lang="postcss">
  .selected {
    @apply bg-primary text-primary-foreground; /* Updated for better contrast */
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
</style>
