// Lets upload dialogs accept JSON pasted from the clipboard: while the dialog is
// open, a paste creates a File and submits the form with it via applyTo(formData).
export function createPasteUpload(params: {
  isOpen: () => boolean;
  submit: () => void;
  reset: () => void;
}) {
  let pastedFile: File | null = null;

  function handlePaste(event: ClipboardEvent) {
    const clipboardData =
      event.clipboardData?.getData('application/json') ||
      event.clipboardData?.getData('text/plain');
    if (!clipboardData) return;
    try {
      const jsonData = JSON.parse(clipboardData);
      pastedFile = new File([JSON.stringify(jsonData)], 'pasted-data.json', {
        type: 'application/json'
      });
      params.submit();
      pastedFile = null;
    } catch {
      alert('Pasted data is not valid JSON.');
    }
  }

  $effect(() => {
    if (!params.isOpen()) return;
    params.reset();
    pastedFile = null;
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  });

  return {
    applyTo(formData: FormData) {
      if (pastedFile != null) {
        formData.set('file', pastedFile);
      }
    }
  };
}
