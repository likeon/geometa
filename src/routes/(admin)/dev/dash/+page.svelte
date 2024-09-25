<script lang="ts">
  import { Alert, Button, Checkbox, Input, Label, Modal, MultiSelect, Select, Textarea } from 'flowbite-svelte';
  import { superForm } from 'sveltekit-superforms';
  import Icon from '@iconify/svelte';

  export let data;
  type MetaType = typeof data.group.metas[number];
  let isModalOpen = false;
  let searchText = '';

  $: filteredMetas = data.group.metas.filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.tagName.toLowerCase().includes(searchText.toLowerCase())
  );

  const { form, errors, constraints, enhance } = superForm(data.form, {
    dataType: 'json',
    onResult() {
      isModalOpen = false;
    }
  });

  const levelChoices = data.levelList.map(item => ({
    value: item.id,
    name: item.name
  }));

  function addMeta() {
    $form.id = undefined;
    $form.mapGroupId = data.group.id;
    $form.tagName = '';
    $form.name = '';
    $form.note = '';
    $form.noteFromPlonkit = false;
    $form.hasImage = false;
    $form.levels = [];
    isModalOpen = true;
  }

  function selectMeta(meta: MetaType) {
    $form.id = meta.id;
    $form.mapGroupId = meta.mapGroupId;
    $form.tagName = meta.tagName;
    $form.name = meta.name;
    $form.note = meta.note;
    $form.noteFromPlonkit = meta.noteFromPlonkit;
    $form.hasImage = meta.hasImage;
    $form.levels = meta.metaLevels.map(item => (item.levelId));
    isModalOpen = true;
  }
</script>

<svelte:head>
  <title>Admin</title>
</svelte:head>

<div>
  <div class="sm:flex sm:items-center">

    <div class="w-1/3">
      <Input type="text" placeholder="Search..." autocomplete="off" bind:value={searchText} />
    </div>
    <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
      <Button on:click={addMeta}>
        Add meta
      </Button>
    </div>
  </div>
  <div class="mt-3 flow-root">
    <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table class="w-full table-fixed border-spacing-y-3 border-separate">
            <colgroup>
              <col class="w-1/3">
              <col class="w-1/3">
              <col class="w-1/6">
              <col class="w-1/6">
              <col class="w-1/6">
            </colgroup>
            <thead class="bg-green-100">
            <tr class="m-10">
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Tag name
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Name</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">From Plonkit</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Has image</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Level</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-gray-400">
            {#each filteredMetas as meta (meta.id) }
              <tr role="link" on:click={() => selectMeta(meta)}>
                <td>{meta.tagName}</td>
                <td>{meta.name}</td>
                <td>
                  {#if meta.noteFromPlonkit}
                    <Icon icon="ei:check" class="w-5 h-5" color="green" />
                  {/if}
                </td>
                <td>
                  {#if meta.hasImage}
                    <Icon icon="ei:check" class="w-5 h-5" color="green" />
                  {/if}
                </td>
                <td>
                  {#each meta.metaLevels as metaLevel, i}
                    {#if i !== 0},{/if}{metaLevel.level.name}
                  {/each}
                </td>
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
    <Input type="hidden" name="mapGroupId" bind:value={$form.mapGroupId} />
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
    <Label>
      <span>Levels</span>
      <MultiSelect items={levelChoices} bind:value={$form.levels} size="lg" />
    </Label>
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
