<script lang="ts">
  export let data;
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import { Button } from 'flowbite-svelte';
  import LevelEditModal from './LevelEditModal.svelte';
  $: levels = data.group.levels;

  type LevelType = (typeof data.group.levels)[number];
  let isLevelModalOpen = false;
  let selectedLevel: LevelType | null = null;

  function addLevel() {
    selectedLevel = null;
    isLevelModalOpen = true;
  }

  function selectLevel(level: LevelType) {
    selectedLevel = level;
    isLevelModalOpen = true;
  }
</script>

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>
  <div class="flex flex-wrap items-center">
    <div class="flex-grow flex items-center justify-end">
      <Button on:click={addLevel}>Add level</Button>
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
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-400">
              {#each levels as level (level.id)}
                <tr
                  class="cursor-pointer hover:bg-green-200"
                  role="link"
                  on:click={() => selectLevel(level)}>
                  <td>{level.name}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<LevelEditModal
  bind:isLevelModalOpen
  data={data.levelForm}
  groupId={data.group.id}
  {selectedLevel} />

<style lang="postcss">
  td {
    @apply pl-3;
  }

  th {
    @apply pl-3;
  }
</style>
