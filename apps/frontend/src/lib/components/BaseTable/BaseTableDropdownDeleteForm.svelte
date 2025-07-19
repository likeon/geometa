<script lang="ts">
  import { enhance } from '$app/forms';
  let {
    action,
    id,
    label = 'Delete',
    confirmMessage = 'Are you sure you want to delete this?',
    dropdownOpen = $bindable()
  }: {
    action: string;
    id: number;
    label?: string;
    confirmMessage?: string;
    dropdownOpen?: boolean;
  } = $props();
</script>

<form
  {action}
  method="post"
  id={`delete-form-${id}`}
  use:enhance={({ cancel }) => {
    const confirmed = confirm(confirmMessage);
    if (!confirmed) {
      cancel();
      dropdownOpen = false;
    }
    return async ({ update }) => {
      update();
      dropdownOpen = false;
    };
  }}>
  <input type="hidden" name="id" value={id} />
  <button type="submit" class="w-full text-left px-2 py-1.5 hover:bg-muted">
    {label}
  </button>
</form>
