export function copyToClipboardSync(textToCopy: string): boolean {
  if (!textToCopy) return false;
  let copied = false;

  // 1. Synchronous execCommand copy (guaranteed user gesture execution)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '-9999px';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 999999);

    copied = document.execCommand('copy');
    document.body.removeChild(textArea);
  } catch (err) {
    console.warn('[Clipboard] execCommand failed:', err);
  }

  // 2. Navigator Clipboard API (if available)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      navigator.clipboard.writeText(textToCopy).then(
        () => {},
        (err) => console.warn('[Clipboard] writeText error:', err)
      );
      copied = true;
    } catch (err) {
      console.warn('[Clipboard] navigator.clipboard error:', err);
    }
  }

  return copied;
}

export async function copyToClipboard(textToCopy: string): Promise<boolean> {
  const syncSuccess = copyToClipboardSync(textToCopy);
  if (syncSuccess) return true;

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    } catch (err) {
      console.warn('[Clipboard] async writeText error:', err);
    }
  }

  return false;
}
