<script lang="ts">
  import { Alert } from 'flowbite-svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    alertText: Snippet;
    showAlert: boolean;
    extraClass?: string;
    color?:
      | 'form'
      | 'none'
      | 'gray'
      | 'red'
      | 'yellow'
      | 'green'
      | 'indigo'
      | 'purple'
      | 'pink'
      | 'blue'
      | 'light'
      | 'dark'
      | 'default'
      | 'dropdown'
      | 'navbar'
      | 'navbarUl'
      | 'primary'
      | 'orange';
  }

  let { alertText, showAlert = $bindable(), extraClass, color }: Props = $props();
  const alertProps = color ? { color } : {};
</script>

{#if showAlert}
  <Alert class={`relative pr-10 ${extraClass || ''}`} {...alertProps}>
    {@render alertText()}
    <button
      class="absolute top-2 right-2 text-2xl text-gray-500 hover:text-gray-800"
      onclick={() => (showAlert = false)}
      aria-label="Close">
      &times;
    </button>
  </Alert>
{/if}
