<script>
  import '../app.css';
  import NavBar from '$lib/components/NavBar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { page } from '$app/state';
  import { env } from '$env/dynamic/public';
  import { building } from '$app/environment';
  import { ModeWatcher } from 'mode-watcher';
  import { updated } from '$app/state';
  import * as Tooltip from '$lib/components/ui/tooltip/index';
  // import AnnouncementBanner from '$lib/components/AnnouncementBanner.svelte';

  let { children } = $props();
  let admin = $derived(page.url.pathname.startsWith('/map-making'));
  const underMaintenance = !building && env.PUBLIC_DASHBOARD_MAINTENANCE === 'true';
</script>

<ModeWatcher />
<Tooltip.Provider>
  <div class="app" data-sveltekit-reload={updated.current}>
    <!-- <AnnouncementBanner /> -->
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
</Tooltip.Provider>
