<script lang="ts">
  import { resolve } from '$app/paths';
  import { columns } from './columns';
  import BaseTable from '$lib/components/BaseTable/BaseTable.svelte';
  import { superForm } from 'sveltekit-superforms';
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog/index';
  import * as Form from '$lib/components/ui/form/index';
  import { zod4Client } from 'sveltekit-superforms/adapters';
  import { insertPersonalMap } from '$lib/form-schema';
  import { Input } from '$lib/components/ui/input';
  import FormLabelWithTooltip from '$lib/components/FormLabelWithTooltip.svelte';
  let { data } = $props();
  let personalMapCreationDialogOpen = $state(false);

  // svelte-ignore state_referenced_locally
  const formPersonal = superForm(data.personalMapForm, {
    validators: zod4Client(insertPersonalMap),
    resetForm: true,
    dataType: 'json',
    onResult({ result }) {
      if (result.type === 'success') {
        personalMapCreationDialogOpen = false;
      }
    }
  });
  const { form, enhance } = formPersonal;
</script>

<div class="container">
  <div class="flex flex-wrap items-center">
    <div class="grow flex items-center justify-end space-x-3">
      <a href={resolve('/personal-maps')} target="_blank" rel="noopener noreferrer">
        <Button variant="outline">What are personal maps?</Button>
      </a>
      <Button onclick={() => (personalMapCreationDialogOpen = true)}>Add personal map</Button>
    </div>
  </div>
  <div class="my-5">
    <BaseTable
      {columns}
      data={data.personalMaps}
      initialSorting={[{ id: 'name', desc: false }]}
      emptyText="You don't have any personal maps, create one!" />
  </div>
  <Dialog.Root bind:open={personalMapCreationDialogOpen}>
    <Dialog.Content class="sm:max-w-3xl w-full">
      <form action="?/createPersonalMap" class="flex flex-col space-y-2" method="post" use:enhance>
        <Form.Field form={formPersonal} name="name">
          <Form.Control>
            {#snippet children({ props })}
              <FormLabelWithTooltip label="Name" tooltipContent="Name of your map" />
              <Input {...props} bind:value={$form.name} />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
        <Form.Field form={formPersonal} name="geoguessrId">
          <Form.Control>
            {#snippet children({ props })}
              <FormLabelWithTooltip
                label="GeoguessrId"
                tooltipContent="GeoguessrId of your personal map" />
              <Input {...props} bind:value={$form.geoguessrId} />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
        <Button type="submit" class="w-full">Save</Button>
      </form>
    </Dialog.Content>
  </Dialog.Root>
</div>
