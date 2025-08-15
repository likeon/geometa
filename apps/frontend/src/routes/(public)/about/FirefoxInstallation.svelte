<script>
  import InstallationSteps from './InstallationSteps.svelte';
  import PlayMapsStepContent from './PlayMapsStepContent.svelte';
  import * as Accordion from '$lib/components/ui/accordion';

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

{#snippet snippetStep3()}
  <PlayMapsStepContent />
{/snippet}

<InstallationSteps {steps} />
