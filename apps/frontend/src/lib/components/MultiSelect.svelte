<script lang="ts">
  import * as Select from '$lib/components/ui/select/index';

  interface Item {
    value: number;
    name: string;
  }

  let {
    items = [],
    selectedValues = $bindable([]),
    name,
    placeholder = 'Select item',
    ...restProps
  }: {
    items: Item[];
    selectedValues: number[];
    name?: string;
    placeholder?: string;
    [key: string]: any;
  } = $props();

  let selectedStrings = $derived(selectedValues.map((val) => val.toString()));

  let displayText = $derived(
    selectedStrings.length === 0
      ? placeholder
      : items
          .filter((item) => selectedStrings.includes(item.value.toString()))
          .map((item) => item.name)
          .join(', ')
  );

  // Handle selection changes
  function handleValueChange(newValues: string[]) {
    selectedValues = newValues.map((str) => Number(str));
  }
</script>

<Select.Root type="multiple" bind:value={selectedStrings} {name} onValueChange={handleValueChange}>
  <Select.Trigger {...restProps}>{displayText}</Select.Trigger>
  <Select.Content>
    {#each items as item (item.value)}
      <Select.Item value={item.value.toString()} label={item.name} />
    {/each}
  </Select.Content>
</Select.Root>
