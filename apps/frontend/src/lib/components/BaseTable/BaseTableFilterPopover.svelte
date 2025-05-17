<script lang="ts">
  import { Popover, PopoverTrigger, PopoverContent } from '$lib/components/ui/popover';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import Icon from '@iconify/svelte';
  import CirclePlus from '@lucide/svelte/icons/circle-plus';

  const { table, columnId, title, options } = $props<{
    table: any;
    columnId: string;
    title: string;
    options: { label: string; value: string }[];
  }>();

  const selected = $derived(() => {
    const fv = table.getColumn(columnId)?.getFilterValue();
    const arr = Array.isArray(fv) ? fv : fv != null ? [fv] : [];
    return new Set(arr);
  });

  function toggle(value: string) {
    const current = selected();
    const next = new Set(current);
    next.has(value) ? next.delete(value) : next.add(value);

    const arr = Array.from(next);
    table.getColumn(columnId)?.setFilterValue(arr.length ? arr : undefined);
  }
</script>

<Popover>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button {...props} variant="outline" size="sm" class="h-8 border-dashed">
        {#if selected().size > 0}
          <CirclePlus size={16} class="mr-1" />{title}:
          <div class="flex space-x-1">
            {#each options.filter((o) => selected().has(o.value)) as opt (opt.value)}
              <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                {opt.label}
              </Badge>
            {/each}
          </div>
        {:else}
          <CirclePlus size={16} class="mr-1" />{title}
        {/if}
      </Button>
    {/snippet}
  </PopoverTrigger>

  <PopoverContent align="start" side="bottom" class="w-40 p-2">
    <div class="flex flex-col space-y-1">
      {#each options as opt (opt.value)}
        <button class="flex items-center rounded px-2 py-1" onclick={() => toggle(opt.value)}>
          <Icon
            class="mr-2"
            icon={selected().has(opt.value) ? 'mdi:checkbox-marked' : 'mdi:checkbox-blank-outline'}
            width="20"
            height="20" />
          {opt.label}
        </button>
      {/each}
    </div>
  </PopoverContent>
</Popover>
