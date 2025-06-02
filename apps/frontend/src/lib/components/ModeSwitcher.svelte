<script lang="ts">
  import MoonIcon from '@lucide/svelte/icons/moon';
  import SunIcon from '@lucide/svelte/icons/sun';
  import { mode, toggleMode } from 'mode-watcher';
  import { Button } from '$lib/components/ui/form';
</script>

<Button variant="ghost" class="group/toggle size-8 px-0" onclick={toggleMode}>
  {#if mode.current === 'dark'}
    <SunIcon />
  {:else}
    <MoonIcon />
  {/if}
  <span class="sr-only">Toggle theme</span>
</Button>
