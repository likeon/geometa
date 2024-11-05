<script lang="ts">
  let { data } = $props();
</script>

<div class="container">
  <ul class="list-disc">
    {#each data.userGroups as group (group.map_groups.id)}
      <li>
        <a href="/dev/dash/groups/{group.map_groups.id}">{group.map_groups.name}</a>
      </li>
    {/each}
  </ul>
  {#if data.allGroups}
    <hr />
    <ul class="list-disc">
      {#each data.allGroups as group (group.id)}
        <li>
          <a href="/dev/dash/groups/{group.id}"
            >{group.name}, locations: {group.locationCount} ({group.authors})</a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
