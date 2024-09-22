<script lang="ts">
  import background from '$lib/assets/background.jpg?enhanced';
  import video from '$lib/assets/hero-compressed-2.webm';
  // import GeoIcon from '~icons/wpf/geo-fence'
  import { Button } from 'flowbite-svelte';
</script>

<div class="bg-cover bg-center bg-no-repeat relative isolate overflow-hidden min-h-screen">
<!--  <div style="background-image: url('path/to/your/image.jpg');" class="absolute inset-0 -z-10 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true"></div>-->
  <enhanced:img src={background} alt="background" class="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
  <div class="items-center mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
    <div class="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
<!--      <GeoIcon style="color: dodgerblue" width="2rem" height="2rem"/>-->
      <h1 class="mt-10 text-4xl font-bold tracking-tight text-white sm:text-6xl shadow-2xl">New way to learn <span class="whitespace-nowrap">Geo Guessing</span></h1>
      <div class="mt-10 flex items-center gap-x-6">
        <Button href="/about">Learn more</Button>
      </div>
    </div>
    <div class="mx-auto mt-16 flex max-w-xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-xl lg:flex-none xl:ml-32">
      <div class="max-w-xl flex-none sm:max-w-5xl lg:max-w-3xl">
        <div class="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
<!--          <img src="https://tailwindui.com/img/component-images/project-app-screenshot.png" alt="App screenshot" width="2432" height="1442" class="w-[76rem] rounded-md shadow-2xl ring-1 ring-gray-900/10">-->
          <video autoplay loop muted playsinline>
            <source src="{video}" type="video/webm">
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  </div>
</div>
