<script>
	import '../app.css';
	import NavBar from '$lib/components/NavBar.svelte';
</script>

<div class="app">
	<NavBar />
	<main class="mt-[70px]">
		<slot />
	</main>
</div>
