<script lang="ts">
	import type { HTMLOlAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils-ui.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLOlAttributes> = $props();
</script>

<ol
	bind:this={ref}
	data-slot="breadcrumb-list"
	class={cn(
		"text-muted-foreground flex flex-wrap items-center gap-1.5 break-words text-sm sm:gap-2.5",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</ol>
