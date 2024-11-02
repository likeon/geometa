<script lang="ts">
  import { GradientButton } from 'flowbite-svelte';
  import Icon from '@iconify/svelte';
</script>

<div class="mt-3 w-full flex justify-center">
  <GradientButton href="/dev/dash" color="greenToBlue">
    <Icon icon="gis:poi-map" color="white" class="mr-3 h-4 w-4" />
    Open Creator Dashboard
  </GradientButton>
</div>
<div class="w-full flex justify-center mb-10 mt-2">
  <p class="text-sm">Requires login with Discord</p>
</div>
