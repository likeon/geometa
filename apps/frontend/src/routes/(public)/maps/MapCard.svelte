<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import CliListIcon from '~icons/cil/list';
  import type { PageData } from './$types';
  import MapBadges from './MapBadges.svelte';

  let {
    map
  }: {
    map: Awaited<PageData['allMaps']>[number];
  } = $props();
</script>

<Card.Root class="flex flex-col">
  <Card.Header>
    <MapBadges {map} split class="pb-2" />
    <Card.Title>{map.name}</Card.Title>
    <Card.Description>by <strong>{map.authors}</strong></Card.Description>
  </Card.Header>
  <Card.Content class="pt-0 flex flex-col h-full">
    <p
      class="mt-6 text-base text-gray-600 dark:text-gray-300 whitespace-pre-line leading-snug break-words grow">
      {map.description}
    </p>
    <div class="mt-7 flex gap-4">
      <!-- Play Button -->
      <Button
        class="flex-1"
        href={'https://www.geoguessr.com/maps/' + map.geoguessrId}
        target="_blank">
        Play
      </Button>
      <!-- Meta List Button -->
      <Button variant="outline" class="flex-1" href={'/maps/' + map.geoguessrId} target="_blank">
        <CliListIcon class="inline-block mr-1" />
        Meta List
      </Button>
    </div>
  </Card.Content>
</Card.Root>
