<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import MapEditModal from './MapEditModal.svelte';
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import Icon from '@iconify/svelte';
  import SortFilterTable from '$lib/components/SortFilterTable.svelte';
  let { data } = $props();
  let columns = [
    { key: 'name', label: 'Name', width: '30%', sortable: true, searchable: true },
    {
      key: 'mapLevels',
      label: 'Levels',
      width: '30%',
      display: (a: any) => a.map((item: { level: { name: any } }) => item.level.name).join(', '),
      sortable: false,
      searchable: true
    },
    { key: 'locationsCount', label: 'Locations count', sortable: true, searchable: false },
    {
      key: 'link',
      label: 'Geoguessr Link',
      sortable: false,
      searchable: false,
      display: (item: any) => `https://www.geoguessr.com/maps/${item.geoguessrId}`
    },
    {
      key: 'link',
      label: 'Download Link',
      sortable: false,
      searchable: false,
      display: (item: any) => `/dev/dash/groups/${data.group.id}/maps/${item.id}/download`
    }
  ];

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

  <SortFilterTable
    data={maps}
    {searchText}
    {columns}
    bind:isModalOpen={isMapModalOpen}
    bind:selectedRowId={selectedMapId} />
</div>

<MapEditModal
  bind:isMapModalOpen
  data={data.mapForm}
  {levelChoices}
  {regionChoices}
  groupId={data.group.id}
  {selectedMap}
  user={data.user} />
