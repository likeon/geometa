<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { Meta } from './types';

  let {
    meta,
    variant = 'desktop'
  }: {
    meta: Meta;
    variant?: 'mobile' | 'desktop' | 'dialog';
  } = $props();

  const imgClass = {
    mobile: 'max-h-[250px]',
    desktop: 'max-h-[300px] transition-transform group-hover:scale-[1.02]',
    dialog: 'max-h-[400px]'
  };
</script>

{#if meta.note || meta.footer !== ''}
  <div class="prose prose-sm dark:prose-invert max-w-none">
    <div class="rounded-lg border bg-muted/50 p-4 space-y-3">
      {#if meta.note}
        <div>
          {@html meta.note}
        </div>
      {/if}
      {#if meta.footer !== ''}
        <div class="text-sm text-muted-foreground border-t pt-3">
          {@html meta.footer}
        </div>
      {/if}
    </div>
  </div>
{/if}

<div class={variant === 'desktop' ? 'space-y-4' : 'space-y-3'}>
  {#if variant !== 'dialog'}
    <div class="flex items-center gap-2">
      <Icon
        icon="material-symbols:image"
        class="{variant === 'desktop' ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground" />
      <h3 class="font-semibold {variant === 'desktop' ? 'text-lg' : ''}">Images</h3>
      {#if meta.images.length > 0}
        <span class="text-sm text-muted-foreground">({meta.images.length})</span>
      {/if}
    </div>
  {/if}

  {#if meta.images.length > 0}
    <div
      class={variant === 'desktop'
        ? `grid gap-4 ${meta.images.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`
        : 'space-y-3'}>
      {#each meta.images as url (url)}
        <div class="group relative overflow-hidden rounded-lg border bg-muted">
          <img
            src={url}
            alt="Meta location"
            class="w-full h-auto object-contain {imgClass[variant]}" />
          {#if variant === 'desktop'}
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors">
            </div>
          {/if}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white p-2 rounded-md">
            <Icon icon="material-symbols:open-in-new" class="h-4 w-4" />
          </a>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center {variant === 'desktop' ? 'py-12' : 'py-8'} text-muted-foreground">
      <Icon
        icon="material-symbols:image-not-supported-outline"
        class="{variant === 'desktop' ? 'h-12 w-12 mb-3' : 'h-8 w-8 mb-2'} mx-auto opacity-50" />
      <p class={variant === 'desktop' ? '' : 'text-sm'}>
        {variant === 'desktop' ? 'No images available for this location' : 'No images available'}
      </p>
    </div>
  {/if}
</div>
