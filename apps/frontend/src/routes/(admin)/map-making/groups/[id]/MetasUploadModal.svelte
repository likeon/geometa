<script lang="ts">
  import { Checkbox, Label, Modal } from 'flowbite-svelte';
  import { type SuperValidated, type Infer, fileProxy } from 'sveltekit-superforms';
  import { superForm } from 'sveltekit-superforms';
  import type { MetasUploadSchema } from './+page.server';

  interface Props {
    isUploadModalOpen: boolean;
    data: SuperValidated<Infer<MetasUploadSchema>>;
  }
  let pastedFile: null | File = null;
  let { isUploadModalOpen = $bindable(), data }: Props = $props();
  const { form, errors, enhance, submit, reset } = superForm(data, {
    id: 'metasUpload',
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
      'You are about to replace all metas in your map group with the new metas. Are you sure?'
    );
  }
</script>

<Modal bind:open={isUploadModalOpen}>
  <form
    class="flex flex-col space-y-6"
    method="post"
    action="?/uploadMetas"
    enctype="multipart/form-data"
    use:enhance>
    <Label>
      <Checkbox name="partialUpload" bind:checked={$form.partialUpload}
        >Keep old metas (will only add/update metas and not remove any already existing ones)</Checkbox>
    </Label>
    <Label>
      Upload metas json:
      <input
        bind:files={$file}
        accept="application/json"
        name="file"
        type="file"
        onchange={() => submit()} />

      {#if $errors.file}
        <div class="text-red-800">{$errors.file}</div>
      {/if}
    </Label>
  </form>
  <p class="text-xl"></p>
  <div class="text-green-900">
    <p>You can also paste metas from your clipboard (ctrl+V).</p>
    <p><a href="/map-making/docs/meta-uploads" target="_blank">Docs are here.</a></p>
  </div>
</Modal>
