export function compressImage(file: File, maxSizeMB = 0.1, maxWidth = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth * height) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.8;
        // Force webp or jpeg for compression to actually work (PNG ignores quality parameter)
        let mimeType = (file.type === 'image/png' || file.type === 'image/webp') ? 'image/webp' : 'image/jpeg';
        let dataUrl = canvas.toDataURL(mimeType, quality);

        // rough estimation to keep under maxSizeMB
        // dataUrl.length gives roughly the number of bytes (since it's base64, it's slightly larger than actual file bytes, so it's a safe upper bound)
        while (dataUrl.length / 1024 / 1024 > maxSizeMB && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL(mimeType, Math.max(0.1, quality));
        }

        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
