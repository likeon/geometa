<script>
	import '../app.css';
	import NavBar from '$lib/components/NavBar.svelte';
</script>

<div class="app">
	<NavBar />
	<main>
		<slot />
	</main>
</div>
