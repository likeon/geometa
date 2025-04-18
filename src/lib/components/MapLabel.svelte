<script lang="ts">
  let { mapId }: {mapId: string} = $props();
</script>

<div class="geometa-map-label-container">
  <p>LearnableMeta Enabled</p>
  <a href={`https://learnablemeta.com/maps/${mapId}`} target="_blank"><button>Meta List</button></a>
</div>

<style>
  .geometa-map-label-container {
    background-color: #252541;
    color: #fff;
    text-align: center;
    z-index: 999999;
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 220px;
    height: 50%;
    box-sizing: border-box;
    border-radius: 0 0 110px 110px;
    clip-path: inset(40% 0 0 0);
  }

  p {
    font-size: 14px;
    margin-top: 48px;
    font-weight: bold;
  }

  button {
    margin-top: 6px;
    padding: 6px 12px;
    font-size: 12px;
    color: #fff;
    background-color: #4CAF50;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
