<script lang="ts">
  import MoonIcon from '@lucide/svelte/icons/moon';
  import SunIcon from '@lucide/svelte/icons/sun';
  import { mode, toggleMode } from 'mode-watcher';
  import { Button } from '$lib/components/ui/form';
</script>

<Button
  variant="dark-ghost"
  class="group/toggle size-8 rounded-md px-0 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-white/35"
  onclick={toggleMode}>
  {#if mode.current === 'dark'}
    <SunIcon />
  {:else}
    <MoonIcon />
  {/if}
  <span class="sr-only">Toggle theme</span>
</Button>
