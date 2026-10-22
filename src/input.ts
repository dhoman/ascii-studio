// Vite serves these local assets in development and emits them for production.
const images = import.meta.glob('../references/*.jpg', { eager: true, query: '?url', import: 'default' });
export const sources = Object.entries(images).map(([path, url]) => ({
  name: path.split('/').pop()!, url: url as string,
})).sort((a, b) => a.name.localeCompare(b.name));

export async function loadStill(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}
