<script lang="ts">
  import { enhance } from '$app/forms';
  import { toast } from '@zerodevx/svelte-toast';

  interface Meta {
    id: number;
    tagName: string;
    name: string;
    note: string;
    footer: string;
    locationsCount?: {
      total: number;
    } | null;
  }
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import { Button } from '$lib/components/ui/button';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
  import LoadingSmall from '$lib/components/LoadingSmall.svelte';

  let {
    // Dialog states
    isAddLevelsDialogOpen = $bindable(),
    isShareDialogOpen = $bindable(),
    isDeleteDialogOpen = $bindable(),
    isDownloadLocationsDialogOpen = $bindable(),
    isDownloadMetasDialogOpen = $bindable(),

    // Data
    selectedIds,
    metas,
    levelChoices,
    groupChoices,

    // State
    selectedLevelIds = $bindable(),
    selectedGroupId = $bindable(),
    sharingMetas = $bindable(),

    // Functions
    toggleLevel,
    handleDeleteCancel,
    handleDownload
  }: {
    isAddLevelsDialogOpen: boolean;
    isShareDialogOpen: boolean;
    isDeleteDialogOpen: boolean;
    isDownloadLocationsDialogOpen: boolean;
    isDownloadMetasDialogOpen: boolean;
    selectedIds: number[];
    metas: Meta[];
    levelChoices: { value: number; name: string }[];
    groupChoices: { value: number; name: string }[];
    selectedLevelIds: Set<number>;
    selectedGroupId: string;
    sharingMetas: boolean;
    toggleLevel: (levelId: number) => void;
    handleDeleteCancel: () => void;
    handleDownload: (endpoint: string, type: string) => void;
  } = $props();

  function handleAddLevelsCancel() {
    isAddLevelsDialogOpen = false;
    selectedLevelIds = new Set();
  }

  function handleShareCancel() {
    isShareDialogOpen = false;
    selectedGroupId = '';
  }

  function handleDownloadLocations() {
    isDownloadLocationsDialogOpen = false;
    handleDownload('download', 'locations');
  }

  function handleDownloadMetas() {
    isDownloadMetasDialogOpen = false;
    handleDownload('download-metas', 'meta data');
  }

  let deleteFormElement: HTMLFormElement;

  function handleDeleteConfirm() {
    deleteFormElement.requestSubmit();
  }
</script>

<!-- Add Levels Dialog -->
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
        <Button type="button" variant="outline" onclick={handleAddLevelsCancel}>Cancel</Button>
        <Button type="submit" disabled={selectedLevelIds.size === 0}>
          Add {selectedLevelIds.size} Level{selectedLevelIds.size !== 1 ? 's' : ''}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Share Metas Dialog -->
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
        sharingMetas = true;
        return async ({ update }) => {
          sharingMetas = false;
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
        <Button type="button" variant="outline" onclick={handleShareCancel}>Cancel</Button>
        <Button type="submit" disabled={!selectedGroupId || sharingMetas}>
          {#if sharingMetas}
            <div class="h-6 w-28 flex items-center justify-center">
              <LoadingSmall />
            </div>
          {:else}
            Share to Group
          {/if}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Download Locations Dialog -->
<Dialog.Root bind:open={isDownloadLocationsDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Download Locations</Dialog.Title>
      <Dialog.Description>
        Download location data for {selectedIds.length} selected meta{selectedIds.length !== 1
          ? 's'
          : ''}.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
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

      <p class="text-sm text-muted-foreground">
        This will download a JSON file containing all location data for the selected metas.
      </p>
    </div>

    <Dialog.Footer>
      <Button
        type="button"
        variant="outline"
        onclick={() => (isDownloadLocationsDialogOpen = false)}>
        Cancel
      </Button>
      <Button onclick={handleDownloadLocations}>Download Locations</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Download Metas Dialog -->
<Dialog.Root bind:open={isDownloadMetasDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Download Meta Data</Dialog.Title>
      <Dialog.Description>
        Download meta information for {selectedIds.length} selected meta{selectedIds.length !== 1
          ? 's'
          : ''}.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
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

      <p class="text-sm text-muted-foreground">
        This will download a JSON file containing meta information (names, notes, levels, images)
        for the selected metas.
      </p>
    </div>

    <Dialog.Footer>
      <Button type="button" variant="outline" onclick={() => (isDownloadMetasDialogOpen = false)}>
        Cancel
      </Button>
      <Button onclick={handleDownloadMetas}>Download Meta Data</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Hidden delete form -->
<form
  bind:this={deleteFormElement}
  method="post"
  action="?/deleteMetas"
  use:enhance={() => {
    return async ({ update }) => {
      await update();
      isDeleteDialogOpen = false;
      selectedIds = [];
      toast.push('Metas deleted successfully', {
        duration: 3000
      });
    };
  }}>
  {#each selectedIds as id (id)}
    <input type="hidden" name="id" value={id} />
  {/each}
</form>

<!-- Delete Confirmation Dialog -->
<ConfirmationDialog
  bind:open={isDeleteDialogOpen}
  title="Delete {selectedIds.length} metas"
  description="This action cannot be undone. The following metas will be permanently deleted:"
  confirmText="Delete {selectedIds.length} Meta{selectedIds.length !== 1 ? 's' : ''}"
  items={metas
    .filter((meta) => selectedIds.includes(meta.id))
    .map((meta) => ({
      id: meta.id,
      name: meta.tagName,
      count: meta.locationsCount?.total
    }))}
  onConfirm={handleDeleteConfirm}
  onCancel={handleDeleteCancel} />
