<script>
  import '../../app.css';
  import NavBar from '$lib/components/NavBar.svelte';
  import { dev } from '$app/environment';
  import Footer from '$lib/components/Footer.svelte';

  let { children } = $props();
</script>

<svelte:head>
  {#if !dev}
    <script async data-id="101468249" src="//static.getclicky.com/js"></script>
  {/if}
</svelte:head>

<div class="app">
  <NavBar admin={false} />
  <main>
    {@render children?.()}
  </main>
  <Footer />
</div>
