<script lang="ts">
  export let images: string[] = [];

  let currentIndex = 0;

  function prev() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
  }

  function next() {
    currentIndex = (currentIndex + 1) % images.length;
  }
</script>

<div class="carousel">
  {#if images.length}
    {#each images as image, index}
      {#if index === currentIndex}
        <div class="image-wrapper">
          <img src={image} alt="Image {index + 1}" class="responsive-image" />
        </div>
      {/if}
    {/each}
  {/if}

  {#if images.length > 1}
    <div class="controls">
      <button class="prev" onclick={prev}>&#10094;</button>
      <button class="next" onclick={next}>&#10095;</button>
    </div>

    <div class="indicators">
      {#each images as _, index}
        <button
          aria-label={`Switch to image ${index + 1}`}
          class="indicator {index === currentIndex ? 'active' : ''}"
          onclick={() => (currentIndex = index)}>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .carousel {
    position: relative;
    overflow: hidden;
    margin: 0 auto;
  }

  .image-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .responsive-image {
    max-width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  .controls {
    position: absolute;
    top: 20px; /* Small offset from the top */
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    pointer-events: none;
  }

  .prev,
  .next {
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    font-size: 2em;
    padding: 0.2em 0.5em;
    cursor: pointer;
  }

  .indicators {
    position: absolute;
    bottom: 15px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
  }

  .indicator {
    width: 12px;
    height: 12px;
    background-color: rgba(255, 255, 255, 0.5);
    margin: 0 4px;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .active {
    background-color: white;
  }
</style>
