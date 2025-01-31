<script lang="ts">
  import { page } from '$app/stores';
  import Icon from '@iconify/svelte';
  import { Button, Input, Label, Modal } from 'flowbite-svelte'; // Import the page store to get the current route
  import { applyAction, enhance } from '$app/forms';
  import TooltipName from './TooltipName.svelte';

  interface Props {
    groupId: number;
    groupName: string;
  }

  let { groupId, groupName }: Props = $props();

  let activeRoute = $derived($page.url.pathname);

  function isActive(route: string) {
    return activeRoute === route
      ? 'border-green-500 text-green-600'
      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700';
  }

  let groupRenameModalOpen = $state(false);
</script>

<div class="border-b border-gray-200 mb-4">
  <span class="text-sm font-semibold text-gray-600 flex group">
    Group: {groupName}
    <button onclick={() => (groupRenameModalOpen = true)} class=" items-center h-full"
      ><Icon
        icon="ic:baseline-edit"
        class="hidden group-hover:block ml-1 mt-[2px]"
        width="14"
        height="14" /></button>
  </span>
  <nav class="-mb-px flex space-x-8" aria-label="Tabs">
    <a
      href={`/dev/dash/groups/${groupId}`}
      class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium {isActive(
        `/dev/dash/groups/${groupId}`
      )}">
      <TooltipName
        name="Metas"
        tooltipText="A list of metas showing their tags, name, location count, assigned levels, and whether they include a note or an image.

You can add metas manually or by uploading a map-making JSON file, which will automatically populate tags. Then, you just need to add names, notes, and images.

For advanced users, you can upload a JSON file containing metas by clicking the three dots and selecting 'Upload Metas'.">
      </TooltipName>
    </a>
    <a
      href={`/dev/dash/groups/${groupId}/maps`}
      class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium {isActive(
        `/dev/dash/groups/${groupId}/maps`
      )}">
      <TooltipName
        name="Maps"
        tooltipText="A list of your maps where you want to enable the learnable script.
After adding a map, make sure to press the Sync button in the Metas tab to apply the changes.
       ">
      </TooltipName>
    </a>
    <a
      href={`/dev/dash/groups/${groupId}/levels`}
      class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium {isActive(
        `/dev/dash/groups/${groupId}/levels`
      )}">
      <TooltipName
        name="Levels"
        tooltipText="A list of levels that can be assigned to metas. When adding a map, you can filter and include only metas with specific levels.">
      </TooltipName>
    </a>
  </nav>
</div>

<Modal bind:open={groupRenameModalOpen}>
  <form
    method="POST"
    action="/dev/dash?/updateGroupName"
    use:enhance={() => {
      return async ({ result }) => {
        await applyAction(result);
        groupRenameModalOpen = false;
      };
    }}>
    <Input type="hidden" name="id" value={groupId} />
    <Label class="space-y-2">
      <span>Group name</span>
      <Input type="text" name="name" bind:value={groupName} />
    </Label>
    <Button type="submit" class="w-full mt-3">Save</Button>
  </form>
</Modal>

<style>
  a {
    transition: all 0.3s ease;
  }
</style>
