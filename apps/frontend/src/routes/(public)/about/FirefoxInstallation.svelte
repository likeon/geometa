<script>
  import InstallationSteps from './InstallationSteps.svelte';
  import PlayMapsStepContent from './PlayMapsStepContent.svelte';
  import InstallUserscriptStep from './InstallUserscriptStep.svelte';

  const steps = [
    {
      title: 'Install the Browser Extension',
      content: snippetStep1
    },
    {
      title: 'Install the Userscript',
      content: snippetStep2
    },
    {
      title: 'Play our maps',
      content: snippetStep3
    }
  ];
</script>

{#snippet snippetStep1()}
  <p class="mt-2">
    Install Tampermonkey from
    <a href="https://addons.mozilla.org/firefox/addon/tampermonkey" target="_blank"
      >Firefox Add-ons</a
    >.
  </p>
{/snippet}

{#snippet snippetStep2()}
  <InstallUserscriptStep />
{/snippet}

{#snippet snippetStep3()}
  <PlayMapsStepContent />
{/snippet}

<InstallationSteps {steps} />
