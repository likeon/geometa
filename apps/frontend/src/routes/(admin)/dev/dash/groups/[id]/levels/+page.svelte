<script lang="ts">
  let { data } = $props();
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import { Button } from 'flowbite-svelte';
  import LevelEditModal from './LevelEditModal.svelte';
  import SortFilterTable from '$lib/components/SortFilterTable.svelte';

  let levels = $derived(data.group.levels);
  let columns = [{ key: 'name', label: 'Name', sortable: true, searchable: true }];

  let selectedLevelId = $state(-1);
  let isLevelModalOpen = $state(false);

  let selectedLevel = $derived.by(() => {
    const level = levels.find((level) => level.id == selectedLevelId);
    return level != undefined ? level : null;
  });

  function addLevel() {
    selectedLevelId = -1;
    isLevelModalOpen = true;
  }
</script>

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>
  <div class="flex flex-wrap items-center">
    <div class="flex-grow flex items-center justify-end">
      <Button onclick={addLevel}>Add level</Button>
    </div>
  </div>
  <SortFilterTable
    data={levels}
    {columns}
    searchText=""
    bind:selectedRowId={selectedLevelId}
    bind:isModalOpen={isLevelModalOpen} />
</div>

<LevelEditModal
  bind:isLevelModalOpen
  data={data.levelForm}
  mapGroupId={data.group.id}
  {selectedLevel} />
