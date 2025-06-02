<script lang="ts">
  import PersonalNavBar from '$lib/components/PersonalNavBar.svelte';
  import VirtualizedTable from '$lib/components/VirtualizedTable.svelte';
  import { columns } from './columns';
  import { enhance } from '$app/forms';

  let { data } = $props();

  let selectedId = $state<number>();
  let isDialogOpen = $state(false);

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
