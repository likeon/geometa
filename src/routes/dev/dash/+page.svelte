<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>Maps</title>
</svelte:head>

<ul>
	{#each data.maps as map}
		<li>
			<a href="/dev/dash/maps/{map.id}">{map.name}</a>
		</li>
	{/each}
</ul>