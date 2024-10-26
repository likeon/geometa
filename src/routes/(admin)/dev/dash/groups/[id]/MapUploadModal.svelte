<script lang="ts">
  import { Modal } from 'flowbite-svelte';

  import { type SuperValidated, type Infer, fileProxy } from 'sveltekit-superforms';
  import { superForm } from 'sveltekit-superforms';
  import type { MapUploadSchema } from './+page.server';

  interface Props {
    isUploadModalOpen: boolean;
    data: SuperValidated<Infer<MapUploadSchema>>;
  }

  let { isUploadModalOpen = $bindable(), data }: Props = $props();

  const { form, errors, enhance, submit } = superForm(data, {
    onResult() {
      window.location.reload();
    }
  });
  const file = fileProxy(form, 'file');
</script>

<Modal bind:open={isUploadModalOpen}>
  <form
    class="flex flex-col space-y-6"
    method="post"
    action="?/uploadMapJson"
    enctype="multipart/form-data"
    use:enhance>
    <label>
      Upload map json: <input
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
</Modal>
