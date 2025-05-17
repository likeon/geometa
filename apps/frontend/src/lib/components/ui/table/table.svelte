<script lang="ts">
	import type { HTMLTableAttributes } from "svelte/elements";
	import type { WithElementRef } from "bits-ui";
	import { cn } from "$lib/utils-ui.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLTableAttributes> = $props();
</script>

<div class="w-full relative ">
	<table bind:this={ref} class={cn("w-full caption-bottom text-sm ", className)} {...restProps}>
		{@render children?.()}
	</table>
</div>
