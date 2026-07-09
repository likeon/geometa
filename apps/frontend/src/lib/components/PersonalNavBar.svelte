<script lang="ts">
  import Icon from '@iconify/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { applyAction, enhance } from '$app/forms';
  import Tooltip from '$lib/components/Tooltip.svelte';
  import NavTabs from '$lib/components/NavTabs.svelte';

  interface Props {
    id: number;
    mapName: string;
    geoguessrId: string;
  }

  let { id, mapName, geoguessrId }: Props = $props();

  let mapRenameDialogOpen = $state(false);
  let errorMessage = $state('');

  const navItems = [
    { name: 'Metas' },
    {
      name: 'Settings',
      slug: 'settings'
    }
  ];
</script>

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

  <NavTabs basePath={`/personal/${id}`} items={navItems} />
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
