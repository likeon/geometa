<div class="loadership_PLFNR">
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>

<style lang="postcss">
  .loadership_PLFNR {
    display: flex;
    position: relative;
    width: 29px;
    height: 7px;
  }

  .loadership_PLFNR div {
    position: absolute;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ffffff;
    top: 0px;
    animation-timing-function: cubic-bezier(0, 1, 1, 0);
  }

  .loadership_PLFNR div:nth-child(1) {
    left: 0px;
    animation: loadership_PLFNR_scale_up 0.6s infinite;
  }

  .loadership_PLFNR div:nth-child(2) {
    left: 0px;
    animation: loadership_PLFNR_translate 0.6s infinite;
  }

  .loadership_PLFNR div:nth-child(3) {
    left: 11px;
    animation: loadership_PLFNR_translate 0.6s infinite;
  }

  .loadership_PLFNR div:nth-child(4) {
    left: 22px;
    animation: loadership_PLFNR_scale_down 0.6s infinite;
  }

  @keyframes loadership_PLFNR_scale_up {
    0% {
      transform: scale(0);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes loadership_PLFNR_scale_down {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(0);
    }
  }

  @keyframes loadership_PLFNR_translate {
    0% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(11px, 0);
    }
  }
</style>
