<script lang="ts">
  import { Alert, Button, Input, Label, Modal } from 'flowbite-svelte';
  import { superForm } from 'sveltekit-superforms';

  let { data } = $props();
  let mapGroupCreationModalOpen = $state(false);
  const { form, errors, constraints } = superForm(data.mapGroupForm);
</script>

<div class="container">
  <div class="flex">
    <div class="w-2/3">
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
    <div class="justify-end">
      <Button onclick={() => (mapGroupCreationModalOpen = true)}>Create group</Button>
    </div>
  </div>
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
