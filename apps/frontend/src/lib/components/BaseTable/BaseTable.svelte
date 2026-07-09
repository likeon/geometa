<script lang="ts" generics="TData extends { id: number }, TValue">
  import { type ColumnDef, type SortingState } from '@tanstack/table-core';
  import { FlexRender } from '$lib/components/ui/data-table/index.js';
  import { createBaseTable } from '$lib/components/BaseTable/create-table.svelte';
  import * as Table from '$lib/components/ui/table/index.js';

  type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    initialSorting?: SortingState;
    selectedId?: number;
    selectedIds?: number[];
    isDialogOpen?: boolean;
    emptyText?: string;
  };

  const defaultSorting: SortingState = [];
  let {
    data,
    columns,
    initialSorting = defaultSorting,
    selectedId = $bindable(),
    isDialogOpen = $bindable(),
    emptyText = 'No results.'
  }: DataTableProps<TData, TValue> = $props();

  const table = createBaseTable({
    data: () => data,
    columns: () => columns,
    initialSorting: () => initialSorting
  });
</script>

<div class="rounded-md">
  <Table.Root>
    <Table.Header>
      {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
        <Table.Row>
          {#each headerGroup.headers as header (header.id)}
            <Table.Head>
              {#if !header.isPlaceholder}
                <FlexRender
                  content={header.column.columnDef.header}
                  context={header.getContext()} />
              {/if}
            </Table.Head>
          {/each}
        </Table.Row>
      {/each}
    </Table.Header>
    <Table.Body>
      {#each table.getRowModel().rows as row (row.id)}
        <Table.Row
          data-state={row.getIsSelected() && 'selected'}
          onclick={() => {
            selectedId = row.original.id;
            isDialogOpen = true;
          }}>
          {#each row.getVisibleCells() as cell (cell.id)}
            <Table.Cell class={cell.column.columnDef.meta?.class}>
              <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
            </Table.Cell>
          {/each}
        </Table.Row>
      {:else}
        <Table.Row>
          <Table.Cell colspan={columns.length} class="h-24 text-center">{emptyText}</Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</div>
