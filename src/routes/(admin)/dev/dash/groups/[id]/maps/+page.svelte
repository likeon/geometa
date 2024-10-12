<script lang="ts">
  export let data;
  import { Button } from 'flowbite-svelte';
  import MapEditModal from './MapEditModal.svelte';
  import DashNavBar from '$lib/components/DashNavBar.svelte';

  type MapType = (typeof data.group.maps)[number];
  let isMapModalOpen = false;
  let selectedMap: (typeof data.group.maps)[number] | null = null;

  $: maps = data.group.maps;

  function addMap() {
    selectedMap = null;
    isMapModalOpen = true;
  }

  function selectMap(map: MapType) {
    selectedMap = map;
    isMapModalOpen = true;
  }

  const levelChoices = data.levelList.map((item) => ({
    value: item.id,
    name: item.name
  }));
</script>

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>

  <div class="flex flex-wrap items-center">
    <div class="flex-grow flex items-center justify-end">
      <Button on:click={addMap}>Add map</Button>
    </div>
  </div>

  <div class="mt-3 flow-root">
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
                  on:click={() => selectMap(map)}>
                  <td>{map.name}</td>
                  <td>{map.mapLevels.map((item) => item.level.name).join(', ')}</td>
                  <td>{map.locationsCount}</td>
                  <td on:click={(event) => event.stopPropagation()}
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
  </div>
</div>

<MapEditModal
  bind:isMapModalOpen
  data={data.mapForm}
  {levelChoices}
  groupId={data.group.id}
  {selectedMap} />

<style lang="postcss">
  td {
    @apply pl-3;
  }

  th {
    @apply pl-3;
  }
</style>
