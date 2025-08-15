<script>
  import InstallationSteps from './InstallationSteps.svelte';
  import { WarningBox } from '$lib/components/ui/warning-box';
  import PlayMapsStepContent from './PlayMapsStepContent.svelte';
  import * as Accordion from '$lib/components/ui/accordion';

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
  <WarningBox>This step is absolutely crucial - the userscript won't work without it.</WarningBox>
{/snippet}

{#snippet snippetStep3()}
  <p class="mt-2">
    Simply click on
    <a href="https://github.com/likeon/geometa/raw/main/dist/geometa.user.js" target="_blank"
      >this link</a> and the installation window will pop up.
  </p>

  <Accordion.Root class="mt-3" type="single">
    <Accordion.Item value="troubleshoot">
      <Accordion.Trigger class="text-sm underline decoration-dotted"
        >Installation doesn't start?</Accordion.Trigger>
      <Accordion.Content>
        <p class="text-sm text-muted-foreground">
          In some cases, the userscript installation doesn't start automatically and the script file
          gets downloaded instead. If this happens, you'll need to install the script manually by
          following
          <a href="https://www.youtube.com/watch?v=RpjvLpyiras" target="_blank" class="underline"
            >this guide</a
          >.
        </p>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
{/snippet}

{#snippet snippetStep4()}
  <PlayMapsStepContent />
{/snippet}

<p class="text-muted-foreground text-sm italic mb-6">
  Also works for: Edge, Brave, Opera, and other Chromium-based browsers
</p>

<InstallationSteps {steps} />
