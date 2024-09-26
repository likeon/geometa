<script lang="ts">
  import {
    Alert,
    Button,
    Input,
    Label,
    Modal,
    MultiSelect,
    Textarea
  } from 'flowbite-svelte';
  import { fileProxy, superForm } from 'sveltekit-superforms';
  import Icon from '@iconify/svelte';

  import { Dropzone } from 'flowbite-svelte';
  import Metas from './Metas.svelte';

  export let data;
  type MetaType = typeof data.group.metas[number];
  let isMetaModalOpen = false;
  let isUploadModalOpen = false;
  let searchText = '';

  $: filteredMetas = data.group.metas.filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.tagName.toLowerCase().includes(searchText.toLowerCase())
  );

  const {
    form: metaForm,
    errors: metaErrors,
    constraints: metaConstraints,
    enhance: metaEnhance
  } = superForm(data.metaForm, {
    dataType: 'json',
    onResult() {
      isMetaModalOpen = false;
    }
  });

  const levelChoices = data.levelList.map(item => ({
    value: item.id,
    name: item.name
  }));

  const {
    form: mapUploadForm,
    errors: mapUploadFormErrors,
    enhance: mapUploadFormEnhance,
    submit: mapUploadFormSubmit
  } = superForm(data.mapUploadForm, {
    onResult() {
      isUploadModalOpen = false;
    }
  });
  const file = fileProxy(mapUploadForm, 'file');

  function addMeta() {
    $metaForm.id = undefined;
    $metaForm.mapGroupId = data.group.id;
    $metaForm.tagName = '';
    $metaForm.name = '';
    $metaForm.note = '';
    $metaForm.noteFromPlonkit = false;
    $metaForm.hasImage = false;
    $metaForm.levels = [];
    isMetaModalOpen = true;
  }

  function selectMeta(meta: MetaType) {
    $metaForm.id = meta.id;
    $metaForm.mapGroupId = meta.mapGroupId;
    $metaForm.tagName = meta.tagName;
    $metaForm.name = meta.name;
    $metaForm.note = meta.note;
    $metaForm.noteFromPlonkit = meta.noteFromPlonkit;
    $metaForm.hasImage = meta.hasImage;
    $metaForm.levels = meta.metaLevels.map(item => (item.levelId));
    isMetaModalOpen = true;
  }
</script>

<svelte:head>
  <title>Admin</title>
</svelte:head>

<div>
  <div class="flex">
    <h1 class="text-xl">{data.group.name}</h1>
    <a href="/" on:click|preventDefault={() => isUploadModalOpen = true} class="ml-3">
      <Icon icon="ri:upload-2-fill" width="1.5rem" height="1.5rem" color="green" />
    </a>
  </div>
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
  <Metas filteredMetas={filteredMetas} selectMeta={selectMeta} />
</div>

<Modal bind:open={isMetaModalOpen}>
  <form action="?/updateMeta" class="flex flex-col space-y-6" method="post" use:metaEnhance>
    <Input type="hidden" name="id" bind:value={$metaForm.id} />
    <Input type="hidden" name="mapGroupId" bind:value={$metaForm.mapGroupId} />
    <Label class="space-y-2">
      <span>Tag name</span>
      <Input type="text" name="tagName" aria-invalid={$metaErrors.tagName ? 'true' : undefined}
             bind:value={$metaForm.tagName}
             {...$metaConstraints.tagName} />
      {#if $metaErrors.tagName}
        <Alert color="red">{$metaErrors.tagName}</Alert>
      {/if}
    </Label>
    <Label class="space-y-2">
      <span>Name</span>
      <Input type="text" name="name" aria-invalid={$metaErrors.name ? 'true' : undefined} bind:value={$metaForm.name}
             {...$metaConstraints.name} />
      {#if $metaErrors.name}
        <Alert color="red">{$metaErrors.name}</Alert>
      {/if}
    </Label>
    <Label class="space-y-2">
      <span>Note</span>
      <Textarea rows="6" name="note" aria-invalid={$metaErrors.note ? 'true' : undefined}
                bind:value={$metaForm.note}
                {...$metaConstraints.note} />
      {#if $metaErrors.note}
        <Alert color="red">{$metaErrors.note}</Alert>
      {/if}
    </Label>
    <Label><input
      class="w-4 h-4 bg-gray-100 border-gray-300 dark:ring-offset-gray-800 focus:ring-2 me-2 dark:bg-gray-700 dark:border-gray-600 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600"
      type="checkbox" name="noteFromPlonkit" bind:checked={$metaForm.noteFromPlonkit}>Note from Plonkit</Label>
    <Label><input
      class="w-4 h-4 bg-gray-100 border-gray-300 dark:ring-offset-gray-800 focus:ring-2 me-2 dark:bg-gray-700 dark:border-gray-600 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600"
      type="checkbox" name="hasImage" bind:checked={$metaForm.hasImage}>Has image</Label>
    <Label>
      <span>Levels</span>
      <MultiSelect items={levelChoices} bind:value={$metaForm.levels} size="lg" />
    </Label>
    <Button type="submit" class="w-full">Save</Button>
  </form>
</Modal>

<Modal bind:open={isUploadModalOpen}>
  <form class="flex flex-col space-y-6" method="post" action="?/uploadMapJson" enctype="multipart/form-data"
        use:mapUploadFormEnhance>
    <label>
      Upload map json: <input
      bind:files={$file}
      accept="application/json"
      name="file"
      type="file"
      on:change={() => mapUploadFormSubmit()}
    />
      {#if $mapUploadFormErrors.file}
        <div class="invalid">{$mapUploadFormErrors.file}</div>
      {/if}
    </label>

  </form>
</Modal>
