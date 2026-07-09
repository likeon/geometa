<script lang="ts">
  import { resolve } from '$app/paths';
  import { type SuperValidated, type Infer, fileProxy } from 'sveltekit-superforms';
  import { superForm } from 'sveltekit-superforms';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/form';
  import { Input } from '$lib/components/ui/input';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Form from '$lib/components/ui/form';
  import type { MetasUploadSchema } from '$lib/form-schema';
  import { Button } from '$lib/components/ui/button';
  import UploadModeInfo from './UploadModeInfo.svelte';
  import { createPasteUpload } from './paste-upload.svelte';

  interface Props {
    isUploadDialogOpen: boolean;
    data: SuperValidated<Infer<MetasUploadSchema>>;
  }
  let { isUploadDialogOpen = $bindable(), data }: Props = $props();
  // svelte-ignore state_referenced_locally
  const form = superForm(data, {
    id: 'upload-metas-form',
    onResult({ result }) {
      if (result.type == 'success') {
        isUploadDialogOpen = false;
      }
    },
    onSubmit({ formData, cancel }) {
      if (!isPartialUpload && !confirmFullUpload()) {
        cancel();
        isUploadDialogOpen = false;
      }
      pasteUpload.applyTo(formData);
    }
  });

  const { form: formData, enhance, submit, reset } = form;
  const isPartialUpload = $derived($formData.partialUpload);
  const file = fileProxy(form, 'file');

  const pasteUpload = createPasteUpload({
    isOpen: () => isUploadDialogOpen,
    submit,
    reset
  });

  function confirmFullUpload() {
    return confirm(
      'You are about to replace all metas in your map group with the new metas. Are you sure?'
    );
  }
</script>

<Dialog.Root bind:open={isUploadDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Upload Metas</Dialog.Title>
      <Dialog.Description>
        Upload meta data JSON to add or update metas in this group.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <!-- Upload Mode Info -->
      {#if !isPartialUpload}
        <UploadModeInfo
          variant="destructive"
          title="Full replacement mode"
          description="All existing metas will be replaced with the uploaded ones." />
      {:else}
        <UploadModeInfo
          variant="info"
          title="Partial upload mode"
          description="New metas will be added and existing ones updated. No metas will be removed." />
      {/if}

      <!-- File Upload Section -->
      <form method="post" action="?/uploadMetas" enctype="multipart/form-data" use:enhance>
        <Form.Field {form} name="partialUpload">
          <Form.Control>
            {#snippet children({ props })}
              <div class="flex items-center space-x-2">
                <Checkbox {...props} bind:checked={$formData.partialUpload} name="partialUpload" />
                <Label for={props.id} class="text-sm font-normal cursor-pointer">
                  Keep existing metas (partial upload)
                </Label>
              </div>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field {form} name="autoCreateLevels">
          <Form.Control>
            {#snippet children({ props })}
              <div class="flex items-center space-x-2">
                <Checkbox
                  {...props}
                  bind:checked={$formData.autoCreateLevels}
                  name="autoCreateLevels" />
                <Label for={props.id} class="text-sm font-normal cursor-pointer">
                  Auto-create levels if they don't exist
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
          <Form.FieldErrors />
        </Form.Field>
      </form>

      <!-- Instructions -->
      <div class="space-y-3">
        <div class="rounded-md bg-muted p-3">
          <p class="text-sm font-medium mb-2">Alternative methods:</p>
          <p class="text-xs text-muted-foreground">
            You can also paste metas directly from your clipboard (Ctrl+V).
          </p>
        </div>

        <div class="rounded-md bg-muted p-3">
          <p class="text-sm font-medium mb-2">Need help?</p>
          <p class="text-xs text-muted-foreground">
            Check the <a
              href={resolve('/map-making/docs/meta-uploads')}
              target="_blank"
              class="underline hover:text-primary">documentation</a> for detailed format requirements
            and examples.
          </p>
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
