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

  <!-- <div class="mt-3 flow-root">
    <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table class="w-full table-fixed border-spacing-y-3 border-separate">
            <thead class="bg-green-100">
              <tr class="m-10">
                <th
                  scope="col"
                  class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >Name</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Levels</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Locations count</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                ></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-400">
              {#each maps as map (map.id)}
                <tr
                  class="cursor-pointer hover:bg-green-200"
                  role="link"
                  onclick={() => selectMap(map)}>
                  <td class="flex items-center space-x-2">
                    {map.name}
                    <a
                      onclick={(event) => event.stopPropagation()}
                      href={`https://www.geoguessr.com/maps/${map.geoguessrId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-500 hover:text-blue-700">
                      <Icon icon="mdi:link" class="ml-1 w-5 h-5 inline" />
                    </a>
                  </td>
                  <td>{map.mapLevels.map((item) => item.level.name).join(', ')}</td>
                  <td>{map.locationsCount}</td>
                  <td onclick={(event) => event.stopPropagation()}
                    ><a href={`/dev/dash/groups/${data.group.id}/maps/${map.id}/download`}
                      >Download</a
                    ></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div> -->

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
