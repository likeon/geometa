<script>
  import * as Tooltip from '$lib/components/ui/tooltip/index';

  let { children, content, side = 'top', delayDuration = 0, ...restProps } = $props();
</script>

<Tooltip.Root {delayDuration}>
  <Tooltip.Trigger>
    {@render children()}
  </Tooltip.Trigger>
  <Tooltip.Content {side} {...restProps}>
    <p class="whitespace-pre-line">
      {content}
    </p>
  </Tooltip.Content>
</Tooltip.Root>
