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
    regionChoices: { value: number; name: string }[];
    user: PageData['user'];
  }

  let {
    data,
    isMapModalOpen = $bindable(),
    selectedMap,
    groupId,
    levelChoices,
    regionChoices,
    user
  }: Props = $props();

  const { form, errors, constraints, enhance } = superForm(data, {
    dataType: 'json',
    onResult() {
      isMapModalOpen = false;
    }
  });

  $effect(() => {
    if (isMapModalOpen) {
      if (selectedMap) {
        $form.geoguessrId = selectedMap.geoguessrId;
        $form.id = selectedMap.id;
        $form.mapGroupId = selectedMap.mapGroupId;
        $form.name = selectedMap.name;
        $form.ordering = selectedMap.ordering;
        $form.description = selectedMap.description;
        $form.isPublished = selectedMap.isPublished;
        $form.isCommunity = selectedMap.isCommunity;
        $form.authors = selectedMap.authors;
        $form.autoUpdate = selectedMap.autoUpdate;
        $form.levels = selectedMap.mapLevels.map((item) => item.levelId);
        $form.regions = selectedMap.mapRegions.map((item) => item.regionId);
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
        $form.isCommunity = false;
        $form.authors = '';
        $form.autoUpdate = false;
        $form.levels = [];
        $form.regions = [];
        $form.includeFilters = [];
        $form.excludeFilters = [];
      }
    }
  });

  let includeFilterInput = $state('');

  let excludeFilterInput = $state('');
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
    {#if user.isSuperadmin || user.isTrusted}
      <Label>
        <Checkbox bind:checked={$form.isPublished}>Publish</Checkbox>
      </Label>
      <Label class="space-y-2">
        <span>Author(s)</span>
        <Input
          type="text"
          name="authors"
          aria-invalid={$errors.authors ? 'true' : undefined}
          bind:value={$form.authors}
          {...$constraints.authors} />
        {#if $errors.authors}
          <Alert color="red">{$errors.authors}</Alert>
        {/if}
      </Label>
    {/if}
    {#if user.isSuperadmin}
      <Label>
        <Checkbox bind:checked={$form.isCommunity}>Community map</Checkbox>
      </Label>
      <Label>
        <Checkbox bind:checked={$form.autoUpdate}>Auto Update</Checkbox>
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
      placeholder="Type an include filter..." />

    <!-- Exclude Filters Section -->
    <FilterManager
      bind:filters={$form.excludeFilters}
      bind:filterInput={excludeFilterInput}
      oppositeFilters={$form.includeFilters}
      title="Exclude Filters"
      placeholder="Type an exclude filter..." />

    <Label>
      <span>Regions</span>
      <MultiSelect items={regionChoices} bind:value={$form.regions} size="lg" />
    </Label>

    <Button type="submit" class="w-full">Save</Button>
  </form>
</Modal>
