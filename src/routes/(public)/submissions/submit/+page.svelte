<script lang="ts">
  import { Alert, Button, Checkbox, Input, Label, Textarea } from 'flowbite-svelte';
  import { superForm } from 'sveltekit-superforms';

  export let data;
  const { metaForm, errors, constraints, message } = superForm(data.metaForm);
  let leaderboardCheckbox = false;
</script>

<svelte:head>
  <title>Community Submissions - Submit</title>
</svelte:head>

<div id="content" class="bg-white px-6 py-10 lg:px-8 mt-[70px]">
  <div class="mx-auto max-w-3xl text-base leading-7 text-gray-700">
    {#if $message}
      <Alert
        >Thank you for contributing! You can track the status of your submission <a
          href="/submissions/track/{$message.id}/{$message.secret}">via this link</a
        ></Alert>
    {/if}
    <h1 class="text-3xl">Submit location</h1>
    <metaForm method="POST">
      <Label class="my-2 space-y-2">
        <span>Google Street View url</span>
        <Input
          type="text"
          name="url"
          autocomplete="off"
          aria-invalid={$errors.url ? 'true' : undefined}
          bind:value={$metaForm.url}
          {...$constraints.url} />
        {#if $errors.url}<Alert color="red">{$errors.url}</Alert>{/if}
      </Label>
      <Label class="my-2 space-y-2">
        <span>Describe the meta</span>
        <Textarea
          name="description"
          required
          rows={5}
          aria-invalid={$errors.description ? 'true' : undefined}
          bind:value={$metaForm.description}
          {...$constraints.description} />
      </Label>
      <Checkbox bind:checked={leaderboardCheckbox}>Add me to the leaderboard</Checkbox>
      <p class="text-gray-700 text-sm">Shows up on the leaderborad only after approval</p>
      {#if leaderboardCheckbox}
        <Label class="my-2 space-y-2">
          <span>Nickname</span>
          <Input
            type="text"
            name="author_nickname"
            required
            aria-invalid={$errors.author_nickname ? 'true' : undefined}
            bind:value={$metaForm.author_nickname}
            {...$constraints.author_nickname} />
        </Label>
      {/if}
      <Button type="submit" class="w-full mt-3">Submit</Button>
    </metaForm>
  </div>
</div>
