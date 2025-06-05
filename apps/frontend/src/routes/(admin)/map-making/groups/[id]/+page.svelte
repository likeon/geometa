<script lang="ts">
  import { applyAction, enhance } from '$app/forms';
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
  import * as Dialog from '$lib/components/ui/dialog';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import Tooltip from '$lib/components/Tooltip.svelte';

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
    isMetaDialogOpen = true;
  }

  function uploadLocations() {
    isMapUploadDialogOpen = true;
  }

  let syncingUserScript = $state(false);

  // Dialog state for adding levels
  let isAddLevelsDialogOpen = $state(false);
  let selectedLevelIds = $state<Set<number>>(new Set());

  // Dialog state for sharing metas
  let isShareDialogOpen = $state(false);
  let selectedGroupId = $state<string>('');

  // Dynamic filter options for levels
  const getLevelOptions = (metaList: typeof metas) => {
    return Array.from(new Set(metaList.flatMap((row) => row.metaLevels.map((m) => m.level.name))))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }));
  };

  // Toggle level selection
  const toggleLevel = (levelId: number) => {
    const newSet = new Set(selectedLevelIds);
    if (newSet.has(levelId)) {
      newSet.delete(levelId);
    } else {
      newSet.add(levelId);
    }
    selectedLevelIds = newSet;
  };

  let selectedIds: number[] = $state([]);
  let deleteFormElement: HTMLFormElement;
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
      <Button class="ml-3" onclick={uploadLocations}>Upload locations</Button>
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
        {#if data.group.hasUnsycnedData}
          <Tooltip
            content="People playing your map will only see changes after you synchronize the changes!">
            <Button variant="default" class="ml-3 animate-pulse" type="submit">
              {@render userScriptSyncButtonContent()}
            </Button>
          </Tooltip>
        {:else}
          <Tooltip content="You have not made any changes since last time you synchronized it.">
            <Button
              variant="ghost"
              class="ml-3 opacity-20 hover:opacity-100 transition-opacity"
              type="submit">
              {@render userScriptSyncButtonContent()}
            </Button>
          </Tooltip>
        {/if}
      </form>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="outline" class="ml-2">
            <Icon icon="material-symbols:more-vert" width="1rem" height="1rem" />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content>
          <DropdownMenu.Item
            onclick={() => (window.location.href = `/map-making/groups/${data.group.id}/download`)}>
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
      }
    ]}
    massAction={{
      dropdownItems: [
        {
          buttonText: 'Add Levels',
          icon: '➕',
          handler: () => {
            selectedLevelIds = new Set();
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
            deleteFormElement.requestSubmit();
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

<!-- Dialog for adding levels -->
<Dialog.Root bind:open={isAddLevelsDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add Levels to {selectedIds.length} Metas</Dialog.Title>
      <Dialog.Description>
        Select which levels you want to add to the selected metas.
      </Dialog.Description>
    </Dialog.Header>

    <form
      method="post"
      action="?/addLevels"
      use:enhance={() => {
        return async ({ update }) => {
          await update();
          isAddLevelsDialogOpen = false;
          selectedLevelIds = new Set();
          toast.push('Levels added successfully!', {
            duration: 3000
          });
        };
      }}>
      <div class="space-y-4 py-4">
        <!-- Level checkboxes -->
        <div class="space-y-2">
          <Label>Available Levels</Label>
          <div class="border rounded-md p-4 space-y-2 max-h-[300px] overflow-y-auto">
            {#each levelChoices as level (level.value)}
              <div class="flex items-center space-x-2">
                <Checkbox
                  id={`level-${level.value}`}
                  checked={selectedLevelIds.has(level.value)}
                  onCheckedChange={() => toggleLevel(level.value)} />
                <Label for={`level-${level.value}`} class="text-sm font-normal cursor-pointer">
                  {level.name}
                </Label>
              </div>
            {/each}
          </div>
        </div>

        {#each selectedIds as id (id)}
          <input type="hidden" name="metaIds" value={id} />
        {/each}

        {#each selectedLevelIds as levelId (levelId)}
          <input type="hidden" name="levelIds" value={levelId} />
        {/each}

        <div class="rounded-md bg-muted p-3">
          <p class="text-sm font-medium mb-1">Selected metas:</p>
          <p class="text-sm text-muted-foreground">
            {#if selectedIds}
              {@const displayMetas = metas
                .filter((meta) => selectedIds.includes(meta.id))
                .map((meta) => meta.tagName)}
              {displayMetas.slice(0, 5).join(', ')}
              {#if displayMetas.length > 5}
                ... and {displayMetas.length - 5} more
              {/if}
            {/if}
          </p>
        </div>
      </div>

      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={() => {
            isAddLevelsDialogOpen = false;
            selectedLevelIds = new Set();
          }}>
          Cancel
        </Button>
        <Button type="submit" disabled={selectedLevelIds.size === 0}>
          Add {selectedLevelIds.size} Level{selectedLevelIds.size !== 1 ? 's' : ''}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Dialog for sharing metas -->
<Dialog.Root bind:open={isShareDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Share {selectedIds.length} Metas</Dialog.Title>
      <Dialog.Description>
        Select which group you want to share the selected metas to.
      </Dialog.Description>
    </Dialog.Header>

    <form
      method="post"
      action="?/shareMetas"
      use:enhance={() => {
        return async ({ update }) => {
          await update();
          isShareDialogOpen = false;
          selectedGroupId = '';
          selectedIds = [];
          toast.push('Metas shared successfully!', {
            duration: 3000
          });
        };
      }}>
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="target-group">Target Group</Label>
          <Select.Root type="single" bind:value={selectedGroupId}>
            <Select.Trigger id="target-group">
              {groupChoices.find((g) => g.value.toString() === selectedGroupId)?.name ??
                'Select Group'}
            </Select.Trigger>
            <Select.Content>
              {#each groupChoices as group (group.value)}
                <Select.Item value={String(group.value)}>{group.name}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        {#each selectedIds as id (id)}
          <input type="hidden" name="metaIds" value={id} />
        {/each}

        {#if selectedGroupId}
          <input type="hidden" name="targetGroupId" value={selectedGroupId} />
        {/if}

        <div class="rounded-md bg-muted p-3">
          <p class="text-sm font-medium mb-1">Selected metas:</p>
          <p class="text-sm text-muted-foreground">
            {#if selectedIds}
              {@const displayMetas = metas
                .filter((meta) => selectedIds.includes(meta.id))
                .map((meta) => meta.tagName)}
              {displayMetas.slice(0, 5).join(', ')}
              {#if displayMetas.length > 5}
                ... and {displayMetas.length - 5} more
              {/if}
            {/if}
          </p>
        </div>
      </div>

      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={() => {
            isShareDialogOpen = false;
            selectedGroupId = '';
          }}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedGroupId}>Share to Group</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!--Hidden delete form-->
<form
  bind:this={deleteFormElement}
  id="delete-form"
  method="post"
  action="?/deleteMetas"
  use:enhance={() => {
    return async ({ update }) => {
      const confirmed = confirm(
        `Are you sure you want to delete ${selectedIds.length} meta(s)? IT'S PERMANENT DELETION`
      );

      if (!confirmed) {
        return;
      }

      await update();
      selectedIds = [];
    };
  }}>
  {#each selectedIds as id (id)}
    <input type="hidden" name="id" value={id} />
  {/each}
</form>

<MetaEditDialog
  bind:isMetaDialogOpen
  metaForm={data.metaForm}
  {levelChoices}
  {selectedMeta}
  groupId={data.group.id}
  imageUploadForm={data.imageUploadForm}
  imageOrderUpdateForm={data.imageOrderUpdateForm} />

<MapUploadDialog
  bind:isUploadDialogOpen={isMapUploadDialogOpen}
  bind:numberOfLocationsUploaded
  data={data.mapUploadForm} />

<MetasUploadDialog bind:isUploadDialogOpen={isMetasUploadDialogOpen} data={data.metasUploadForm} />

<SvelteToast />
