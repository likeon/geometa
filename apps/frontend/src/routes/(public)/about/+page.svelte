<script lang="ts">
  import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
  <title>About Learnable Meta</title>
  <meta name="description" content="Learn how Learnable Meta teaches GeoGuessr clues in context." />
</svelte:head>

<div class="container px-6 py-10 lg:px-8">
  <div class="mx-auto max-w-3xl text-base leading-7">
    <p class="font-semibold text-green-700">About Learnable Meta</p>
    <h1 class="mt-2">Learn GeoGuessr clues in context</h1>

    <p class="mt-4">
      Learnable Meta combines educational GeoGuessr maps with a browser userscript. After each
      guess, it explains the useful clue at that location so players can connect what they just saw
      with the country or region they were trying to identify.
    </p>
    <p class="mt-4">
      The maps cover landscapes, bollards, signs, road markings, Street View cars, and other clues
      that are easier to remember when they appear naturally during a game.
    </p>

    <div class="mt-8 flex flex-wrap gap-3">
      <Button href="/maps">Browse maps</Button>
      <Button variant="outline" href="https://docs.learnablemeta.com/getting-started/">
        Get started
      </Button>
    </div>

    <h2 class="mt-10">Open source and community</h2>
    <p class="mt-4">
      Learnable Meta is
      <a href="https://github.com/likeon/geometa" target="_blank" rel="noopener noreferrer"
        >open source on GitHub</a
      >. Questions and feedback are welcome in the
      <a href="https://discord.gg/AcXEWznYZe" target="_blank" rel="noopener noreferrer"
        >Learnable Meta Discord</a
      >.
    </p>

    <h2 class="mt-10">Credits</h2>
    <p class="mt-4"><strong>Map creator:</strong> trausi</p>
    <p><strong>Userscript creator:</strong> plurk</p>
    <p>Thanks to Bastu, Gelotris, and Micha for helping create the original map.</p>
    <p>
      <strong>Metas and some descriptions:</strong>
      <a href="https://www.plonkit.net/" target="_blank" rel="noopener noreferrer">Plonk It</a>
    </p>
  </div>
</div>
