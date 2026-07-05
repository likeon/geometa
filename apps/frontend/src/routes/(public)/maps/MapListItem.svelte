<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import CliListIcon from '~icons/cil/list';
  import MapSharedBadge from './MapSharedBadge.svelte';
  import MapStatBadges from './MapStatBadges.svelte';
  import type { PageData } from './$types';

  let {
    map
  }: {
    map: Awaited<PageData['allMaps']>[number];
  } = $props();
</script>

<Card.Root class="py-0">
  <div class="flex min-h-12 flex-col gap-2 px-3 py-2 lg:flex-row lg:items-center">
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold">
        {map.name}
        <span class="font-normal text-muted-foreground">by {map.authors}</span>
      </p>
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-2">
      {#if map.isShared}
        <MapSharedBadge />
      {/if}
      <MapStatBadges {map} />
    </div>

    <div class="flex shrink-0 gap-2">
      <Button size="sm" href={'https://www.geoguessr.com/maps/' + map.geoguessrId} target="_blank">
        Play
      </Button>
      <Button variant="outline" size="sm" href={'/maps/' + map.geoguessrId} target="_blank">
        <CliListIcon />
        Meta List
      </Button>
    </div>
  </div>
</Card.Root>
