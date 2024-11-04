<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { PageData } from './$types';
  interface Props {
    metas: PageData['group']['metas'];
    searchText: string;
    levelNames: any;
    selectedMetaId: number;
    isMetaModalOpen: boolean;
  }

  let {
    metas,
    levelNames,
    searchText,
    selectedMetaId = $bindable(),
    isMetaModalOpen = $bindable()
  }: Props = $props();
  let noteFilter = $state('all');
  let imageFilter = $state('all');
  let levelFilter = $state('all');
  let selectedHeader = $state('tag');
  let sortModifier = $state(1);
  let sortArrow = $state('▼');

  let filteredMetas = $derived(
    metas
      .filter((item) => {
        // Apply text filter
        const matchesSearchText =
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.tagName.toLowerCase().includes(searchText.toLowerCase());

        // Apply note filter ('all', 'missing', 'has')
        const matchesNoteCondition =
          noteFilter == 'all' ||
          (noteFilter == 'hasNote' && item.note != '') ||
          (noteFilter == 'missingNote' && item.note == '');

        // Apply image filter ('all', 'missing', 'has')
        const matchesImageCondition =
          imageFilter == 'all' ||
          (imageFilter == 'hasImage' && item.images.length != 0) ||
          (imageFilter == 'missingImage' && !item.images.length);

        const matchesLevelCondition =
          levelFilter == 'all' ||
          item.metaLevels.some((metaLevel) => metaLevel.level.name == levelFilter);

        return (
          matchesSearchText &&
          matchesNoteCondition &&
          matchesImageCondition &&
          matchesLevelCondition
        );
      })
      .sort((a, b) => {
        if (selectedHeader === 'level') {
          // Primary sort by the count of metaLevels
          const levelCountDiff = (a.metaLevels.length - b.metaLevels.length) * sortModifier;
          if (levelCountDiff !== 0) return levelCountDiff;

          // Secondary sort by the first level name if counts are the same
          const firstLevelA = a.metaLevels[0]?.level.name || '';
          const firstLevelB = b.metaLevels[0]?.level.name || '';
          return firstLevelA.localeCompare(firstLevelB) * sortModifier;
        } else if (selectedHeader == 'tag') {
          return a.tagName.localeCompare(b.tagName) * sortModifier;
        } else if (selectedHeader == 'name') {
          return a.name.localeCompare(b.name) * sortModifier;
        } else if (selectedHeader == 'locations') {
          return (Number(a.locationsCount) - Number(b.locationsCount)) * sortModifier;
        }
        return 0;
      })
  );

  function selectHeader(header: string) {
    if (selectedHeader == header) {
      sortArrow = sortArrow == '▼' ? '▲' : '▼';
      sortModifier *= -1;
    }
    selectedHeader = header;
  }
</script>

<div class="mt-3 flow-root">
  <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
    <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
      <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table class="w-full table-fixed border-spacing-y-3 border-separate">
          <colgroup>
            <col class="w-1/4" />
            <col class="w-1/4" />
            <col class="w-1/12" />
            <col class="w-5/36" />
            <col class="w-5/36" />
            <col class="w-5/36" />
          </colgroup>
          <thead class="bg-green-100">
            <tr>
              <th
                scope="col"
                class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer hover:bg-green-200"
                class:hover:bg-green-200={selectedHeader !== 'tag'}
                class:bg-blue-300={selectedHeader === 'tag'}
                onclick={() => selectHeader('tag')}>
                Tag name {selectedHeader === 'tag' ? sortArrow : ''}
              </th>
              <th
                scope="col"
                class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                class:bg-blue-300={selectedHeader === 'name'}
                class:hover:bg-green-200={selectedHeader !== 'name'}
                onclick={() => selectHeader('name')}>
                Name {selectedHeader === 'name' ? sortArrow : ''}
              </th>
              <th
                scope="col"
                class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                class:bg-blue-300={selectedHeader === 'locations'}
                class:hover:bg-green-200={selectedHeader !== 'locations'}
                onclick={() => selectHeader('locations')}>
                Locations {selectedHeader === 'locations' ? sortArrow : ''}
              </th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                <select
                  class="border-gray-300 rounded focus:ring-2 focus:ring-primary-500 custom-select"
                  bind:value={noteFilter}>
                  <option value="all">Any Note</option>
                  <option value="hasNote">Has Note</option>
                  <option value="missingNote">Missing Note</option>
                </select>
              </th>

              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                <select
                  class="border-gray-300 rounded focus:ring-2 focus:ring-primary-500 custom-select"
                  bind:value={imageFilter}>
                  <option value="all">Any Image</option>
                  <option value="hasImage">Has Image</option>
                  <option value="missingImage">Missing Image</option>
                </select>
              </th>
              <th
                scope="col"
                class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-green-200"
                class:hover:bg-green-200={selectedHeader !== 'level'}
                class:bg-blue-300={selectedHeader === 'level'}
                onclick={() => selectHeader('level')}>
                <select
                  class="border-gray-300 rounded focus:ring-2 focus:ring-primary-500 custom-select"
                  bind:value={levelFilter}
                  onclick={(event) => event.stopPropagation()}>
                  <option value="all">All Levels</option>
                  {#each levelNames as levelName}
                    <option value={levelName}>{levelName}</option>
                  {/each}
                </select>
                {selectedHeader === 'level' ? sortArrow : ''}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-400">
            {#each filteredMetas as meta (meta.id)}
              <tr
                class="cursor-pointer hover:bg-green-200"
                role="link"
                onclick={() => {
                  isMetaModalOpen = true;
                  selectedMetaId = meta.id;
                }}>
                <td>{meta.tagName}</td>
                <td>{meta.name}</td>
                <td>
                  {meta.locationsCount}
                </td>
                <td>
                  {#if meta.note}
                    <Icon icon="ei:check" class="w-5 h-5" color="green" />
                  {/if}
                </td>
                <td>
                  {#if meta.images.length}
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

  .custom-select {
    width: 110px;
    font-size: 12px;
    padding: 4px;
    display: inline-block;
    margin-right: 10px;
  }
</style>
