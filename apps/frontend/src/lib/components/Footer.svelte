<script>
  import { resolve } from '$app/paths';
</script>

<footer class="border-t">
  <nav
    class="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-6 gap-y-3 px-6 py-10 text-sm text-muted-foreground"
    aria-label="Footer">
    <a href={resolve('/about')} class="hover:text-foreground">About</a>
    <a href="https://docs.learnablemeta.com/" class="hover:text-foreground">Documentation</a>
    <a
      href="https://github.com/likeon/geometa"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-foreground">GitHub</a>
    <a
      href="https://discord.gg/AcXEWznYZe"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-foreground">Discord</a>
    <a href={resolve('/privacy')} class="hover:text-foreground">Privacy</a>
  </nav>
</footer>
