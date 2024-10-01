<script lang="ts">
  import { Button, Input } from 'flowbite-svelte';
  import { fileProxy, type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
  import type { MapUploadSchema } from './+page.server';
  import type { PageData } from './$types';
  import { applyAction, enhance } from '$app/forms';

  export let metaId: number;
  export let data: SuperValidated<Infer<MapUploadSchema>>;
  export let images: PageData['group']['metas'][number]['images'];

  const {
    form: imageForm,
    errors: imageErrors,
    enhance: imageEnhance,
    submit: imageSubmit
  } = superForm(data, {
    async onUpdated({ form }) {
      if (form.valid) {
        images = [...images, form.message];
      }
    }
  });
  const file = fileProxy(imageForm, 'file');
</script>

<div class="grid grid-cols-2 gap-4">
  {#each images as image (image.id)}
    <div class="relative group">
      <form
        method="post"
        action="?/deleteMetaImage"
        use:enhance={() => {
          return async ({ result }) => {
            images = images.filter((image) => image.id !== result.data.imageId);
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
  on:change={() => imageSubmit()}
>
  <Input type="hidden" name="metaId" value={metaId} />
  <label>
    Upload an image: <input
      accept="image/png, image/jpeg, image/webp"
      name="file"
      type="file"
      bind:files={$file}
    />
    {#if $imageErrors.file}
      <div class="invalid">{$imageErrors.file}</div>
    {/if}
  </label>
</form>
