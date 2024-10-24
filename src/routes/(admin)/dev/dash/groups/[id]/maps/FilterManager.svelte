<script lang="ts">
  import { Label } from 'flowbite-svelte';

  export let filters: string[] = [];
  export let filterInput: string = '';
  export let title: string = 'Filters';
  export let placeholder: string = 'Type a filter...';
  export let oppositeFilters: string[] = [];

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
        filterInput = ''; // Clear input after adding
        dispatch('updateFilters', filters); // Emit event to update parent
      }
    }
  };

  const removeFilter = (filter: string) => {
    filters = filters.filter((f) => f !== filter);
    dispatch('updateFilters', filters);
  };

  // Event dispatcher to notify parent
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<Label>
  <span>{title}</span>
  <input type="text" bind:value={filterInput} {placeholder} />
  <button type="button" on:click={addFilter}>+</button>

  <div class="mt-2">
    {#each filters as filter}
      <span class="tag">
        {filter}
        <button type="button" on:click={() => removeFilter(filter)}
          ><span style="color: red;">X</span></button>
      </span>
    {/each}
  </div>
</Label>
