let copyText = (text: string) => {
  if (navigator.clipboard) {
    copyText = (text: string) => navigator.clipboard.writeText(text);
  } else {
    copyText = (text: string) => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = text;
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
  copyText(text)
}
export {
  copyText
}