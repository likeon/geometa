<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  let { data } = $props();
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import BaseTable from '$lib/components/BaseTable/BaseTable.svelte';
  import { columns } from './columns';
  import LevelEditDialog from '$routes/(admin)/map-making/groups/[id]/levels/LevelEditDialog.svelte';

  let isOwner = $derived(data.role === 'owner');
  let tableColumns = $derived(isOwner ? columns : columns.filter((c) => c.id !== 'actions'));
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
  <DashNavBar groupId={data.group.id} groupName={data.group.name} canRename={isOwner}></DashNavBar>
  <div class="flex flex-wrap items-center">
    <div class="grow flex items-center justify-end">
      {#if isOwner}
        <Button onclick={addLevel}>Add level</Button>
      {/if}
    </div>
  </div>
  <div class="mt-5">
    <BaseTable
      columns={tableColumns}
      data={levels}
      bind:selectedId={selectedLevelId}
      bind:isDialogOpen={isLevelDialogOpen}
      initialSorting={[{ id: 'name', desc: false }]} />
  </div>
</div>

{#if isOwner}
  <LevelEditDialog
    bind:isLevelDialogOpen
    levelForm={data.levelForm}
    mapGroupId={data.group.id}
    {selectedLevel} />
{/if}
