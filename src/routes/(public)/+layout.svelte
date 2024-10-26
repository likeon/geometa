<script>
  import '../../app.css';
  import NavBar from '$lib/components/NavBar.svelte';
  import { dev } from '$app/environment';
  /**
   * @typedef {Object} Props
   * @property {import('svelte').Snippet} [children]
   */

  /** @type {Props} */
  let { children } = $props();
</script>

<svelte:head>
  {#if !dev}
    <script
      defer
      src="https://cloud.umami.is/script.js"
      data-website-id="3cb09286-f8f9-43c8-85ee-8df2b972c113"></script>
  {/if}
</svelte:head>

<div class="app">
  <NavBar admin={false} />
  <main>
    {@render children?.()}
  </main>
</div>
