<script lang="ts">
  import { SITE_BASE_URL } from '../config';

  let { mapId }: { mapId: string } = $props();
</script>

<div class="geometa-map-label-container">
  <p>LearnableMeta Enabled</p>
  <a href={`${SITE_BASE_URL}/maps/${mapId}`} target="_blank">Meta List</a>
</div>

<style>
  .geometa-map-label-container {
    background-color: rgba(0, 0, 0, 0.65);
    color: #fff;
    text-align: center;
    z-index: 100;
    position: absolute;
    bottom: 4px;
    right: 4px;
    box-sizing: border-box;
    border-radius: 8px;
    padding: 8px;
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  p {
    font-size: 14px;
    font-weight: bold;
  }

  a {
    padding: 6px 12px;
    font-size: 12px;
    color: #fff;
    text-decoration: none;
    background-color: #4caf50;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
