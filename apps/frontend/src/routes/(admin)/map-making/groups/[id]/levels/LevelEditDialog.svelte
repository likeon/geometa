<script lang="ts">
  import * as Form from '$lib/components/ui/form/index';
  import { Input } from '$lib/components/ui/input/index';
  import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import * as Dialog from '$lib/components/ui/dialog/index';
  import type { PageData } from './$types';
  import { insertLevelsSchema, type InsertLevelsSchema } from '$lib/form-schema';
  import FormLabelWithTooltip from '$lib/components/FormLabelWithTooltip.svelte';

  let {
    isLevelDialogOpen = $bindable(),
    levelForm,
    mapGroupId,
    selectedLevel
  }: {
    isLevelDialogOpen: boolean;
    levelForm: SuperValidated<Infer<InsertLevelsSchema>>;
    mapGroupId: number;
    selectedLevel: PageData['group']['levels'][number] | null;
  } = $props();

  const formLevel = superForm(levelForm, {
    validators: zodClient(insertLevelsSchema),
    resetForm: true,
    dataType: 'json',
    onResult({ result }) {
      if (result.type === 'success') {
        isLevelDialogOpen = false;
      }
    }
  });

  const { form: formLevelData, enhance: enhanceLevel } = formLevel;

  function nullifyForm() {
    formLevelData.update(
      ($formLevelData) => {
        $formLevelData.id = undefined;
        $formLevelData.mapGroupId = mapGroupId;
        $formLevelData.name = '';
        return $formLevelData;
      },
      { taint: false }
    );
  }

  function fillForm(level: PageData['group']['levels'][number] | null) {
    if (level) {
      formLevelData.update(
        ($formLevelData) => {
          $formLevelData.id = level.id;
          $formLevelData.mapGroupId = mapGroupId;
          $formLevelData.name = level.name;
          return $formLevelData;
        },
        { taint: false }
      );
    } else {
      nullifyForm();
    }
  }

  $effect(() => {
    if (isLevelDialogOpen) {
      fillForm(selectedLevel);
    }
  });
</script>

<Dialog.Root bind:open={isLevelDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <form method="POST" use:enhanceLevel action="?/updateLevel">
      <Input type="hidden" name="id" bind:value={$formLevelData.id} />
      <Input type="hidden" name="mapGroupId" bind:value={$formLevelData.mapGroupId} />

      <Form.Field form={formLevel} name="name">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex items-center justify-between mb-2">
              <FormLabelWithTooltip
                label="Name"
                tooltipContent="The name of the level that can be assigned to metas and used for filtering in maps." />
            </div>
            <Input {...props} bind:value={$formLevelData.name} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Button class="w-full mt-6">Save level</Form.Button>
    </form>
  </Dialog.Content>
</Dialog.Root>
