<script lang="ts">
  import { Popover, PopoverTrigger, PopoverContent } from '$lib/components/ui/popover';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import Icon from '@iconify/svelte';
  import { normalizeFilterValue } from '$lib/components/BaseTable/filters';
  import type { Table } from '@tanstack/table-core';

  let {
    table,
    columnId,
    title,
    options
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: Table<any>;
    columnId: string;
    title: string;
    options: { label: string; value: string }[];
  } = $props();

  const selected = $derived(
    new Set(normalizeFilterValue(table.getColumn(columnId)?.getFilterValue()))
  );

  function toggle(value: string) {
    const arr = selected.has(value)
      ? [...selected].filter((v) => v !== value)
      : [...selected, value];
    table.getColumn(columnId)?.setFilterValue(arr.length ? arr : undefined);
  }
</script>

<Popover>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button {...props} variant="outline" size="sm" class="h-8 border-dashed">
        {#if selected.size > 0}
          <Icon icon="mdi:plus-circle-outline" class="mr-1 w-4 h-4" />{title}:
          <div class="flex space-x-1">
            {#each options.filter((o) => selected.has(o.value)) as opt (opt.value)}
              <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                {opt.label}
              </Badge>
            {/each}
          </div>
        {:else}
          <Icon icon="mdi:plus-circle-outline" class="mr-1  w-4 h-4" />{title}
        {/if}
      </Button>
    {/snippet}
  </PopoverTrigger>

  <PopoverContent
    align="start"
    side="bottom"
    class="w-auto max-w-[90vw] p-2 whitespace-normal break-words">
    <div class="flex flex-col space-y-1">
      {#each options as opt (opt.value)}
        <button
          class="flex items-start text-left rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          onclick={() => toggle(opt.value)}>
          <Icon
            class="mt-0.5 mr-2 shrink-0"
            icon={selected.has(opt.value) ? 'mdi:checkbox-marked' : 'mdi:checkbox-blank-outline'}
            width="20"
            height="20" />
          <span class="break-words">{opt.label}</span>
        </button>
      {/each}
    </div>
  </PopoverContent>
</Popover>
