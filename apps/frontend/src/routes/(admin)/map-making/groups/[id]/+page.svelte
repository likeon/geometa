<script lang="ts">
  import { applyAction, enhance } from '$app/forms';
  import { browser } from '$app/environment';
  import { SvelteToast } from '@zerodevx/svelte-toast';
  import { toast } from '@zerodevx/svelte-toast';
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import Icon from '@iconify/svelte';
  import LoadingSmall from '$lib/components/LoadingSmall.svelte';
  import VirtualizedTable from '$lib/components/VirtualizedTable.svelte';
  import { columns } from './columns';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import MetaEditDialog from '$routes/(admin)/map-making/groups/[id]/MetaEditDialog.svelte';
  import MapUploadDialog from '$routes/(admin)/map-making/groups/[id]/MapUploadDialog.svelte';
  import MetasUploadDialog from '$routes/(admin)/map-making/groups/[id]/MetasUploadDialog.svelte';
  import MassActionDialogs from '$routes/(admin)/map-making/groups/[id]/MassActionDialogs.svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { SvelteSet } from 'svelte/reactivity';

  let { data } = $props();

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

  let isMetaDialogOpen = $state(false);
  let isMapUploadDialogOpen = $state(false);
  let isMetasUploadDialogOpen = $state(false);
  let isDownloadLocationsDialogOpen = $state(false);
  let isDownloadMetasDialogOpen = $state(false);
  let metas = $derived(data.group.metas);
  let selectedMetaId = $state(-1);
  let selectedMeta = $derived.by(() => {
    const meta = metas.find((meta) => meta.id == selectedMetaId);
    return meta != undefined ? meta : null;
  });
  let metaIds = $derived(metas.map((m) => m.id));

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
    isMetaDialogOpen = true;
  }

  function uploadLocations() {
    isMapUploadDialogOpen = true;
  }

  let syncingUserScript = $state(false);
  let sharingMetas = $state(false);

  // Dialog state for adding levels
  let isAddLevelsDialogOpen = $state(false);
  // doesn't need to be wrapped in state - don't get baited
  // svelte-ignore non_reactive_update
  let selectedLevelIds = new SvelteSet<number>();

  // Dialog state for sharing metas
  let isShareDialogOpen = $state(false);
  let selectedGroupId = $state<string>('');

  // Dynamic filter options for levels
  const getLevelOptions = (metaList: typeof metas) => {
    const levelOptions = Array.from(
      new SvelteSet(metaList.flatMap((row) => row.metaLevels.map((m) => m.level.name)))
    )
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }));

    return [{ label: 'No Levels', value: '__FILTER_NO_LEVELS__' }, ...levelOptions];
  };

  // Toggle level selection
  const toggleLevel = (levelId: number) => {
    if (selectedLevelIds.has(levelId)) {
      selectedLevelIds.delete(levelId);
    } else {
      selectedLevelIds.add(levelId);
    }
  };

  let selectedIds: number[] = $state([]);
  let isDeleteDialogOpen = $state(false);

  function handleDeleteCancel() {
    // Dialog will close automatically
  }

  function handleDownload(endpoint: string, type: string) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/map-making/groups/${data.group.id}/${endpoint}`;

    selectedIds.forEach((id) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'metaIds';
      input.value = id.toString();
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    const downloadType = type ? `${type} for ` : '';
    toast.push(
      `Downloading ${downloadType}${selectedIds.length} selected meta${selectedIds.length !== 1 ? 's' : ''}`,
      {
        duration: 3000
      }
    );
  }
</script>

<svelte:head>
  <title>{data.group.name || '<No name>'} - Metas</title>
</svelte:head>

{#snippet userScriptSyncButtonContent()}
  {#if syncingUserScript}
    <div class="h-6 w-28 flex items-center justify-center">
      <LoadingSmall />
    </div>
  {:else}
    Sync UserScript
  {/if}
{/snippet}

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>
  <div class="flex flex-wrap items-center">
    <div class="grow flex items-center justify-end">
      <Button variant="outline" class="ml-3" onclick={uploadLocations}>Upload locations</Button>
      <Button class="ml-3" onclick={addMeta}>Add meta</Button>
      <form
        method="post"
        action="?/prepareUserScriptData"
        use:enhance={() => {
          syncingUserScript = true;
          return async ({ result, update }) => {
            syncingUserScript = false;
            if (result.type === 'success') {
              await applyAction(result);
              if (data.group.id === 1) {
                const updateCount = result.data?.updateCount || 0;
                toast.push(`Updated ${updateCount} map(s)`);
              }

              toast.push('Updated', {
                duration: 10000
              });
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
            update();
          };
        }}>
        {#if browser}
          {#if data.group.hasUnsycnedData}
            <Tooltip
              content="People playing your map will only see changes after you synchronize the changes!">
              <Button
                variant="default"
                class="ml-3 animate-pulse"
                type="submit"
                disabled={syncingUserScript}>
                {@render userScriptSyncButtonContent()}
              </Button>
            </Tooltip>
          {:else}
            <Tooltip content="You have not made any changes since last time you synchronized it.">
              <Button
                variant="ghost"
                class="ml-3 opacity-20 hover:opacity-100 transition-opacity"
                type="submit"
                disabled={syncingUserScript}>
                {@render userScriptSyncButtonContent()}
              </Button>
            </Tooltip>
          {/if}
        {/if}
      </form>
      {#if browser}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="outline" class="ml-2">
              <Icon icon="material-symbols:more-vert" width="1rem" height="1rem" />
            </Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Content>
            <DropdownMenu.Item
              onclick={() =>
                (window.location.href = `/map-making/groups/${data.group.id}/download`)}>
              <div class="flex items-center gap-2">
                <Icon
                  icon="material-symbols:globe"
                  width="1rem"
                  height="1rem"
                  class="text-gray-800 dark:text-gray-300" />
                <Icon
                  icon="material-symbols:download-rounded"
                  width="1rem"
                  height="1rem"
                  class="text-gray-800 dark:text-gray-300" />
                <span>Download map group JSON</span>
              </div>
            </DropdownMenu.Item>

            <DropdownMenu.Item onclick={() => (isMetasUploadDialogOpen = true)}>
              <div class="flex items-center gap-2">
                <Icon
                  icon="mi:document"
                  width="1rem"
                  height="1rem"
                  class="text-gray-800 dark:text-gray-300" />
                <Icon
                  icon="material-symbols:upload-rounded"
                  width="1rem"
                  height="1rem"
                  class="text-gray-800 dark:text-gray-300" />
                <span>Upload metas</span>
              </div>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onclick={() =>
                (window.location.href = `/map-making/groups/${data.group.id}/download-metas`)}>
              <div class="flex items-center gap-2">
                <Icon
                  icon="mi:document"
                  width="1rem"
                  height="1rem"
                  class="text-gray-800 dark:text-gray-300" />
                <Icon
                  icon="material-symbols:download-rounded"
                  width="1rem"
                  height="1rem"
                  class="text-gray-800 dark:text-gray-300" />
                <span>Download metas</span>
              </div>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}
    </div>
  </div>

  <!-- Mass action dropdown when rows are selected -->

  <VirtualizedTable
    data={metas}
    {columns}
    bind:selectedId={selectedMetaId}
    bind:selectedIds
    bind:isDialogOpen={isMetaDialogOpen}
    initialSorting={[{ id: 'tagName', desc: false }]}
    searchColumnId="search"
    searchPlaceholder="Filter tags"
    getRowId={(row) => row.id}
    filters={[
      {
        columnId: 'images',
        title: 'Images',
        options: [
          { label: 'Has Image', value: 'has' },
          { label: 'No Image', value: 'none' }
        ]
      },
      {
        columnId: 'note',
        title: 'Notes',
        options: [
          { label: 'Has Note', value: 'has' },
          { label: 'Missing Note', value: 'none' }
        ]
      },
      {
        columnId: 'levels',
        title: 'Levels',
        options: getLevelOptions
      },
      {
        columnId: 'locationsCount',
        title: 'Locations',
        options: () => [
          { label: 'With locations', value: 'has_locations' },
          { label: 'No locations', value: 'no_locations' }
        ]
      }
    ]}
    massAction={{
      dropdownItems: [
        {
          buttonText: 'Download Locations',
          icon: '⬇️',
          handler: () => {
            isDownloadLocationsDialogOpen = true;
          }
        },
        {
          buttonText: 'Download Metas',
          icon: '📄',
          handler: () => {
            isDownloadMetasDialogOpen = true;
          }
        },
        {
          buttonText: 'Add Levels',
          icon: '➕',
          handler: () => {
            selectedLevelIds.clear();
            isAddLevelsDialogOpen = true;
          }
        },
        {
          buttonText: 'Share to Group',
          icon: '📤',
          handler: () => {
            selectedGroupId = '';
            isShareDialogOpen = true;
          }
        },
        {
          buttonText: 'Delete Selected',
          icon: '🗑',
          variant: 'destructive',
          handler: () => {
            isDeleteDialogOpen = true;
          }
        }
      ]
    }} />

  {#if data.group.metas.length === 0}
    <div class="justify-center w-full flex mt-2">
      <p class="text-2xl">
        Upload locations using <a target="_blank" href="https://map-making.app/">map-making.app</a> json
        to prepopulate the metas.
      </p>
    </div>
  {/if}
</div>

<MetaEditDialog
  bind:isMetaDialogOpen
  metaForm={data.metaForm}
  {levelChoices}
  {selectedMeta}
  groupId={data.group.id}
  imageUploadForm={data.imageUploadForm}
  imageOrderUpdateForm={data.imageOrderUpdateForm}
  selectedIds={selectedIds.length > 0 ? selectedIds : metaIds}
  bind:selectedMetaId />

<MapUploadDialog
  bind:isUploadDialogOpen={isMapUploadDialogOpen}
  bind:numberOfLocationsUploaded
  data={data.mapUploadForm} />

<MetasUploadDialog bind:isUploadDialogOpen={isMetasUploadDialogOpen} data={data.metasUploadForm} />

<MassActionDialogs
  bind:isAddLevelsDialogOpen
  bind:isShareDialogOpen
  bind:isDeleteDialogOpen
  bind:isDownloadLocationsDialogOpen
  bind:isDownloadMetasDialogOpen
  {selectedIds}
  {metas}
  {levelChoices}
  {groupChoices}
  bind:selectedLevelIds
  bind:selectedGroupId
  bind:sharingMetas
  {toggleLevel}
  {handleDeleteCancel}
  {handleDownload} />

<SvelteToast />
