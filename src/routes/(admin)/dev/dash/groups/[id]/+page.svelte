<script lang="ts">
  import { Button, Dropdown, DropdownItem, GradientButton, Input } from 'flowbite-svelte';
  import { applyAction, enhance } from '$app/forms';
  import { SvelteToast } from '@zerodevx/svelte-toast';
  import { toast } from '@zerodevx/svelte-toast';
  import MapUploadModal from './MapUploadModal.svelte';
  import MetaEditModal from './MetaEditModal.svelte';
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import Icon from '@iconify/svelte';
  import SortFilterTable from '$lib/components/SortFilterTable.svelte';

  let { data } = $props();

  const levelChoices = data.levelList.map((item) => ({
    value: item.id,
    name: item.name
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
      sortable: true
    },
    {
      key: 'note',
      label: 'Note',
      display: (item: String) => item != '',
      searchable: false,
      filterable: true,
      type: 'select',
      options: ['Any note', 'Has note', 'Missing note'],
      filterLogic: (filter: string, item: any) =>
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
      filterLogic: (filter: string, item: any) => {
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
      display: (item: any) =>
        item.map((metaLevel: { level: { name: any } }) => metaLevel.level.name).join(', '),
      searchable: false,
      filterable: true,
      type: 'select',
      options: ['All Levels', ...levelChoices.map((levelChoice) => levelChoice.name)], // Add "All Levels" option
      filterLogic: (filter: string, item: any) =>
        filter === 'All Levels' ||
        item.metaLevels.some(
          (metaLevel: { level: { name: string } }) => metaLevel.level.name === filter
        )
    }
  ];

  let isMetaModalOpen = $state(false);
  let isUploadModalOpen = $state(false);
  let searchText = $state('');
  let metas = $derived(data.group.metas);
  let selectedMetaId = $state(-1);
  let selectedMeta = $derived.by(() => {
    const meta = metas.find((meta) => meta.id == selectedMetaId);
    return meta != undefined ? meta : null;
  });
  function handleModalSuccess() {
    toast.push('Successfully uploaded locations!');
  }

  function addMeta() {
    selectedMetaId = -1;
    isMetaModalOpen = true;
  }

  function uploadLocations() {
    isUploadModalOpen = true;
  }

  function submitPopulateNotesHtmlForm() {
    if (populateNotesHtmlForm) {
      populateNotesHtmlForm.submit();
    }
  }

  let populateNotesHtmlForm: HTMLFormElement;
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
      <GradientButton color="cyanToBlue" class="ml-3" onclick={uploadLocations}
        >Upload locations
      </GradientButton>
      <Button class="ml-3" onclick={addMeta}>Add meta</Button>
      <form
        method="post"
        action="?/prepareUserScriptData"
        use:enhance={() => {
          return async ({ result }) => {
            // `result` is an `ActionResult` object
            if (result.type === 'success') {
              applyAction(result);
              if (data.group.id == 1) {
                const updateCount = result.data?.updateCount || 0;
                toast.push(`Updated ${updateCount} map(s)`);
              } else {
                toast.push('Updated');
              }
            } else if (result.type === 'failure') {
              const errorMessage = result.data?.message || 'Something went wrong';
              toast.push(errorMessage, {
                theme: { '--toastBackground': 'red', '--toastColor': 'white' }
              });
            } else if (result.type === 'error') {
              const errorMessage = result.error.message || 'An error occurred';
              toast.push(errorMessage, {
                theme: { '--toastBackground': 'red', '--toastColor': 'white' }
              });
            }
          };
        }}>
        <GradientButton color="pinkToOrange" class="ml-3" type="submit"
          >Sync UserScript
        </GradientButton>
      </form>
      <button>
        <Icon icon="pepicons-pop:dots-y" width="1rem" height="1rem" style="color: black" />
      </button>
      <Dropdown>
        <DropdownItem click={submitPopulateNotesHtmlForm}>Populate notes html</DropdownItem>
      </Dropdown>
      <form
        bind:this={populateNotesHtmlForm}
        method="post"
        action="?/populateNotesHtml"
        use:enhance={() => {
          return async ({ result }) => {
            await applyAction(result);
            toast.push('Updated');
          };
        }}>
        <input type="hidden" name="groupId" value={data.group.id} />
      </form>
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
  {levelChoices}
  groupId={data.group.id}
  {selectedMeta}
  imageUploadForm={data.imageUploadForm} />

<MapUploadModal bind:isUploadModalOpen data={data.mapUploadForm} on:success={handleModalSuccess} />

<SvelteToast />
