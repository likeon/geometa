<script lang="ts">
  import Icon from '@iconify/svelte';

  let {
    variant,
    title,
    description
  }: {
    variant: 'info' | 'warning' | 'destructive';
    title: string;
    description: string;
  } = $props();

  const styles = {
    info: {
      box: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30',
      icon: 'material-symbols:info-rounded',
      iconClass: 'text-blue-600 dark:text-blue-400',
      titleClass: 'text-blue-800 dark:text-blue-200'
    },
    warning: {
      box: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30',
      icon: 'material-symbols:warning-rounded',
      iconClass: 'text-orange-600 dark:text-orange-400',
      titleClass: 'text-orange-800 dark:text-orange-200'
    },
    destructive: {
      box: 'bg-destructive/10 border-destructive/20',
      icon: 'material-symbols:warning-rounded',
      iconClass: 'text-destructive',
      titleClass: 'text-destructive'
    }
  };
  const style = $derived(styles[variant]);
</script>

<div class="rounded-md border p-3 {style.box}">
  <div class="flex items-start space-x-2">
    <Icon icon={style.icon} width="1rem" height="1rem" class="mt-0.5 {style.iconClass}" />
    <div class="space-y-1">
      <p class="text-sm font-medium {style.titleClass}">{title}</p>
      <p class="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
</div>
