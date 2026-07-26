<script lang="ts">
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import { columns } from './columns';
  import BaseTable from '$lib/components/BaseTable/BaseTable.svelte';
  import { Button } from '$lib/components/ui/button';
  import MapEditDialog from '$routes/(admin)/map-making/groups/[id]/maps/MapEditDialog.svelte';

  let { data } = $props();

  let isOwner = $derived(data.role === 'owner');
  let tableColumns = $derived(isOwner ? columns : columns.filter((c) => c.id !== 'actions'));
  let isMapDialogOpen = $state(false);
  let selectedMapId = $state(-1);
  let maps = $derived(data.group.maps);
  let selectedMap = $derived.by(() => {
    const map = maps.find((map) => map.id == selectedMapId);
    return map != undefined ? map : null;
  });

  function addMap() {
    selectedMapId = -1;
    isMapDialogOpen = true;
  }

  let levelChoices = $derived(
    data.levelList.map((item) => ({
      value: item.id,
      name: item.name
    }))
  );
  let regionChoices = $derived(
    data.regionList.map((item) => ({
      value: item.id,
      name: item.name
    }))
  );
</script>

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name} canRename={isOwner}></DashNavBar>

  <div class="flex flex-wrap items-center">
    <div class="grow flex items-center justify-end">
      {#if isOwner}
        <Button onclick={addMap}>Add map</Button>
      {/if}
    </div>
  </div>
  <div class="mt-5">
    <BaseTable
      columns={tableColumns}
      data={maps}
      bind:selectedId={selectedMapId}
      bind:isDialogOpen={isMapDialogOpen}
      initialSorting={[{ id: 'name', desc: false }]}>
    </BaseTable>
  </div>
</div>
{#if isOwner}
  <MapEditDialog
    bind:isMapDialogOpen
    mapForm={data.mapForm}
    {levelChoices}
    {regionChoices}
    groupId={data.group.id}
    {selectedMap}
    user={data.user} />
{/if}
