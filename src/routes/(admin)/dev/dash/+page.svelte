<script lang="ts">
  let { data } = $props();
</script>

<div class="container">
  <ul class="list-disc">
    {#each data.groups as group (group.map_groups.id)}
      <li>
        <a href="/dev/dash/groups/{group.map_groups.id}">{group.map_groups.name}</a>
      </li>
    {/each}
  </ul>
</div>
