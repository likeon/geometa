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
  import { Search, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import Icon from '@iconify/svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';

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

  let currentMetaIndex = $derived(
    filteredMetaList.findIndex((meta) => meta.id === selectedMeta.id)
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

  // Handle case when search filters change and current meta is no longer visible
  $effect(() => {
    if (filteredMetaList.length > 0 && currentMetaIndex === -1) {
      // If current meta is not in filtered list, select the first filtered meta
      selectMetaAndScroll(filteredMetaList[0]);
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

  function getMetaCountText(count: number): string {
    return count === 1 ? '1 meta' : `${count} metas`;
  }

  function navigateToNext() {
    if (filteredMetaList.length === 0) return;
    const nextIndex = (currentMetaIndex + 1) % filteredMetaList.length;
    selectMetaAndScroll(filteredMetaList[nextIndex]);
  }

  function navigateToPrevious() {
    if (filteredMetaList.length === 0) return;
    const prevIndex = currentMetaIndex <= 0 ? filteredMetaList.length - 1 : currentMetaIndex - 1;
    selectMetaAndScroll(filteredMetaList[prevIndex]);
  }

  // Mobile swipe handling
  let touchStartX = 0;
  let touchStartY = 0;
  let swipeTarget: EventTarget | null = null;
  let touchStartTime = 0;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    swipeTarget = e.target;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(e: TouchEvent) {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 50;
    const touchDuration = Date.now() - touchStartTime;
    const maxTouchDuration = 300; // ms

    const target = swipeTarget as Element;
    if (target) {
      // Always block swipe on images and links
      if (target.tagName === 'IMG' || target.tagName === 'A' || target.closest('a')) {
        return;
      }

      // Check if there's text selection - if so, don't swipe
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return;
      }

      // Check for actual horizontal overflow
      const hasHorizontalOverflow = (element: Element) => {
        return element.scrollWidth > element.clientWidth;
      };

      // Block swipe if touching content with actual overflow
      const proseElement = target.closest('.prose');
      if (proseElement && hasHorizontalOverflow(proseElement)) {
        return;
      }

      const scrollableElement =
        target.closest('.overflow-x-auto') || target.closest('.overflow-auto');
      if (scrollableElement && hasHorizontalOverflow(scrollableElement)) {
        return;
      }

      // Check if the touch was too long (likely text selection attempt)
      if (touchDuration > maxTouchDuration) {
        return;
      }
    }

    // Only trigger swipe if horizontal movement is greater than vertical movement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swipe right - go to previous meta
        navigateToPrevious();
      } else {
        // Swipe left - go to next meta
        navigateToNext();
      }
    }
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
  <!-- Mobile Layout -->
  <div class="lg:hidden">
    <div in:fade class="mx-auto max-w-4xl px-3 py-2 space-y-4">
      <!-- Mobile Header -->
      <div class="bg-background shadow-lg rounded-lg p-4">
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <h1 class="text-xl font-bold tracking-tight">{data.mapName}</h1>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">{data.metaList.length} locations</span>
              {#if data.mapAuthors}
                <span class="text-muted-foreground">·</span>
                <span class="text-muted-foreground"
                  >by <span class="text-foreground font-medium">{data.mapAuthors}</span></span>
              {/if}
            </div>
          </div>
          <Button
            target="_blank"
            href={`https://www.geoguessr.com/maps/${data.mapGeoguessrId}`}
            size="sm">
            <Icon icon="material-symbols:play-arrow" class="mr-1 h-4 w-4" />
            Play
          </Button>
        </div>
      </div>

      <!-- Mobile Meta Selection -->
      {#if data.isMapShared}
        <div class="bg-background shadow-lg rounded-lg p-4">
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

          <form
            action="?/addMetasToPersonalMap"
            method="post"
            id="mobile-delete-metas-form"
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
              if (!selectedPersonalMapId) {
                selectedPersonalMapId = data.personalMaps[0].id.toString();
              }
              confirmAdding = await openDialog();

              if (!confirmAdding) {
                cancel();
              }

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
                class="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 mb-4">
                Add {visibleSelectedMetaIds.size} visible meta{visibleSelectedMetaIds.size !== 1
                  ? 's'
                  : ''} to personal map
              </Button>
            {:else}
              <Button type="submit" variant="outline" disabled class="w-full mb-4">
                No visible metas selected
              </Button>
            {/if}
          </form>

          <!-- Search Input -->
          <div class="relative mb-4">
            <Search
              class="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search metas..."
              bind:value={searchQuery}
              class="pl-8" />
          </div>

          <!-- Meta List -->
          <div class="space-y-2 max-h-[80px] overflow-y-auto">
            {#each filteredMetaList as meta (meta.id)}
              <div
                class="flex items-center space-x-3 p-3 rounded-lg border {selectedMeta.id ===
                meta.id
                  ? 'bg-accent border-accent-foreground/20'
                  : 'hover:bg-muted/50'}"
                role="button"
                tabindex="0"
                onclick={() => selectMetaAndScroll(meta)}
                onkeydown={(e) =>
                  e.key === 'Enter' || e.key === ' ' ? selectMetaAndScroll(meta) : null}>
                {#if data.isMapShared}
                  <Checkbox
                    checked={selectedMetaIds.has(meta.id)}
                    onCheckedChange={(checked) => toggleMeta(meta.id, !!checked)} />
                {/if}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-sm truncate">{meta.name}</span>
                    <div
                      class="flex items-center gap-1 text-xs text-muted-foreground ml-2 shrink-0">
                      <Icon icon="material-symbols:location-on" class="h-3 w-3" />
                      <span>{meta.locationsCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>

          {#if selectedMetaIds.size > 0}
            <div class="text-sm text-muted-foreground text-center mt-4">
              {#if searchQuery && visibleSelectedMetaIds.size !== selectedMetaIds.size}
                {visibleSelectedMetaIds.size} of {selectedMetaIds.size} selected metas visible
              {:else}
                {selectedMetaIds.size} meta{selectedMetaIds.size !== 1 ? 's' : ''} selected
              {/if}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Mobile Meta Detail -->
      <div
        class="bg-background shadow-lg rounded-lg p-4 space-y-4"
        ontouchstart={handleTouchStart}
        ontouchend={handleTouchEnd}>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold tracking-tight">{selectedMeta.name}</h2>
          <div class="flex items-center gap-2 shrink-0">
            <Tooltip
              content="This meta has {selectedMeta.locationsCount} location{selectedMeta.locationsCount !==
              1
                ? 's'
                : ''}">
              <div class="flex items-center gap-1 text-sm text-muted-foreground cursor-help">
                <Icon icon="material-symbols:location-on" class="h-4 w-4" />
                <span>{selectedMeta.locationsCount}</span>
              </div>
            </Tooltip>
            {#if filteredMetaList.length > 1}
              <div class="flex items-center gap-1 ml-2">
                <Button variant="ghost" size="sm" onclick={navigateToPrevious} class="p-1 h-8 w-8">
                  <ChevronLeft class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onclick={navigateToNext} class="p-1 h-8 w-8">
                  <ChevronRight class="h-4 w-4" />
                </Button>
              </div>
            {/if}
          </div>
        </div>

        {#if filteredMetaList.length > 1}
          <div class="text-xs text-muted-foreground text-center">
            {currentMetaIndex + 1} of {filteredMetaList.length} metas
          </div>
        {/if}

        {#if selectedMeta.note || selectedMeta.footer !== ''}
          <div class="prose prose-sm dark:prose-invert max-w-none">
            <div class="rounded-lg border bg-muted/50 p-4 space-y-3">
              {#if selectedMeta.note}
                <div>
                  {@html selectedMeta.note}
                </div>
              {/if}
              {#if selectedMeta.footer !== ''}
                <div class="text-sm text-muted-foreground border-t pt-3">
                  {@html selectedMeta.footer}
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <Icon icon="material-symbols:image" class="h-4 w-4 text-muted-foreground" />
            <h3 class="font-semibold">Images</h3>
            {#if selectedMeta.images.length > 0}
              <span class="text-sm text-muted-foreground">({selectedMeta.images.length})</span>
            {/if}
          </div>

          {#if selectedMeta.images.length > 0}
            <div class="space-y-3">
              {#each selectedMeta.images as url (url)}
                <div class="group relative overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={url}
                    alt="Meta location"
                    class="w-full h-auto max-h-[250px] object-contain" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white p-2 rounded-md">
                    <Icon icon="material-symbols:open-in-new" class="h-4 w-4" />
                  </a>
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-center py-8 text-muted-foreground">
              <Icon
                icon="material-symbols:image-not-supported-outline"
                class="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p class="text-sm">No images available</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Desktop Layout -->
  <div class="hidden lg:block">
    <div class="items-center mx-auto max-w-8xl px-3 py-2 h-screen">
      <div
        in:fade
        class="mx-auto flex flex-row bg-background shadow-lg rounded-lg overflow-hidden w-full max-w-[1500px] h-[calc(100vh-90px)]">
        <div class="w-1/4 p-4 border-r border-border bg-muted/10 rounded-l-lg h-full">
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
                  if (!selectedPersonalMapId) {
                    selectedPersonalMapId = data.personalMaps[0].id.toString();
                  }
                  confirmAdding = await openDialog();

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
                          onCheckedChange={(checked) => toggleAll(!!checked)}
                          class="cursor-pointer" />
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
                      <Table.Row class={`${selectedMeta.id === meta.id ? 'bg-accent' : ''}`}>
                        {#if data.isMapShared}
                          <Table.Cell
                            class="w-[40px] cursor-pointer hover:bg-muted/50"
                            onclick={(e) => {
                              e.stopPropagation();
                              toggleMeta(meta.id, !selectedMetaIds.has(meta.id));
                            }}>
                            <Checkbox
                              checked={selectedMetaIds.has(meta.id)}
                              class="pointer-events-none" />
                          </Table.Cell>
                        {/if}
                        <Table.Cell
                          class="font-medium py-2 px-2 cursor-pointer hover:bg-muted/20"
                          onclick={() => selectMetaAndScroll(meta)}>
                          <div class="flex items-center justify-between w-full">
                            <span
                              class={`whitespace-normal break-words ${selectedMeta.id === meta.id ? 'font-semibold' : ''}`}>
                              {meta.name}
                            </span>
                            <div
                              class="flex items-center gap-1 text-xs text-muted-foreground ml-2 shrink-0">
                              <Icon icon="material-symbols:location-on" class="h-3 w-3" />
                              <span>{meta.locationsCount}</span>
                            </div>
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

        <div class="lg:w-3/4 overflow-hidden flex flex-col" bind:this={rightPanelRef}>
          <!-- Header Section -->
          <div
            class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <h1 class="text-2xl font-bold tracking-tight">{data.mapName}</h1>
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-muted-foreground"
                    >Meta List · {data.metaList.length} locations</span>
                  {#if data.mapAuthors}
                    <span class="text-muted-foreground">·</span>
                    <span class="text-muted-foreground"
                      >by <span class="text-foreground font-medium">{data.mapAuthors}</span></span>
                  {/if}
                </div>
              </div>
              <Button
                target="_blank"
                href={`https://www.geoguessr.com/maps/${data.mapGeoguessrId}`}
                class="shrink-0">
                <Icon icon="material-symbols:play-arrow" class="mr-2 h-4 w-4" />
                Play Map
              </Button>
            </div>
          </div>

          <!-- Meta Content Section -->
          <div class="flex-1 overflow-y-auto p-6">
            <div class="max-w-4xl mx-auto space-y-6">
              <!-- Meta Title -->
              <div class="flex items-center justify-between">
                <div class="min-w-0">
                  <h2 class="text-2xl font-bold tracking-tight">{selectedMeta.name}</h2>
                  {#if filteredMetaList.length > 1}
                    <div class="text-sm text-muted-foreground">
                      {currentMetaIndex + 1} of {filteredMetaList.length} metas
                    </div>
                  {/if}
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  <Tooltip
                    content="This meta has {selectedMeta.locationsCount} location{selectedMeta.locationsCount !==
                    1
                      ? 's'
                      : ''}">
                    <div class="flex items-center gap-1 text-sm text-muted-foreground cursor-help">
                      <Icon icon="material-symbols:location-on" class="h-4 w-4" />
                      <span>{selectedMeta.locationsCount}</span>
                    </div>
                  </Tooltip>
                  {#if filteredMetaList.length > 1}
                    <div class="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={navigateToPrevious}
                        class="p-2 h-10 w-10">
                        <ChevronLeft class="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={navigateToNext}
                        class="p-2 h-10 w-10">
                        <ChevronRight class="h-5 w-5" />
                      </Button>
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Meta Description -->
              {#if selectedMeta.note || selectedMeta.footer !== ''}
                <div class="prose prose-sm dark:prose-invert max-w-none">
                  <div class="rounded-lg border bg-muted/50 p-4 space-y-3">
                    {#if selectedMeta.note}
                      <div>
                        {@html selectedMeta.note}
                      </div>
                    {/if}
                    {#if selectedMeta.footer !== ''}
                      <div class="text-sm text-muted-foreground border-t pt-3">
                        {@html selectedMeta.footer}
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Images Section -->
              <div class="space-y-4">
                <div class="flex items-center gap-2">
                  <Icon icon="material-symbols:image" class="h-5 w-5 text-muted-foreground" />
                  <h3 class="text-lg font-semibold">Images</h3>
                  {#if selectedMeta.images.length > 0}
                    <span class="text-sm text-muted-foreground"
                      >({selectedMeta.images.length})</span>
                  {/if}
                </div>

                {#if selectedMeta.images.length > 0}
                  <div
                    class="grid gap-4 {selectedMeta.images.length === 1
                      ? 'grid-cols-1 max-w-2xl mx-auto'
                      : 'grid-cols-1 md:grid-cols-2'}">
                    {#each selectedMeta.images as url (url)}
                      <div class="group relative overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={url}
                          alt="Meta location"
                          class="w-full h-auto max-h-[300px] object-contain transition-transform group-hover:scale-[1.02]" />
                        <div
                          class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors">
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white p-2 rounded-md">
                          <Icon icon="material-symbols:open-in-new" class="h-4 w-4" />
                        </a>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="text-center py-12 text-muted-foreground">
                    <Icon
                      icon="material-symbols:image-not-supported-outline"
                      class="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No images available for this location</p>
                  </div>
                {/if}
              </div>
            </div>
          </div>
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
          <Select.Trigger class="w-[240px]">
            <span class="truncate">
              {selectedPersonalMapId
                ? data.personalMaps.find((m) => m.id.toString() === selectedPersonalMapId)?.name
                : 'Select a map'}
            </span>
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Your Personal Maps</Select.Label>
              {#each data.personalMaps as map (map.id)}
                <Select.Item value={map.id.toString()} label={map.name}>
                  <div class="flex items-center justify-between w-full">
                    <span class="truncate pr-2" title={map.name}>{map.name}</span>
                    <span class="text-xs text-muted-foreground">
                      {getMetaCountText(map.metasCount)}
                    </span>
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
            <p class="text-sm text-primary">These metas will be added to:</p>
            <p class="text-sm font-semibold text-primary mt-1 break-words">
              {selectedMap.name}
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
