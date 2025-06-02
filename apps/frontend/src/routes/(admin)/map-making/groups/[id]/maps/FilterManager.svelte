<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { X, Plus, AlertCircle } from '@lucide/svelte';

  interface Props {
    filters: string[];
    filterInput: string;
    oppositeFilters: string[];
    label?: string;
  }

  let {
    filters = $bindable(),
    filterInput = $bindable(),
    oppositeFilters,
    label = 'Filters'
  }: Props = $props();

  let errorMessage = $state('');

  const addFilter = () => {
    const trimmedFilter = filterInput.trim();
    errorMessage = ''; // Clear any existing error

    if (trimmedFilter && !filters.includes(trimmedFilter)) {
      if (oppositeFilters.includes(trimmedFilter)) {
        errorMessage = `Cannot add the filter "${trimmedFilter}" because it is already in the opposite filter list.`;
      } else {
        filters = [...filters, trimmedFilter];
        filterInput = '';
      }
    }
  };

  const removeFilter = (filter: string) => {
    filters = filters.filter((f) => f !== filter);
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addFilter();
    }
  };

  // Clear error when user starts typing
  const handleInput = () => {
    if (errorMessage) {
      errorMessage = '';
    }
  };
</script>

<div class="space-y-2">
  <Label class="text-sm font-medium">{label}</Label>
  <div class="flex items-center gap-2">
    <Input
      type="text"
      name="filters"
      bind:value={filterInput}
      onkeydown={handleKeydown}
      oninput={handleInput}
      class="h-8 text-sm flex-1"
      placeholder="Add filter..." />
    <Button type="button" onclick={addFilter} size="sm" class="h-8 w-8 p-0">
      <Plus class="w-4 h-4" />
    </Button>
  </div>

  {#if errorMessage}
    <div
      class="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
      <AlertCircle class="w-4 h-4 flex-shrink-0" />
      <span class="flex-1">{errorMessage}</span>
      <button
        type="button"
        class="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring"
        onclick={() => (errorMessage = '')}>
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  {#if filters.length > 0}
    <div class="flex flex-wrap gap-1.5">
      {#each filters as filter (filter)}
        <Badge variant="secondary" class="text-xs px-2 py-0.5 pr-1 flex items-center gap-1">
          <span>{filter}</span>
          <button
            type="button"
            class="ml-1 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring"
            onclick={() => removeFilter(filter)}>
            <X class="w-3 h-3" />
          </button>
        </Badge>
      {/each}
    </div>
  {/if}
</div>
