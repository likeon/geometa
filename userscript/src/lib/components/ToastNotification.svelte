<script lang="ts">
  import { fade } from 'svelte/transition';

  interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
  }

  let {
    message,
    type = 'info',
    onClose,
  }: ToastProps = $props();
</script>

<div
  class="toast-notification toast-{type}"
  role="alert"
  in:fade={{ duration: 200, delay: 50 }}
  out:fade={{ duration: 300 }}
  style:position="absolute"
  style:top= '100%'
  style:transform='translateX(-75%) translateY(-10px)'
  style:margin-top='10px'
>
  <span class="toast-message">{message}</span>
  <button class="toast-close-button" onclick={onClose} aria-label="Close">×</button>
</div>

<style>
  .toast-notification {
    z-index: 10001;
    min-width: 250px;
    max-width: 400px;

    /* Existing styles */
    padding: 14px 22px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.95em;
    line-height: 1.4;
  }

  .toast-success {
    background-color: #28a745;
    border-left: 5px solid #1e7e34;
  }

  .toast-error {
    background-color: #dc3545;
    border-left: 5px solid #b02a37;
  }

  .toast-info {
    background-color: #17a2b8;
    border-left: 5px solid #117a8b;
  }

  .toast-warning {
    background-color: #ffc107;
    color: #212529;
    border-left: 5px solid #d39e00;
  }

  .toast-message {
    flex-grow: 1;
    margin-right: 10px;
  }

  .toast-close-button {
    background: transparent;
    border: none;
    color: inherit;
    font-size: 1.6em;
    font-weight: bold;
    margin-left: 10px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  .toast-close-button:hover {
    opacity: 1;
  }
</style>
