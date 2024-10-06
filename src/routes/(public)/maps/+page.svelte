<script>
  import { Button } from 'flowbite-svelte';
  import background from '$lib/assets/background.jpg?enhanced';
</script>

<div class="">
  <enhanced:img
    src={background}
    alt="background"
    class="absolute inset-0 -z-10 h-full w-full object-cover object-center"
  />
  <div class="mx-auto max-w-7xl px-6 pb-96 pt-12 text-center lg:px-8">
    <div class="mx-auto max-w-4xl">
      <h1 class="text-2xl shadow-2xl font-semibold leading-7 text-green-200">Maps</h1>
      <p class="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
        The right map for you, <br />whatever you want
      </p>
    </div>
    <div class="relative mt-6">
      <span class="mx-auto text-lg leading-8 text-black bg-green-200 rounded p-2">
        Make sure you have our
        <a href="/about" class="underline text-blue-600 hover:text-blue-800"> UserScript </a>
        installed!
      </span>
    </div>
  </div>
  <div class="flow-root bg-white pb-24 sm:pb-32">
    <div class="-mt-80">
      <div class="container">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div
            class="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-900/10 sm:p-10"
          >
            <div>
              <h3 class="text-xl font-semibold leading-7 text-green-600">A Learnable Meta World</h3>
              <div class="mt-4 flex items-baseline gap-x-2">
                <span class="text-xl font-bold tracking-tight text-gray-900">1500+ locations</span>
              </div>
              <p class="mt-6 text-base leading-7 text-gray-600">
                A beginner-friendly map with most common/worth learning metas to recognize the
                countries.
              </p>
            </div>
            <Button
              class="mt-7"
              href="https://www.geoguessr.com/maps/66c0d3feff4dbe492e06174e"
              target="_blank"
              >Play
            </Button>
          </div>
          <div
            class="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-900/10 sm:p-10"
          >
            <div>
              <h3 class="text-xl font-semibold leading-7 text-green-600">
                A Learnable Meta World — Regionguessing
              </h3>
              <div class="mt-4 flex items-baseline gap-x-2">
                <span class="text-xl font-bold tracking-tight text-gray-900">350+ locations</span>
              </div>
              <p class="mt-6 text-base leading-7 text-gray-600">
                An advanced map for experienced Geo Guessers with advanced metas that help to
                determine the region of the country.
              </p>
            </div>
            <Button
              class="mt-7"
              href="https://www.geoguessr.com/maps/66fda2e27e08dc03b5bb3d6e"
              target="_blank"
              >Play
            </Button>
          </div>
          <div
            class="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-900/10 sm:p-10"
          >
            <div>
              <h3 class="text-xl font-semibold leading-7 text-green-600">
                A Learnable Meta World — Bollards
              </h3>
              <div class="mt-4 flex items-baseline gap-x-2">
                <span class="text-xl font-bold tracking-tight text-gray-900">240+ locations</span>
              </div>
              <p class="mt-6 text-base leading-7 text-gray-600">
                A world map focused on road bollards.
              </p>
            </div>
            <Button
              class="mt-7"
              href="https://www.geoguessr.com/maps/66fd7c30b34ca9145ec96a6a"
              target="_blank">Play</Button
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
