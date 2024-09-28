<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>Entries</title>
</svelte:head>

<div class="container">
  <table>
    <thead>
      <tr>
        <th>Tags</th>
        <th>Type</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      {#each data.entries as entry}
        <tr>
          <td>
            {#each JSON.parse(entry.tagsJSON) as parsedTag, index}
              {#if index !== 0},
              {/if}{parsedTag.tagName}
            {/each}
          </td>
          <td>{entry.type}</td>
          <td>{entry.description}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
