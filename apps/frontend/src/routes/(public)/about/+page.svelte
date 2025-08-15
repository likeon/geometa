<script>
  import geoPin from '$lib/assets/GeoGuessr-Pin.png?enhanced';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import Icon from '@iconify/svelte';
  import ChromeInstallation from './ChromeInstallation.svelte';
  import FirefoxInstallation from './FirefoxInstallation.svelte';
  import AndroidInstallation from './AndroidInstallation.svelte';
  import IosInstallation from './IosInstallation.svelte';
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
        maps are designed for No Move because it's skill itself to find clues and it's good habbit
        to learn to check google car, poles, roadlines etc.
      </p>
      <p></p>
      <div class="flex flex-col items-center justify-center text-center">
        <div class="flex items-center space-x-2">
          <enhanced:img src={geoPin} class="h-6 sm:h-9 w-auto" alt="Geoguessr pin" />
          <a href="/maps" class="font-bold text-3xl">Our GeoGuessr maps</a>
        </div>
        <div class="flex items-center space-x-2 mt-5">
          <Icon icon="mdi:github" class="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <a
            href="https://github.com/likeon/geometa"
            target="_blank"
            class="text-2xl font-medium text-gray-800 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            Learnable Meta on GitHub - entirely Open Source
          </a>
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
      <h4 class="mt-4 mb-2">Here's how to do it</h4>

      <Tabs value="chrome" class="w-full mt-4">
        <TabsList class="grid w-full grid-cols-4">
          <TabsTrigger value="chrome">Chrome</TabsTrigger>
          <TabsTrigger value="firefox">Firefox</TabsTrigger>
          <TabsTrigger value="android">Android</TabsTrigger>
          <TabsTrigger value="ios">iOS</TabsTrigger>
        </TabsList>

        <TabsContent value="chrome" class="mt-4">
          <Card>
            <CardContent class="pt-6">
              <ChromeInstallation />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="firefox" class="mt-4">
          <Card>
            <CardContent class="pt-6">
              <FirefoxInstallation />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="android" class="mt-4">
          <Card>
            <CardContent class="pt-6">
              <AndroidInstallation />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ios" class="mt-4">
          <Card>
            <CardContent class="pt-6">
              <IosInstallation />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p class="font-semibold">
        Feel free to join our <a href="https://discord.gg/AcXEWznYZe" target="_blank"
          >Discord server</a>
        if you have any questions or feedback. For technical issues (e.g., userscript problems), please
        use the
        <code class="text-sm bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">#help-desk</code> channel.
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
