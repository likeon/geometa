<script lang="ts">
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { Info } from '@lucide/svelte';

  const jsonExample = `[
  {
    "tagName": "testTag1",
    "metaName": "test name1",
    "note": "bla",
    "footer": "blablabla",
    "levels": ["levelName"],
    "images": [
      "https://example.com/i.jpg"
    ]
  },
  {
    "tagName": "testTag2",
    "metaName": "test name2",
    "note": "bla"
  }
]`;
</script>

<svelte:head>
  <title>Docs: Meta uploads</title>
</svelte:head>

<div id="content" class="container bg-white px-6 py-10 lg:px-8">
  <div class="mx-auto max-w-3xl text-base leading-7 text-gray-700">
    <div class="main-content">
      <h1 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Meta Uploads</h1>
      <p>Upload metas in JSON format. Excel coming soon™.</p>

      <h2 class="mt-8 text-2xl font-bold tracking-tight text-gray-900">Format</h2>
      <p>
        <code
          class="relative rounded bg-gray-100 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-gray-900"
          >footer</code
        >,
        <code
          class="relative rounded bg-gray-100 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-gray-900"
          >levels</code>
        and
        <code
          class="relative rounded bg-gray-100 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-gray-900"
          >images</code>
        keys are optional - when not provided or set to null in the json we keep already saved values.
        For example this allows importing metas from JSON while the images are managed via UI and use
        our storage.
      </p>

      <Alert class="mt-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <Info class="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription class="text-blue-800 dark:text-blue-200">
          <span class="font-medium">Important!</span>
          <strong>[]</strong> (empty array) is not equal to <strong>null</strong>!
          <strong>[]</strong>
          means that existing associated meta levels/images will be deleted.
        </AlertDescription>
      </Alert>

      <div class="mt-6 overflow-hidden rounded-lg bg-gray-900 shadow-lg">
        <pre class="overflow-x-auto p-4 text-sm leading-6">
          <code class="text-gray-300">{jsonExample}</code>
        </pre>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";
  .main-content p {
    @apply mt-4;
  }
</style>
