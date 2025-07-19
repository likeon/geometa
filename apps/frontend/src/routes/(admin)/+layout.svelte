<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';

  let { children } = $props();
</script>

<Tooltip.Provider>
  <div class="container mt-3">
    {@render children?.()}
  </div>
</Tooltip.Provider>
