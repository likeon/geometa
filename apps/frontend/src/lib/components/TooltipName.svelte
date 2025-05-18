<script lang="ts">
  import Icon from '@iconify/svelte';
  import { Tooltip } from 'flowbite-svelte';
  let {
    name,
    tooltipText,
    colorClass = 'text-gray-300 dark:text-gray-700'
  }: { name: string; tooltipText: string; colorClass?: string } = $props();
</script>

<div class="mb-1">
  <span class="inline-flex items-center">
    {name}
    <span>
<Icon icon="akar-icons:question-fill" class="w-4 h-4 ml-1 align-middle {colorClass}" />
    </span>
    
    <Tooltip placement="right-end">
      <span class="whitespace-pre-line">
        {tooltipText}
      </span>
    </Tooltip>
  </span>
</div>
