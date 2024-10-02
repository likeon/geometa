<script lang="ts">
  import { page } from '$app/stores'; // Import the page store to get the current route

  export let groupId: Number;
  export let groupName: string;

  $: activeRoute = $page.url.pathname;

  function isActive(route: string) {
    return activeRoute === route
      ? 'border-green-500 text-green-600'
      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700';
  }
</script>

<div class="border-b border-gray-200 mb-4">
  <span class="text-sm font-semibold text-gray-600">
    Group: {groupName}
  </span>
  <nav class="-mb-px flex space-x-8" aria-label="Tabs">
    <a
      href={`/dev/dash/groups/${groupId}`}
      class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium {isActive(
        `/dev/dash/groups/${groupId}`
      )}"
    >
      Metas
    </a>
    <a
      href={`/dev/dash/groups/${groupId}/maps`}
      class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium {isActive(
        `/dev/dash/groups/${groupId}/maps`
      )}"
    >
      Maps
    </a>
    <a
      href={`/dev/dash/groups/${groupId}/levels`}
      class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium {isActive(
        `/dev/dash/groups/${groupId}/levels`
      )}"
    >
      Levels
    </a>
  </nav>
</div>

<style>
  a {
    transition: all 0.3s ease;
  }
</style>
