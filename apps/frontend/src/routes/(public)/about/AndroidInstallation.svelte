<script>
  import { WarningBox } from '$lib/components/ui/warning-box';
</script>

<div class="space-y-4">
  <WarningBox variant="info">
    The userscript only works with GeoGuessr in the browser. It won't work with the GeoGuessr mobile
    app.
  </WarningBox>

  <p>
    Firefox for Android supports browser extensions and userscripts, making it possible to use our
    meta hints on mobile devices.
  </p>

  <WarningBox variant="warning">
    While this works reasonably well on tablets, the experience on smartphones can be challenging
    due to screen size limitations and interface quirks. We recommend using a tablet for the best
    mobile experience.
  </WarningBox>

  <p>
    To install on Android, simply follow the <strong>Firefox installation instructions</strong> above
    using Firefox for Android instead of the desktop version. The process is identical - install Tampermonkey
    from Firefox Add-ons, then install our userscript.
  </p>
</div>
