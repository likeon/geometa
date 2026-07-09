import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type PartialKeys,
  type VirtualizerOptions
} from '@tanstack/virtual-core';

export * from '@tanstack/virtual-core';

function createVirtualizerBase<
  TScrollElement extends Element | Window,
  TItemElement extends Element
>(
  options: VirtualizerOptions<TScrollElement, TItemElement>
): Virtualizer<TScrollElement, TItemElement> {
  const resolvedOptions = { ...options };
  const instance = new Virtualizer(resolvedOptions);

  let virtualItems = $state(instance.getVirtualItems());
  let totalSize = $state(instance.getTotalSize());

  const handler = {
    get(
      target: Virtualizer<TScrollElement, TItemElement>,
      prop: keyof Virtualizer<TScrollElement, TItemElement>
    ) {
      if (prop === 'getVirtualItems') return () => virtualItems;
      if (prop === 'getTotalSize') return () => totalSize;
      return Reflect.get(target, prop);
    }
  };

  const virtualizer = new Proxy(instance, handler);
  virtualizer.setOptions(resolvedOptions);

  $effect(() => {
    const cleanup = virtualizer._didMount();
    virtualizer._willUpdate();
    return cleanup;
  });

  $effect(() => {
    virtualizer.setOptions({
      ...resolvedOptions,
      ...options,
      onChange: (instance, sync) => {
        instance._willUpdate();
        virtualItems = instance.getVirtualItems();
        totalSize = instance.getTotalSize();
        options.onChange?.(instance, sync);
      }
    });
    virtualizer.measure();
  });

  return virtualizer;
}

export function createVirtualizer<TScrollElement extends Element, TItemElement extends Element>(
  options: PartialKeys<
    VirtualizerOptions<TScrollElement, TItemElement>,
    'observeElementRect' | 'observeElementOffset' | 'scrollToFn'
  >
): Virtualizer<TScrollElement, TItemElement> {
  return createVirtualizerBase<TScrollElement, TItemElement>({
    observeElementRect: observeElementRect,
    observeElementOffset: observeElementOffset,
    scrollToFn: elementScroll,
    ...options
  });
}
