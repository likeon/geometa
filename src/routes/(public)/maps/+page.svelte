<script>
  import { Button } from 'flowbite-svelte';
</script>

<div class="bg-green-500">
  <div class="mx-auto max-w-7xl px-6 pb-96 pt-12 text-center lg:px-8">
    <div class="mx-auto max-w-4xl">
      <h1 class="text-base font-semibold leading-7 text-green-200">Maps</h1>
      <p class="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
        The right map for you, <br />whatever you want
      </p>
    </div>
    <div class="relative mt-6">
      <p class="mx-auto max-w-2xl text-lg leading-8 text-white/80">
        Make sure you have our UserScript installed!
      </p>
    </div>
  </div>
  <div class="flow-root bg-white pb-24 sm:pb-32">
    <div class="-mt-80">
      <div class="container">
        <div class="grid grid-cols-1 gap-2 lg:grid-cols-3">
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
            <Button class="mt-7">Play</Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
