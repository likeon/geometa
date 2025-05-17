<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import { Button } from '$lib/components/ui/button/index.js';

  let {
    name,
    variant = 'ghost',
    sort,
    ...restProps
  }: ComponentProps<typeof Button> & {
    name: string;
    sort?: 'asc' | 'desc' | false;
  } = $props();
</script>

<Button {variant} {...restProps} class="pl-0">
  {name}
  {#if sort === 'asc'}
    <ArrowUp class="ml-2" size={16} />
  {:else if sort === 'desc'}
    <ArrowDown class="ml-2" size={16} />
  {:else}
    <ArrowUpDown class="ml-2" size={16} />
  {/if}
</Button>
