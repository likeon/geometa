<script lang="ts">
  import { type SuperValidated, type Infer, fileProxy } from 'sveltekit-superforms';
  import { superForm } from 'sveltekit-superforms';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/form';
  import { Input } from '$lib/components/ui/input';
  import * as Dialog from '$lib/components/ui/dialog/index';
  import * as Form from '$lib/components/ui/form';
  import { type MapUploadSchema } from '$lib/form-schema';
  import Icon from '@iconify/svelte';
  import { Button } from '$lib/components/ui/button';

  interface Props {
    isUploadDialogOpen: boolean;
    numberOfLocationsUploaded: number;
    data: SuperValidated<Infer<MapUploadSchema>>;
  }
  let pastedFile: null | File = null;
  let {
    isUploadDialogOpen = $bindable(),
    numberOfLocationsUploaded = $bindable(),
    data
  }: Props = $props();
  const form = superForm(data, {
    onResult({ result }) {
      if (result.type == 'success') {
        numberOfLocationsUploaded = result.data?.form.message.numberOfLocations || 0;
        isUploadDialogOpen = false;
      }
    },
    onSubmit({ formData, cancel }) {
      if (!isPartialUpload && !confirmFullUpload()) {
        cancel();
        isUploadDialogOpen = false;
      }
      if (pastedFile != null) {
        formData.set('file', pastedFile);
      }
    }
  });

  const { form: formData, enhance, submit, reset } = form;
  const isPartialUpload = $derived($formData.partialUpload);
  const file = fileProxy(form, 'file');

  $effect(() => {
    if (isUploadDialogOpen) {
      document.addEventListener('paste', handlePaste);
      reset();
      pastedFile = null;
    } else {
      document.removeEventListener('paste', handlePaste);
    }
  });

  async function handlePaste(event: ClipboardEvent) {
    const clipboardData =
      event.clipboardData?.getData('application/json') ||
      event.clipboardData?.getData('text/plain');
    if (clipboardData) {
      try {
        const jsonData = JSON.parse(clipboardData);
        pastedFile = new File([JSON.stringify(jsonData)], 'pasted-data.json', {
          type: 'application/json'
        });
        submit();
        pastedFile = null;
      } catch {
        alert('Pasted data is not valid JSON.');
      }
    }
  }

  function confirmFullUpload() {
    return confirm(
      'You are about to replace all locations in your map group with new locations (metas and description will stay). Are you sure?'
    );
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
      {#if !isPartialUpload}
        <div class="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <div class="flex items-start space-x-2">
            <Icon
              icon="material-symbols:warning-rounded"
              width="1rem"
              height="1rem"
              class="text-destructive mt-0.5" />
            <div class="space-y-1">
              <p class="text-sm font-medium text-destructive">Full replacement mode</p>
              <p class="text-xs text-muted-foreground">
                All existing locations will be replaced. Metas and descriptions will be preserved.
              </p>
            </div>
          </div>
        </div>
      {:else}
        <div
          class="rounded-md bg-blue-50 border border-blue-200 p-3 dark:bg-blue-950/20 dark:border-blue-900/30">
          <div class="flex items-start space-x-2">
            <Icon
              icon="material-symbols:info-rounded"
              width="1rem"
              height="1rem"
              class="text-blue-600 mt-0.5 dark:text-blue-400" />
            <div class="space-y-1">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-200">
                Partial upload mode
              </p>
              <p class="text-xs text-muted-foreground">
                New locations will be added and existing ones updated. No locations will be removed.
              </p>
            </div>
          </div>
        </div>
      {/if}

      <!-- File Upload Section -->
      <form method="post" action="?/uploadMapJson" enctype="multipart/form-data" use:enhance>
        <Form.Field {form} name="partialUpload">
          <Form.Control>
            {#snippet children({ props })}
              <div class="flex items-center space-x-2">
                <Checkbox {...props} bind:checked={$formData.partialUpload} name="partialUpload" />
                <Label for={props.id} class="text-sm font-normal cursor-pointer">
                  Keep existing locations (partial upload)
                </Label>
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
