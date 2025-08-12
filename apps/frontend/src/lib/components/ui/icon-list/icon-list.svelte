<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '$lib/utils-ui.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLUListElement>> = $props();
</script>

<ul
  bind:this={ref}
  role="list"
  class={cn('mt-8 max-w-xl space-y-4 text-sidebar-foreground', className)}
  {...restProps}>
  {@render children?.()}
</ul>
