<script>
  import { Heading, Kbd } from 'flowbite-svelte';

  const jsonExample = `
[
  {
    "tagName": "testTag1",
    "metaName": "test name1",
    "note": "bla",
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
      <Heading tag="h1">Meta Uploads</Heading>
      <p>Upload metas in JSON format. Excel coming soon™.</p>
      <Heading tag="h2">Format</Heading>
      <p>
        <Kbd class="p-1">levels</Kbd> and <Kbd class="p-1">images</Kbd> keys are optional - when not
        provided or set to null in the json we keep already saved values. For example this allows importing
        metas from JSON while the images are managed via UI and use our storage.
      </p>
      <pre class="bg-gray-800 text-gray-200 p-4 rounded shadow-lg max-w-lg mt-3">
        <code>
          {jsonExample}
        </code>
      </pre>
    </div>
  </div>
</div>

<style lang="postcss">
  .main-content p {
    @apply mt-4;
  }
</style>
