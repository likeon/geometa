<script>
  import * as Accordion from '$lib/components/ui/accordion';
</script>

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
