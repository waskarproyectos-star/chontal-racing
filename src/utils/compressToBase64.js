// Comprime una imagen File/Blob a base64 JPEG super comprimido
// maxWidth: ancho máximo en px (default 800)
// quality: calidad JPEG 0-1 (default 0.4 = super comprimido)
export async function compressToBase64(file, maxWidth = 800, quality = 0.4) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) {
                    h = (h * maxWidth) / w;
                    w = maxWidth;
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const base64 = canvas.toDataURL('image/jpeg', quality);
                resolve(base64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Comprime múltiples archivos a base64
export async function compressMultiple(files, maxWidth = 800, quality = 0.4) {
    const promises = Array.from(files).map(f => compressToBase64(f, maxWidth, quality));
    return Promise.all(promises);
}
