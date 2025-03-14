<script lang="ts">
  import '../../app.css';
  import NavBar from '$lib/components/NavBar.svelte';
  import { env } from '$env/dynamic/public';

  let { children } = $props();
  const underMaintenance = env.PUBLIC_DASHBOARD_MAINTENANCE === 'true';
</script>

<div class="app">
  <NavBar admin={true} />
  <main>
    {#if underMaintenance}
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
</div>
