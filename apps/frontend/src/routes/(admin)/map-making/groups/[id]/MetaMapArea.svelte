<script lang="ts">
  import { applyAction, enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { Button } from '$lib/components/ui/button';
  import LoadingSmall from '$lib/components/LoadingSmall.svelte';
  import { fileProxy, type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
  import type { GeoJsonUploadSchema } from './+page.server';
  import type { PageData } from './$types';

  let {
    selectedMeta,
    geoJsonUploadForm
  }: {
    selectedMeta: PageData['group']['metas'][number];
    geoJsonUploadForm: SuperValidated<Infer<GeoJsonUploadSchema>>;
  } = $props();

  let isDragging = $state(false);
  let isUploading = $state(false);
  let fileInput: HTMLInputElement;
  // svelte-ignore state_referenced_locally
  const formApi = superForm(geoJsonUploadForm, {
    onSubmit() {
      isUploading = true;
    },
    onResult() {
      isUploading = false;
    },
    async onUpdated({ form }) {
      if (form.valid) await invalidateAll();
    }
  });
  const { form, errors, enhance: uploadEnhance, submit } = formApi;
  const file = fileProxy(form, 'file');

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = !isUploading;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    const files = event.dataTransfer?.files;
    if (isUploading || !files?.length) return;
    fileInput.files = files;
    submit();
  }

  const previewGeoJson: SubmitFunction = () => {
    const previewWindow = window.open('about:blank', '_blank');
    if (previewWindow) previewWindow.opener = null;

    return async ({ result }) => {
      const preview = result.type === 'success' ? result.data : null;
      if (preview?.previewUrl) {
        if (previewWindow) previewWindow.location.replace(preview.previewUrl);
        else window.location.assign(preview.previewUrl);
        return;
      }
      if (preview?.previewError) {
        previewWindow?.close();
        window.alert(preview.previewError);
        return;
      }
      previewWindow?.close();
      await applyAction(result);
    };
  };
</script>

<div class="space-y-5 p-1">
  <p class="text-sm text-muted-foreground">
    Displayed on GeoGuessr round results. Supports GeoJSON points and polygons up to 5 MiB.
  </p>

  {#if selectedMeta.hasGeoJson}
    <div class="rounded-md border bg-muted/40 p-3 flex items-center justify-between gap-4">
      <p class="font-medium text-sm">Map area uploaded</p>
      <div class="flex gap-2">
        <form method="post" action="?/previewMetaGeoJson" use:enhance={previewGeoJson}>
          <input type="hidden" name="metaId" value={selectedMeta.id} />
          <Button type="submit" variant="outline" size="sm">Preview</Button>
        </form>
        <form
          method="post"
          action="?/deleteMetaGeoJson"
          use:enhance={() => {
            return async ({ result }) => {
              await invalidateAll();
              await applyAction(result);
            };
          }}>
          <input type="hidden" name="metaId" value={selectedMeta.id} />
          <Button type="submit" variant="destructive" size="sm">Remove</Button>
        </form>
      </div>
    </div>
  {/if}

  <form method="post" action="?/uploadMetaGeoJson" enctype="multipart/form-data" use:uploadEnhance>
    <input type="hidden" name="metaId" value={selectedMeta.id} />
    <label class="block text-sm font-medium mb-2" for={`meta-geojson-${selectedMeta.id}`}>
      {selectedMeta.hasGeoJson ? 'Replace GeoJSON' : 'Upload GeoJSON'}
    </label>
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
            Drag & Drop GeoJSON here
          {/if}
        </p>
      </div>

      <span class="text-xs text-muted-foreground">or</span>

      <input
        bind:this={fileInput}
        id={`meta-geojson-${selectedMeta.id}`}
        accept=".geojson,.json,application/geo+json,application/json"
        name="file"
        type="file"
        bind:files={$file}
        disabled={isUploading}
        onchange={() => submit()}
        class="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-secondary file:text-secondary-foreground hover:file:bg-accent" />
    </div>
    {#if $errors.file}
      <p class="text-destructive text-sm mt-2">{$errors.file}</p>
    {/if}
  </form>
</div>
