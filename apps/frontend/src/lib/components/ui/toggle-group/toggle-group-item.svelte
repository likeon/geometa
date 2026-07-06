<script lang="ts">
  import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
  import { getToggleGroupCtx } from './toggle-group.svelte';
  import { cn } from '$lib/utils-ui.js';
  import { type ToggleVariants, toggleVariants } from '$lib/components/ui/toggle/index.js';

  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    size,
    variant,
    ...restProps
  }: ToggleGroupPrimitive.ItemProps & ToggleVariants = $props();

  const ctx = getToggleGroupCtx();

  function isSelected() {
    const groupValue = ctx.getValue();
    return Array.isArray(groupValue) ? groupValue.includes(value) : groupValue === value;
  }

  function preventDeselect(event: MouseEvent | KeyboardEvent) {
    if (ctx.getAllowDeselect() || !isSelected()) return;

    if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    event.stopImmediatePropagation();
  }
</script>

<ToggleGroupPrimitive.Item
  bind:ref
  onclickcapture={preventDeselect}
  onkeydowncapture={preventDeselect}
  data-slot="toggle-group-item"
  data-variant={ctx.variant || variant}
  data-size={ctx.size || size}
  class={cn(
    toggleVariants({
      variant: ctx.variant || variant,
      size: ctx.size || size
    }),
    'min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l',
    className
  )}
  {value}
  {...restProps} />
