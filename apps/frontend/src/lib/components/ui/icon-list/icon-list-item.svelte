<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '@iconify/svelte';
  import { cn, type WithElementRef } from '$lib/utils-ui.js';

  let {
    ref = $bindable(null),
    icon = 'icon-park-solid:check-one',
    iconColor = 'green',
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLLIElement>> & {
    icon?: string;
    iconColor?: string;
  } = $props();
</script>

<li bind:this={ref} class={cn('flex gap-x-3', className)} {...restProps}>
  <Icon {icon} color={iconColor} class="h-6 w-6 shrink-0" />
  {@render children?.()}
</li>
