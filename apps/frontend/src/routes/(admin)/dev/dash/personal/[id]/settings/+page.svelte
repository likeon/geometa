<script lang="ts">
  import { applyAction, enhance } from '$app/forms';
  import PersonalNavBar from '$lib/components/PersonalNavBar.svelte';
  import Icon from '@iconify/svelte';
  import { Button, Heading, Input, Label, Modal } from 'flowbite-svelte';
 let { data } = $props();


let  geoguessrIdChangeModalOpen = $state(false);
let errorMessage = $state('');
let geoguessrId = $state(data.geoguessrId);
</script>


<div>
  <PersonalNavBar mapName={data.mapName} id={data.id}/>
       <span class="text-m font-semibold text-gray-600 dark:text-gray-400 flex group">

Geoguessrid: {geoguessrId}
  <button onclick={() => (geoguessrIdChangeModalOpen = true)} class=" items-center h-full"
      ><Icon
        icon="ic:baseline-edit"
        class="hidden group-hover:block ml-1 mt-[2px]"
        width="14"
        height="14" /></button>
          </span>
  <Heading tag="h4" class="mt-3">Danger Zone</Heading>
  <div class="border-2 border-red-300 dark:border-red-800 rounded-lg p-4 w-full max-w-lg mt-2">
    <div class="flex justify-between items-center py-3 space-x-4">
      <div>
        <p class="font-semibold">Delete this map</p>
      </div>
      <Button color="red" class="dark:bg-red-900" onclick={() => console.log("Delete map")}
        >Delete
      </Button>
    </div>
  </div>
</div>




<Modal bind:open={geoguessrIdChangeModalOpen}>
<form
  method="POST"
  action="/dev/dash/personal?/updatePersonalMapGeoguessrId"
  use:enhance={() => {
    return async ({ result, formData }) => {
      console.log(result);
      if (result.type === 'failure') {
errorMessage = (result.data as { message?: string })?.message ?? 'Something went wrong';
  return;
      }

      await applyAction(result);
      geoguessrId = formData.get('geoguessrId') as string;
      geoguessrIdChangeModalOpen = false;
    };
  }}
>
  <Input type="hidden" name="id" value={data.id} />
  <Label class="space-y-2">
    <span>Geoguessrid</span>
    <Input type="text" name="geoguessrId" defaultValue={geoguessrId}/>
  </Label>
  {#if errorMessage}
    <p class="text-sm text-red-500 mt-1">{errorMessage}</p>
  {/if}
  <Button type="submit" class="w-full mt-3">Save</Button>
</form>
</Modal>
