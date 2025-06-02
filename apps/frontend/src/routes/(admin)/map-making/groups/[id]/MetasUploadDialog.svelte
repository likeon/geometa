<script lang="ts">
  import { type SuperValidated, type Infer, fileProxy } from 'sveltekit-superforms';
  import { superForm } from 'sveltekit-superforms';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/form';
  import { Input } from '$lib/components/ui/input';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Form from '$lib/components/ui/form';
  import type { MetasUploadSchema } from '$lib/form-schema';

  interface Props {
    isUploadDialogOpen: boolean;
    data: SuperValidated<Infer<MetasUploadSchema>>;
  }
  let pastedFile: null | File = null;
  let { isUploadDialogOpen = $bindable(), data }: Props = $props();
  const form = superForm(data, {
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
      'You are about to replace all metas in your map group with the new metas. Are you sure?'
    );
  }
</script>

<Dialog.Root bind:open={isUploadDialogOpen}>
  <Dialog.Content>
    <form
      class="flex flex-col space-y-6"
      method="post"
      action="?/uploadMetas"
      enctype="multipart/form-data"
      use:enhance>
      <Form.Field {form} name="partialUpload">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex flex-row items-start space-x-1 space-y-0 mb-2">
              <Checkbox {...props} bind:checked={$formData.partialUpload} name="partialUpload" />
              <Label
                for={props.id}
                class="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Keep old metas (will only add/update metas and not remove any already existing ones)
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
              <Label for={props.id}>Upload metas json:</Label>
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

    <p class="text-xl"></p>
    <div class="text-green-900">
      <p>You can also paste metas from your clipboard (ctrl+V).</p>
      <p><a href="/map-making/docs/meta-uploads" target="_blank">Docs are here.</a></p>
    </div>
  </Dialog.Content>
</Dialog.Root>
