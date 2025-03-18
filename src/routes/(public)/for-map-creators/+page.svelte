<script lang="ts">
  import video from '$lib/assets/showcase.webm';
  import { GradientButton, Heading } from 'flowbite-svelte';
  import Icon from '@iconify/svelte';
  import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
  <title>For Map Creators</title>
</svelte:head>

<div
  class="bg-gradient-to-r from-emerald-200 via-rose-200 to-blue-200 dark:from-gray-800 dark:via-gray-900 dark:to-black relative isolate overflow-hidden">
  <div class="items-center mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-10">
    <div class="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
      <h1 class="mt-10 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
        Want this on <span class="text-nowrap">your map</span>?
      </h1>
      <div class="mt-10 flex items-center gap-x-6">
        <Button href="#content">Learn more</Button>
      </div>
    </div>
    <div
      class="mx-auto mt-16 flex max-w-xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-xl lg:flex-none xl:ml-32">
      <div class="max-w-xl flex-none sm:max-w-5xl lg:max-w-3xl">
        <div
          class="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
          <video autoplay loop muted playsinline>
            <source src={video} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="content" class="mx-auto max-w-3xl mt-10 container">
  <p class="w-full flex justify-center"></p>
  <Heading tag="h2">Learnable Meta for Map Creators</Heading>
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
  <ul role="list" class="mt-8 max-w-xl space-y-4 text-gray-600 dark:text-gray-400">
    <li>
      <div class="flex gap-x-3">
        <Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 flex-shrink-0" />
        <span
          ><strong class="font-semibold text-gray-900 dark:text-gray-100">Adjust your map.</strong>
          First, you need to tag your locations in the map-making app. Only one tag per location in
          <span class="italic">CountryName-Any tag name</span> format.</span>
      </div>
    </li>
    <li class="flex gap-x-3">
      <Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 flex-shrink-0" />
      <span
        ><strong class="font-semibold text-gray-900 dark:text-gray-100"
          >Upload map JSON and enter tag descriptions.</strong>
        Upload the map into our platform and fill-out the notes for each tag. What you entered is going
        to be shown to the users after a guess on location that uses this tag.
      </span>
    </li>
  </ul>
  <div class="mt-3 w-full flex justify-center">
    <GradientButton href="/dev/dash" color="greenToBlue"
      ><Icon icon="gis:poi-map" color="white" class="mr-3 h-4 w-4" />Open Creator Dashboard</GradientButton>
  </div>
  <div class="w-full flex justify-center mb-10 mt-2">
    <p class="text-sm">Requires login with Discord</p>
  </div>
</div>
