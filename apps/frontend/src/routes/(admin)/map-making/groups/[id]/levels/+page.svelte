<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  let { data } = $props();
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import BaseTable from '$lib/components/BaseTable/BaseTable.svelte';
  import { columns } from './columns';
  import LevelEditDialog from '$routes/(admin)/map-making/groups/[id]/levels/LevelEditDialog.svelte';

  let levels = $derived(data.group.levels);

  let selectedLevelId = $state(-1);
  let isLevelDialogOpen = $state(false);

  let selectedLevel = $derived.by(() => {
    const level = levels.find((level) => level.id == selectedLevelId);
    return level != undefined ? level : null;
  });

  function addLevel() {
    selectedLevelId = -1;
    isLevelDialogOpen = true;
  }
</script>

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>
  <div class="flex flex-wrap items-center">
    <div class="grow flex items-center justify-end">
      <Button onclick={addLevel}>Add level</Button>
    </div>
  </div>
  <div class="mt-5">
    <BaseTable
      {columns}
      data={levels}
      bind:selectedId={selectedLevelId}
      bind:isDialogOpen={isLevelDialogOpen}
      initialSorting={[{ id: 'name', desc: false }]} />
  </div>
</div>

<LevelEditDialog
  bind:isLevelDialogOpen
  levelForm={data.levelForm}
  mapGroupId={data.group.id}
  {selectedLevel} />
