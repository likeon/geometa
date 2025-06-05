<script lang="ts">
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { Button } from '$lib/components/ui/button';
  import { X } from '@lucide/svelte';
  import { PersistedState } from 'runed';
  import { browser } from '$app/environment';

  const bannerStatus = new PersistedState('awardsVoting2025BannerStatus', true);

  function closeBanner() {
    bannerStatus.current = false;
  }
</script>

{#if browser && bannerStatus.current}
  <Alert class="rounded-none border-0 border-b border-border bg-slate-800 text-white">
    <AlertDescription class="flex items-center justify-between w-full">
      <p class="text-sm leading-6 flex-1 text-center">
        <a
          class="text-white hover:text-slate-200 transition-colors"
          href="https://www.geoguessr.com/community/awards/2025"
          target="_blank"
          rel="noopener noreferrer">
          <span class="font-semibold text-green-400">Learnable Meta</span> and
          <span class="font-semibold text-green-400">trausi</span>
          got nominated in
          <span class="text-yellow-400">GeoGuessr Community Awards 2025</span> 🎉
          <svg viewBox="0 0 2 2" class="mx-2 inline size-0.5 fill-current" aria-hidden="true">
            <circle cx="1" cy="1" r="1"></circle>
          </svg>
          Vote for us by clicking here!
        </a>
      </p>

      <Button
        variant="ghost"
        size="sm"
        class="h-auto p-1 text-white hover:bg-slate-700"
        onclick={closeBanner}
        aria-label="Close banner">
        <X class="h-4 w-4" />
      </Button>
    </AlertDescription>
  </Alert>
{/if}
