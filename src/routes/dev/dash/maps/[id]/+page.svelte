<script lang="ts">
  import { Alert, Button, Input, Label, Modal, Textarea } from 'flowbite-svelte';
  import { superForm } from 'sveltekit-superforms';

  export let data;
  type MetaType = typeof data.map.metas[number];
  let isModalOpen = false;
  const { form, errors, constraints, enhance } = superForm(data.form, {
    onResult() {
      isModalOpen = false;
    }
  });

  function addMeta() {
    $form.id = undefined;
    $form.mapId = data.map.id;
    $form.tagName = '';
    $form.name = '';
    $form.note = '';
    $form.noteFromPlonkit = false;
    $form.hasImage = false;
    isModalOpen = true;
  }

  function selectMeta(meta: MetaType) {
    $form.id = meta.id;
    $form.mapId = meta.mapId;
    $form.tagName = meta.tagName;
    $form.name = meta.name;
    $form.note = meta.note;
    $form.noteFromPlonkit = meta.noteFromPlonkit;
    $form.hasImage = meta.hasImage;
    isModalOpen = true;
  }
</script>


<div class="px-4 sm:px-6 lg:px-8 mt-3">
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1 class="text-base font-semibold leading-6 text-gray-900">{data.map.name}</h1>
    </div>
    <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
      <Button on:click={addMeta}>
        Add meta
      </Button>
    </div>
  </div>
  <div class="mt-8 flow-root">
    <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table class="w-full table-fixed border-spacing-y-3 border-separate">
            <colgroup>
              <col class="w-1/3">
              <col class="w-1/3">
              <col class="w-1/6">
              <col class="w-1/6">
            </colgroup>
            <thead class="bg-green-100">
            <tr class="m-10">
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Type</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Note</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">From Plonkit</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Has image</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-gray-400">
            {#each data.map.metas as meta (meta.id) }
              <tr role="link" on:click={() => selectMeta(meta)}>
                <td>{meta.tagName}</td>
                <td>{meta.name}</td>
                <td>{meta.noteFromPlonkit}</td>
                <td>{meta.hasImage}</td>
              </tr>
            {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<Modal bind:open={isModalOpen}>
  <form class="flex flex-col space-y-6" method="post" use:enhance>
    <Input type="hidden" name="id" bind:value={$form.id} />
    <Input type="hidden" name="mapId" bind:value={$form.mapId} />
    <Label class="space-y-2">
      <span>Tag name</span>
      <Input type="text" name="tagName" aria-invalid={$errors.tagName ? 'true' : undefined} bind:value={$form.tagName}
             {...$constraints.tagName} />
      {#if $errors.tagName}
        <Alert color="red">{$errors.tagName}</Alert>
      {/if}
    </Label>
    <Label class="space-y-2">
      <span>Name</span>
      <Input type="text" name="name" aria-invalid={$errors.name ? 'true' : undefined} bind:value={$form.name}
             {...$constraints.name} />
      {#if $errors.name}
        <Alert color="red">{$errors.name}</Alert>
      {/if}
    </Label>
    <Label class="space-y-2">
      <span>Note</span>
      <Textarea rows="6" name="note" aria-invalid={$errors.note ? 'true' : undefined}
                bind:value={$form.note}
                {...$constraints.note} />
      {#if $errors.note}
        <Alert color="red">{$errors.note}</Alert>
      {/if}
    </Label>
    <Label><input
      class="w-4 h-4 bg-gray-100 border-gray-300 dark:ring-offset-gray-800 focus:ring-2 me-2 dark:bg-gray-700 dark:border-gray-600 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600"
      type="checkbox" name="noteFromPlonkit" bind:checked={$form.noteFromPlonkit}>Note from Plonkit</Label>
    <Label><input
      class="w-4 h-4 bg-gray-100 border-gray-300 dark:ring-offset-gray-800 focus:ring-2 me-2 dark:bg-gray-700 dark:border-gray-600 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600"
      type="checkbox" name="hasImage" bind:checked={$form.hasImage}>Has image</Label>
    <Button type="submit" class="w-full">Save</Button>
  </form>
</Modal>

<style lang="postcss">
  td {
    @apply pl-3
  }

  th {
    @apply pl-3
  }
</style>
