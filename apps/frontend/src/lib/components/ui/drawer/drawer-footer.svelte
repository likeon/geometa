<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils-ui.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="drawer-footer"
	class={cn("mt-auto flex flex-col gap-2", className)}
	{...restProps}
>
	{@render children?.()}
</div>
