<script lang="ts">
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { Button } from '$lib/components/ui/button';
  import { X } from '@lucide/svelte';
  import { PersistedState } from 'runed';
  import { browser } from '$app/environment';

  // change the local storage name when you want to repurpose the banner for some other event
  const bannerStatus = new PersistedState('awards2025BannerStatus', true);

  function closeBanner() {
    bannerStatus.current = false;
  }
</script>

<!--browser check prevents the banner from being rendered during SSR-->
{#if browser && bannerStatus.current}
  <Alert
    class="rounded-none border-x-0 border-t-0 border-b border-gray-200 dark:border-gray-700 bg-gray-800 text-white p-4">
    <div class="flex items-center justify-between">
      <AlertDescription class="text-sm/6 m-0">
        <a
          class="text-white hover:text-gray-200 dark:text-white dark:hover:text-gray-200"
          href="https://www.geoguessr.com/community/awards/2025"
          target="_blank">
          <strong class="font-semibold">GeoGuessr Community Awards 2025</strong>
          <svg viewBox="0 0 2 2" class="mx-2 inline size-0.5 fill-current" aria-hidden="true">
            <circle cx="1" cy="1" r="1"></circle>
          </svg>
          We'd be honored if you'd nominate Learnable Meta as Community Champion 🎉
        </a>
      </AlertDescription>

      <Button
        variant="ghost"
        size="icon"
        class="h-6 w-6 text-white hover:text-gray-200 hover:bg-gray-700"
        onclick={closeBanner}>
        <X class="h-4 w-4" />
        <span class="sr-only">Close banner</span>
      </Button>
    </div>
  </Alert>
{/if}
