<script lang="ts">
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils-ui';

  interface Props {
    alertText: Snippet;
    showAlert: boolean;
    extraClass?: string;
    variant?: 'default' | 'destructive' | 'success';
  }

  let { alertText, showAlert = $bindable(), extraClass, variant = 'default' }: Props = $props();

  // Define variant-specific classes
  const variantClasses = {
    default:
      'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-50',
    destructive:
      'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-50',
    success:
      'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-50'
  };
</script>

{#if showAlert}
  <Alert class={cn('relative pr-10 mb-2', variantClasses[variant], extraClass)}>
    <AlertDescription>
      {@render alertText()}
    </AlertDescription>
    <button
      class="absolute top-2 right-2 p-1 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      onclick={() => (showAlert = false)}
      aria-label="Close">
      <X class="h-4 w-4" />
    </button>
  </Alert>
{/if}
