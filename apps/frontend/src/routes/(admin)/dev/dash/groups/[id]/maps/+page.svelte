<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import MapEditModal from './MapEditModal.svelte';
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import SortFilterTable from '$lib/components/SortFilterTable.svelte';
  import { columns } from './columns';
  import BaseTable from '$lib/components/BaseTable/BaseTable.svelte';
  let { data } = $props();

  let isMapModalOpen = $state(false);
  let searchText = $state('');
  let selectedMapId = $state(-1);
  let maps = $derived(data.group.maps);
  let selectedMap = $derived.by(() => {
    const map = maps.find((map) => map.id == selectedMapId);
    return map != undefined ? map : null;
  });

  function addMap() {
    selectedMapId = -1;
    isMapModalOpen = true;
  }

  const levelChoices = data.levelList.map((item) => ({
    value: item.id,
    name: item.name
  }));
  const regionChoices = data.regionList.map((item) => ({
    value: item.id,
    name: item.name
  }));
</script>

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>

  <div class="flex flex-wrap items-center">
    <div class="flex-grow flex items-center justify-end">
      <Button onclick={addMap}>Add map</Button>
    </div>
  </div>
  <BaseTable
    {columns}
    data={maps}
    bind:selectedId={selectedMapId}
    bind:isModalOpen={isMapModalOpen}
    initialSorting={[{ id: 'name', desc: false }]}>
  </BaseTable>
</div>
<MapEditModal
  bind:isMapModalOpen
  data={data.mapForm}
  {levelChoices}
  {regionChoices}
  groupId={data.group.id}
  {selectedMap}
  user={data.user} />
