<script lang="ts">
  import video from '$lib/assets/showcase.webm';
  import Icon from '@iconify/svelte';
  import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
  <title>For Map Creators</title>
</svelte:head>

<div
  class="bg-linear-to-r from-emerald-200/40 via-rose-200/30 to-blue-200/60 dark:from-gray-800 dark:via-gray-900 dark:to-black relative isolate overflow-hidden">
  <div
    class="mx-auto max-w-6xl lg:max-w-7xl xl:max-w-screen-xl 2xl:max-w-screen-2xl px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:py-10">
    <div class="lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-8 2xl:gap-12 lg:items-center">
      <div class="lg:col-span-5 xl:col-span-4 2xl:col-span-4">
        <h1
          class="mt-10 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
          Want this on<br />your map?
        </h1>
        <div class="mt-10 flex items-center gap-x-6">
          <Button href="#content">Learn more</Button>
        </div>
      </div>

      <div class="mt-16 lg:mt-0 lg:col-span-7 xl:col-span-8 2xl:col-span-8">
        <div class="mx-auto max-w-md lg:max-w-lg xl:max-w-3xl 2xl:max-w-3xl">
          <div class="rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:p-4">
            <video autoplay loop muted playsinline class="w-full h-auto rounded-lg">
              <source src={video} type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="content" class="mx-auto max-w-3xl mt-10 container">
  <p class="w-full flex justify-center"></p>
  <h2>Learnable Meta for Map Creators</h2>
  <p class="text-base font-semibold leading-7 text-green-700">
    Enhance your map with our UserScript in 2 easy steps
  </p>
  <p class="mt-3">
    Creating a memorable GeoGuessr map isn't just about dropping pins on a map—it's about crafting
    an experience that challenges and educates players.
  </p>
  <p class="mt-3">
    We built a platform that easily allows you to share helpful insights with the users of your map.
  </p>
  <ul role="list" class="mt-8 max-w-xl space-y-4 text-muted-foreground">
    <li>
      <div class="flex gap-x-3">
        <Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 shrink-0" />
        <span
          ><strong class="font-semibold text-foreground">Adjust your map.</strong>
          First, you need to tag your locations in the map-making app. Only one tag per location in
          <span class="italic">CountryName-Any tag name</span> format.</span>
      </div>
    </li>
    <li class="flex gap-x-3">
      <Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 shrink-0" />
      <span
        ><strong class="font-semibold text-foreground"
          >Upload map JSON and enter tag descriptions.</strong>
        Upload the map into our platform and fill-out the notes for each tag. What you entered is going
        to be shown to the users after a guess on location that uses this tag.
      </span>
    </li>
  </ul>
  <div class="mt-3 w-full flex justify-center">
    <Button href="/map-making"
      ><Icon icon="gis:poi-map" color="white" class="mr-3 h-4 w-4" />Open Creator Dashboard</Button>
  </div>
  <div class="w-full flex justify-center mb-10 mt-2">
    <p class="text-sm">Requires login with Discord</p>
  </div>
</div>
