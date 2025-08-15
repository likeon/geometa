<script lang="ts">
  import type { Snippet } from 'svelte';

  type Step = {
    title: string;
    content: Snippet;
  };

  type Props = {
    steps: Step[];
  };

  let { steps }: Props = $props();
</script>

<ol class="installation-steps space-y-6">
  {#each steps as step, index (index)}
    <li class="flex gap-4">
      <div class="step-number">
        <span>{index + 1}</span>
      </div>
      <div class="flex-1">
        <strong class="font-semibold text-foreground text-lg">{step.title}</strong>
        {@render step.content()}
      </div>
    </li>
  {/each}
</ol>

<style lang="postcss">
  @reference "tailwindcss";

  .installation-steps {
    list-style: none;
    padding: 0;
  }

  .step-number {
    @apply flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md;
    transition: all 0.3s ease;
  }

  .installation-steps li:hover .step-number {
    @apply bg-green-700 shadow-lg;
  }

  .installation-steps li {
    @apply transition-all duration-200;
  }

  @media (prefers-color-scheme: dark) {
    .step-number {
      @apply bg-green-700;
    }

    .installation-steps li:hover .step-number {
      @apply bg-green-600;
    }
  }
</style>
