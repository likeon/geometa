<script lang="ts">
  import { Button, GradientButton, Input } from 'flowbite-svelte';
  import Icon from '@iconify/svelte';
  import { applyAction, enhance } from '$app/forms';
  import { SvelteToast } from '@zerodevx/svelte-toast';
  import { toast } from '@zerodevx/svelte-toast';
  import { page } from '$app/stores';
  import Metas from './Metas.svelte';
  import MapUploadModal from './MapUploadModal.svelte';
  import MetaEditModal from './MetaEditModal.svelte';

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

  function addMeta() {
    selectedMeta = null;
    isMetaModalOpen = true;
  }

  function selectMeta(meta: MetaType) {
    console.log('works');
    selectedMeta = meta;
    isMetaModalOpen = true;
  }

  const levelChoices = data.levelList.map((item) => ({
    value: item.id,
    name: item.name
  }));

  let selectedMeta: (typeof data.group.metas)[number] | null = null;
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

<MetaEditModal
  bind:isMetaModalOpen
  data={data.metaForm}
  {levelChoices}
  groupId={data.group.id}
  {selectedMeta}
/>

<MapUploadModal bind:isUploadModalOpen data={data.mapUploadForm} />

<SvelteToast />
