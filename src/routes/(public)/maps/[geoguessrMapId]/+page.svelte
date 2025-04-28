<script lang="ts">
  import { writable } from 'svelte/store';
  import background from '$lib/assets/background.jpg';
  import { Button } from '$lib/components/ui/button';
  import { fade } from 'svelte/transition';

  let { data } = $props();

  type Meta = {
    name: string;
    noteHtml: string;
    imageUrls: string[];
    footer: string;
  };

  const selectedMeta = writable<Meta | null>(null);

  let rightPanelRef: HTMLDivElement | undefined = $state();

  function selectMeta(meta: Meta) {
    selectedMeta.set(meta);
  }

  const dataPromise = Promise.all([data.map, data.mapMetaList]);

  // duplicate, fixme
  function getImageUrl(url: string): string {
    const geometa_storage_prefix = 'https://static.learnablemeta.com/';

    if (url.startsWith(geometa_storage_prefix)) {
      return `https://learnablemeta.com/cdn-cgi/image/format=avif,quality=80/${url}`;
    }

    return url;
  }
</script>

<svelte:head>
  <title>Meta List - {data.mapName}</title>
</svelte:head>

<div
  class="relative min-h-screen bg-cover bg-center"
  style="background-image: url({background}); background-attachment: fixed;">
  <div class="items-center mx-auto max-w-8xl px-3 py-2 h-screen">
    {#await dataPromise}
      <div
        class="mx-auto flex justify-center items-center bg-background shadow-lg rounded-lg w-full max-w-[1500px] lg:h-[calc(100vh-90px)] h-[calc(100vh-80px)]">
        <p>Loading map details...</p>
      </div>
    {:then [resolvedMap, resolvedMetaList]}
      {@const metaList: Meta[] = resolvedMetaList}
      {@const initialMeta = metaList[0]}
      {@const _ = selectedMeta.set(initialMeta)}

      <div
        in:fade
        class="mx-auto flex flex-col lg:flex-row bg-white dark:bg-black shadow-lg rounded-lg overflow-hidden w-full max-w-[1500px] lg:h-[calc(100vh-90px)] h-[calc(100vh-80px)]">
        <div
          class="lg:w-1/4 p-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900 rounded-t-lg lg:rounded-l-lg overflow-y-auto h-[130px] lg:h-full">
          <table class="table-auto w-full text-left">
            <tbody>
              {#each metaList as meta}
                <tr
                  class={`cursor-pointer hover:bg-gray-200 hover:dark:bg-gray-800 ${
                    $selectedMeta === meta ? 'bg-blue-100 dark:bg-green-900 font-semibold' : ''
                  }`}
                  onclick={() => {
                    selectMeta(meta);
                    if (rightPanelRef) rightPanelRef.scrollTop = 0;
                  }}>
                  <td class="py-2 px-4 text-sm">{meta.name}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="lg:w-3/4 p-4 overflow-y-auto h-full" bind:this={rightPanelRef}>
          <div class="flex w-full items-center mb-3">
            <h1 class="text-xl">Meta List - {data.mapName}</h1>
            {#if resolvedMap}
              <div class="ml-3">
                <Button
                  target="_blank"
                  href={`https://www.geoguessr.com/maps/${resolvedMap.geoguessrId}`}
                  >Play
                </Button>
              </div>
            {/if}
          </div>
          {#if $selectedMeta}
            <div>
              <h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100 text-center">
                {$selectedMeta.name}
              </h3>
              <div class="note mb-1 text-gray-700 dark:text-gray-300">
                {@html $selectedMeta.noteHtml}
              </div>
              {#if $selectedMeta.footer !== ''}
                <div
                  class="text-sm text-gray-500 break-words"
                  style="overflow-wrap: break-word; word-wrap: break-word; word-break: break-word;">
                  {@html $selectedMeta.footer}
                </div>
              {/if}

              <h4 class="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Images:</h4>
              {#if $selectedMeta.imageUrls.length > 0}
                <div
                  class={`grid gap-6 ${
                    $selectedMeta.imageUrls.length > 2
                      ? 'grid-cols-1 lg:grid-cols-2'
                      : 'grid-cols-1'
                  }`}>
                  {#each $selectedMeta.imageUrls as url}
                    <div
                      class="relative w-full flex justify-center items-center border-transparent"
                      style="height: auto; max-height: 400px;">
                      <img
                        src={getImageUrl(url)}
                        alt=""
                        class="max-h-full max-w-full object-contain" />
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="text-gray-500">No images available.</p>
              {/if}
            </div>
          {:else}
            <p class="text-gray-500 text-center">Select a meta from the list to view details.</p>
          {/if}
        </div>
      </div>
    {:catch error}
      <div
        class="mx-auto flex justify-center items-center bg-white dark:bg-black shadow-lg rounded-lg w-full max-w-[1500px] lg:h-[calc(100vh-90px)] h-[calc(100vh-80px)]">
        <p class="text-red-500">Error loading map details: {error.message}</p>
      </div>
    {/await}
  </div>
</div>

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
