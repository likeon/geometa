<script lang="ts">
  import video from '$lib/assets/hero-compressed-2.webm';
  import { Button, Heading } from 'flowbite-svelte';
</script>

<div
  class="bg-gradient-to-r from-emerald-200 via-rose-200 to-blue-200 relative isolate overflow-hidden"
>
  <div class="items-center mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-10">
    <div class="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
      <h1 class="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
        Want this on <span class="text-nowrap">your map</span>?
      </h1>
      <div class="mt-10 flex items-center gap-x-6">
        <Button href="#content">Learn more</Button>
      </div>
    </div>
    <div
      class="mx-auto mt-16 flex max-w-xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-xl lg:flex-none xl:ml-32"
    >
      <div class="max-w-xl flex-none sm:max-w-5xl lg:max-w-3xl">
        <div
          class="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4"
        >
          <video autoplay loop muted playsinline>
            <source src={video} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="content" class="mx-auto max-w-3xl mt-10">
  <Heading tag="h2">LearnableMeta for Map Creators</Heading>
  <p class="mt-3">
    Creating a memorable GeoGuessr map isn't just about dropping pins on a map—it's about crafting
    an experience that challenges and educates players. Often, players aim to improve by memorizing
    various "metas" like bollards, signs, road lines, and unique Google Street View cars. Our
    platform simplifies this learning curve by highlighting these common metas directly within the
    GeoGuessr.
  </p>
</div>
