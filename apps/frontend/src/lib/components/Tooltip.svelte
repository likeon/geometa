<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip/index';

  let {
    children,
    content,
    side = 'top' as 'left' | 'right' | 'top' | 'bottom',
    delayDuration = 0,
    disableCloseOnTriggerClick = false,
    ...restProps
  } = $props();
</script>

<Tooltip.Root {delayDuration} {disableCloseOnTriggerClick}>
  <Tooltip.Trigger>
    {@render children()}
  </Tooltip.Trigger>
  <Tooltip.Content {side} {...restProps}>
    <p class="whitespace-pre-line">
      {content}
    </p>
  </Tooltip.Content>
</Tooltip.Root>
