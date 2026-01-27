<script lang="ts">
  import { fileProxy, type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
  import type { ImageUploadSchema, ImageOrderUpdateSchema } from './+page.server';
  import type { PageData } from './$types';
  import { applyAction, enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import LoadingSmall from '$lib/components/LoadingSmall.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { dndzone, TRIGGERS, SOURCES, SHADOW_PLACEHOLDER_ITEM_ID } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';

  interface Props {
    imageUploadForm: SuperValidated<Infer<ImageUploadSchema>>;
    orderData: SuperValidated<Infer<ImageOrderUpdateSchema>>;
    selectedMeta: PageData['group']['metas'][number];
  }

  let { imageUploadForm, orderData, selectedMeta }: Props = $props();

  let isDragging = $state(false);
  let isUploading = $state(false);
  // svelte-ignore state_referenced_locally
  // eslint-disable-next-line svelte/prefer-writable-derived -- mutated by drag-and-drop
  let items = $state(
    selectedMeta.images.map((img, index) => ({ ...img, id: img.id.toString(), order: index }))
  );

  $effect(() => {
    items = selectedMeta.images.map((img, index) => ({
      ...img,
      id: img.id.toString(),
      order: index
    }));
  });

  // svelte-ignore state_referenced_locally
  const imageFormApi = superForm(imageUploadForm, {
    onSubmit() {
      isUploading = true;
    },
    onResult() {
      isUploading = false;
    },
    async onUpdated() {}
  });
  const {
    form: imageForm,
    errors: imageErrors,
    enhance: imageEnhance,
    submit: imageSubmit
  } = imageFormApi;

  // svelte-ignore state_referenced_locally
  const orderFormApi = superForm(orderData, {
    id: 'imageOrder',
    dataType: 'json',
    resetForm: false,
    async onUpdated({ form }) {
      if (form.valid) {
        await invalidateAll();
      }
    }
  });
  const { form: orderForm, enhance: orderEnhance, submit: orderSubmit } = orderFormApi;

  const file = fileProxy(imageForm, 'file');

  // Function to update image order via SvelteKit action
  async function updateImageOrder(newItems: typeof items) {
    const updates = newItems
      .filter((item) => item.id !== SHADOW_PLACEHOLDER_ITEM_ID)
      .map((item, index) => ({
        imageId: parseInt(item.id),
        order: index
      }));

    // Set the form data using superforms
    $orderForm.metaId = selectedMeta.id;
    $orderForm.updates = updates;

    // Submit using superforms
    orderSubmit();
  }

  function handleDndConsider(e: CustomEvent) {
    const { items: newItems, info } = e.detail;
    items = newItems;
    if (info.source === SOURCES.KEYBOARD && info.trigger === TRIGGERS.DRAG_STARTED) {
      isDragging = true;
    }
  }

  function handleDndFinalize(e: CustomEvent) {
    const { items: newItems, info } = e.detail;
    items = newItems;
    isDragging = false;

    if (info.source === SOURCES.POINTER) {
      updateImageOrder(newItems);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fileInput.files = files;
      imageSubmit();
    }
  }

  function handleFileUpload() {
    imageSubmit();
  }
</script>

<div class="h-full flex flex-col">
  <div class="border-b pb-2 mb-2">
    <form method="post" action="?/uploadMetaImages" enctype="multipart/form-data" use:imageEnhance>
      <Input type="hidden" name="metaId" value={selectedMeta.id} />

      <div class="flex gap-2 items-center h-12">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="flex-1 border-2 border-dashed rounded p-2 text-center transition-colors border-border bg-muted hover:bg-accent {isDragging
            ? 'border-primary bg-primary/10'
            : ''}"
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}>
          <p class="text-muted-foreground text-xs">
            {#if isUploading}
              <LoadingSmall />
            {:else}
              Drag & Drop images here
            {/if}
          </p>
        </div>

        <span class="text-xs text-muted-foreground">or</span>

        <input
          accept="image/png, image/jpeg, image/webp"
          name="file"
          type="file"
          bind:files={$file}
          onchange={handleFileUpload}
          class="text-xs file:py-1 file:px-2 file:rounded file:border-0 file:bg-secondary file:text-secondary-foreground hover:file:bg-accent" />
      </div>

      {#if $imageErrors.file}
        <div class="text-destructive text-xs mt-1">{$imageErrors.file}</div>
      {/if}
    </form>
  </div>

  <div class="flex-1 overflow-y-auto min-h-0">
    <div
      class="grid grid-cols-2 gap-2"
      use:dndzone={{
        items,
        flipDurationMs: 200,
        dropTargetStyle: {
          outline: '2px dashed #3b82f6',
          'outline-offset': '4px',
          'background-color': 'rgba(59, 130, 246, 0.1)'
        }
      }}
      onconsider={handleDndConsider}
      onfinalize={handleDndFinalize}>
      {#each items as image (image.id)}
        <div
          class="relative group transition-transform duration-200 {isDragging
            ? 'cursor-grabbing'
            : 'cursor-grab'}"
          animate:flip={{ duration: 200 }}>
          <form
            method="post"
            action="?/deleteMetaImage"
            use:enhance={() => {
              return async ({ result }) => {
                await invalidateAll();
                await applyAction(result);
              };
            }}>
            <Input type="hidden" name="imageId" value={parseInt(image.id)} />
            <img
              src={image.image_url}
              alt="#"
              class="w-full aspect-square object-contain bg-gray-100 rounded-lg" />
            <div
              class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
              <Button type="submit" variant="secondary" size="sm">Delete</Button>
            </div>
          </form>
        </div>
      {/each}
    </div>
  </div>
</div>

<form method="post" action="?/updateImageOrder" style="display: none;" use:orderEnhance></form>

<style>
  /* Custom drag styles for svelte-dnd-action */
  :global(.dnd-action-dragged-el) {
    opacity: 0.9;
    transform: scale(1.05);
    z-index: 1000;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  .group:hover {
    transform: scale(1.01);
    transition: transform 0.2s ease;
  }
</style>
