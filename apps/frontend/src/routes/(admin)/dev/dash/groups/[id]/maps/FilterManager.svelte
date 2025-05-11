<script lang="ts">
  import Icon from '@iconify/svelte';
  import { Badge, Input, Label } from 'flowbite-svelte';

  // Dispatch event to update parent filter list
  const addFilter = () => {
    const trimmedFilter = filterInput.trim();
    if (trimmedFilter && !filters.includes(trimmedFilter)) {
      if (oppositeFilters.includes(trimmedFilter)) {
        alert(
          `Cannot add the filter "${trimmedFilter}" because it is already in the opposite filter list.`
        );
      } else {
        filters = [...filters, trimmedFilter];
        filterInput = '';
      }
    }
  };

  const removeFilter = (filter: string) => {
    filters = filters.filter((f) => f !== filter);
  };

  interface Props {
    filters: string[];
    filterInput: string;
    oppositeFilters: string[];
  }

  let { filters = $bindable(), filterInput = $bindable(), oppositeFilters }: Props = $props();
</script>

<Label>
  <div class="flex items-center space-x-2">
    <Input
      type="text"
      name="filters"
      bind:value={filterInput}
      class="w-[300px] text-sm px-2 py-1" />
    <button
      type="button"
      onclick={addFilter}
      class="bg-primary-700 text-white px-3 py-1 rounded-lg hover:bg-primary-800">
      +
    </button>
  </div>

  <div class="mt-2 flex flex-wrap justify-start gap-2">
    {#each filters as filter}
      <Badge class="flex items-center gap-1 p-1">
        {filter}
        <button
          type="button"
          class="p-0.5 rounded-full hover:bg-gray-200"
          onclick={() => removeFilter(filter)}>
          <Icon icon="material-symbols:delete" class="w-4 h-4" color="red" />
        </button>
      </Badge>
    {/each}
  </div>
</Label>
