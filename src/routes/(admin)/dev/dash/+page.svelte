<script lang="ts">
  import { Alert, Button, Dropdown, DropdownItem, Input, Label, Modal } from 'flowbite-svelte';
  import { superForm } from 'sveltekit-superforms';
  import SortFilterTable from '$lib/components/SortFilterTable.svelte';

  let { data } = $props();
  let mapGroupCreationModalOpen = $state(false);
  const { form, errors, constraints } = superForm(data.mapGroupForm);
  let searchText = $state('');
  let columns = [
    {
      key: 'name',
      label: 'Name',
      width: '25%',
      searchable: true,
      sortable: true,
      displayHtml: (item: (typeof data.userGroups)[number]) =>
        `<a href="/dev/dash/groups/${item.id}">${item.name}</a>`
    },
    {
      key: 'metasCount',
      label: 'Metas',
      width: '25%',
      searchable: false,
      sortable: true
    },
    {
      key: 'locationCount',
      label: 'Locations',
      width: '25%',
      searchable: false,
      sortable: true
    },
    {
      key: 'mapsCount',
      label: 'Maps',
      width: '25%',
      searchable: false,
      sortable: true
    },
    {
      key: 'gamesPlayed',
      label: 'Games played',
      width: '25%',
      searchable: false,
      sortable: true
    }
  ];
</script>

<svelte:head>
  <title>Creator dashboard</title>
</svelte:head>

<div class="container">
  <div class="flex flex-wrap items-center">
    <div class="w-1/3">
      <Input type="text" placeholder="Search..." autocomplete="off" bind:value={searchText} />
    </div>
    <div class="flex-grow flex items-center justify-end space-x-3">
      <Button color="dark">Documentation</Button>
      <Dropdown>
        <DropdownItem
          target="_blank"
          href="https://docs.google.com/document/d/15FMgCvyT5pn-U_Ckfd-hoezsWhZMR2NpKBkoiD1aN6Y"
          >Text
        </DropdownItem>
        <DropdownItem target="_blank" href="https://youtu.be/0O2mg9G35xg">Video</DropdownItem>
      </Dropdown>
      <Button onclick={() => (mapGroupCreationModalOpen = true)}>Create group</Button>
    </div>
  </div>
  <SortFilterTable
    data={data.userGroups}
    {searchText}
    {columns}
    isModalOpen={false}
    selectedRowId={undefined} />
  {#if data.allGroups}
    <div class="mt-5">
      <hr />
      <ul class="">
        {#each data.allGroups as group (group.id)}
          <li>
            <a href="/dev/dash/groups/{group.id}"
              >{group.name}, locations: {group.locationCount} ({group.authors})</a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  <Modal bind:open={mapGroupCreationModalOpen}>
    <form method="POST" action="?/createGroup">
      <Label class="space-y-2">
        <span>Group name</span>
        <Input
          type="text"
          name="name"
          aria-invalid={$errors.name ? 'true' : undefined}
          bind:value={$form.name}
          {...$constraints.name} />
        {#if $errors.name}
          <Alert color="red">{$errors.name}</Alert>
        {/if}
      </Label>
      <Button type="submit" class="w-full mt-3">Save</Button>
    </form>
  </Modal>
</div>
