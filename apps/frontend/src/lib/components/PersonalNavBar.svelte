<script lang="ts">
  import { goto } from '$app/navigation';
   import { page } from '$app/state';
  import TooltipName from '$lib/components/TooltipName.svelte';
  import Icon from '@iconify/svelte';
  import Button from './ui/button/button.svelte';
  import { Input, Label, Modal } from 'flowbite-svelte';
  import { applyAction, enhance } from '$app/forms';


interface Props {
    id: number;
    mapName: string;
  }

  let { id, mapName }: Props = $props();

 let activeRoute = $derived(page.url.pathname);
 let mapRenameModalOpen = $state(false);
 let errorMessage = $state('');

 function isActive(route: string) {
    return activeRoute === route
      ? 'border-green-500 text-green-600'
      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:border-gray-700 hover:text-gray-300';
  }
</script>



{#snippet navItem({
  name,
  slug,
  tooltipText
}: {
  name: string;
  slug?: string;
  tooltipText?: string;
})}
  {@const url = `/dev/dash/personal/${id}` + (slug ? `/${slug}` : '')}
  <a
    href={url}
    class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium dark:text-gray-300 {isActive(
      url
    )}">
    {#if tooltipText}
      <TooltipName {name} {tooltipText}></TooltipName>
    {:else}
      <div class="mb-1">
        <span class="inline-flex items-center">{name}</span>
      </div>
    {/if}
  </a>
{/snippet}




<div class="border-b border-gray-200 mb-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-400 group">
      Map: {mapName}
      <button
        onclick={() => (mapRenameModalOpen = true)}
        class="items-center h-full"
      >
        <Icon
          icon="ic:baseline-edit"
          class="hidden group-hover:block ml-1 mt-[2px]"
          width="14"
          height="14"
        />
      </button>
    </div>

    <div>
      <Button onclick={() => goto('/dev/dash/personal/')}>
        Back to personal map list
      </Button>
    </div>
  </div>


  
  <nav class="-mb-px flex space-x-8" aria-label="Tabs">
    {@render navItem({
      name: 'Metas',       
    })}
    {@render navItem({
      name: 'Settings',
      slug: 'settings'
    })}
  </nav>
 
 
</div>



<Modal bind:open={mapRenameModalOpen}>
<form
  method="POST"
  action="/dev/dash/personal?/updatePersonalMapName"
  use:enhance={() => {
    return async ({ result, formData }) => {
      console.log(result);
      if (result.type === 'failure') {
errorMessage = (result.data as { message?: string })?.message ?? 'Something went wrong';
  return;
      }

      await applyAction(result);
      mapName = formData.get('name') as string;
      mapRenameModalOpen = false;
    };
  }}
>
  <Input type="hidden" name="id" value={id} />
  <Label class="space-y-2">
    <span>Map name</span>
    <Input type="text" name="name" defaultValue={mapName}/>
  </Label>
  {#if errorMessage}
    <p class="text-sm text-red-500 mt-1">{errorMessage}</p>
  {/if}
  <Button type="submit" class="w-full mt-3">Save</Button>
</form>
</Modal>

<style>
  a {
    transition: all 0.3s ease;
  }
</style>
