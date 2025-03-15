<script lang="ts">
  import { Button, Dropdown, DropdownItem, GradientButton, Input, Tooltip } from 'flowbite-svelte';
  import { applyAction, enhance } from '$app/forms';
  import { SvelteToast } from '@zerodevx/svelte-toast';
  import { toast } from '@zerodevx/svelte-toast';
  import MapUploadModal from './MapUploadModal.svelte';
  import MetasUploadModal from './MetasUploadModal.svelte';
  import MetaEditModal from './MetaEditModal.svelte';
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import Icon from '@iconify/svelte';
  import SortFilterTable from '$lib/components/SortFilterTable.svelte';
  import LoadingSmall from '$lib/components/LoadingSmall.svelte';

  let { data } = $props();
  type Meta = (typeof data.group.metas)[number];

  const levelChoices = data.group.levels.map((item) => ({
    value: item.id,
    name: item.name
  }));

  const groupChoices = data
    .user!.permissions.filter((permission) => permission.mapGroup.id !== data.group.id)
    .map((permission) => ({
      value: permission.mapGroup.id,
      name: permission.mapGroup.name
    }));

  let columns = [
    {
      key: 'tagName',
      label: 'Tag name',
      searchable: true,
      sortable: true,
      width: '25%'
    },
    {
      key: 'name',
      label: 'Name',
      width: '25%',
      searchable: true,
      sortable: true
    },
    {
      key: 'locationsCount',
      label: 'Locations',
      searchable: false,
      sortable: true,
      display: (item: Meta['locationsCount']) => item?.total || 0
    },
    {
      key: 'note',
      label: 'Note',
      display: (item: string) => item != '',
      searchable: false,
      filterable: true,
      type: 'select',
      options: ['Any note', 'Has note', 'Missing note'],
      filterLogic: (filter: string, item: Meta) =>
        filter == 'Any note' || (filter === 'Has note' ? !!item.note : !item.note)
    },
    {
      key: 'images',
      label: 'Image',
      display: (item: []) => item.length != 0,
      searchable: false,
      filterable: true,
      type: 'select',
      options: ['Any image', 'Has image', 'Missing image'],
      filterLogic: (filter: string, item: Meta) => {
        return (
          filter == 'Any image' ||
          (filter == 'Has image' && item.images.length > 0) ||
          (filter == 'Missing image' && item.images.length == 0)
        );
      }
    },
    {
      key: 'metaLevels',
      label: 'Level',
      display: (item: (typeof data.group.metas)[number]['metaLevels']) =>
        item.map((metaLevel) => metaLevel.level.name).join(', '),
      searchable: false,
      filterable: true,
      type: 'select',
      options: [
        'All Levels',
        'Missing Level',
        ...levelChoices.map((levelChoice) => levelChoice.name)
      ], // Add "All Levels" option
      filterLogic: (filter: string, item: Meta) =>
        filter == 'All Levels' ||
        (filter == 'Missing Level' && item.metaLevels.length == 0) ||
        item.metaLevels.some((metaLevel) => metaLevel.level.name === filter)
    }
  ];

  let isMetaModalOpen = $state(false);
  let isMapUploadModalOpen = $state(false);
  let isMetasUploadModalOpen = $state(false);
  let searchText = $state('');
  let metas = $derived(data.group.metas);
  let selectedMetaId = $state(-1);
  let selectedMeta = $derived.by(() => {
    const meta = metas.find((meta) => meta.id == selectedMetaId);
    return meta != undefined ? meta : null;
  });
  let numberOfLocationsUploaded = $state(0);

  $effect(() => {
    if (numberOfLocationsUploaded != 0) {
      toast.push(`Successfully uploaded ${numberOfLocationsUploaded} locations!`, {
        duration: 5000
      });
    }
  });

  function addMeta() {
    selectedMetaId = -1;
    isMetaModalOpen = true;
  }

  function uploadLocations() {
    isMapUploadModalOpen = true;
  }

  let syncingUserScript = $state(false);
</script>

<svelte:head>
  <title>{data.group.name} - Metas</title>
</svelte:head>

{#snippet userScriptSyncButtonContent()}
  {#if syncingUserScript}
    <div class="h-6 w-[7rem] flex items-center justify-center">
      <LoadingSmall />
    </div>
  {:else}
    Sync UserScript
  {/if}
{/snippet}

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>
  <div class="flex flex-wrap items-center">
    <div class="w-1/3">
      <Input type="text" placeholder="Search..." autocomplete="off" bind:value={searchText} />
    </div>
    <div class="flex-grow flex items-center justify-end">
      <GradientButton color="cyanToBlue" class="ml-3" onclick={uploadLocations}
        >Upload locations
      </GradientButton>
      <Button class="ml-3" onclick={addMeta}>Add meta</Button>
      <form
        method="post"
        action="?/prepareUserScriptData"
        use:enhance={() => {
          syncingUserScript = true;
          return async ({ result, update }) => {
            syncingUserScript = false;
            if (result.type === 'success') {
              applyAction(result);
              if (data.group.id == 1) {
                const updateCount = result.data?.updateCount || 0;
                toast.push(`Updated ${updateCount} map(s)`);
              }

              toast.push('Updated', {
                duration: 10000
              });
            } else if (result.type === 'failure') {
              console.log(result.data);
              const errorMessage = result.data?.message || 'Something went wrong';
              toast.push(errorMessage, {
                theme: { '--toastBackground': 'red', '--toastColor': 'white' }
              });
            } else if (result.type === 'error') {
              console.log(result.error);
              const errorMessage = result.error.message || 'An error occurred';
              toast.push(errorMessage, {
                theme: { '--toastBackground': 'red', '--toastColor': 'white' }
              });
            }
            update();
          };
        }}>
        {#if data.group.hasUnsycnedData}
          <GradientButton color="pinkToOrange" class="ml-3" type="submit">
            {@render userScriptSyncButtonContent()}
          </GradientButton>
        {:else}
          <Button color="dark" class="ml-3" type="submit">
            {@render userScriptSyncButtonContent()}
          </Button>
        {/if}
        <Tooltip>
          Update your changes after editing or adding metas/maps to make them visible to users of
          the LearnableMeta script.
        </Tooltip>
      </form>
      <button>
        <Icon icon="pepicons-pop:dots-y" width="1rem" height="1rem" style="color: black" />
      </button>
      <Dropdown>
        <DropdownItem
          onclick={() => (window.location.href = `/dev/dash/groups/${data.group.id}/download`)}>
          <div class="flex">
            <Icon icon="material-symbols:globe" width="1rem" height="1rem" style="color: black" />
            <Icon
              icon="material-symbols:download-rounded"
              width="1rem"
              height="1rem"
              style="color: black" />
            Download map group JSON
          </div>
        </DropdownItem>
        <DropdownItem onclick={() => (isMetasUploadModalOpen = true)}>
          <div class="flex">
            <Icon icon="mi:document" width="1rem" height="1rem" style="color: black" />
            <Icon
              icon="material-symbols:upload-rounded"
              width="1rem"
              height="1rem"
              style="color: black" />
            Upload metas
          </div>
        </DropdownItem>
        <DropdownItem
          onclick={() =>
            (window.location.href = `/dev/dash/groups/${data.group.id}/download-metas`)}>
          <div class="flex">
            <Icon icon="mi:document" width="1rem" height="1rem" style="color: black" />
            <Icon
              icon="material-symbols:download-rounded"
              width="1rem"
              height="1rem"
              style="color: black" />
            Download metas
          </div>
        </DropdownItem>
      </Dropdown>
    </div>
  </div>
  <SortFilterTable
    data={metas}
    {searchText}
    {columns}
    bind:isModalOpen={isMetaModalOpen}
    bind:selectedRowId={selectedMetaId} />
  {#if data.group.metas.length === 0}
    <div class="justify-center w-full flex mt-2">
      <p class="text-2xl">
        Upload locations using <a target="_blank" href="https://map-making.app/">map-making.app</a> json
        to prepopulate the metas.
      </p>
    </div>
  {/if}
</div>

<MetaEditModal
  bind:isMetaModalOpen
  metaForm={data.metaForm}
  copyForm={data.copyForm}
  {levelChoices}
  mapGroupChoices={groupChoices}
  groupId={data.group.id}
  {selectedMeta}
  imageUploadForm={data.imageUploadForm} />

<MapUploadModal
  bind:isUploadModalOpen={isMapUploadModalOpen}
  bind:numberOfLocationsUploaded
  data={data.mapUploadForm} />
<MetasUploadModal bind:isUploadModalOpen={isMetasUploadModalOpen} data={data.metasUploadForm} />

<SvelteToast />
