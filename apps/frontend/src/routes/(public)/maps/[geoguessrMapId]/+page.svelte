<script lang="ts">
  import background from '$lib/assets/background.jpg';
  import { Button } from '$lib/components/ui/button';
  import { fade } from 'svelte/transition';
  import type { PageProps } from './$types';
  import { enhance } from '$app/forms';
  import { SvelteSet } from 'svelte/reactivity';
  import DismissibleAlert from '$lib/components/DismissibleAlert.svelte';
  import { Label } from '$lib/components/ui/label';
  import * as Dialog from '$lib/components/ui/dialog/index';
  import * as Select from '$lib/components/ui/select';
  import * as Table from '$lib/components/ui/table';
  import { Input } from '$lib/components/ui/input';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Search } from '@lucide/svelte';

  let { data }: PageProps = $props();
  let showNotLoggedInAlert = $state(false);
  let showNoPersonalMapsAlert = $state(false);
  let showAddedMetasAlert = $state(false);
  let showErrorAlert = $state(false);
  let searchQuery = $state('');

  type Meta = {
    id: number;
    name: string;
    note: string;
    images: string[];
    footer: string;
    locationsCount: number;
  };

  let selectedMeta: Meta = $state(data.metaList[0]);
  let rightPanelRef: HTMLDivElement | undefined = $state();
  let selectedMetaIds = new SvelteSet<number>();
  let selectAll = $state(false);
  let personalMapChoiceDialogOpen = $state(false);
  let confirmAdding = $state(false);

  let filteredMetaList = $derived(
    data.metaList.filter((meta) => meta.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let visibleSelectedMetaIds = $derived.by(() => {
    const visible = new Set<number>();
    filteredMetaList.forEach((meta) => {
      if (selectedMetaIds.has(meta.id)) {
        visible.add(meta.id);
      }
    });
    return visible;
  });

  $effect(() => {
    if (filteredMetaList.length > 0) {
      selectAll = filteredMetaList.every((meta) => selectedMetaIds.has(meta.id));
    } else {
      selectAll = false;
    }
  });

  function toggleMeta(id: number, checked: boolean) {
    showAddedMetasAlert = false;
    if (checked) {
      selectedMetaIds.add(id);
    } else {
      selectedMetaIds.delete(id);
    }
  }

  function toggleAll(checked: boolean) {
    showAddedMetasAlert = false;
    if (checked) {
      for (const meta of filteredMetaList) {
        selectedMetaIds.add(meta.id);
      }
    } else {
      for (const meta of filteredMetaList) {
        selectedMetaIds.delete(meta.id);
      }
    }
    selectAll = checked;
  }

  let dialogResolve: ((value: boolean) => void) | null = null;

  function openDialog(): Promise<boolean> {
    personalMapChoiceDialogOpen = true;
    return new Promise((resolve) => {
      dialogResolve = resolve;
    });
  }

  let selectedPersonalMapId: string | undefined = $state(undefined);

  function selectMetaAndScroll(meta: Meta) {
    selectedMeta = meta;
    if (rightPanelRef) rightPanelRef.scrollTop = 0;
  }
</script>

{#snippet errorAlert()}
  There was an error, try again later.
{/snippet}

{#snippet notLoggedInAlert()}
  You are not logged in, you can login with discord
  <a href="/personal" class="font-semibold underline hover:text-blue-800 dark:hover:text-blue-900"
    >here</a>
  and create your personal map.
{/snippet}

{#snippet noPersonalMapAlert()}
  You don't have any personal maps, you can do it
  <a href="/personal" class="font-semibold underline hover:text-blue-800 dark:hover:text-blue-900"
    >here</a
  >.
{/snippet}

{#snippet addedMetasAlert()}
  <p>You added {visibleSelectedMetaIds.size} meta(s) to your personal map!</p>
  <p>
    Click
    <a
      target="_blank"
      href={`/personal/${selectedPersonalMapId}`}
      class="font-semibold underline hover:text-blue-800 dark:hover:text-blue-900">here</a> to see meta
    list for your personal map.
  </p>
{/snippet}

<svelte:head>
  <title>Meta List - {data.mapName}</title>
</svelte:head>

<div
  class="relative min-h-screen bg-cover bg-center"
  style="background-image: url({background}); background-attachment: fixed;">
  <div class="items-center mx-auto max-w-8xl px-3 py-2 h-screen">
    <div
      in:fade
      class="mx-auto flex flex-col lg:flex-row bg-background shadow-lg rounded-lg overflow-hidden w-full max-w-[1500px] lg:h-[calc(100vh-90px)] h-[calc(100vh-80px)]">
      <div
        class="lg:w-1/4 p-4 border-b lg:border-b-0 lg:border-r border-border bg-muted/10 rounded-t-lg lg:rounded-l-lg h-[130px] lg:h-full">
        <DismissibleAlert
          variant="destructive"
          bind:showAlert={showErrorAlert}
          alertText={errorAlert} />
        <DismissibleAlert
          variant="default"
          bind:showAlert={showNotLoggedInAlert}
          alertText={notLoggedInAlert} />
        <DismissibleAlert
          variant="default"
          bind:showAlert={showNoPersonalMapsAlert}
          alertText={noPersonalMapAlert} />
        <DismissibleAlert
          variant="success"
          bind:showAlert={showAddedMetasAlert}
          alertText={addedMetasAlert} />

        <div class="grid grid-rows-[auto_auto_auto_1fr_auto] h-full gap-2">
          {#if data.isMapShared}
            <form
              action="?/addMetasToPersonalMap"
              method="post"
              id="delete-metas-form"
              use:enhance={async ({ cancel, formData }) => {
                showNoPersonalMapsAlert = false;
                showNotLoggedInAlert = false;
                showAddedMetasAlert = false;
                showErrorAlert = false;
                if (!data.isLoggedIn) {
                  cancel();
                  showNotLoggedInAlert = true;
                  return;
                }
                if (data.personalMaps.length === 0) {
                  cancel();
                  showNoPersonalMapsAlert = true;
                  return;
                }

                confirmAdding = false;
                if (data.personalMaps.length > 1) {
                  if (!selectedPersonalMapId) {
                    selectedPersonalMapId = data.personalMaps[0].id.toString();
                  }
                  confirmAdding = await openDialog();
                } else {
                  selectedPersonalMapId = data.personalMaps[0].id.toString();
                  confirmAdding = confirm(
                    `Are you sure you want to add ${visibleSelectedMetaIds.size} visible meta(s) to your personal map?`
                  );
                }

                if (!confirmAdding) {
                  cancel();
                }

                // Only add visible selected metas
                visibleSelectedMetaIds.forEach((id) => {
                  formData.append('id', `${id}`);
                });
                formData.append('mapId', selectedPersonalMapId || '');

                return async ({ update, result }) => {
                  if (result.status !== 200) {
                    showErrorAlert = true;
                    return;
                  }
                  showAddedMetasAlert = true;
                  update();
                };
              }}>
              {#if visibleSelectedMetaIds.size > 0}
                <Button
                  type="submit"
                  variant="default"
                  class="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800">
                  Add {visibleSelectedMetaIds.size} visible meta{visibleSelectedMetaIds.size !== 1
                    ? 's'
                    : ''} to personal map
                </Button>
              {:else}
                <Button type="submit" variant="default" disabled class="w-full">
                  No visible metas selected
                </Button>
              {/if}
            </form>
          {/if}

          <!-- Search Input -->
          <div class="relative">
            <Search
              class="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search metas..."
              bind:value={searchQuery}
              class="pl-8" />
          </div>

          <!-- Warning when there are hidden selections -->
          {#if searchQuery && selectedMetaIds.size > visibleSelectedMetaIds.size}
            <div class="bg-warning/20 border border-warning rounded-md px-2 py-1 min-h-0">
              <p class="text-xs text-warning-foreground truncate">
                {selectedMetaIds.size - visibleSelectedMetaIds.size} hidden selection{selectedMetaIds.size -
                  visibleSelectedMetaIds.size !==
                1
                  ? 's'
                  : ''}
              </p>
            </div>
          {/if}

          <div class="text-right overflow-y-auto flex-grow min-h-0">
            <Table.Root class="table-fixed w-full text-left h-full">
              {#if data.isMapShared}
                <Table.Header class="sticky top-0 bg-background z-10">
                  <Table.Row>
                    <Table.Head class="w-[25px]">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={(checked) => toggleAll(!!checked)} />
                    </Table.Head>
                    <Table.Head>Select all ({filteredMetaList.length})</Table.Head>
                  </Table.Row>
                </Table.Header>
              {/if}
              <Table.Body>
                {#if filteredMetaList.length === 0}
                  <Table.Row>
                    <Table.Cell
                      colspan={data.isMapShared ? 2 : 1}
                      class="text-center text-muted-foreground">
                      No metas found matching "{searchQuery}"
                    </Table.Cell>
                  </Table.Row>
                {:else}
                  {#each filteredMetaList as meta (meta.id)}
                    <Table.Row
                      class={`cursor-pointer ${selectedMeta.id === meta.id ? 'bg-accent' : ''}`}>
                      {#if data.isMapShared}
                        <Table.Cell class="w-[40px]">
                          <Checkbox
                            checked={selectedMetaIds.has(meta.id)}
                            onCheckedChange={(checked) => toggleMeta(meta.id, !!checked)}
                            onclick={(e) => e.stopPropagation()} />
                        </Table.Cell>
                      {/if}
                      <Table.Cell
                        class="font-medium py-2 px-2"
                        onclick={() => selectMetaAndScroll(meta)}>
                        <div class="flex items-center justify-between w-full">
                          <span
                            class={`block w-full whitespace-normal break-words ${selectedMeta.id === meta.id ? 'font-semibold' : ''}`}>
                            {meta.name} ({meta.locationsCount})
                          </span>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                {/if}
              </Table.Body>
            </Table.Root>
          </div>

          {#if selectedMetaIds.size > 0}
            <div class="text-sm text-muted-foreground text-center">
              {#if searchQuery && visibleSelectedMetaIds.size !== selectedMetaIds.size}
                {visibleSelectedMetaIds.size} of {selectedMetaIds.size} selected metas visible
              {:else}
                {selectedMetaIds.size} meta{selectedMetaIds.size !== 1 ? 's' : ''} selected
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <div class="lg:w-3/4 p-4 overflow-y-auto h-full" bind:this={rightPanelRef}>
        <div class="flex w-full items-center mb-3">
          <h1 class="text-xl">Meta List - {data.mapName}</h1>
          <div class="ml-3">
            <Button target="_blank" href={`https://www.geoguessr.com/maps/${data.mapGeoguessrId}`}
              >Play
            </Button>
          </div>
        </div>
        <div>
          <h3 class="text-2xl font-bold mb-4 text-foreground text-center">
            {selectedMeta.name}
          </h3>
          <div class="note mb-1 text-muted-foreground">
            {@html selectedMeta.note}
          </div>
          {#if selectedMeta.footer !== ''}
            <div
              class="text-sm text-muted-foreground/80 break-words"
              style="overflow-wrap: break-word; word-wrap: break-word; word-break: break-word;">
              {@html selectedMeta.footer}
            </div>
          {/if}

          <h4 class="text-lg font-semibold mb-4 text-foreground">Images:</h4>
          {#if selectedMeta.images.length > 0}
            <div
              class={`grid gap-6 ${
                selectedMeta.images.length > 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
              }`}>
              {#each selectedMeta.images as url (url)}
                <div
                  class="relative w-full flex justify-center items-center border-transparent"
                  style="height: auto; max-height: 400px;">
                  <img src={url} alt="" class="max-h-full max-w-full object-contain" />
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-muted-foreground">No images available.</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<Dialog.Root bind:open={personalMapChoiceDialogOpen}>
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>Add to Personal Map</Dialog.Title>
      <Dialog.Description>
        Choose which personal map you want to add {visibleSelectedMetaIds.size} selected meta{visibleSelectedMetaIds.size !==
        1
          ? 's'
          : ''} to.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <div class="space-y-2">
        <Label for="personal-map-select">Select destination map</Label>
        <Select.Root type="single" name="personalMapId" bind:value={selectedPersonalMapId}>
          <Select.Trigger class="w-[180px]">
            {selectedPersonalMapId
              ? data.personalMaps.find((m) => m.id.toString() === selectedPersonalMapId)?.name
              : 'Select a map'}
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Your Personal Maps</Select.Label>
              {#each data.personalMaps as map (map.id)}
                <Select.Item value={map.id.toString()} label={map.name}>
                  <div class="flex items-center justify-between w-full">
                    <span>{map.name}</span>
                  </div>
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>

      <div class="rounded-md bg-muted p-3 space-y-2">
        <p class="text-sm font-medium">Selected metas to add:</p>
        <div class="max-h-[120px] overflow-y-auto space-y-1">
          {#each data.metaList.filter( (meta) => visibleSelectedMetaIds.has(meta.id) ) as meta (meta.id)}
            <p class="text-sm text-muted-foreground">{meta.name}</p>
          {/each}
        </div>
      </div>

      {#if selectedPersonalMapId}
        {@const selectedMap = data.personalMaps.find(
          (m) => m.id.toString() === selectedPersonalMapId
        )}
        {#if selectedMap}
          <div class="rounded-md bg-primary/10 border border-primary/20 p-3">
            <p class="text-sm text-primary">
              These metas will be added to <span class="font-semibold">{selectedMap.name}</span>
            </p>
          </div>
        {/if}
      {/if}
    </div>

    <Dialog.Footer>
      <Button
        type="button"
        variant="outline"
        onclick={() => {
          personalMapChoiceDialogOpen = false;
          dialogResolve?.(false);
        }}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="default"
        disabled={!selectedPersonalMapId}
        onclick={() => {
          personalMapChoiceDialogOpen = false;
          dialogResolve?.(true);
        }}>
        Add to Map
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.note ul li) {
    list-style-type: disc;
    margin-left: 1rem;
  }

  :global(.note ol li) {
    list-style-type: decimal;
    margin-left: 1rem;
  }
</style>
