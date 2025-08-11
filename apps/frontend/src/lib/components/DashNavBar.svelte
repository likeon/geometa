<script lang="ts">
  import { page } from '$app/state';
  import Icon from '@iconify/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { applyAction, enhance } from '$app/forms';
  import Tooltip from '$lib/components/Tooltip.svelte';

  interface Props {
    groupId: number;
    groupName: string;
  }

  let { groupId, groupName }: Props = $props();
  let activeRoute = $derived(page.url.pathname);
  let groupRenameDialogOpen = $state(false);

  function isActive(route: string) {
    return activeRoute === route
      ? 'border-green-500 text-green-600'
      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:border-gray-700 hover:text-gray-300';
  }
  type NavItemProps = {
    name: string;
    slug?: string;
    tooltipText?: string;
  };
</script>

{#snippet navItem(props: NavItemProps)}
  {@const { name, slug, tooltipText } = props}
  {@const url = `/map-making/groups/${groupId}` + (slug ? `/${slug}` : '')}
  <a
    href={url}
    class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium dark:text-gray-300 {isActive(
      url
    )}">
    {#if tooltipText}
      <Tooltip content={tooltipText}>{name}</Tooltip>
    {:else}
      <div class="mb-1">
        <span class="inline-flex items-center">{name}</span>
      </div>
    {/if}
  </a>
{/snippet}

<div class="border-b border-gray-200 mb-4">
  <span class="text-sm font-semibold text-muted-foreground flex group">
    Group: {groupName || '<No name>'}
    <button onclick={() => (groupRenameDialogOpen = true)} class=" items-center h-full"
      ><Icon
        icon="ic:baseline-edit"
        class="hidden group-hover:block ml-1 mt-[2px]"
        width="14"
        height="14" /></button>
  </span>
  <nav class="-mb-px flex space-x-8" aria-label="Tabs">
    {@render navItem({
      name: 'Metas',
      tooltipText:
        'A list of metas showing their tags, name, location count, assigned levels, and whether they include a note or an image.\n' +
        '\n' +
        'You can add metas manually or by uploading a map-making JSON file, which will automatically populate tags. Then, you just need to add names, notes, and images.\n' +
        '\n' +
        "For advanced users, you can upload a JSON file containing metas by clicking the three dots and selecting 'Upload Metas'."
    })}
    {@render navItem({
      name: 'Maps',
      slug: 'maps',
      tooltipText:
        'A list of your maps where you want to enable the learnable script.\n' +
        'After adding a map, make sure to press the Sync button in the Metas tab to apply the changes.'
    })}
    {@render navItem({
      name: 'Levels',
      slug: 'levels',
      tooltipText:
        'A list of levels that can be assigned to metas. When adding a map, you can filter and include only metas with specific levels.'
    })}
    {@render navItem({
      name: 'Stats',
      slug: 'stats',
      tooltipText: 'View usage stats. (Temporarily unavailable - will be added back soon)'
    })}
    {@render navItem({
      name: 'Settings',
      slug: 'settings'
    })}
  </nav>
</div>

<Dialog bind:open={groupRenameDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Rename Group</DialogTitle>
    </DialogHeader>
    <form
      method="POST"
      action="/map-making?/updateGroupName"
      use:enhance={() => {
        return async ({ result }) => {
          await applyAction(result);
          groupRenameDialogOpen = false;
        };
      }}>
      <input type="hidden" name="id" value={groupId} />
      <div class="space-y-2">
        <Label for="group-name">Group name</Label>
        <Input id="group-name" type="text" name="name" bind:value={groupName} />
      </div>
      <Button type="submit" class="w-full mt-3">Save</Button>
    </form>
  </DialogContent>
</Dialog>

<style>
  a {
    transition: all 0.3s ease;
  }
</style>
