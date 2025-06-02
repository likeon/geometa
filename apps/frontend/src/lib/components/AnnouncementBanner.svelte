<script lang="ts">
  import { Banner } from 'flowbite-svelte';
  import { PersistedState } from 'runed';
  import { browser } from '$app/environment';
  // change the local storage name when you want to repurpose the banner for some other event
  const bannerStatus = new PersistedState('awardsVoting2025BannerStatus', true);
</script>

<!--browser check prevents the banner from being rendered during SSR-->
{#if browser}
  <Banner
    id="default-banner"
    position="static"
    class="flex justify-between p-4 w-full border-b border-gray-700 dark:border-gray-700 bg-gray-800"
    color="gray"
    bind:bannerStatus={bannerStatus.current}>
    <p class="text-sm/6">
      <a
        class="text-white dark:text-white"
        href="https://www.geoguessr.com/community/awards/2025"
        target="_blank">
        <span class="font-semibold text-green-600">Learnable Meta</span> and
        <span class="font-semibold text-green-600">trausi</span>
        got nominated in
        <span class="text-yellow-400">GeoGuessr Community Awards 2025</span> 🎉
        <svg viewBox="0 0 2 2" class="mx-2 inline size-0.5 fill-current" aria-hidden="true">
          <circle cx="1" cy="1" r="1"></circle>
        </svg>
        Vote for us by clicking here!
      </a>
    </p>
  </Banner>
{/if}
