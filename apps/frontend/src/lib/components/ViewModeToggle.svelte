<script lang="ts">
  import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import ListIcon from '@lucide/svelte/icons/list';
  import type { ViewMode } from '$lib/view-mode';

  let {
    value = $bindable(),
    cookieName,
    label
  }: {
    value: ViewMode;
    cookieName: string;
    label: string;
  } = $props();

  const itemClass =
    'h-6 min-w-6 !rounded-md px-1.5 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs';

  $effect(() => {
    document.cookie = `${cookieName}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  });
</script>

<ToggleGroup.Root
  type="single"
  bind:value
  allowDeselect={false}
  size="sm"
  class="gap-0.5 bg-muted/60 p-0.5"
  aria-label={label}>
  <ToggleGroup.Item value="cards" class={itemClass} aria-label="Card view" title="Card view">
    <LayoutGridIcon class="size-4" />
  </ToggleGroup.Item>
  <ToggleGroup.Item value="list" class={itemClass} aria-label="List view" title="List view">
    <ListIcon class="size-4" />
  </ToggleGroup.Item>
</ToggleGroup.Root>
