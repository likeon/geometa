<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip/index';
  import { HelpCircle } from '@lucide/svelte';
  import * as Form from '$lib/components/ui/form/index';
  let { label, tooltipContent } = $props();
</script>

<Tooltip.Root delayDuration={100}>
  <Tooltip.Trigger>
    <Form.Label>
      {label}
      <HelpCircle class="h-4 w-4" />
    </Form.Label>
  </Tooltip.Trigger>
  <Tooltip.Content side="right">
    <p class="whitespace-pre-line max-w-xs">
      {tooltipContent}
    </p>
  </Tooltip.Content>
</Tooltip.Root>
