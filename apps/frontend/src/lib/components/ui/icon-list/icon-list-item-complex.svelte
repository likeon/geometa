<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '@iconify/svelte';
  import { cn, type WithElementRef } from '$lib/utils-ui.js';

  let {
    ref = $bindable(null),
    icon = 'icon-park-solid:check-one',
    iconColor = 'green',
    class: className,
    children,
    subContent,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLLIElement>> & {
    icon?: string;
    iconColor?: string;
    subContent?: Snippet;
  } = $props();
</script>

<li bind:this={ref} class={className} {...restProps}>
  <div class="flex gap-x-3">
    <Icon {icon} color={iconColor} class="h-6 w-6 shrink-0" />
    {@render children?.()}
  </div>
  {#if subContent}
    {@render subContent()}
  {/if}
</li>
