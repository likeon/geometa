<script lang="ts">
  import { type SuperValidated, type Infer, fileProxy } from 'sveltekit-superforms';
  import { superForm } from 'sveltekit-superforms';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/form';
  import { Input } from '$lib/components/ui/input';
  import * as Dialog from '$lib/components/ui/dialog/index';
  import * as Form from '$lib/components/ui/form';
  import { type MapUploadSchema } from '$lib/form-schema';

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
        console.log(result.data?.form.message.numberOfLocations);
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
    <form
      class="flex flex-col space-y-6"
      method="post"
      action="?/uploadMapJson"
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
                Keep old locations (will only add/update locations and not remove any already added
                locations)
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
              <Label for={props.id}>
                Upload Map json from <a
                  target="_blank"
                  href="https://map-making.app/"
                  class="text-blue-600 hover:underline">map-making.app</a
                >:
              </Label>
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

    <div class="text-green-900 dark:text-white">
      <p>
        You can also paste locations from your clipboard (ctrl+V) after copying them from map-making
        app (by using copy button there).
      </p>
      <br />
      <br />
      <p>
        Each location <strong>must</strong> have exactly one tag in
        <span class="whitespace-nowrap font-semibold">CountryName-Your Meta Name</span> format!
      </p>
      <p>Examples:</p>
      <ol class="list-disc ml-5">
        <li>Czechia-Bollard</li>
        <li>Portugal-LicensePlate</li>
        <li>Singapore-StreetSign</li>
      </ol>
    </div>
  </Dialog.Content>
</Dialog.Root>
