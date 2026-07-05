<script lang="ts">
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import RaStarlineIcon from '~icons/ri/star-line';
</script>

<Tooltip content="You can add metas from this map to personal map!:)">
  <Badge
    class="bg-amber-500 text-amber-900 dark:bg-amber-400 dark:text-amber-950 font-semibold px-2.5 py-0.5 rounded-md">
    <RaStarlineIcon class="inline-block mr-1" />
    Shared
  </Badge>
</Tooltip>
