<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import BaseTable from '$lib/components/BaseTable/BaseTable.svelte';
  import { columns } from './columns';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Dialog from '$lib/components/ui/dialog/index';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index';
  import * as Form from '$lib/components/ui/form/index';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { insertMapGroupSchema } from '$lib/form-schema';

  let { data } = $props();
  let mapGroupCreationDialogOpen = $state(false);

  const form = superForm(data.mapGroupForm, {
    validators: zodClient(insertMapGroupSchema)
  });
  const { form: formData, enhance } = form;
</script>

<svelte:head>
  <title>Creator dashboard</title>
</svelte:head>

<div class="container">
  <div class="flex flex-wrap items-center">
    <div class="grow flex items-center justify-end space-x-3">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="outline">Documentation</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <a
            href="https://docs.google.com/document/d/15FMgCvyT5pn-U_Ckfd-hoezsWhZMR2NpKBkoiD1aN6Y"
            target="_blank"
            rel="noopener noreferrer"
            class="block">
            <DropdownMenu.Item>Text</DropdownMenu.Item>
          </a>
          <a
            href="https://youtu.be/0O2mg9G35xg"
            target="_blank"
            rel="noopener noreferrer"
            class="block">
            <DropdownMenu.Item>Video</DropdownMenu.Item>
          </a>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <Button
        onclick={() => {
          mapGroupCreationDialogOpen = true;
        }}>Create group</Button>
    </div>
  </div>
  <div class="my-5">
    <BaseTable {columns} data={data.userGroups} initialSorting={[{ id: 'name', desc: false }]} />
  </div>
  {#if data.allGroups}
    <div>
      <hr />
      <ul class="">
        {#each data.allGroups as group (group.id)}
          <li>
            <a href="/map-making/groups/{group.id}"
              >{group.name}, locations: {group.locationCount} ({group.authors})</a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <Dialog.Root bind:open={mapGroupCreationDialogOpen}>
    <Dialog.Content class="sm:max-w-md">
      <!--     TODO: currently allows for empty strings, check it-->
      <form method="POST" use:enhance action="?/createGroup">
        <Form.Field {form} name="name">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Name</Form.Label>
              <Input {...props} bind:value={$formData.name} />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
        <Form.Button>Create map group</Form.Button>
      </form>
    </Dialog.Content>
  </Dialog.Root>
</div>
