<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import Icon from '@iconify/svelte';
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

<!--  TODO: hack: it's set to !pl-0 so text hugs the button so it looks aligned with rest of cells, do it better way because button looks ugly when hovered-->
<Button
  {variant}
  {...restProps}
  class=" !pl-0 hover:bg-transparent focus:bg-transparent active:bg-transparent {sort === undefined
    ? 'pointer-events-none cursor-default'
    : ''}">
  {name}
  {#if sort !== undefined}
    {#if sort === 'asc'}
      <Icon class="ml-2" icon="carbon:arrow-up" />
    {:else if sort === 'desc'}
      <Icon class="ml-2" icon="carbon:arrow-down" />
    {:else}
      <Icon class="ml-2" icon="carbon:arrows-vertical" />
    {/if}
  {/if}
</Button>
