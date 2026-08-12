<script lang="ts">
  import { applyAction, enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
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

  let isUploading = $state(false);
  // svelte-ignore state_referenced_locally
  const formApi = superForm(geoJsonUploadForm, {
    onSubmit() {
      isUploading = true;
    },
    async onUpdated({ form }) {
      isUploading = false;
      if (form.valid) await invalidateAll();
    }
  });
  const { form, errors, enhance: uploadEnhance, submit } = formApi;
  const file = fileProxy(form, 'file');
</script>

<div class="space-y-5 p-1">
  <div class="space-y-1">
    <h3 class="font-medium">GeoJSON</h3>
    <p class="text-sm text-muted-foreground">
      Shown on GeoGuessr result maps after each round. Polygon and MultiPolygon only, using WGS84
      coordinates. Maximum size: 5 MiB.
    </p>
  </div>

  {#if selectedMeta.hasGeoJson}
    <div class="rounded-md border bg-muted/40 p-3 flex items-center justify-between gap-4">
      <div>
        <p class="font-medium text-sm">Map area uploaded</p>
        <p class="text-xs text-muted-foreground">Replace it below or remove it entirely.</p>
      </div>
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
  {/if}

  <form method="post" action="?/uploadMetaGeoJson" enctype="multipart/form-data" use:uploadEnhance>
    <input type="hidden" name="metaId" value={selectedMeta.id} />
    <label class="block text-sm font-medium mb-2" for={`meta-geojson-${selectedMeta.id}`}>
      {selectedMeta.hasGeoJson ? 'Replace GeoJSON' : 'Upload GeoJSON'}
    </label>
    <div class="flex items-center gap-3">
      <input
        id={`meta-geojson-${selectedMeta.id}`}
        accept=".geojson,.json,application/geo+json,application/json"
        name="file"
        type="file"
        bind:files={$file}
        disabled={isUploading}
        onchange={() => submit()}
        class="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-secondary file:text-secondary-foreground hover:file:bg-accent" />
      {#if isUploading}<LoadingSmall />{/if}
    </div>
    {#if $errors.file}
      <p class="text-destructive text-sm mt-2">{$errors.file}</p>
    {/if}
  </form>

  <p class="text-xs text-muted-foreground">
    Uploading or removing an area requires synchronizing the map group before players see the
    change.
  </p>
</div>
