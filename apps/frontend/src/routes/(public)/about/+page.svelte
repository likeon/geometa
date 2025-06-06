<script>
  import Icon from '@iconify/svelte';
  import geoPin from '$lib/assets/GeoGuessr-Pin.png?enhanced';
</script>

<svelte:head>
  <title>How To</title>
</svelte:head>

<div id="content" class="container px-6 py-10 lg:px-8">
  <div class="mx-auto max-w-3xl text-base leading-7">
    <div class="main-content">
      <p class="text-base font-semibold leading-7 text-green-700">Introducing</p>
      <h1>A Learnable Meta World maps</h1>
      <p>
        When someone wants to improve at GeoGuessr, they often try to memorize lists of bollards,
        signs, Google cars, and other clues. This can be quite overwhelming because there are so
        many different details to remember. I tried teaching my friends some of these "metas" by
        playing the world map with them and pointing out specific clues, but by the time those clues
        appeared again, they had already forgotten them. To help with this, I created several maps
        that highlight the most common "metas" - anything from landscapes, bollards, and signs to
        unique Google Street View cars that are useful to learn at the beginning.
      </p>
      <p>
        While there might be other maps like this available, ours include a script that shows a note
        about the location after you make your guess in GeoGuessr, explaining each round and
        highlighting the clues you might have missed that could help you identify the country. The
        map is designed for No Move because it's skill itself to find clues and it's good habbit to
        learn to check google car, poles, roadlines etc.
      </p>
      <p></p>
      <div class="flex flex-col items-center justify-center text-center">
        <div class="flex items-center space-x-2">
          <enhanced:img src={geoPin} class="h-6 sm:h-9 w-auto" alt="Geoguessr pin" />
          <a href="/maps" class="font-bold text-3xl">Our GeoGuessr maps</a>
        </div>
      </div>
      <h2 class="mt-4 mb-[-10px]">How to use</h2>
      <p>
        To get helpful hints in GeoGuessr, you'll need a browser extension that allows you to run
        userscripts, such as
        <strong>Tampermonkey</strong>. If you’ve used other popular userscripts like GeoGuessr
        Training Mode, you might already be familiar with it. But if this is your first time hearing
        about it, don't worry—it's easy to set up.
      </p>
      <h4 class="mt-4 mb-[-20px]">Here's how to do it</h4>
      <ul role="list" class="mt-8 max-w-xl space-y-4 text-gray-600 dark:text-white">
        <li>
          <div class="flex gap-x-3">
            <Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 shrink-0" />
            <span
              ><strong class="font-semibold text-foreground">Install the Browser Extension.</strong>
              First, you need to install a userscript manager extension for your browser. Tampermonkey
              is available for
              <a
                href="https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo"
                target="_blank">Chrome</a
              >* or
              <a href="https://addons.mozilla.org/firefox/addon/tampermonkey" target="_blank"
                >Firefox</a
              >.</span>
          </div>
          <p class="text-gray-600 dark:text-gray-400 ml-9 italic">
            * - Chrome: <a
              href="https://www.tampermonkey.net/faq.php?locale=en#Q209"
              target="_blank">Enable developer mode</a> in extensions to ensure Tampermonkey works properly
          </p>
        </li>
        <li class="flex gap-x-3">
          <Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 shrink-0" />
          <span
            ><strong class="font-semibold text-foreground">Install the Userscript.</strong>
            Once you have the extension installed, you can install the userscript by clicking
            <a
              href="https://github.com/likeon/geometa/raw/main/dist/geometa.user.js"
              target="_blank">this link</a
            >. Make sure to open new window with geoguessr after installing the script for first
            time.
            <p>
              The userscript is open-source and <a
                href="https://github.com/likeon/geometa"
                target="_blank">available on GitHub</a
              >.
            </p>
          </span>
        </li>

        <li class="flex gap-x-3">
          <Icon icon="icon-park-solid:check-one" class="h-6 w-6 shrink-0" color="green" />
          <span
            ><strong class="font-semibold text-foreground">Play one of our maps.</strong>
            Guess a location on
            <a href="/maps">our maps</a>. On the results screen, a note will be displayed showing
            the meta that was in the round, in case you missed it.</span>
        </li>
      </ul>

      <p class="font-semibold">
        Feel free to join our <a href="https://discord.gg/AcXEWznYZe" target="_blank"
          >discord server</a> if you have any questions or feedback.
      </p>
    </div>
    <h3 class="mt-4">Credits</h3>
    <p><strong>Map Creator</strong>: trausi</p>
    <p><strong>UserScript Creator</strong>: plurk</p>
    <p><i>Also big thanks to Bastu, Gelotris and Micha for help with making the map.</i></p>
    <p>
      <strong>Metas and some meta descriptions</strong>:
      <a href="https://www.plonkit.net/" target="_blank">Plonk It</a>
    </p>
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";
  .main-content p {
    @apply mt-4;
  }
</style>
