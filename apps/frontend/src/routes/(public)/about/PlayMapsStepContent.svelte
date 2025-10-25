<script>
  import { resolve } from '$app/paths';
  import { WarningBox } from '$lib/components/ui/warning-box';
</script>

<p class="mt-2">
  Open a new browser tab (or restart your browser for best results) and play one of
  <a href={resolve('/maps')}>our maps</a>. On the results screen, a note will be displayed showing
  the meta that was in the round, in case you missed it.
</p>

<WarningBox class="mt-2">
  The script won't work in tabs that were open before installation. Always use a fresh tab or
  restart your browser after installing the userscript.
</WarningBox>
