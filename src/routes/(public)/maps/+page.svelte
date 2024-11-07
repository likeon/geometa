<script>
  import { Button, TabItem, Tabs } from 'flowbite-svelte';
  import background from '$lib/assets/background.jpg';

  let { data } = $props();
</script>

<svelte:head>
  <title>Maps</title>
</svelte:head>

<div class="">
  <div
    class="relative min-h-screen bg-cover bg-center"
    style="background-image: url({background}); background-attachment: fixed;">
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
    <div class="flow-root pb-24 sm:pb-32">
      <div class="-mt-80">
        <div class="container">
          <Tabs
            tabStyle="full"
            defaultClass="flex rounded-lg divide-x rtl:divide-x-reverse divide-gray-200 shadow dark:divide-gray-700"
            contentClass="mt-5">
            <TabItem class="w-full" open>
              <span slot="title">Official</span>

              <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {#each data.mapsToPublish as map}
                  <div
                    class="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-900/10 sm:p-10">
                    <div>
                      <h3 class="text-xl font-semibold leading-7 text-green-600">{map.name}</h3>
                      <div class="mt-4 flex items-baseline gap-x-2">
                        <span class="text-xl font-bold tracking-tight text-gray-900"
                          >{map.locationsCount}+ locations</span>
                      </div>
                      <p class="mt-6 text-base leading-7 text-gray-600">
                        {map.description}
                      </p>
                    </div>
                    <Button
                      class="mt-7"
                      href={'https://www.geoguessr.com/maps/' + map.geoguessrId}
                      target="_blank"
                      >Play
                    </Button>
                  </div>
                {/each}
              </div>
            </TabItem>
            <TabItem class="w-full">
              <span slot="title">Community</span>
              <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {#each data.communityMaps as map}
                  <div
                    class="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-900/10 sm:p-10">
                    <div>
                      <h3 class="text-xl font-semibold leading-7 text-green-600">{map.name}</h3>
                      <p>by <strong>{map.authors}</strong></p>
                      <div class="mt-4 flex items-baseline gap-x-2">
                        <span class="text-xl font-bold tracking-tight text-gray-900"
                          >{map.locationsCount}+ locations</span>
                      </div>
                      <p class="mt-6 text-base leading-7 text-gray-600">
                        {map.description}
                      </p>
                    </div>
                    <Button
                      class="mt-7"
                      href={'https://www.geoguessr.com/maps/' + map.geoguessrId}
                      target="_blank"
                      >Play
                    </Button>
                  </div>
                {/each}
              </div>
            </TabItem>
          </Tabs>
        </div>
      </div>
    </div>
  </div>
</div>
