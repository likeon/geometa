<script lang="ts">
  import PersonalNavBar from '$lib/components/PersonalNavBar.svelte';
  import { columns } from './columns';
   import DataTable from './table.svelte';
   
 let { data } = $props();


</script>



<PersonalNavBar mapName={data.mapName} id={data.id}/>
  <div class="mt-5">
 <DataTable data={data.metaList} {columns}/>
  </div>

