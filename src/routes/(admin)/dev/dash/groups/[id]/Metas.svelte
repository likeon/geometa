<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { PageData } from './$types';
  export let filteredMetas: PageData['group']['metas'];
  export let selectMeta;
  export let selectHeader;
  export let selectedHeader;
  export let sortArrow;
</script>

<div class="mt-3 flow-root">
  <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
    <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
      <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table class="w-full table-fixed border-spacing-y-3 border-separate">
          <colgroup>
            <col class="w-1/3" />
            <col class="w-1/3" />
            <col class="w-1/6" />
            <col class="w-1/6" />
            <col class="w-1/6" />
          </colgroup>
          <thead class="bg-green-100">
            <tr>
              <th
                scope="col"
                class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer hover:bg-green-200"
                class:hover:bg-green-200={selectedHeader !== 'tag'}
                class:bg-blue-300={selectedHeader === 'tag'}
                on:click={() => selectHeader('tag')}
              >
                Tag name {selectedHeader === 'tag' ? sortArrow : ''}
              </th>
              <th
                scope="col"
                class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                class:bg-blue-300={selectedHeader === 'name'}
                class:hover:bg-green-200={selectedHeader !== 'name'}
                on:click={() => selectHeader('name')}
              >
                Name {selectedHeader === 'name' ? sortArrow : ''}
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                From Plonkit
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Has image
              </th>
              <th
                scope="col"
                class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-green-200"
                class:hover:bg-green-200={selectedHeader !== 'level'}
                class:bg-blue-300={selectedHeader === 'level'}
                on:click={() => selectHeader('level')}
              >
                Level {selectedHeader === 'level' ? sortArrow : ''}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-400">
            {#each filteredMetas as meta (meta.id)}
              <tr
                class="cursor-pointer hover:bg-green-200"
                role="link"
                on:click={() => selectMeta(meta)}
              >
                <td>{meta.tagName}</td>
                <td>{meta.name}</td>
                <td>
                  {#if meta.noteFromPlonkit}
                    <Icon icon="ei:check" class="w-5 h-5" color="green" />
                  {/if}
                </td>
                <td>
                  {#if meta.hasImage}
                    <Icon icon="ei:check" class="w-5 h-5" color="green" />
                  {/if}
                </td>
                <td>
                  {#each meta.metaLevels as metaLevel, i}
                    {#if i !== 0},{/if}{metaLevel.level.name}
                  {/each}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  td {
    @apply pl-3;
  }

  th {
    @apply pl-3;
  }
</style>
