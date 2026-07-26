<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import DashNavBar from '$lib/components/DashNavBar.svelte';
  import Icon from '@iconify/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { Card, CardContent } from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';
  import { Switch } from '$lib/components/ui/switch';
  import { superForm } from 'sveltekit-superforms';
  import { toast } from 'svelte-sonner';

  let { data } = $props();

  let deleteDialogOpen = $state(false);
  let inputText = $state('');
  let groupNameMatches = $derived(inputText == data.group.name);
  let isOwner = $derived(data.role === 'owner');

  function pluralize(word: string, count: number): string {
    return count == 1 ? word : `${word}s`;
  }

  function handlePermissionDeleteSubmit(event: SubmitEvent) {
    if (!confirm('Are you sure?')) {
      event.preventDefault();
    }
  }

  // svelte-ignore state_referenced_locally
  const permissionCreate = superForm(data.permissionCreateForm);
  const {
    form: permissionCreateForm,
    errors: permissionCreateErrors,
    constraints: permissionCreateConstraints,
    enhance: permissionCreateEnhance
  } = permissionCreate;

  // svelte-ignore state_referenced_locally
  const settings = superForm(data.settingsForm, {
    onResult({ result }) {
      if (result.type === 'success') {
        toast('Settings updated successfully!');
      }
    }
  });
  const { form: settingsForm, enhance: settingsEnhance } = settings;
</script>

<div>
  <DashNavBar groupId={data.group.id} groupName={data.group.name} canRename={isOwner}></DashNavBar>

  <h4 class="text-lg font-semibold">Sharing</h4>
  <p>A list of users with access to this group</p>

  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.Head class="w-[300px]">Discord Username</Table.Head>
        <Table.Head class="w-[140px]">Role</Table.Head>
        <Table.Head>Access</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each data.group.permissions as permission (permission.id)}
        <Table.Row>
          <Table.Cell class="font-medium">{permission.user.username}</Table.Cell>
          <Table.Cell>
            {#if isOwner && permission.user.id !== data.user.id}
              <form
                action="?/updatePermissionRole"
                method="post"
                use:enhance={({ formElement }) => {
                  return async ({ result, update }) => {
                    if (result.type === 'failure') {
                      const failureData = result.data as
                        | { errors?: Record<string, string[]> }
                        | undefined;
                      toast.error(
                        Object.values(failureData?.errors ?? {}).flat()[0] ??
                          'Failed to update role'
                      );
                      // restore the select to the real role
                      const select = formElement.querySelector('select');
                      if (select) select.value = permission.role;
                      await invalidateAll();
                      return;
                    }
                    await update();
                  };
                }}>
                <input type="hidden" name="permissionId" value={permission.id} />
                <select
                  name="role"
                  value={permission.role}
                  onchange={(e) => {
                    const select = e.currentTarget;
                    if (
                      select.value === 'owner' &&
                      !confirm(
                        `Make ${permission.user.username} an owner? Owners can sync, manage members and delete the group.`
                      )
                    ) {
                      select.value = permission.role;
                      return;
                    }
                    select.form?.requestSubmit();
                  }}
                  class="border-input bg-background h-8 rounded-md border px-2 text-sm">
                  <option value="owner">owner</option>
                  <option value="editor">editor</option>
                </select>
              </form>
            {:else}
              <span class="text-sm text-muted-foreground">{permission.role}</span>
            {/if}
          </Table.Cell>
          <Table.Cell>
            {#if isOwner && permission.user.id !== data.user.id}
              <form
                action="?/deletePermission"
                method="post"
                use:enhance
                onsubmit={handlePermissionDeleteSubmit}>
                <input type="hidden" name="permissionId" value={permission.id} />
                <button type="submit">
                  <Icon icon="streamline:delete-1-solid" class="text-red-700 h-3 w-3" />
                </button>
              </form>
            {/if}
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>

  {#if isOwner}
    <form action="?/createPermission" class="space-y-1" method="post" use:permissionCreateEnhance>
      <div class="space-y-2">
        <Label for="username">Share</Label>
        <div class="flex items-center space-x-2">
          <Input
            id="username"
            type="text"
            name="username"
            placeholder="Discord username"
            aria-invalid={$permissionCreateErrors.username ? 'true' : undefined}
            bind:value={$permissionCreateForm.username}
            class="w-[208px]"
            {...$permissionCreateConstraints.username} />
          <select
            name="role"
            bind:value={$permissionCreateForm.role}
            class="border-input bg-background h-9 rounded-md border px-2 text-sm">
            <option value="editor">editor</option>
            <option value="owner">owner</option>
          </select>
        </div>
        <p class="text-sm text-muted-foreground mt-2">
          User must be in our database (logged into the dashboard least once). Editors can edit
          content but can't sync, manage members or delete the group.
        </p>
        {#if $permissionCreateErrors.username}
          <Alert variant="destructive">
            <AlertDescription>{$permissionCreateErrors.username}</AlertDescription>
          </Alert>
        {/if}
      </div>
      <Button type="submit" variant="outline">Share</Button>
    </form>

    <h4 class="text-lg font-semibold mt-6">Settings</h4>
    <p>Configure map group settings</p>

    <form action="?/updateSettings" method="post" class="space-y-4 mt-2" use:settingsEnhance>
      <div class="flex items-center space-x-2">
        <Switch
          id="syncIncludeLocationsNotOnStreetView"
          name="syncIncludeLocationsNotOnStreetView"
          bind:checked={$settingsForm.syncIncludeLocationsNotOnStreetView} />
        <Label for="syncIncludeLocationsNotOnStreetView" class="cursor-pointer">
          Include locations not on Street View
        </Label>
      </div>
      <p class="text-sm text-muted-foreground">
        When enabled, locations that are not available on Street View will be included when syncing
        with GeoGuessr.
      </p>
      <Button type="submit" variant="outline">Save Settings</Button>
    </form>

    <h4 class="text-lg font-semibold mt-6">Danger Zone</h4>

    <Card class="border-red-300 dark:border-red-800 border-2 w-full max-w-lg mt-2">
      <CardContent class="p-4">
        <div class="flex justify-between items-center py-3 space-x-4">
          <div>
            <p class="font-semibold">Delete this map group</p>
            <p class="text-sm text-muted-foreground">
              Once you delete a group, there is no going back.
            </p>
            <p class="text-sm text-muted-foreground">Please be certain.</p>
          </div>
          <Button variant="destructive" onclick={() => (deleteDialogOpen = true)}>Delete</Button>
        </div>
      </CardContent>
    </Card>
  {/if}
</div>

<Dialog bind:open={deleteDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete group "{data.group.name}"</DialogTitle>
    </DialogHeader>

    <div class="flex flex-col items-center py-4">
      <div class="p-4">
        <Icon icon="entypo:location" width="80" height="80" />
      </div>
      <p class="mt-2 text-md text-muted-foreground">
        {data.group.metasCount}
        {pluralize('meta', data.group.metasCount)} · {data.group.locationsCount}
        {pluralize('location', data.group.locationsCount)}
      </p>
    </div>

    <hr />

    <p class="font-semibold">To confirm, type "{data.group.name}" in the box below</p>

    <form action="?/deleteGroup" class="flex flex-col" method="post" use:enhance>
      <input type="hidden" name="id" value={data.group.id} />
      <Input name="group-name" bind:value={inputText} />
      <Button type="submit" variant="destructive" class="w-full mt-3" disabled={!groupNameMatches}>
        Delete this group
      </Button>
    </form>
  </DialogContent>
</Dialog>
