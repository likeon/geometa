<script lang="ts">
  import {
    Alert,
    Button,
    Input,
    Label,
    Modal,
    MultiSelect,
    TabItem,
    Tabs,
    Textarea
  } from 'flowbite-svelte';
  import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
  import type { InsertMetasSchema, MapUploadSchema } from './+page.server';
  import type { PageData } from './$types';
  import MetaImages from '$routes/(admin)/dev/dash/groups/[id]/MetaImages.svelte';

  export let isMetaModalOpen: boolean;
  export let selectedMeta: PageData['group']['metas'][number] | null;
  export let metaForm: SuperValidated<Infer<InsertMetasSchema>>;
  export let levelChoices: { value: number; name: string }[];
  export let groupId: number;
  export let imageUploadForm: SuperValidated<Infer<MapUploadSchema>>;

  $: images = selectedMeta?.images;

  const { form, errors, constraints, enhance } = superForm(metaForm, {
    dataType: 'json',
    onResult() {
      isMetaModalOpen = false;
    }
  });

  $: if (selectedMeta) {
    $form.id = selectedMeta.id;
    $form.mapGroupId = selectedMeta.mapGroupId;
    $form.tagName = selectedMeta.tagName;
    $form.name = selectedMeta.name;
    $form.note = selectedMeta.note;
    $form.noteFromPlonkit = selectedMeta.noteFromPlonkit;
    $form.hasImage = selectedMeta.hasImage;
    $form.levels = selectedMeta.metaLevels.map((item) => item.levelId);
  } else {
    $form.id = undefined;
    $form.mapGroupId = groupId;
    $form.tagName = '';
    $form.name = '';
    $form.note = '';
    $form.noteFromPlonkit = false;
    $form.hasImage = false;
    $form.levels = [];
  }
</script>

<Modal bind:open={isMetaModalOpen}>
  <Tabs contentClass="p-4 mt-4" tabStyle="underline">
    <TabItem open title="Info">
      <form action="?/updateMeta" class="flex flex-col space-y-6" method="post" use:enhance>
        <Input type="hidden" name="id" bind:value={$form.id} />
        <Input type="hidden" name="mapGroupId" bind:value={$form.mapGroupId} />
        <Label class="space-y-2">
          <span>Tag name</span>
          <Input
            type="text"
            name="tagName"
            aria-invalid={$errors.tagName ? 'true' : undefined}
            bind:value={$form.tagName}
            {...$constraints.tagName}
          />
          {#if $errors.tagName}
            <Alert color="red">{$errors.tagName}</Alert>
          {/if}
        </Label>
        <Label class="space-y-2">
          <span>Name</span>
          <Input
            type="text"
            name="name"
            aria-invalid={$errors.name ? 'true' : undefined}
            bind:value={$form.name}
            {...$constraints.name}
          />
          {#if $errors.name}
            <Alert color="red">{$errors.name}</Alert>
          {/if}
        </Label>
        <Label class="space-y-2">
          <span>Note</span>
          <Textarea
            rows="6"
            name="note"
            aria-invalid={$errors.note ? 'true' : undefined}
            bind:value={$form.note}
            {...$constraints.note}
          />
          {#if $errors.note}
            <Alert color="red">{$errors.note}</Alert>
          {/if}
        </Label>
        <Label>
          <span>Levels</span>
          <MultiSelect items={levelChoices} bind:value={$form.levels} size="lg" />
        </Label>
        <Button type="submit" class="w-full">Save</Button>
      </form>
    </TabItem>
    {#if selectedMeta?.id}
      <TabItem title="Images">
        <MetaImages data={imageUploadForm} metaId={selectedMeta.id} images={images || []} />
      </TabItem>
    {/if}
  </Tabs>
</Modal>
