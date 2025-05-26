<script lang="ts">
  import PersonalNavBar from '$lib/components/PersonalNavBar.svelte';
  import { columns } from './columns';
  import DataTable from './table.svelte';

  let { data } = $props();
</script>

<PersonalNavBar mapName={data.mapName} id={data.id} />
<div class="mt-5">
  {#if data.metaList.length === 0}
    <p>
      To add metas, go to the meta list of a map with sharing enabled, select the metas you want,
      and add them to your map. Visit <a
        target="_blank"
        href="/maps"
        class="font-semibold underline hover:text-blue-800 dark:hover:text-blue-900">maps page</a> and
      enable the "Shared" filter to see which maps are available for selecting metas!
    </p>
  {:else}
    <DataTable data={data.metaList} {columns} />
  {/if}
</div>
