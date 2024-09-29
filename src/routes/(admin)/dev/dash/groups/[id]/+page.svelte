<script lang="ts">
  import {
    Alert,
    Button,
    GradientButton,
    Input,
    Label,
    Modal,
    MultiSelect,
    Textarea
  } from 'flowbite-svelte';
  import { fileProxy, superForm } from 'sveltekit-superforms';
  import Icon from '@iconify/svelte';
  import Metas from './Metas.svelte';
  import { applyAction, enhance } from '$app/forms';
  import { SvelteToast } from '@zerodevx/svelte-toast';
  import { toast } from '@zerodevx/svelte-toast';

  export let data;
  type MetaType = (typeof data.group.metas)[number];
  let isMetaModalOpen = false;
  let isUploadModalOpen = false;
  let searchText = '';
  let isMissingNote = false;
  let isMissingImage = false;

  let selectedHeader = 'tag';
  let sortModifier = 1;
  $: sortArrow = sortModifier == 1 ? '▼' : '▲';

  $: filteredMetas = data.group.metas
    .filter((item) => {
      // Apply your filtering logic here
      const matchesSearchText =
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.tagName.toLowerCase().includes(searchText.toLowerCase());

      const matchesNoteCondition = isMissingNote ? item.note === '' : true;
      const matchesImageCondition = isMissingImage ? !item.hasImage : true;

      return matchesSearchText && matchesNoteCondition && matchesImageCondition;
    })
    .sort((a, b) => {
      // Apply sorting logic based on selectedHeader and sortModifier
      if (selectedHeader === 'tag') {
        return a.tagName.localeCompare(b.tagName) * sortModifier;
      } else if (selectedHeader === 'level') {
        return (a.metaLevels.length - b.metaLevels.length) * sortModifier;
      } else if (selectedHeader === 'name') {
        return a.name.localeCompare(b.name) * sortModifier;
      }
      return 0;
    });

  function selectHeader(header: string) {
    if (selectedHeader == header) {
      sortModifier *= -1;
    } else {
      sortModifier = 1;
      selectedHeader = header;
    }
  }

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

  const levelChoices = data.levelList.map((item) => ({
    value: item.id,
    name: item.name
  }));

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
    $metaForm.levels = meta.metaLevels.map((item) => item.levelId);
    isMetaModalOpen = true;
  }

  import { page } from '$app/stores';
  import MapUpload from '$routes/(admin)/dev/dash/groups/[id]/MapUpload.svelte';
</script>

<svelte:head>
  <title>{data.group.name} - Metas</title>
</svelte:head>

<div>
  <div class="flex">
    <h1 class="text-xl">{data.group.name}</h1>
    <a href="/" on:click|preventDefault={() => (isUploadModalOpen = true)} class="ml-3">
      <Icon icon="ri:upload-2-fill" width="1.5rem" height="1.5rem" color="green" />
    </a>
  </div>
  <div>
    <div class="border-b border-gray-200 mb-4">
      <nav class="-mb-px flex space-x-8" aria-label="Tabs">
        <a
          href={`/dev/dash/groups/${$page.params.id}`}
          class="whitespace-nowrap border-b-2 border-green-500 px-1 py-4 text-sm font-medium text-green-600"
          aria-current="page">Metas</a
        >
        <a
          href={`/dev/dash/groups/${$page.params.id}/maps`}
          class="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
          >Maps</a
        >
      </nav>
    </div>
  </div>
  <div class="flex flex-wrap items-center">
    <div class="w-1/3">
      <Input type="text" placeholder="Search..." autocomplete="off" bind:value={searchText} />
    </div>
    <div class="ml-1 flex items-center">
      Missing:
      <input
        class="w-4 h-4 bg-gray-100 border-gray-300 dark:ring-offset-gray-800 focus:ring-2 ml-1 dark:bg-gray-700 dark:border-gray-600
    rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600"
        type="checkbox"
        name="isMissingNote"
        bind:checked={isMissingNote}
      />
      <span class="ml-1 mr-1">Note</span>

      <input
        class="w-4 h-4 bg-gray-100 border-gray-300 dark:ring-offset-gray-800 focus:ring-2 me-0 dark:bg-gray-700 dark:border-gray-600
      rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600"
        type="checkbox"
        name="isMissingImage"
        bind:checked={isMissingImage}
      />
      <span class="ml-1 mr-1">Image</span>
    </div>

    <div class="flex-grow flex items-center justify-end">
      <Button on:click={addMeta}>Add meta</Button>
      <form
        method="post"
        action="?/prepareUserScriptData"
        use:enhance={() => {
          return async ({ result }) => {
            // `result` is an `ActionResult` object
            await applyAction(result);
            toast.push('Updated');
          };
        }}
      >
        <GradientButton color="pinkToOrange" class="ml-3" type="submit"
          >Sync UserScript
        </GradientButton>
      </form>
    </div>
  </div>
  <Metas {filteredMetas} {selectMeta} {selectedHeader} {sortArrow} {selectHeader} />
</div>

<Modal bind:open={isMetaModalOpen}>
  <form action="?/updateMeta" class="flex flex-col space-y-6" method="post" use:metaEnhance>
    <Input type="hidden" name="id" bind:value={$metaForm.id} />
    <Input type="hidden" name="mapGroupId" bind:value={$metaForm.mapGroupId} />
    <Label class="space-y-2">
      <span>Tag name</span>
      <Input
        type="text"
        name="tagName"
        aria-invalid={$metaErrors.tagName ? 'true' : undefined}
        bind:value={$metaForm.tagName}
        {...$metaConstraints.tagName}
      />
      {#if $metaErrors.tagName}
        <Alert color="red">{$metaErrors.tagName}</Alert>
      {/if}
    </Label>
    <Label class="space-y-2">
      <span>Name</span>
      <Input
        type="text"
        name="name"
        aria-invalid={$metaErrors.name ? 'true' : undefined}
        bind:value={$metaForm.name}
        {...$metaConstraints.name}
      />
      {#if $metaErrors.name}
        <Alert color="red">{$metaErrors.name}</Alert>
      {/if}
    </Label>
    <Label class="space-y-2">
      <span>Note</span>
      <Textarea
        rows="6"
        name="note"
        aria-invalid={$metaErrors.note ? 'true' : undefined}
        bind:value={$metaForm.note}
        {...$metaConstraints.note}
      />
      {#if $metaErrors.note}
        <Alert color="red">{$metaErrors.note}</Alert>
      {/if}
    </Label>
    <Label
      ><input
        class="w-4 h-4 bg-gray-100 border-gray-300 dark:ring-offset-gray-800 focus:ring-2 me-2 dark:bg-gray-700 dark:border-gray-600 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600"
        type="checkbox"
        name="noteFromPlonkit"
        bind:checked={$metaForm.noteFromPlonkit}
      />Note from Plonkit</Label
    >
    <Label
      ><input
        class="w-4 h-4 bg-gray-100 border-gray-300 dark:ring-offset-gray-800 focus:ring-2 me-2 dark:bg-gray-700 dark:border-gray-600 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600"
        type="checkbox"
        name="hasImage"
        bind:checked={$metaForm.hasImage}
      />Has image</Label
    >
    <Label>
      <span>Levels</span>
      <MultiSelect items={levelChoices} bind:value={$metaForm.levels} size="lg" />
    </Label>
    <Button type="submit" class="w-full">Save</Button>
  </form>
</Modal>

<MapUpload {isUploadModalOpen} data={data.mapUploadForm} />

<SvelteToast />
