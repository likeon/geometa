<script>
  import '../../app.css';
  import NavBar from '$lib/components/NavBar.svelte';
  /**
   * @typedef {Object} Props
   * @property {import('svelte').Snippet} [children]
   */

  /** @type {Props} */
  let { children } = $props();
</script>

<div class="app">
  <NavBar admin={true} />
  <main>
    {@render children?.()}
  </main>
</div>
