<script lang="ts">
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import VirtualizedTable from '$lib/components/VirtualizedTable.svelte';
  import { columns } from './columns';
  import * as Select from '$lib/components/ui/select';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Chart from '$lib/components/ui/chart';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { BarChart } from 'layerchart';

  let { data } = $props();

  let selectedPeriod = $state(data.selectedPeriod || '30');
  let summaryData = $state(data.summaryData);
  let combinedStats = $state(data.combinedStats);
  let statsUnavailable = $state(data.statsUnavailable);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let selectedMeta = $state<any>(null);
  let dialogOpen = $state(false);

  const periodOptions = [
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days' },
    { value: '180', label: '180 days' },
    { value: '360', label: '360 days' }
  ];

  function handlePeriodChange() {
    const url = new URL($page.url);
    url.searchParams.set('days', selectedPeriod);
    const resolvedPath = `/map-making/groups/${String(data.group.id)}/stats`;
    goto(resolvedPath + url.search);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleRowClick(row: any) {
    selectedMeta = row;
    dialogOpen = true;
  }

  // Update selectedPeriod when data changes (e.g., on navigation)
  $effect(() => {
    selectedPeriod = data.selectedPeriod || '30';
    summaryData = data.summaryData;
    combinedStats = data.combinedStats;
    statsUnavailable = data.statsUnavailable;
  });

  // Chart configuration
  const chartConfig = {
    personalMapCount: {
      label: 'Personal Maps',
      color: '#2563eb'
    },
    regularMapCount: {
      label: 'Regular Maps',
      color: '#10b981'
    }
  };

  // Transform daily data for chart
  let chartData = $derived(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedMeta?.dailyData?.map((day: any) => ({
      date: new Date(day.day).toLocaleDateString(),
      personalMapCount: day.personalMapCount,
      regularMapCount: day.regularMapCount
    })) || []
  );

  // Transform combined stats for chart
  let combinedChartData = $derived(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    combinedStats?.map((day: any) => ({
      date: new Date(day.day).toLocaleDateString(),
      personalMapCount: day.personalMapCount,
      regularMapCount: day.regularMapCount
    })) || []
  );
</script>

<svelte:head>
  <title>Stats - {data.group.name}</title>
</svelte:head>

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name}></DashNavBar>

  <div class="flex items-center justify-between mb-4">
    <h1 class="text-2xl font-semibold">Meta Request Statistics</h1>

    <div class="flex items-center gap-3">
      <span class="text-sm text-muted-foreground">Time period:</span>
      <Select.Root type="single" bind:value={selectedPeriod} onValueChange={handlePeriodChange}>
        <Select.Trigger class="w-32">
          {periodOptions.find((opt) => opt.value === selectedPeriod)?.label || 'Select period'}
        </Select.Trigger>
        <Select.Content>
          {#each periodOptions as option (option.value)}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  {#if statsUnavailable}
    <div class="bg-blue-50 border border-blue-200 rounded-md p-8 text-center">
      <h2 class="text-lg font-semibold text-blue-900 mb-2">Statistics Temporarily Unavailable</h2>
      <p class="text-blue-800">
        Statistics are temporarily unavailable but will be added back soon.
      </p>
    </div>
  {:else if combinedChartData.length > 0}
    <div class="mb-6 p-4 border rounded-lg">
      <h2 class="text-lg font-semibold mb-3">Combined Daily Usage</h2>
      <div class="h-64">
        <Chart.Container config={chartConfig} class="pl-8 h-full w-full">
          <BarChart
            data={combinedChartData}
            x="date"
            seriesLayout="stack"
            series={[
              {
                key: 'personalMapCount',
                label: chartConfig.personalMapCount.label,
                color: chartConfig.personalMapCount.color
              },
              {
                key: 'regularMapCount',
                label: chartConfig.regularMapCount.label,
                color: chartConfig.regularMapCount.color
              }
            ]}>
            {#snippet tooltip()}
              <Chart.Tooltip />
            {/snippet}
          </BarChart>
        </Chart.Container>
      </div>
    </div>
  {/if}

  {#if !statsUnavailable}
    {#if summaryData.length === 0}
      <div class="text-center py-8">
        <p class="text-muted-foreground">No data found for the selected period.</p>
      </div>
    {:else}
      <VirtualizedTable
        data={summaryData}
        {columns}
        initialSorting={[{ id: 'totalCount', desc: true }]}
        searchColumnId="metaName"
        searchPlaceholder="Filter by meta name"
        getRowId={(row) => row.metaId}
        onRowClick={handleRowClick} />
    {/if}
  {/if}
</div>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="max-w-4xl">
    <Dialog.Header>
      <Dialog.Title>Daily Usage for {selectedMeta?.metaName}</Dialog.Title>
      <Dialog.Description>Meta statistics per day for the selected period</Dialog.Description>
    </Dialog.Header>

    {#if chartData.length > 0}
      <div class="mt-4 h-96">
        <Chart.Container config={chartConfig}>
          <BarChart
            data={chartData}
            x="date"
            seriesLayout="stack"
            series={[
              {
                key: 'personalMapCount',
                label: chartConfig.personalMapCount.label,
                color: chartConfig.personalMapCount.color
              },
              {
                key: 'regularMapCount',
                label: chartConfig.regularMapCount.label,
                color: chartConfig.regularMapCount.color
              }
            ]}>
            {#snippet tooltip()}
              <Chart.Tooltip />
            {/snippet}
          </BarChart>
        </Chart.Container>
      </div>
    {:else}
      <div class="mt-4 text-center text-muted-foreground">
        No daily data available for this meta
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
