<script lang="ts">
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { HelpCircle } from '@lucide/svelte';
  import * as Form from '$lib/components/ui/form/index';
  let { label, tooltipContent }: { label: string; tooltipContent: string } = $props();
</script>

<Tooltip content={tooltipContent} side="right" delayDuration={100} class="max-w-xs">
  <Form.Label>
    {label}
    <HelpCircle class="h-4 w-4" />
  </Form.Label>
</Tooltip>
