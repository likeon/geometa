<script lang="ts">
  import { type SuperValidated, type Infer, fileProxy } from 'sveltekit-superforms';
  import { superForm } from 'sveltekit-superforms';
  import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
  import { Label } from '$lib/components/ui/form';
  import { Input } from '$lib/components/ui/input';
  import * as Dialog from '$lib/components/ui/dialog/index';
  import * as Form from '$lib/components/ui/form';
  import { type MapUploadSchema } from '$lib/form-schema';
  import { Button } from '$lib/components/ui/button';
  import UploadModeInfo from './UploadModeInfo.svelte';
  import { createPasteUpload } from './paste-upload.svelte';

  interface Props {
    isUploadDialogOpen: boolean;
    numberOfLocationsUploaded: number;
    data: SuperValidated<Infer<MapUploadSchema>>;
  }
  let {
    isUploadDialogOpen = $bindable(),
    numberOfLocationsUploaded = $bindable(),
    data
  }: Props = $props();
  // svelte-ignore state_referenced_locally
  const form = superForm(data, {
    onResult({ result }) {
      if (result.type == 'success') {
        numberOfLocationsUploaded = result.data?.form.message.numberOfLocations || 0;
        isUploadDialogOpen = false;
      }
    },
    onSubmit({ formData, cancel }) {
      if ((uploadMode === 'full' || uploadMode === 'tagReplace') && !confirmFullUpload()) {
        cancel();
        isUploadDialogOpen = false;
      }
      pasteUpload.applyTo(formData);
    }
  });

  const { form: formData, enhance, submit, reset } = form;
  const uploadMode = $derived($formData.uploadMode);
  const file = fileProxy(form, 'file');

  const pasteUpload = createPasteUpload({
    isOpen: () => isUploadDialogOpen,
    submit,
    reset
  });

  function confirmFullUpload() {
    if (uploadMode === 'full') {
      return confirm(
        'You are about to replace ALL locations in your map group with new locations (metas and descriptions will stay). Are you sure?'
      );
    } else if (uploadMode === 'tagReplace') {
      return confirm(
        'You are about to replace locations with specific tags only. Locations with other tags will remain untouched. Are you sure?'
      );
    }
    return true;
  }
</script>

<Dialog.Root bind:open={isUploadDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Upload Locations</Dialog.Title>
      <Dialog.Description>
        Upload map JSON from map-making.app to add or update locations in this group.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <!-- Upload Mode Info -->
      {#if uploadMode === 'partial'}
        <UploadModeInfo
          variant="info"
          title="Partial upload mode"
          description="New locations will be added and existing ones updated. No locations will be removed." />
      {:else if uploadMode === 'full'}
        <UploadModeInfo
          variant="destructive"
          title="Full replacement mode"
          description="All existing locations will be replaced. Metas and descriptions will be preserved." />
      {:else if uploadMode === 'tagReplace'}
        <UploadModeInfo
          variant="warning"
          title="Tag-based replacement mode"
          description="Only locations with tags present in the upload will be replaced. Other locations remain untouched." />
      {/if}

      <!-- File Upload Section -->
      <form method="post" action="?/uploadMapJson" enctype="multipart/form-data" use:enhance>
        <!-- Upload Mode Selection -->
        <Form.Field {form} name="uploadMode">
          <Form.Control>
            {#snippet children({ props })}
              <div class="space-y-3">
                <Label class="text-sm font-medium">Upload Mode</Label>
                <RadioGroup bind:value={$formData.uploadMode} {...props}>
                  <button
                    type="button"
                    class="flex items-center space-x-2 cursor-pointer text-left"
                    onclick={() => ($formData.uploadMode = 'partial')}>
                    <RadioGroupItem value="partial" />
                    <span class="text-sm font-normal">
                      Partial upload - Add/update locations without removing existing ones
                    </span>
                  </button>
                  <button
                    type="button"
                    class="flex items-center space-x-2 cursor-pointer text-left"
                    onclick={() => ($formData.uploadMode = 'tagReplace')}>
                    <RadioGroupItem value="tagReplace" />
                    <span class="text-sm font-normal">
                      Tag-based replacement - Replace only locations with uploaded tags
                    </span>
                  </button>
                  <button
                    type="button"
                    class="flex items-center space-x-2 cursor-pointer text-left"
                    onclick={() => ($formData.uploadMode = 'full')}>
                    <RadioGroupItem value="full" />
                    <span class="text-sm font-normal">
                      Full replacement - Replace all locations in the group
                    </span>
                  </button>
                </RadioGroup>
              </div>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
        <Form.Field {form} name="file">
          <Form.Control>
            {#snippet children({ props })}
              <div class="space-y-2">
                <label for={props.id} class="text-sm font-medium">Select JSON file</label>
                <Input
                  {...props}
                  type="file"
                  accept="application/json"
                  name="file"
                  bind:files={$file}
                  onchange={() => submit()} />
              </div>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors>
            {#snippet children({ errors })}
              {#if errors && errors.length > 0}
                <div class="space-y-1 text-sm text-destructive">
                  {#each errors as error, index (index)}
                    <p>{@html error}</p>
                  {/each}
                </div>
              {/if}
            {/snippet}
          </Form.FieldErrors>
        </Form.Field>
      </form>

      <!-- Instructions -->
      <div class="space-y-3">
        <div class="rounded-md bg-muted p-3">
          <p class="text-sm font-medium mb-2">Alternative methods:</p>
          <p class="text-xs text-muted-foreground">
            You can also paste locations directly from your clipboard (Ctrl+V) after copying them
            from
            <a href="https://map-making.app/" target="_blank" class="underline hover:text-primary"
              >map-making.app</a
            >.
          </p>
        </div>

        <div class="rounded-md bg-muted p-3">
          <p class="text-sm font-medium mb-2">Tag format requirements:</p>
          <p class="text-xs text-muted-foreground mb-2">
            Each location must have exactly one tag in <code class="bg-background px-1 rounded"
              >CountryName-Your Meta Name</code> format.
          </p>
          <div class="text-xs text-muted-foreground space-y-1">
            <p class="font-medium">Examples:</p>
            <ul class="list-disc list-inside ml-2 space-y-0.5">
              <li><code class="bg-background px-1 rounded">Czechia-Bollard</code></li>
              <li><code class="bg-background px-1 rounded">Portugal-LicensePlate</code></li>
              <li><code class="bg-background px-1 rounded">Singapore-StreetSign</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <Dialog.Footer>
      <Button type="button" variant="outline" onclick={() => (isUploadDialogOpen = false)}>
        Cancel
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
