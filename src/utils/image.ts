export function resolveImageSrc(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `data:image/jpeg;base64,${value}`;
}


