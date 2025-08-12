<script lang="ts">
  import * as Tabs from '$lib/components/ui/tabs/index';
  import { Button } from '$lib/components/ui/button/index';
  import { Textarea } from '$lib/components/ui/textarea/index';
  import { Separator } from '$lib/components/ui/separator/index';
  import { marked } from 'marked';
  import Icon from '@iconify/svelte';

  let {
    value = $bindable(''),
    height = '160px',
    minHeight = '120px',
    maxHeight = '200px',
    ...props
  }: {
    value: string;
    height?: string;
    minHeight?: string;
    maxHeight?: string;
    [key: string]: any;
  } = $props();

  let currentTab = $state('edit');
  let textareaElement: HTMLTextAreaElement | null = $state(null);
  
  let parsedMarkdown = $derived(
    (() => {
      try {
        return marked(value);
      } catch {
        return '<p>Invalid markdown</p>';
      }
    })()
  );

  function insertMarkdown(before: string, after: string = '') {
    // Switch to edit tab if not already there
    currentTab = 'edit';
    
    // Wait for tab switch to complete
    requestAnimationFrame(() => {
      if (!textareaElement) return;
      
      const start = textareaElement.selectionStart;
      const end = textareaElement.selectionEnd;
      const selectedText = value.slice(start, end);
      
      const replacement = before + selectedText + after;
      const newValue = value.slice(0, start) + replacement + value.slice(end);
      
      value = newValue;
      
      // Set cursor position after the insertion
      requestAnimationFrame(() => {
        if (textareaElement) {
          const newCursorPos = start + before.length + selectedText.length;
          textareaElement.focus();
          textareaElement.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    });
  }

  function insertBold() {
    insertMarkdown('**', '**');
  }

  function insertItalic() {
    insertMarkdown('*', '*');
  }

  function insertUnorderedList() {
    const start = textareaElement.selectionStart;
    const lines = value.slice(0, start).split('\n');
    const isNewLine = lines[lines.length - 1] === '';
    
    if (isNewLine) {
      insertMarkdown('- ');
    } else {
      insertMarkdown('\n- ');
    }
  }

  function insertOrderedList() {
    const start = textareaElement.selectionStart;
    const lines = value.slice(0, start).split('\n');
    const isNewLine = lines[lines.length - 1] === '';
    
    if (isNewLine) {
      insertMarkdown('1. ');
    } else {
      insertMarkdown('\n1. ');
    }
  }

  function insertLink() {
    const start = textareaElement.selectionStart;
    const end = textareaElement.selectionEnd;
    const selectedText = value.slice(start, end);
    
    if (selectedText) {
      insertMarkdown('[', '](url)');
    } else {
      insertMarkdown('[text](', ')');
    }
  }

  function insertHeading() {
    const start = textareaElement?.selectionStart ?? 0;
    const lines = value.slice(0, start).split('\n');
    const currentLine = lines[lines.length - 1];
    
    // Check if current line already has heading
    const headingMatch = currentLine.match(/^(#{1,6})\s/);
    
    if (headingMatch) {
      // Cycle through heading levels (H1 -> H2 -> ... -> H6 -> remove heading -> H1)
      const currentLevel = headingMatch[1].length;
      const newLevel = currentLevel >= 6 ? 0 : currentLevel + 1;
      
      if (newLevel === 0) {
        // Remove heading
        const newValue = currentLine.replace(/^#{1,6}\s/, '');
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        value = value.slice(0, lineStart) + newValue + value.slice(start);
      } else {
        // Change heading level
        const newHeading = '#'.repeat(newLevel) + ' ';
        const newValue = currentLine.replace(/^#{1,6}\s/, newHeading);
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        value = value.slice(0, lineStart) + newValue + value.slice(start);
      }
    } else {
      // Add H1 heading to current line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const isNewLine = currentLine === '';
      
      if (isNewLine) {
        insertMarkdown('# ');
      } else {
        value = value.slice(0, lineStart) + '# ' + currentLine + value.slice(start);
      }
    }
  }

  function insertStrikethrough() {
    insertMarkdown('~~', '~~');
  }

  function insertTaskList() {
    const start = textareaElement?.selectionStart ?? 0;
    const lines = value.slice(0, start).split('\n');
    const isNewLine = lines[lines.length - 1] === '';
    
    if (isNewLine) {
      insertMarkdown('- [ ] ');
    } else {
      insertMarkdown('\n- [ ] ');
    }
  }

  function insertCode() {
    const start = textareaElement?.selectionStart ?? 0;
    const end = textareaElement?.selectionEnd ?? 0;
    const selectedText = value.slice(start, end);
    
    if (selectedText) {
      insertMarkdown('`', '`');
    } else {
      insertMarkdown('`code`');
    }
  }
</script>

<div class="border border-input rounded-md bg-background shadow-xs transition-all focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
  <Tabs.Root bind:value={currentTab} class="w-full !gap-0">
    <div class="flex items-center justify-between border-b border-input px-2 py-1 bg-muted/30 rounded-t-md">
      <Tabs.List class="h-7 p-0 bg-transparent">
        <Tabs.Trigger value="edit" class="h-6 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Edit</Tabs.Trigger>
        <Tabs.Trigger value="preview" class="h-6 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Preview</Tabs.Trigger>
      </Tabs.List>
      
      <div class="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-background/80" onclick={insertHeading} type="button" title="Heading">
          <Icon icon="material-symbols:title" width="12" height="12" />
        </Button>
        <div class="w-px h-4 bg-border mx-0.5"></div>
        <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-background/80" onclick={insertBold} type="button" title="Bold">
          <Icon icon="material-symbols:format-bold" width="12" height="12" />
        </Button>
        <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-background/80" onclick={insertItalic} type="button" title="Italic">
          <Icon icon="material-symbols:format-italic" width="12" height="12" />
        </Button>
        <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-background/80" onclick={insertStrikethrough} type="button" title="Strikethrough">
          <Icon icon="material-symbols:format-strikethrough" width="12" height="12" />
        </Button>
        <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-background/80" onclick={insertCode} type="button" title="Inline Code">
          <Icon icon="material-symbols:code" width="12" height="12" />
        </Button>
        <div class="w-px h-4 bg-border mx-0.5"></div>
        <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-background/80" onclick={insertUnorderedList} type="button" title="Bullet List">
          <Icon icon="material-symbols:format-list-bulleted" width="12" height="12" />
        </Button>
        <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-background/80" onclick={insertOrderedList} type="button" title="Numbered List">
          <Icon icon="material-symbols:format-list-numbered" width="12" height="12" />
        </Button>
        <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-background/80" onclick={insertTaskList} type="button" title="Task List">
          <Icon icon="material-symbols:task-alt" width="12" height="12" />
        </Button>
        <div class="w-px h-4 bg-border mx-0.5"></div>
        <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-background/80" onclick={insertLink} type="button" title="Link">
          <Icon icon="material-symbols:link" width="12" height="12" />
        </Button>
      </div>
    </div>
    
    <Tabs.Content value="edit" class="mt-0 p-0">
      <Textarea
        bind:ref={textareaElement}
        bind:value
        class="resize-none border-0 rounded-none rounded-b-md focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
        style="height: {height}; min-height: {minHeight}; max-height: {maxHeight};"
        {...props}
      />
    </Tabs.Content>
    
    <Tabs.Content value="preview" class="mt-0 p-0">
      <div 
        class="prose prose-sm max-w-none px-3 pb-3 pt-2 overflow-y-auto dark:prose-invert rounded-b-md"
        style="height: {height}; min-height: {minHeight}; max-height: {maxHeight};"
      >
        {@html parsedMarkdown}
      </div>
    </Tabs.Content>
  </Tabs.Root>
</div>