<script lang="ts">
  import Icon from '@iconify/svelte';

  interface BaseColumn {
    label: string;
    width?: string;
    searchable: boolean;
    sortable?: boolean;
    filterable?: boolean;
    type?: string;
    options?: string[];
    filterLogic?: (filter: string, item: any) => boolean;
  }

  interface LinkColumn extends BaseColumn {
    key: 'link';
    display: (item: any) => string; // required
  }

  interface RegularColumn extends BaseColumn {
    key: Exclude<string, 'link'>;
    display?: (item: any) => any;
  }

  type Column = LinkColumn | RegularColumn;

  interface Props {
    data: Array<any>;
    columns: Column[];
    searchText: string;
    selectedRowId: number;
    isModalOpen: boolean;
  }

  let {
    data,
    columns,
    searchText,
    selectedRowId = $bindable(),
    isModalOpen = $bindable()
  }: Props = $props();

  let selectedColumn: string = $state(columns[0]?.key || '');
  let sortOrder: number = $state(1);
  let sortArrow = $state('▼');
  let filters: Record<string, string> = $state(
    columns.reduce(
      (acc, column) => {
        if (column.options && column.options.length > 0) {
          acc[column.key] = column.options[0]; // Set the first option as the default value
        }
        return acc;
      },
      {} as Record<string, string>
    )
  );

  let filteredData = $derived(
    data
      .filter((item) => {
        // Apply text filter to each column
        const matchesText = columns
          .filter((column) => column.searchable) // Filter columns with searchable set to true
          .some((column) => item[column.key]?.toLowerCase().includes(searchText.toLowerCase())); // Check if any of the filtered columns match the search text

        // Apply column-specific filters
        const matchesColumnFilters = columns
          .filter((column) => column.filterable) // Only include filterable columns
          .every((column) => {
            const filter = filters[column.key];
            const logicFunction = column.filterLogic; // Get the logic function for the current column
            return logicFunction ? logicFunction(filter, item) : true; // Apply the logic if exists
          });

        return matchesText && matchesColumnFilters;
      })
      .sort((a, b) => {
        if (selectedColumn && columns.some((c) => c.key === selectedColumn)) {
          const valueA = a[selectedColumn];
          const valueB = b[selectedColumn];

          // Check if both values are numbers
          if (typeof valueA === 'number' && typeof valueB === 'number') {
            return (valueA - valueB) * sortOrder; // Numerical comparison
          } else if (typeof valueA === 'string' && typeof valueB === 'string') {
            return valueA.localeCompare(valueB) * sortOrder; // String comparison
          } else {
            // Optional: Handle cases where types differ
            return 0; // or you can define a specific behavior for mixed types
          }
        }
        return 0; // Default case if no selectedColumn is found
      })
  );

  function handleSort(columnKey: string) {
    if (selectedColumn === columnKey) {
      sortArrow = sortArrow === '▼' ? '▲' : '▼';
      sortOrder *= -1;
    } else {
      sortArrow = '▼';
      sortOrder = 1;
      selectedColumn = columnKey;
    }
  }
</script>

<div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mt-3">
  <table class="w-full table-fixed border-spacing-y-3 border-separate">
    <colgroup>
      {#each columns as column}
        <col style="width: {column.width || 'auto'}" />
      {/each}
    </colgroup>
    <thead class="bg-green-100">
      <tr>
        {#each columns as column}
          <th
            scope="col"
            class="table-header py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
            class:hover:bg-green-200={column.sortable}
            class:bg-blue-300={selectedColumn === column.key}
            class:cursor-pointer={column.sortable}
            onclick={() => column.sortable && handleSort(column.key)}>
            {#if !column.filterable}
              {column.label} {selectedColumn === column.key ? sortArrow : ''}
            {/if}
            {#if column.filterable && column.type === 'select'}
              <select class="custom-select" bind:value={filters[column.key]}>
                {#each column.options ?? [] as option}
                  <option value={option}>{option}</option>
                {/each}
              </select>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each filteredData as row (row.id)}
        <tr
          class="cursor-pointer hover:bg-green-200"
          role="link"
          onclick={() => {
            selectedRowId = row.id;
            isModalOpen = true;
          }}>
          {#each columns as column}
            <td>
              <!-- column.display check is pointless because type requires it, but typescript can't figure out the type correctly  -->
              {#if column.key === 'link' && column.display}
                <a
                  onclick={(event) => event.stopPropagation()}
                  href={column.display(row)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-500 hover:text-blue-700">
                  <Icon icon="mdi:link" class="ml-1 w-5 h-5 inline" />
                </a>
              {:else if column.display}
                {@const displayValue = column.display(row[column.key])}
                {#if typeof displayValue === 'boolean'}
                  {#if displayValue}
                    <Icon icon="ei:check" class="w-5 h-5" color="green" /> <!-- Display the icon -->
                  {/if}
                {:else}
                  {displayValue}
                  <!-- Display the value returned by the function if not boolean -->
                {/if}
              {:else}
                {row[column.key]}
                <!-- Directly display the value if column.display does not exist -->
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style lang="postcss">
  td {
    @apply pl-3;
  }

  th {
    @apply pl-3;
  }

  .table-header {
    @apply py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900;
    height: 55px;
    line-height: 25px;
    box-sizing: border-box;
    padding: 10px 16px;
  }

  .custom-select {
    width: 110px;
    font-size: 12px;
    padding: 4px;
    display: inline-block;
    margin-right: 10px;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
  }

  .custom-select:focus {
    outline: none;
    ring: 2px;
    ring-color: #3b82f6;
  }
</style>
