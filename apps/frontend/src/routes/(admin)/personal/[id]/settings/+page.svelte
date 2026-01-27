<script lang="ts">
  import { resolve } from '$app/paths';
  import { applyAction, enhance } from '$app/forms';
  import PersonalNavBar from '$lib/components/PersonalNavBar.svelte';
  import Icon from '@iconify/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { goto } from '$app/navigation';

  let { data } = $props();
  let geoguessrIdChangeDialogOpen = $state(false);
  let errorMessage = $state('');
  // svelte-ignore state_referenced_locally
  // eslint-disable-next-line svelte/prefer-writable-derived -- mutated on form success
  let geoguessrId = $state(data.geoguessrId);

  $effect(() => {
    geoguessrId = data.geoguessrId;
  });
</script>

<div>
  <PersonalNavBar mapName={data.mapName} id={data.id} geoguessrId={data.geoguessrId} />

  <span class="text-m font-semibold text-muted-foreground flex group">
    Geoguessrid: {geoguessrId}
    <button onclick={() => (geoguessrIdChangeDialogOpen = true)} class=" items-center h-full"
      ><Icon
        icon="ic:baseline-edit"
        class="hidden group-hover:block ml-1 mt-[2px]"
        width="14"
        height="14" /></button>
  </span>

  <h4 class="text-lg font-semibold mt-3">Danger Zone</h4>

  <Card class="border-red-300 dark:border-red-800 border-2 w-full max-w-lg mt-2">
    <CardContent class="p-4">
      <div class="flex justify-between items-center py-3 space-x-4">
        <div>
          <p class="font-semibold">Delete this map</p>
        </div>
        <form
          action="/personal?/deletePersonalMap"
          method="post"
          id="delete-map-form"
          use:enhance={({ cancel }) => {
            const confirmed = confirm('Are you sure you want to delete this map?');
            if (!confirmed) {
              cancel();
            }
            return async () => {
              await goto(resolve('/personal'));
            };
          }}>
          <input type="hidden" name="id" value={data.id} />
          <Button type="submit" variant="destructive" class="w-full">DELETE</Button>
        </form>
      </div>
    </CardContent>
  </Card>
</div>

<Dialog bind:open={geoguessrIdChangeDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Update Geoguessr ID</DialogTitle>
    </DialogHeader>
    <form
      method="POST"
      action="/personal?/updatePersonalMapGeoguessrId"
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
            const maybeGeoguessrId = result.data?.geoguessrId;
            if (typeof maybeGeoguessrId === 'string') {
              geoguessrId = maybeGeoguessrId;
            }
          }
          geoguessrIdChangeDialogOpen = false;
        };
      }}>
      <input type="hidden" name="id" value={data.id} />
      <div class="space-y-2">
        <Label for="geoguessr-id">Geoguessrid</Label>
        <Input id="geoguessr-id" type="text" name="geoguessrId" value={geoguessrId} />
      </div>
      {#if errorMessage}
        <p class="text-sm text-red-500 mt-1">{errorMessage}</p>
      {/if}
      <Button type="submit" class="w-full mt-3">Save</Button>
    </form>
  </DialogContent>
</Dialog>
