<script>
  import '../app.css';
  import NavBar from '$lib/components/NavBar.svelte';
  import { dev } from '$app/environment';
  import Footer from '$lib/components/Footer.svelte';
  import { page } from '$app/state';
  import { env } from '$env/dynamic/public';
  import { building } from '$app/environment';
  import { ModeWatcher } from 'mode-watcher';

  let { children } = $props();
  let admin = $derived(page.url.pathname.startsWith('/dev/dash'));
  const underMaintenance = !building && env.PUBLIC_DASHBOARD_MAINTENANCE === 'true';
</script>

<svelte:head>
  {#if !dev && !admin}
    <script async data-id="101468249" src="//static.getclicky.com/js"></script>
  {/if}
</svelte:head>

{#if dev}
  <ModeWatcher />
{/if}
<div class="app">
  <NavBar />
  <main>
    {#if underMaintenance && admin}
      <div class="bg-white px-6 py-24 sm:py-32 lg:px-8">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl">
            Under maintenance
          </h2>
          <p class="mt-8 text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">
            The dashboard is currently unavailable. Please check back later.
          </p>
        </div>
      </div>
    {:else}
      {@render children?.()}
    {/if}
  </main>
  <Footer />
</div>
