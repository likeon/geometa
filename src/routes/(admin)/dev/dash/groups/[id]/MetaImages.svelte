<script lang="ts">
  import { Button, Input } from 'flowbite-svelte';
  import { fileProxy, type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
  import type { MapUploadSchema } from './+page.server';
  import type { PageData } from './$types';
  import { applyAction, enhance } from '$app/forms';

  export let metaId: number;
  export let data: SuperValidated<Infer<MapUploadSchema>>;
  export let images: PageData['group']['metas'][number]['images'];
  type ImagesType = typeof images;
  export let updateImages: (images: ImagesType) => void;

  let isDragging = false;

  const {
    form: imageForm,
    errors: imageErrors,
    enhance: imageEnhance,
    submit: imageSubmit
  } = superForm(data, {
    async onUpdated({ form }) {
      if (form.valid) {
        images = [...images, form.message];
        updateImages(images);
      }
    }
  });

  const file = fileProxy(imageForm, 'file');

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

  function handleFileUpload(event: Event) {
    imageSubmit();
  }
</script>

<p>Currently the UserScript only shows one image</p>
<div class="grid grid-cols-2 gap-4">
  {#each images as image (image.id)}
    <div class="relative group">
      <form
        method="post"
        action="?/deleteMetaImage"
        use:enhance={() => {
          return async ({ result }) => {
            if ('data' in result) {
              images = images.filter((image) => image.id !== result.data?.imageId);
              updateImages(images);
            }
            await applyAction(result);
          };
        }}
      >
        <Input type="hidden" name="imageId" value={image.id} />
        <img src={image.image_url} alt="#" class="w-full h-auto" />
        <div
          class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <Button type="submit" color="light">Delete</Button>
        </div>
      </form>
    </div>
  {/each}
</div>

<form
  class="flex flex-col space-y-6"
  method="post"
  action="?/uploadMetaImages"
  enctype="multipart/form-data"
  use:imageEnhance
>
  <Input type="hidden" name="metaId" value={metaId} />

  <label>
    Upload an image:
    <input
      accept="image/png, image/jpeg, image/webp"
      name="file"
      type="file"
      bind:files={$file}
      on:change={handleFileUpload}
    />
    {#if $imageErrors.file}
      <div class="invalid">{$imageErrors.file}</div>
    {/if}
  </label>

  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="drop-area {isDragging ? 'dragging' : ''}"
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
  >
    <p>Drag & Drop your image here or click above to browse</p>
  </div>
</form>

<style>
  .drop-area {
    border: 2px dashed #cccccc;
    padding: 20px;
    text-align: center;
    transition: background-color 0.2s;
  }

  .drop-area.dragging {
    background-color: #f0f0f0;
  }

  img {
    max-width: 100%;
    height: auto;
  }
</style>
