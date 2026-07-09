<script>
  import InstallationSteps from './InstallationSteps.svelte';
  import { WarningBox } from '$lib/components/ui/warning-box';
  import PlayMapsStepContent from './PlayMapsStepContent.svelte';
  import InstallUserscriptStep from './InstallUserscriptStep.svelte';
  import allowUserScripts from '$lib/assets/allowUserScripts.png?enhanced';

  const steps = [
    {
      title: 'Install the Browser Extension',
      content: snippetStep1
    },
    {
      title: 'Enable Developer Mode',
      content: snippetStep2
    },
    {
      title: 'Install the Userscript',
      content: snippetStep3
    },
    {
      title: 'Play our maps',
      content: snippetStep4
    }
  ];
</script>

{#snippet snippetStep1()}
  <p class="mt-2">
    Install Tampermonkey from the
    <a
      href="https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo"
      target="_blank">Chrome Web Store</a
    >.
  </p>
{/snippet}

{#snippet snippetStep2()}
  <p class="mt-2">
    <a href="https://www.tampermonkey.net/faq.php?locale=en#Q209" target="_blank"
      >Enable developer mode</a> in your browser's extensions settings to ensure Tampermonkey works properly.
  </p>
  <p class="mt-2">
    On the same page, navigate to Tampermonkey Details and enable "Allow User Scripts".
  </p>
  <enhanced:img
    src={allowUserScripts}
    class="mt-2 rounded-md border"
    alt="Allow User Scripts setting" />
  <WarningBox>This step is absolutely crucial - the userscript won't work without it.</WarningBox>
{/snippet}

{#snippet snippetStep3()}
  <InstallUserscriptStep />
{/snippet}

{#snippet snippetStep4()}
  <PlayMapsStepContent />
{/snippet}

<p class="text-muted-foreground text-sm italic mb-6">
  Also works for: Edge, Brave, Opera, and other Chromium-based browsers
</p>

<InstallationSteps {steps} />
