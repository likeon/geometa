<script lang="ts">
  let { data } = $props();
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import { Button } from 'flowbite-svelte';
  import LevelEditModal from './LevelEditModal.svelte';
  import BaseTable from '$lib/components/BaseTable/BaseTable.svelte';
  import { columns } from './columns';
  let levels = $derived(data.group.levels);

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
  <BaseTable
    {columns}
    data={levels}
    bind:selectedId={selectedLevelId}
    bind:isModalOpen={isLevelModalOpen}
    initialSorting={[{ id: 'name', desc: false }]} />
</div>

<LevelEditModal
  bind:isLevelModalOpen
  data={data.levelForm}
  mapGroupId={data.group.id}
  {selectedLevel} />
