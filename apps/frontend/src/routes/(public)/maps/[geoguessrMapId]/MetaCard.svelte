<script lang="ts">
  import Icon from '@iconify/svelte';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import type { Meta } from './types';

  let {
    meta,
    selectable = false,
    selected = false,
    onToggleSelect,
    onOpen
  }: {
    meta: Meta;
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: (checked: boolean) => void;
    onOpen?: () => void;
  } = $props();

  let imageIndex = $state(0);

  let noteExcerpt = $derived(
    meta.note
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
  );

  function cycleImage(event: Event, direction: number) {
    event.stopPropagation();
    imageIndex = (imageIndex + direction + meta.images.length) % meta.images.length;
  }
</script>

<div
  class="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-border hover:shadow-lg focus-visible:outline-2 focus-visible:outline-ring"
  role="button"
  tabindex="0"
  onclick={onOpen}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), onOpen?.()) : null)}>
  {#if meta.images.length > 0}
    <div class="relative h-44 shrink-0 overflow-hidden border-b bg-muted/60">
      <img
        src={meta.images[imageIndex]}
        alt={meta.name}
        loading="lazy"
        decoding="async"
        class="h-full w-full object-contain" />
      {#if meta.images.length > 1}
        <button
          type="button"
          aria-label="Previous image"
          class="absolute left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100"
          onclick={(e) => cycleImage(e, -1)}>
          <ChevronLeftIcon class="size-4" />
        </button>
        <button
          type="button"
          aria-label="Next image"
          class="absolute right-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100"
          onclick={(e) => cycleImage(e, 1)}>
          <ChevronRightIcon class="size-4" />
        </button>
        <span
          class="pointer-events-none absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
          {imageIndex + 1} / {meta.images.length}
        </span>
      {/if}
    </div>
  {:else}
    <div class="flex h-44 shrink-0 items-center justify-center border-b bg-muted/40">
      <Icon
        icon="material-symbols:image-not-supported-outline"
        class="h-8 w-8 text-muted-foreground/50" />
    </div>
  {/if}

  {#if selectable}
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
    <div
      class="absolute left-2 top-2 z-10 rounded-md bg-background/80 p-1.5 shadow-xs backdrop-blur-sm"
      onclick={(e) => e.stopPropagation()}>
      <Checkbox
        checked={selected}
        onCheckedChange={(checked) => onToggleSelect?.(!!checked)}
        aria-label="Select {meta.name}" />
    </div>
  {/if}

  <div class="flex flex-1 flex-col gap-2 p-4">
    <h3 class="font-semibold leading-snug">{meta.name}</h3>
    {#if noteExcerpt}
      <p class="grow text-sm leading-relaxed text-muted-foreground line-clamp-3">{noteExcerpt}</p>
    {/if}
    <div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
      <Icon icon="material-symbols:location-on" class="h-3.5 w-3.5" />
      <span>{meta.locationsCount} location{meta.locationsCount !== 1 ? 's' : ''}</span>
    </div>
  </div>
</div>
