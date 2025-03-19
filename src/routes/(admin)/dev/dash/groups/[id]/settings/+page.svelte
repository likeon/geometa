<script lang="ts">
  import { enhance } from '$app/forms';
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import Icon from '@iconify/svelte';
  import { Button, Heading, Modal, Input } from 'flowbite-svelte';

  let { data } = $props();

  let deleteModalOpen = $state(false);
  let inputText = $state('');
  let groupNameMatches = $derived(inputText == data.group.name);

  const irregularPlurals: Record<string, string> = {};
  export function pluralize(word: string, count: number): string {
    return count == 1 ? word : irregularPlurals[word] || `${word}s`;
  }
</script>

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>
  <Heading tag="h4">Danger Zone</Heading>
  <div class="border-2 border-red-300 dark:border-red-800 rounded-lg p-4 w-full max-w-lg mt-2">
    <div class="flex justify-between items-center py-3 space-x-4">
      <div>
        <p class="font-semibold">Delete this map group</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Once you delete a group, there is no going back.
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Please be certain.</p>
      </div>
      <Button color="red" class="dark:bg-red-900" onclick={() => (deleteModalOpen = true)}
        >Delete</Button>
    </div>
  </div>
</div>

<Modal title={`Delete group "${data.group.name}"`} bind:open={deleteModalOpen}>
  <div class="flex flex-col items-center py-4">
    <div class="p-4">
      <Icon icon="entypo:location" width="80" height="80" />
    </div>
    <p class="mt-2 text-md text-gray-600 dark:text-gray-400">
      {data.group.metasCount}
      {pluralize('meta', data.group.metasCount)} · {data.group.locationsCount}
      {pluralize('location', data.group.locationsCount)}
    </p>
  </div>
  <hr />
  <p class="font-semibold">To confirm, type "{data.group.name}" in the box below</p>
  <form action="?/deleteGroup" class="flex flex-col" method="post" use:enhance>
    <Input type="hidden" name="id" value={data.group.id} />
    <Input name="group-name" bind:value={inputText} />
    <Button
      type="submit"
      color="red"
      class="w-full mt-3 dark:bg-red-900"
      disabled={!groupNameMatches}>Delete this group</Button>
  </form>
</Modal>
