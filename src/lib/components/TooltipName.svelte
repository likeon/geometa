<script>
  import Icon from '@iconify/svelte';
  import { Tooltip } from 'flowbite-svelte';
  export let name = 'Label';
  export let tooltipText = 'Tooltip description.';
</script>

<div class="mb-1">
  <span class="inline-flex items-center">
    {name}
    <Icon
      icon="akar-icons:question-fill"
      class="w-4 h-4 ml-1 align-middle text-gray-300 dark:text-gray-700" />
    <Tooltip placement="right-end">
      <span class="whitespace-pre-line">
        {tooltipText}
      </span>
    </Tooltip>
  </span>
</div>
