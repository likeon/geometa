<script lang="ts">
  import { Alert, Button, Input, Label, Modal } from 'flowbite-svelte';
  import { columns } from './columns';
  import BaseTable from '$lib/components/BaseTable/BaseTable.svelte';
  import { superForm } from 'sveltekit-superforms';
  import TooltipName from '$lib/components/TooltipName.svelte';
  import * as Collapsible from '$lib/components/ui/collapsible';
  let { data } = $props();
  let personalMapCreationModalOpen = $state(false);

  const {
    form: form,
    errors: errors,
    constraints: constraints,
    enhance: enhance
  } = superForm(data.personalMapForm, {
    dataType: 'json',
    onResult(result) {
      if (result.result.type === 'success' && result.result.data?.success) {
        personalMapCreationModalOpen = false;
      }
    }
  });
</script>

<div class="container">
  <Collapsible.Root>
    <Collapsible.Trigger
      ><div class="p-2 bg-gray-300 dark:bg-gray-500 rounded">
        What are the personal maps?
      </div></Collapsible.Trigger>
    <Collapsible.Content>
      <p>
        Personal maps let you create your own custom maps by adding selected metas shared by other
        map-makers from their maps. You can add metas to your map by going to shared map meta list.
      </p>
    </Collapsible.Content>
  </Collapsible.Root>
  <div class="flex flex-wrap items-center">
    <div class="flex-grow flex items-center justify-end space-x-3">
      <Button onclick={() => (personalMapCreationModalOpen = true)}>Add personal map</Button>
    </div>
  </div>
  <div class="my-5">
    <BaseTable
      {columns}
      data={data.personalMaps}
      initialSorting={[{ id: 'name', desc: false }]}
      emptyText="You don't have any personal maps, create one!" />
  </div>

  <Modal bind:open={personalMapCreationModalOpen}>
    <form action="?/createPersonalMap" class="flex flex-col space-y-2" method="post" use:enhance>
      <Label>
        <TooltipName name="name" tooltipText="name"></TooltipName>
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
      <Label>
        <TooltipName name="geoguessrId" tooltipText="geoguessrId"></TooltipName>
        <Input
          type="text"
          name="geoguessrId"
          aria-invalid={$errors.geoguessrId ? 'true' : undefined}
          bind:value={$form.geoguessrId}
          {...$constraints.geoguessrId} />
        {#if $errors.geoguessrId}
          <Alert color="red">{$errors.geoguessrId}</Alert>
        {/if}
      </Label>
      <Button type="submit" class="w-full">Save</Button>
    </form>
  </Modal>
</div>
