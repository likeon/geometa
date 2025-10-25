<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { enhance as enhanceForm } from '$app/forms';
  import BaseTable from '$lib/components/BaseTable/BaseTable.svelte';
  import { columns } from './columns';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Dialog from '$lib/components/ui/dialog/index';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index';
  import * as Form from '$lib/components/ui/form/index';
  import { zod4Client } from 'sveltekit-superforms/adapters';
  import { insertMapGroupSchema } from '$lib/form-schema';

  let { data, form: actionData } = $props();
  let mapGroupCreationDialogOpen = $state(false);
  let geoguessrId = $state('');
  let isLookingUp = $state(false);

  const form = superForm(data.mapGroupForm, {
    validators: zod4Client(insertMapGroupSchema)
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
    <div class="my-8">
      <h2 class="text-lg font-semibold mb-4">Find Map by GeoGuessr Map ID</h2>
      <form
        method="POST"
        action="?/lookupMapGroup"
        class="flex gap-3 items-start"
        use:enhanceForm={() => {
          isLookingUp = true;

          return async ({ update }) => {
            await update();
            isLookingUp = false;
          };
        }}>
        <div class="flex-1 max-w-md">
          <Input
            name="geoguessrId"
            placeholder="Enter GeoGuessr Map ID"
            bind:value={geoguessrId}
            required />
        </div>
        <Button type="submit" disabled={isLookingUp}>
          {isLookingUp ? 'Looking up...' : 'Lookup Map'}
        </Button>
      </form>

      {#if actionData?.mapGroup}
        {@const isPersonal = actionData.mapGroup.isPersonal}
        {@const title = isPersonal ? 'Personal Map Found:' : 'MapGroup Found:'}
        {@const idLabel = isPersonal ? 'Personal Map ID:' : 'MapGroup ID:'}
        {@const ownerLabel = isPersonal ? 'Owner:' : 'Owner(s):'}
        {@const ownerValue =
          'owner' in actionData.mapGroup ? actionData.mapGroup.owner : actionData.mapGroup.owners}
        {@const linkText = isPersonal ? 'View Personal Map →' : 'View MapGroup →'}
        {@const resolvedHref = isPersonal
          ? `/personal/${String(actionData.mapGroup.id)}`
          : `/map-making/groups/${String(actionData.mapGroup.id)}`}

        <div
          class="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
          <p class="font-semibold">{title}</p>
          <p class="mt-1">
            <span class="font-medium">{idLabel}</span>
            {actionData.mapGroup.id}
          </p>
          <p>
            <span class="font-medium">Name:</span>
            {actionData.mapGroup.name}
          </p>
          <p>
            <span class="font-medium">{ownerLabel}</span>
            {ownerValue}
          </p>
          <a
            href={resolvedHref}
            class="inline-block mt-2 text-blue-600 dark:text-blue-400 hover:underline">
            {linkText}
          </a>
        </div>
      {/if}

      {#if actionData?.error}
        <div
          class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p class="text-red-700 dark:text-red-300">{actionData.error}</p>
        </div>
      {/if}
    </div>

    <hr class="my-6" />

    <div>
      <ul class="">
        {#each data.allGroups as group (group.id)}
          <li>
            <a href={`/map-making/groups/${String(group.id)}`}
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
