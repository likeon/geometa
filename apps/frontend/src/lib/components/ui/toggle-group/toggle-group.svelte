<script lang="ts" module>
  import { getContext, setContext } from 'svelte';
  import type { ToggleVariants } from '$lib/components/ui/toggle/index.js';

  type ToggleGroupCtx = ToggleVariants & {
    getAllowDeselect: () => boolean;
    getValue: () => string | string[] | undefined;
  };

  export function setToggleGroupCtx(props: ToggleGroupCtx) {
    setContext('toggleGroup', props);
  }

  export function getToggleGroupCtx() {
    return getContext<ToggleGroupCtx>('toggleGroup');
  }
</script>

<script lang="ts">
  import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils-ui.js';

  let {
    ref = $bindable(null),
    value = $bindable(),
    allowDeselect = true,
    class: className,
    size = 'default',
    variant = 'default',
    ...restProps
  }: ToggleGroupPrimitive.RootProps & ToggleVariants & { allowDeselect?: boolean } = $props();

  setToggleGroupCtx({
    variant,
    size,
    getAllowDeselect: () => allowDeselect,
    getValue: () => value
  });
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<ToggleGroupPrimitive.Root
  bind:value={value as never}
  bind:ref
  data-slot="toggle-group"
  data-variant={variant}
  data-size={size}
  class={cn(
    'group/toggle-group data-[variant=outline]:shadow-xs flex w-fit items-center rounded-md',
    className
  )}
  {...restProps} />
