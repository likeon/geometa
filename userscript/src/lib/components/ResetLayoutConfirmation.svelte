<script lang="ts">
  import { modalDialog } from '../utils/modalDialog';

  let { onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void } = $props();
</script>

<div class="learnablemeta-modal-backdrop learnablemeta-ui" role="presentation">
  <div
    class="learnablemeta-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="reset-layout-title"
    use:modalDialog={{ onClose: onCancel }}>
    <div class="learnablemeta-modal-header">
      <p class="learnablemeta-modal-eyebrow">LearnableMeta</p>
      <h2 class="learnablemeta-modal-title" id="reset-layout-title">Reset window layout?</h2>
      <p class="learnablemeta-modal-description">
        The meta window will return to its default position and size.
      </p>
    </div>
    <div class="learnablemeta-modal-actions">
      <button
        type="button"
        onclick={onCancel}
        data-modal-initial-focus
        class="learnablemeta-button learnablemeta-button--outline">Cancel</button>
      <button
        type="button"
        onclick={onConfirm}
        class="learnablemeta-button learnablemeta-button--primary">Reset layout</button>
    </div>
  </div>
</div>
