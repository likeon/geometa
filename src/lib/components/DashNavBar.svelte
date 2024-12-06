<script lang="ts">
  import { page } from '$app/stores';
  import Icon from '@iconify/svelte';
  import { Button, Input, Label, Modal } from 'flowbite-svelte'; // Import the page store to get the current route
  import { applyAction, enhance } from '$app/forms';

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
      Metas
    </a>
    <a
      href={`/dev/dash/groups/${groupId}/maps`}
      class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium {isActive(
        `/dev/dash/groups/${groupId}/maps`
      )}">
      Maps
    </a>
    <a
      href={`/dev/dash/groups/${groupId}/levels`}
      class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium {isActive(
        `/dev/dash/groups/${groupId}/levels`
      )}">
      Levels
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
