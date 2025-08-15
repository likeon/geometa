<script>
  import { WarningBox } from '$lib/components/ui/warning-box';
  import * as Accordion from '$lib/components/ui/accordion';
</script>

<div class="space-y-4">
  <WarningBox variant="info">
    The userscript only works with GeoGuessr in the browser. It won't work with the GeoGuessr mobile
    app.
  </WarningBox>

  <p>
    iOS has limited support for userscripts, but users in our community have successfully gotten it
    working using the methods below. Choose the option that works best for your device.
  </p>

  <Accordion.Root class="mt-4" type="single">
    <Accordion.Item value="tampermonkey">
      <Accordion.Trigger class="text-sm underline decoration-dotted">
        Tampermonkey for Safari (Paid App)
      </Accordion.Trigger>
      <Accordion.Content>
        <ol class="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Download Tampermonkey from the App Store (approximately €3)</li>
          <li>Go to Settings app → Safari → Disable "Block Pop-ups"</li>
          <li>Open Tampermonkey app from your home screen and allow it to always access Safari</li>
          <li>
            In Safari, tap the puzzle piece icon in the address bar → Extensions → Enable
            Tampermonkey
          </li>
          <li>
            When a Tampermonkey tab opens, paste the userscript into the editor (delete any existing
            content first) and save
          </li>
          <li>
            Open a new GeoGuessr tab and tap the Tampermonkey icon to verify the script is active
          </li>
        </ol>
        <p class="mt-3 text-sm text-muted-foreground italic">
          Tip: If the script stops working after page reloads, go to Tampermonkey settings and
          enable "Automatic reload" in advanced config mode. Then toggle the script off and on to
          reload the page.
        </p>
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="ipad-tweaks">
      <Accordion.Trigger class="text-sm underline decoration-dotted">
        Additional iPad Settings
      </Accordion.Trigger>
      <Accordion.Content>
        <p class="text-sm text-muted-foreground mb-2">
          If using Tampermonkey on iPad, you may need these additional tweaks:
        </p>
        <ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            Ensure Tampermonkey has access to all websites, not just GeoGuessr and Learnable Meta
          </li>
          <li>
            In Safari's page menu (icon on left side of address bar), disable "Hide Distracting
            Items"
          </li>
          <li>If issues persist, try refreshing the page or restarting Safari</li>
        </ul>
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="orion">
      <Accordion.Trigger class="text-sm underline decoration-dotted">
        Orion Browser with Violentmonkey (Free Alternative)
      </Accordion.Trigger>
      <Accordion.Content>
        <ol class="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Download Orion Browser from the App Store (free)</li>
          <li>Install Violentmonkey extension from Firefox Add-ons store within Orion</li>
          <li>Add our userscript to Violentmonkey</li>
          <li>Navigate to GeoGuessr and start playing</li>
        </ol>
        <p class="mt-3 text-sm text-muted-foreground italic">
          Note: Tampermonkey may not work properly with Orion. If you encounter issues, try
          refreshing the page or restarting the browser before starting a new game.
        </p>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
</div>
