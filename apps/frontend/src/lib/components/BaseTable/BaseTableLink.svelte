<script lang="ts">
  import Icon from '@iconify/svelte';
  let {
    link,
    name,
    linkClasses = 'text-blue-500 hover:text-blue-700'
  }: {
    link: string;
    name?: string;
    linkClasses?: string;
  } = $props();
</script>

{#if name}
  <a href={link} class={linkClasses}>
    {name}
  </a>
{:else}
  <a href={link} target="_blank" class={linkClasses} onclick={(event) => event.stopPropagation()}>
    <Icon icon="mdi:link" class="ml-1 w-5 h-5 inline" />
  </a>
{/if}
