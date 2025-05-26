<script lang="ts">
  import background from '$lib/assets/background.jpg';
  import { Button } from '$lib/components/ui/button';
  import { fade } from 'svelte/transition';
  import type { PageProps } from './$types';
  import { enhance } from '$app/forms';
  import { SvelteSet } from 'svelte/reactivity';
  import { Label, Modal, Select } from 'flowbite-svelte';
  import DismissibleAlert from '$lib/components/DismissibleAlert.svelte';

  let { data }: PageProps = $props();
  let showNotLoggedInAlert = $state(false);
  let showNoPersonalMapsAlert = $state(false);
  let showAddedMetasAlert = $state(false);
  let showErrorAlert = $state(false);

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
  let personalMapChoiceModalOpen = $state(false);
  let confirmAdding = $state(false);

  function toggleMeta(id: number, checked: boolean) {
    if (checked) {
      selectedMetaIds.add(id);
    } else {
      selectedMetaIds.delete(id);
    }
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      for (const id of data.metaList.map((m) => m.id)) {
        selectedMetaIds.add(id);
      }
    } else {
      selectedMetaIds.clear();
    }
    selectAll = checked;
  }

  let modalResolve: ((value: boolean) => void) | null = null;

  function openModal(): Promise<boolean> {
    personalMapChoiceModalOpen = true;
    return new Promise((resolve) => {
      modalResolve = resolve;
    });
  }
  let selectedPersonalMapId: number | null = $state(null);
</script>

{#snippet errorAlert()}
  There was an error, try again later.
{/snippet}

{#snippet notLoggedInAlert()}
  You are not logged in, you can login with discord
  <a
    href="/dev/dash/personal"
    class="font-semibold underline hover:text-blue-800 dark:hover:text-blue-900">here</a>
  and create your personal map.
{/snippet}

{#snippet noPersonalMapAlert()}
  You don't have any personal maps, you can do it
  <a
    href="/dev/dash/personal"
    class="font-semibold underline hover:text-blue-800 dark:hover:text-blue-900">here</a
  >.
{/snippet}

{#snippet addedMetasAlert()}
  <p>You added {selectedMetaIds.size} meta(s) to your personal map!</p>
  <p>
    Click
    <a
      target="_blank"
      href={`/dev/dash/personal/${selectedPersonalMapId}`}
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
      class="mx-auto flex flex-col lg:flex-row bg-white dark:bg-black shadow-lg rounded-lg overflow-hidden w-full max-w-[1500px] lg:h-[calc(100vh-90px)] h-[calc(100vh-80px)]">
      <div
        class="lg:w-1/4 p-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900 rounded-t-lg lg:rounded-l-lg h-[130px] lg:h-full">
        <DismissibleAlert color="red" bind:showAlert={showErrorAlert} alertText={errorAlert} />
        <DismissibleAlert bind:showAlert={showNotLoggedInAlert} alertText={notLoggedInAlert} />
        <DismissibleAlert bind:showAlert={showNoPersonalMapsAlert} alertText={noPersonalMapAlert} />
        <DismissibleAlert bind:showAlert={showAddedMetasAlert} alertText={addedMetasAlert} />

        <div class="grid grid-rows-[auto_1fr_auto] h-full">
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
                  // if there is no personal map selected, select first one from list
                  if (!selectedPersonalMapId) {
                    selectedPersonalMapId = data.personalMaps[0].id;
                  }
                  confirmAdding = await openModal();
                } else {
                  selectedPersonalMapId = data.personalMaps[0].id;
                  confirmAdding = confirm(
                    `Are you sure you wanna add ${selectedMetaIds.size} meta(s) to your personal map?`
                  );
                }

                if (!confirmAdding) {
                  cancel();
                }
                selectedMetaIds.forEach((id) => {
                  formData.append('id', `${id}`);
                });
                formData.append('mapId', `${selectedPersonalMapId}`);

                return async ({ update, result }) => {
                  if (result.status !== 200) {
                    showErrorAlert = true;
                    return;
                  }
                  showAddedMetasAlert = true;
                  update();
                };
              }}>
              <button
                type="submit"
                class="w-full text-left px-2 py-1.5 bg-green-600 text-white font-semibold rounded hover:bg-green-700 active:bg-red-800 transition-colors shadow-sm">
                Add to personal map
              </button>
            </form>
          {/if}
          <div class="mb-2 text-right overflow-y-auto">
            <table class="table-auto w-full text-left">
              {#if data.isMapShared}
                <thead>
                  <tr>
                    <th
                      class="px-2 w-8 text-center align-middle cursor-pointer"
                      onclick={() => {
                        toggleAll(!selectAll);
                      }}>
                      <input
                        type="checkbox"
                        bind:checked={selectAll}
                        onclick={(event) => event.stopPropagation()}
                        onchange={() => toggleAll(selectAll)} />
                    </th>
                    <th class="px-2">Select all</th>
                  </tr>
                </thead>
              {/if}
              <tbody>
                {#each data.metaList as meta (meta.id)}
                  <tr
                    class={`hover:bg-gray-200 hover:dark:bg-gray-800 ${
                      selectedMeta.id === meta.id
                        ? 'bg-blue-100 dark:bg-green-900 font-semibold'
                        : ''
                    }`}>
                    {#if data.isMapShared}
                      <td
                        class="px-2 w-8 text-center align-middle cursor-pointer"
                        onclick={() => toggleMeta(meta.id, !selectedMetaIds.has(meta.id))}>
                        <label class="flex justify-center items-center h-full w-full">
                          <input
                            type="checkbox"
                            class="cursor-pointer"
                            checked={selectedMetaIds.has(meta.id)}
                            onclick={(event) => event.stopPropagation()}
                            onchange={(e) => toggleMeta(meta.id, e.currentTarget.checked)} />
                        </label>
                      </td>
                    {/if}
                    <td
                      class="py-2 px-2 text-sm cursor-pointer"
                      onclick={() => {
                        selectedMeta = meta;
                        if (rightPanelRef) rightPanelRef.scrollTop = 0;
                      }}>
                      {`${meta.name} (${meta.locationsCount})`}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
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
          <h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100 text-center">
            {selectedMeta.name}
          </h3>
          <div class="note mb-1 text-gray-700 dark:text-gray-300">
            {@html selectedMeta.note}
          </div>
          {#if selectedMeta.footer !== ''}
            <div
              class="text-sm text-gray-500 break-words"
              style="overflow-wrap: break-word; word-wrap: break-word; word-break: break-word;">
              {@html selectedMeta.footer}
            </div>
          {/if}

          <h4 class="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Images:</h4>
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
            <p class="text-gray-500">No images available.</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<Modal title="Choose personal map" bind:open={personalMapChoiceModalOpen}>
  <Label>
    Select personal map you wanna add metas to
    <Select bind:value={selectedPersonalMapId}>
      {#each data.personalMaps as map (map.id)}
        <option value={map.id}>{map.name}</option>
      {/each}
    </Select>
  </Label>
  <div class="mt-4 flex justify-between">
    <Button
      color="green"
      onclick={() => {
        personalMapChoiceModalOpen = false;
        modalResolve?.(true);
      }}
      >Add
    </Button>
    <Button
      color="red"
      onclick={() => {
        personalMapChoiceModalOpen = false;
        modalResolve?.(false);
      }}
      >Cancel
    </Button>
  </div>
</Modal>

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
