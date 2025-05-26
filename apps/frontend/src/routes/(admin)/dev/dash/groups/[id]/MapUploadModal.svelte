<script lang="ts">
  import { Checkbox, Label, Modal } from 'flowbite-svelte';
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
    id: 'mapUpload',
    onSubmit({ formData, cancel }) {
      if (!$form.partialUpload && !confirmFullUpload()) {
        cancel();
        isUploadModalOpen = false;
      }
      if (pastedFile != null) {
        formData.set('file', pastedFile);
      }
    },
    onResult({ result }) {
      if (result.type == 'success') {
        numberOfLocationsUploaded = result.data?.form.message.numberOfLocations || 0;
        isUploadModalOpen = false;
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

<Modal bind:open={isUploadModalOpen}>
  <form
    class="flex flex-col space-y-6"
    method="post"
    action="?/uploadMapJson"
    enctype="multipart/form-data"
    use:enhance>
    <Label>
      <Checkbox name="partialUpload" bind:checked={$form.partialUpload}
        >Keep old locations (will only add/update locations and not remove any already added
        locations)</Checkbox>
    </Label>
    <Label>
      Upload Map json from <a target="_blank" href="https://map-making.app/">map-making.app</a>:
      <input
        bind:files={$file}
        accept="application/json"
        name="file"
        type="file"
        onchange={() => submit()} />

      {#if $errors.file}
        <div class="text-red-500 leading-5">
          {#if Array.isArray($errors.file)}
            {#each $errors.file as error, index (index)}
              <p>{error}</p>
            {/each}
          {:else}
            <p>{$errors.file}</p>
          {/if}
        </div>
      {/if}
    </Label>
  </form>
  <p class="text-xl"></p>
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
</Modal>
