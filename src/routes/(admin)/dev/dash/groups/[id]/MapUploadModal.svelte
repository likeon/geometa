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
      Map json from <a target="_blank" href="https://map-making.app/">map-making.app</a>:
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
      Each location <strong>must</strong> have exactly one tag in
      <span class="whitespace-nowrap font-semibold">[Country Name]-[Your Meta Name]</span> format!
    </p>
    <p>Examples:</p>
    <ol class="list-disc ml-5">
      <li>Czechia-Bollard</li>
      <li>Portugal-LicensePlate</li>
      <li>Singapore-StreetSign</li>
    </ol>
  </div>
</Modal>
