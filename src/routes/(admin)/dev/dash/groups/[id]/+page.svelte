<script lang="ts">
  import { Button, GradientButton, Input } from 'flowbite-svelte';
  import { applyAction, enhance } from '$app/forms';
  import { SvelteToast } from '@zerodevx/svelte-toast';
  import { toast } from '@zerodevx/svelte-toast';
  import Metas from './Metas.svelte';
  import MapUploadModal from './MapUploadModal.svelte';
  import MetaEditModal from './MetaEditModal.svelte';
  import DashNavBar from '$lib/components/DashNavBar.svelte';

  let { data } = $props();

  type MetaType = (typeof data.group.metas)[number];
  let isMetaModalOpen = $state(false);
  let isUploadModalOpen = $state(false);
  let searchText = $state('');
  let selectedNoteFilter = $state('all');
  let selectedImageFilter = $state('all');
  let selectedLevelFilter = $state('all');
  let selectedHeader = $state('tag');
  let sortModifier = $state(1);

  function handleCriteriaChange(event: { detail: { type: string; value: string } }) {
    const { type, value } = event.detail;

    // Handle filters (note or image)
    if (type == 'note') {
      selectedNoteFilter = value;
    } else if (type == 'image') {
      selectedImageFilter = value;
    }

    // Handle level changes

    if (type == 'level') {
      selectedLevelFilter = value;
    }

    // Handle header changes
    if (type == 'header') {
      if (selectedHeader == value) {
        sortModifier *= -1;
      } else {
        sortModifier = 1;
        selectedHeader = value;
      }
    }
  }

  let filteredMetas = $derived(
    data.group.metas
      .filter((item) => {
        // Apply text filter
        const matchesSearchText =
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.tagName.toLowerCase().includes(searchText.toLowerCase());

        // Apply note filter ('all', 'missing', 'has')
        const matchesNoteCondition =
          selectedNoteFilter == 'all' ||
          (selectedNoteFilter == 'hasNote' && item.note != '') ||
          (selectedNoteFilter == 'missingNote' && item.note == '');

        // Apply image filter ('all', 'missing', 'has')
        const matchesImageCondition =
          selectedImageFilter == 'all' ||
          (selectedImageFilter == 'hasImage' && item.images.length != 0) ||
          (selectedImageFilter == 'missingImage' && !item.images.length);

        const matchesLevelCondition =
          selectedLevelFilter == 'all' ||
          item.metaLevels.some((metaLevel) => metaLevel.level.name == selectedLevelFilter);

        return (
          matchesSearchText &&
          matchesNoteCondition &&
          matchesImageCondition &&
          matchesLevelCondition
        );
      })
      .sort((a, b) => {
        if (selectedHeader === 'level') {
          // Primary sort by the count of metaLevels
          const levelCountDiff = (a.metaLevels.length - b.metaLevels.length) * sortModifier;
          if (levelCountDiff !== 0) return levelCountDiff;

          // Secondary sort by the first level name if counts are the same
          const firstLevelA = a.metaLevels[0]?.level.name || '';
          const firstLevelB = b.metaLevels[0]?.level.name || '';
          return firstLevelA.localeCompare(firstLevelB) * sortModifier;
        } else if (selectedHeader === 'tag') {
          return a.tagName.localeCompare(b.tagName) * sortModifier;
        } else if (selectedHeader === 'name') {
          return a.name.localeCompare(b.name) * sortModifier;
        }
        return 0;
      })
  );

  let selectedMeta: (typeof data.group.metas)[number] | null = $state(null);

  function addMeta() {
    selectedMeta = null;
    isMetaModalOpen = true;
  }

  function selectMeta(meta: MetaType) {
    selectedMeta = meta;
    isMetaModalOpen = true;
  }

  const levelChoices = data.levelList.map((item) => ({
    value: item.id,
    name: item.name
  }));

  function updateMeta(updatedMeta: MetaType) {
    data.group.metas = data.group.metas.map((meta) =>
      meta.id == updatedMeta.id ? updatedMeta : meta
    );
  }

  function uploadLocations() {
    isUploadModalOpen = true;
  }
</script>

<svelte:head>
  <title>{data.group.name} - Metas</title>
</svelte:head>

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>
  <div class="flex flex-wrap items-center">
    <div class="w-1/3">
      <Input type="text" placeholder="Search..." autocomplete="off" bind:value={searchText} />
    </div>
    <div class="flex-grow flex items-center justify-end">
      <GradientButton color="cyanToBlue" class="ml-3" on:click={uploadLocations}
        >Upload locations</GradientButton>
      <Button class="ml-3" on:click={addMeta}>Add meta</Button>
      <form
        method="post"
        action="?/prepareUserScriptData"
        use:enhance={() => {
          return async ({ result }) => {
            // `result` is an `ActionResult` object
            await applyAction(result);
            toast.push('Updated');
          };
        }}>
        <GradientButton color="pinkToOrange" class="ml-3" type="submit"
          >Sync UserScript
        </GradientButton>
      </form>
    </div>
  </div>
  <Metas
    {filteredMetas}
    {selectMeta}
    on:criteriaChange={handleCriteriaChange}
    levelNames={levelChoices.map((levelChoice) => levelChoice.name)} />
</div>

<MetaEditModal
  bind:isMetaModalOpen
  metaForm={data.metaForm}
  {levelChoices}
  groupId={data.group.id}
  {selectedMeta}
  imageUploadForm={data.imageUploadForm}
  {updateMeta} />

<MapUploadModal bind:isUploadModalOpen data={data.mapUploadForm} />

<SvelteToast />
