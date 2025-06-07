<script lang="ts">
  import background from '$lib/assets/background.jpg?enhanced';
  import video from '$lib/assets/showcase.webm';
  import { Button } from '$lib/components/ui/button';
  // import GeoIcon from '~icons/wpf/geo-fence'
</script>

<div class="bg-cover bg-center bg-no-repeat relative isolate overflow-hidden min-h-screen">
  <!--  <div style="background-image: url('path/to/your/image.jpg');" class="absolute inset-0 -z-10 h-full w-full stroke-gray-200 mask-[radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true"></div>-->
  <enhanced:img
    src={background}
    alt="background"
    class="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
  <div
    class="mx-auto max-w-6xl lg:max-w-7xl xl:max-w-screen-xl 2xl:max-w-screen-2xl px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:py-40">
    <div class="lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-8 2xl:gap-12 lg:items-center">
      <div class="lg:col-span-5 xl:col-span-4 2xl:col-span-4">
        <h1
          class="mt-10 text-4xl font-bold tracking-tight text-white dark:text-zinc-300 sm:text-5xl lg:text-6xl shadow-2xl">
          <span class="whitespace-nowrap">New way to learn</span>
          <span class="whitespace-nowrap">Geoguessr</span>
        </h1>
        <div class="mt-10 flex items-center gap-x-6">
          <Button href="/about">Learn more</Button>
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
