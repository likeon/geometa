<script lang="ts">
  import { page } from '$app/state';
  import { type PrimitiveAnchorAttributes, cn } from '$lib/utils-ui';

  let {
    open = $bindable(false),
    href,
    class: className,
    children,
    ...restProps
  }: PrimitiveAnchorAttributes & { open: boolean } = $props();

  function handleClick() {
    open = false;
  }
</script>

<a
  {href}
  class={cn(
    'text-[1.15rem] pl-4 py-3 rounded-md transition-colors',
    page.url.pathname.endsWith(href)
      ? 'bg-gradient-to-r from-green-900 to-sky-900 text-white'
      : 'text-foreground/80 hover:text-foreground hover:bg-accent',
    className
  )}
  onclick={handleClick}
  {...restProps}>
  {@render children?.()}
</a>
