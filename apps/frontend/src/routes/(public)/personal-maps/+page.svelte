<script>
  import { IconList, IconListItem, IconListItemComplex } from '$lib/components/ui/icon-list';
</script>

<svelte:head>
  <title>Personal Maps</title>
</svelte:head>

<div id="content" class="container px-6 py-10 lg:px-8">
  <div class="mx-auto max-w-3xl text-base leading-7">
    <div class="main-content">
      <p class="text-base font-semibold leading-7 text-green-700">Introducing</p>
      <h1>Personal maps</h1>
      <p class="mt-4 text-base leading-7">Take control of your learning experience.</p>

      <p class="mt-2 text-base leading-7">
        When playing Learnable maps with lots of metas, it's normal to fully learn some and want to
        focus only on the ones you haven't mastered yet. Previously, there was no easy way to remove
        the metas you already knew from the map.
      </p>

      <p class="mt-2 text-base leading-7">
        That’s where <span class="font-semibold">Personal Maps</span> come in.
      </p>

      <ul class="mt-4 list-disc list-inside text-base leading-7">
        <li>
          <span class="font-medium">Select specific metas</span> from any map (as long as the map creator
          has enabled sharing).
        </li>
        <li>
          <span class="font-medium">Mix metas from different maps</span> to create your own custom map
          and focus only on what you want to practice.
        </li>
      </ul>

      <h2 class="mt-4 mb-[-20px]">Here's how to do it</h2>
      <IconList>
        <IconListItem>
          <span
            ><strong class="font-semibold text-foreground">Create a GeoGuessr map.</strong>
            First, you'll need to create a GeoGuessr map. You can do that
            <a href="https://www.geoguessr.com/map-maker" target="_blank">here</a>.
          </span>
        </IconListItem>
        <IconListItem>
          <span
            ><strong class="font-semibold text-foreground">Create a personal map.</strong>
            After creating your GeoGuessr map, copy the map ID from the URL. It's the long string of
            letters and numbers at the end of the address bar (e.g., after geoguessr.com/map-maker/)
            and use it to create a personal map in our
            <a href="/personal" target="_blank">portal</a>.
          </span>
        </IconListItem>

        <IconListItem>
          <span
            ><strong class="font-semibold text-foreground"
              >Choose metas from community maps.</strong>
            Find <a href="/maps">maps</a> with the "shared" tag and select as many metas as you want.
            You can use the filter in the top right corner to show only maps with shared metas. Then,
            add them to your map.</span>
        </IconListItem>
        <IconListItemComplex>
          {#snippet subContent()}
            <p class="text-muted-foreground ml-9 italic">
              * When you upload locations for the first time, you'll need an API key from our
              portal. Just click the link that shows up when prompted to get it.
            </p>
          {/snippet}
          <span
            ><strong class="font-semibold text-foreground">Upload locations to your map.</strong>
            Once you've added metas in the portal, it's time to make your map playable. Go to the
            <a href="https://www.geoguessr.com/me/maps" target="_blank">Your Maps</a> section on GeoGuessr,
            select the map you used to create your personal version, and use our userscript to upload
            locations with a single click.
          </span>
        </IconListItemComplex>
      </IconList>

      <p class="font-semibold">
        Feel free to join our
        <a href="https://discord.gg/AcXEWznYZe" target="_blank">discord server</a> if you have any questions
        or feedback.
      </p>
    </div>
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";
  .main-content p {
    @apply mt-4;
  }
</style>
