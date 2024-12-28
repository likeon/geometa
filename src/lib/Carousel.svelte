<script lang="ts">
  export let images: string[] = [];

  let currentIndex = 0;

  function prev() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
  }

  function next() {
    currentIndex = (currentIndex + 1) % images.length;
  }

  // --- Zoom-related state ---
  let containerRef: HTMLDivElement | null = null;
  let imageRef: HTMLImageElement | null = null;
  let isZoomed = false;

  // Mouse position within the container
  let lensX = 0;
  let lensY = 0;

  // Lens and zoom factor
  let lensSize = 150; // diameter of the circular lens
  let scale = 2;      // zoom scale

  function handleMouseEnter() {
    isZoomed = true;
  }

  function handleMouseLeave() {
    isZoomed = false;
  }

  function handleMouseMove(event: MouseEvent) {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();

    // Calculate mouse position relative to the container
    lensX = event.clientX - rect.left;
    lensY = event.clientY - rect.top;
  }
</script>

<div class="carousel">
  {#if images.length}
    {#each images as image, index}
      {#if index === currentIndex}
        <div
          class="image-wrapper"
          bind:this={containerRef}
          onmouseenter={handleMouseEnter}
          onmouseleave={handleMouseLeave}
          onmousemove={handleMouseMove}
          role="img"
          aria-label="Zoomable image"
        >
          <img
            src={image}
            alt="Image {index + 1}"
            class="responsive-image"
            bind:this={imageRef}
          />

          {#if isZoomed && imageRef}
            <!-- The circular lens overlay -->
            <div
              class="lens"
              style="
                /* Position the lens so the mouse is in its center */
                top: {lensY - lensSize/2}px;
                left: {lensX - lensSize/2}px;
                width: {lensSize}px;
                height: {lensSize}px;
                background-image: url({image});
                background-repeat: no-repeat;
                background-size: {imageRef.width * scale}px {imageRef.height * scale}px;
                background-position: {-(lensX * scale - lensSize/2)}px {-(lensY * scale - lensSize/2)}px;
              "
            ></div>
          {/if}
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
          onclick={() => (currentIndex = index)}
        ></button>
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
    cursor: zoom-in;
  }

  .responsive-image {
    max-width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  .lens {
    position: absolute;
    pointer-events: none;
    border: 2px solid #aaa;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
  }

  .controls {
    position: absolute;
    top: 20px;
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
    pointer-events: auto;
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

  .indicator.active {
    background-color: white;
  }
</style>
