<script>
  import { Heading } from 'flowbite-svelte';
  import Icon from '@iconify/svelte';
</script>

<svelte:head>
  <title>Personal Maps</title>
</svelte:head>

<div id="content" class="container px-6 py-10 lg:px-8">
  <div class="mx-auto max-w-3xl text-base leading-7">
    <div class="main-content">
      <p class="text-base font-semibold leading-7 text-green-700">Introducing</p>
      <Heading tag="h1">Personal maps</Heading>
      <p class="mt-4 text-base leading-7">Take control of your learning experience.</p>

      <p class="mt-2 text-base leading-7">
        When playing Learnable maps with lots of metas, it’s normal to fully learn some of them and
        want to focus only on the ones you haven’t learned yet. But before, there was no way to
        remove the metas you already know from the map.
      </p>

      <p class="mt-2 text-base leading-7">
        That’s where <span class="font-semibold">Personal Maps</span> come in.
      </p>

      <ul class="mt-4 list-disc list-inside text-base leading-7">
        <li>
          <span>Select specific metas</span> from any map (if the map creator has enabled sharing).
        </li>
        <li>
          <span class="font-medium">Mix metas from different maps</span> to create your own custom map
          and focus only on what you want to practice.
        </li>
      </ul>

      <Heading tag="h2" class="mt-4 mb-[-20px]">Here's how to do it</Heading>
      <ul role="list" class="mt-8 max-w-xl space-y-4 text-gray-600 dark:text-white">
        <li>
          <div class="flex gap-x-3">
            <Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 flex-shrink-0" />
            <span
              ><strong class="font-semibold text-gray-900 dark:text-gray-200"
                >Create a GeoGuessr map.</strong>
              First, you’ll need to create a GeoGuessr map. You can do that
              <a href="https://www.geoguessr.com/me/maps" target="_blank">here</a>.
            </span>
          </div>
        </li>
        <li class="flex gap-x-3">
          <Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 flex-shrink-0" />
          <span
            ><strong class="font-semibold text-gray-900 dark:text-gray-200"
              >Create a personal map.</strong>
            After creating your GeoGuessr map, copy its ID and use it to create a personal map in our
            <a href="/personal" target="_blank">portal</a>.
          </span>
        </li>

        <li class="flex gap-x-3">
          <Icon icon="icon-park-solid:check-one" class="h-6 w-6 flex-shrink-0" color="green" />
          <span
            ><strong class="font-semibold text-gray-900 dark:text-gray-200"
              >Choose metas from community maps.</strong>
            Find <a href="/maps">maps</a> with the shared tag and pick as many metas as you want. Add
            them to your map.</span>
        </li>
        <li>
          <div class="flex gap-x-3">
            <Icon icon="icon-park-solid:check-one" color="green" class="h-6 w-6 flex-shrink-0" />
            <span
              ><strong class="font-semibold text-gray-900 dark:text-gray-200"
                >Upload locations to your map.</strong>
              Once you’ve added metas in the portal, it’s time to make your map playable. Go to the
              <a href="https://www.geoguessr.com/me/maps" target="_blank">your maps</a> section on GeoGuessr,
              choose the map that you used for creating personal map, and with our userscript you can
              upload locations with one click.
            </span>
          </div>
          <p class="text-gray-600 dark:text-gray-400 ml-9 italic">
            * The first time you upload locations, it will ask you for an API key from our portal.
            You can get it by clicking the link that shows up when prompted.
          </p>
        </li>
      </ul>

      <p class="font-semibold">
        Feel free to join our
        <a href="https://discord.gg/AcXEWznYZe" target="_blank">discord server</a> if you have any questions
        or feedback.
      </p>
    </div>
  </div>
</div>

<style lang="postcss">
  .main-content p {
    @apply mt-4;
  }
</style>
