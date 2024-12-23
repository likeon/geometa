<script lang="ts">
  import { Modal } from 'flowbite-svelte';
  import { type SuperValidated, type Infer, fileProxy } from 'sveltekit-superforms';
  import { superForm } from 'sveltekit-superforms';
  import type { MapUploadSchema } from './+page.server';

  interface Props {
    isUploadModalOpen: boolean;
    numberOfLocationsUploaded: number;
    data: SuperValidated<Infer<MapUploadSchema>>;
  }
  let pastedFile: null | File = null;
  let {
    isUploadModalOpen = $bindable(),
    numberOfLocationsUploaded = $bindable(),
    data
  }: Props = $props();
  const { form, errors, enhance, submit, reset } = superForm(data, {
    onSubmit({ formData }) {
      if (pastedFile != null) {
        formData.set('file', pastedFile);
      }
    },
    onResult({ result }) {
      if (result.type == 'success') {
        numberOfLocationsUploaded = result.data?.form.message.numberOfLocations || 0;
        isUploadModalOpen = false;
      }

      if (result.type == 'failure') {
      }
    }
  });
  const file = fileProxy(form, 'file');

  $effect(() => {
    if (isUploadModalOpen) {
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
        const jsonFile = new File([JSON.stringify(jsonData)], 'pasted-data.json', {
          type: 'application/json'
        });
        pastedFile = jsonFile;
        const numberOfLocs = jsonData.customCoordinates.length;
        if (confirm(`Are you sure you want to upload ${numberOfLocs} locations from clipboard?`)) {
          await submit();
        }
      } catch (error) {
        alert('Pasted data is not valid JSON.');
      }
    }
  }
</script>

<Modal bind:open={isUploadModalOpen}>
  <form
    class="flex flex-col space-y-6"
    method="post"
    action="?/uploadMapJson"
    enctype="multipart/form-data"
    use:enhance>
    <label>
      Upload Map json from <a target="_blank" href="https://map-making.app/">map-making.app</a>:
      <input
        bind:files={$file}
        accept="application/json"
        name="file"
        type="file"
        onchange={() => submit()} />
      {#if $errors.file}
        <div class="invalid">{$errors.file}</div>
      {/if}
    </label>
  </form>
  <p class="text-xl"></p>
  <div class="text-green-900">
    <p>
      You can also paste locations from your clipboard(ctrl+v) after copying them from map-making
      app(by using copy button there).
    </p>
    <br />
    <p>
      WARNING: All the locations will be replaced by the locations you are uploading(metas and
      descriptions will stay). We gonna add way to add locations without replacing current ones
      soon.
    </p>
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
</Modal>
