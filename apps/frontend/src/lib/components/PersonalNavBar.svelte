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
    id: number;
    mapName: string;
    geoguessrId: string;
  }

  let { id, mapName, geoguessrId }: Props = $props();

  let activeRoute = $derived(page.url.pathname);
  let mapRenameDialogOpen = $state(false);
  let errorMessage = $state('');

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
  {@const url = `/personal/${id}` + (slug ? `/${slug}` : '')}
  <a
    href={url}
    class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium dark:text-gray-300 {isActive(
      url
    )}">
    {#if tooltipText}
      <Tooltip content={tooltipText}>{name}</Tooltip>
    {:else}
      <div class="mb-1"><span class="inline-flex items-center">{name}</span></div>{/if}</a
  >{/snippet}

<div class="border-b border-gray-200 mb-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center text-sm font-semibold text-muted-foreground group">
      Map: {mapName}
      <button onclick={() => (mapRenameDialogOpen = true)} class="items-center h-full">
        <Icon
          icon="ic:baseline-edit"
          class="hidden group-hover:block ml-1 mt-[2px]"
          width="14"
          height="14" />
      </button>
    </div>

    <div class="flex gap-x-2">
      <div>
        <Button variant="secondary" href="/personal/">Back to personal map list</Button>
      </div>
      <div>
        <Button href={`https://www.geoguessr.com/map-maker/${geoguessrId}`} target="_blank">
          <Tooltip
            content="This will take you to geoguessr website where you can upload locations using our script, just press the LearnableMeta - upload button and it's all done! If you don't see a button your userscript is probably not updated">
            Upload to Geoguessr
          </Tooltip>
        </Button>
      </div>
    </div>
  </div>

  <nav class="-mb-px flex space-x-8" aria-label="Tabs">
    {@render navItem({
      name: 'Metas'
    })}
    {@render navItem({
      name: 'Settings',
      slug: 'settings'
    })}
  </nav>
</div>

<Dialog bind:open={mapRenameDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Rename Map</DialogTitle>
    </DialogHeader>
    <form
      method="POST"
      action="/personal?/updatePersonalMapName"
      use:enhance={() => {
        return async ({ result }) => {
          if (result.type === 'failure') {
            errorMessage = 'Something went wrong';
            const maybeMessage = result.data?.message;
            if (typeof maybeMessage === 'string') {
              errorMessage = maybeMessage;
            }
            return;
          }

          await applyAction(result);
          if (result.type === 'success') {
            const maybeMapName = result.data?.mapName;
            if (typeof maybeMapName === 'string') {
              mapName = maybeMapName;
            }
          }
          mapRenameDialogOpen = false;
        };
      }}>
      <input type="hidden" name="id" value={id} />
      <div class="space-y-2">
        <Label for="map-name">Map name</Label>
        <Input id="map-name" type="text" name="name" value={mapName} />
      </div>
      {#if errorMessage}
        <p class="text-sm text-red-500 mt-1">{errorMessage}</p>
      {/if}
      <Button type="submit" class="w-full mt-3">Save</Button>
    </form>
  </DialogContent>
</Dialog>

<style>
  a {
    transition: all 0.3s ease;
  }
</style>
