<script>
  import '../../app.css';
  import NavBar from '$lib/components/NavBar.svelte';
</script>

<div class="app">
  <NavBar admin={true} />
  <main>
    <slot />
  </main>
</div>
