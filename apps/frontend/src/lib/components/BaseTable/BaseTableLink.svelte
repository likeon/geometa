<script lang="ts">
  import Icon from '@iconify/svelte';
  let {
    link,
    name
  }: {
    link: string;
    name?: string;
  } = $props();
</script>

{#if name}
  <a href={link} class="text-blue-500 hover:text-blue-700">
    {name}
  </a>
{:else}
  <a
    href={link}
    target="_blank"
    class="text-blue-500 hover:text-blue-700"
    onclick={(event) => event.stopPropagation()}>
    <Icon icon="mdi:link" class="ml-1 w-5 h-5 inline" />
  </a>
{/if}
