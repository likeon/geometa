<script lang="ts">
  import { cn } from '$lib/utils-ui';
  import type { Snippet } from 'svelte';

  type Props = {
    variant?: 'warning' | 'info' | 'error';
    class?: string;
    children: Snippet;
  };

  let { variant = 'warning', class: className, children }: Props = $props();

  const variantStyles = {
    warning: 'border-amber-500/50',
    info: 'border-blue-500/50',
    error: 'border-red-500/50'
  };
</script>

<p
  class={cn(
    'text-muted-foreground mt-3 text-sm italic bg-muted/30 rounded-md p-3 border-l-4',
    variantStyles[variant],
    className
  )}>
  {@render children()}
</p>
