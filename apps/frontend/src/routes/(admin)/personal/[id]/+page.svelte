<script lang="ts">
  import PersonalNavBar from '$lib/components/PersonalNavBar.svelte';
  import VirtualizedTable from '$lib/components/VirtualizedTable.svelte';
  import { columns } from './columns';
  import { enhance } from '$app/forms';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import Icon from '@iconify/svelte';

  let { data } = $props();
  let selectedId = $state<number>();
  let isDialogOpen = $state(false);

  let selectedMeta = $derived.by(() => {
    if (selectedId === undefined) return null;
    return data.metaList.find((meta) => meta.metaId === selectedId) || null;
  });

  const getMapOptions = (metaList: typeof data.metaList) => {
    return Array.from(
      new Set(metaList.map((item) => item.usedInMapName).filter((name) => name != null))
    )
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }));
  };

  let selectedIds: number[] = $state([]);
  let deleteFormElement: HTMLFormElement;
</script>

<PersonalNavBar mapName={data.mapName} id={data.id} geoguessrId={data.geoguessrId} />

<div class="mt-5">
  {#if data.metaList.length === 0}
    <p>
      To add metas, go to the meta list of a map with sharing enabled, select the metas you want,
      and add them to your map. Visit <a
        target="_blank"
        href="/maps"
        class="font-semibold underline hover:text-blue-800 dark:hover:text-blue-900">maps page</a> and
      enable the "Shared" filter to see which maps are available for selecting metas!
    </p>
  {:else}
    <VirtualizedTable
      data={data.metaList}
      {columns}
      bind:selectedId
      bind:selectedIds
      bind:isDialogOpen
      initialSorting={[{ id: 'name', desc: false }]}
      searchColumnId="name"
      searchPlaceholder="Filter tags"
      getRowId={(row) => row.metaId}
      filters={[
        {
          columnId: 'usedInMapName',
          title: 'Meta Maps',
          options: getMapOptions
        }
      ]}
      massAction={{
        dropdownItems: [
          {
            buttonText: 'Delete Selected',
            icon: '🗑',
            variant: 'destructive',
            handler: () => {
              deleteFormElement.requestSubmit();
            }
          }
        ]
      }}
      resetButtonIcon="ic:twotone-clear" />
  {/if}
</div>

<!-- Meta Details Dialog -->
<Dialog.Root bind:open={isDialogOpen}>
  <Dialog.Content class="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
    {#if selectedMeta}
      {@const metaName = `${selectedMeta.countries?.[0] || 'Unknown country'} - ${selectedMeta.name}`}
      <Dialog.Header>
        <Dialog.Title class="text-2xl">{metaName}</Dialog.Title>
        {#if selectedMeta.usedInMapName}
          <Dialog.Description>
            From: {selectedMeta.usedInMapName}
          </Dialog.Description>
        {/if}
      </Dialog.Header>

      <div class="flex-1 overflow-y-auto py-4 space-y-4">
        {#if selectedMeta.note}
          <div class="space-y-2">
            <div class="prose prose-sm dark:prose-invert max-w-none rounded-md bg-muted/50 p-4">
              {@html selectedMeta.note}
            </div>
          </div>
        {/if}

        <!-- Images Section -->
        {#if selectedMeta.images && selectedMeta.images.length > 0}
          <div class="space-y-2">
            <h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Images ({selectedMeta.images.length})
            </h4>
            <div
              class="grid gap-4 {selectedMeta.images.length === 1
                ? 'grid-cols-1'
                : 'grid-cols-1 sm:grid-cols-2'}">
              {#each selectedMeta.images as image, index (index)}
                <div class="relative group">
                  <img
                    src={image}
                    alt="{selectedMeta.name} - Image {index + 1}"
                    class="w-full h-auto max-h-[300px] object-contain rounded-md border bg-gray-50 dark:bg-gray-900" />
                  <a
                    href={image}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white p-2 rounded-md hover:bg-black/70">
                    <Icon icon="material-symbols:open-in-new" width="20" height="20" />
                  </a>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="rounded-md bg-muted/50 p-8 text-center text-muted-foreground">
            <Icon
              icon="material-symbols:image-not-supported-outline"
              width="48"
              height="48"
              class="mx-auto mb-2 opacity-50" />
            <p>No images available for this meta</p>
          </div>
        {/if}

        <!-- Additional Meta Information -->
        {#if selectedMeta.locationsCount}
          <div class="rounded-md bg-muted/50 p-3 flex items-center gap-2">
            <Icon
              icon="material-symbols:location-on"
              width="20"
              height="20"
              class="text-muted-foreground" />
            <span class="text-sm">
              <span class="font-medium">{selectedMeta.locationsCount}</span>
              location{selectedMeta.locationsCount !== 1 ? 's' : ''}
            </span>
          </div>
        {/if}
      </div>

      <Dialog.Footer class="pt-4">
        <Button variant="outline" onclick={() => (isDialogOpen = false)}>Close</Button>
      </Dialog.Footer>
    {:else}
      <Dialog.Header>
        <Dialog.Title>No Meta Selected</Dialog.Title>
      </Dialog.Header>
      <div class="py-8 text-center text-muted-foreground">
        <p>Please select a meta from the table to view its details.</p>
      </div>
      <Dialog.Footer>
        <Button variant="outline" onclick={() => (isDialogOpen = false)}>Close</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!--Hidden delete form-->
<form
  bind:this={deleteFormElement}
  id="delete-form"
  method="post"
  action="?/removeMetasFromPersonalMap"
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

<style>
  :global(.prose ul li) {
    list-style-type: disc;
    margin-left: 1rem;
  }

  :global(.prose ol li) {
    list-style-type: decimal;
    margin-left: 1rem;
  }

  :global(.prose p) {
    margin-bottom: 0.5rem;
  }
</style>
