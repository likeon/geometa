<script lang="ts">
  import BaseTableDropDown from '$lib/components/BaseTable/BaseTableDropDown.svelte';
  import BaseTableDropdownDeleteForm from '$lib/components/BaseTable/BaseTableDropdownDeleteForm.svelte';
  let { id }: { id: number } = $props();
  let dropdownOpen = $state(false);
</script>

{#snippet dropdownContent()}
  <BaseTableDropdownDeleteForm action="?/deleteLevel" {id} bind:dropdownOpen />
{/snippet}

<BaseTableDropDown bind:dropdownOpen {dropdownContent} />
