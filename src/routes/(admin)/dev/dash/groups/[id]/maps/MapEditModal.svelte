<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import type { InsertMapsSchema } from './+page.server';
  import type { PageData } from './$types';
  import { Alert, Button, Input, Label, Modal, MultiSelect, Textarea } from 'flowbite-svelte';
  import Checkbox from 'flowbite-svelte/Checkbox.svelte';
  import FilterManager from './FilterManager.svelte';

  interface Props {
    data: SuperValidated<Infer<InsertMapsSchema>>;
    isMapModalOpen: boolean;
    selectedMap: PageData['group']['maps'][number] | null;
    groupId: number;
    levelChoices: { value: number; name: string }[];
    user: PageData['user'];
  }

  let {
    data,
    isMapModalOpen = $bindable(),
    selectedMap,
    groupId,
    levelChoices,
    user
  }: Props = $props();

  const { form, errors, constraints, enhance } = superForm(data, {
    dataType: 'json',
    onResult() {
      isMapModalOpen = false;
    }
  });

  $effect(() => {
    if (selectedMap) {
      $form.geoguessrId = selectedMap.geoguessrId;
      $form.id = selectedMap.id;
      $form.mapGroupId = selectedMap.mapGroupId;
      $form.name = selectedMap.name;
      $form.ordering = selectedMap.ordering;
      $form.description = selectedMap.description;
      $form.isPublished = selectedMap.isPublished;
      $form.levels = selectedMap.mapLevels.map((item) => item.levelId);
      $form.includeFilters = selectedMap.filters
        .filter((item) => item.isExclude == false)
        .map((item) => item.tagLike as string);
      $form.excludeFilters = selectedMap.filters
        .filter((item) => item.isExclude == true)
        .map((item) => item.tagLike as string);
    } else {
      $form.id = undefined;
      $form.mapGroupId = groupId;
      $form.geoguessrId = '';
      $form.name = '';
      $form.ordering = 0;
      $form.description = '';
      $form.isPublished = false;
      $form.levels = [];
      $form.includeFilters = [];
      $form.excludeFilters = [];
    }
  });

  let includeFilterInput = $state('');

  let excludeFilterInput = $state('');

  function handleIncludeUpdate(event: { detail: string[] }) {
    $form.includeFilters = event.detail; // Update include filters in the form
  }

  function handleExcludeUpdate(event: { detail: string[] }) {
    $form.excludeFilters = event.detail; // Keep track of exclude filters in a separate list
  }
</script>

<Modal bind:open={isMapModalOpen}>
  <form action="?/updateMap" class="flex flex-col space-y-6" method="post" use:enhance>
    <Input type="hidden" name="id" bind:value={$form.id} />
    <Input type="hidden" name="mapGroupId" bind:value={$form.mapGroupId} />
    <Label class="space-y-2">
      <span>Name</span>
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
    {#if user.isSuperadmin}
      <Label class="space-y-2">
        <span>Ordering</span>
        <Input
          type="number"
          name="ordering"
          aria-invalid={$errors.ordering ? 'true' : undefined}
          bind:value={$form.ordering}
          {...$constraints.ordering} />
        {#if $errors.ordering}
          <Alert color="red">{$errors.ordering}</Alert>
        {/if}
      </Label>
    {/if}
    <Label class="space-y-2">
      <span>Geoguessr Id</span>
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
    <Label class="space-y-2">
      <span>Description</span>
      <Textarea
        rows="6"
        name="description"
        aria-invalid={$errors.description ? 'true' : undefined}
        bind:value={$form.description}
        {...$constraints.description} />
      {#if $errors.description}
        <Alert color="red">{$errors.description}</Alert>
      {/if}
    </Label>
    {#if user.isSuperadmin}
      <Label>
        <Checkbox bind:checked={$form.isPublished}>List map on homepage</Checkbox>
      </Label>
    {/if}
    <Label>
      <span>Levels</span>
      <MultiSelect items={levelChoices} bind:value={$form.levels} size="lg" />
    </Label>
    <!-- Include Filters Section -->
    <FilterManager
      bind:filters={$form.includeFilters}
      bind:filterInput={includeFilterInput}
      oppositeFilters={$form.excludeFilters}
      title="Include Filters"
      placeholder="Type an include filter..."
      on:updateFilters={handleIncludeUpdate} />

    <!-- Exclude Filters Section -->
    <FilterManager
      bind:filters={$form.excludeFilters}
      bind:filterInput={excludeFilterInput}
      oppositeFilters={$form.includeFilters}
      title="Exclude Filters"
      placeholder="Type an exclude filter..."
      on:updateFilters={handleExcludeUpdate} />

    <Button type="submit" class="w-full">Save</Button>
  </form>
</Modal>
