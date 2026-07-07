export const calculateAge = (birthday?: string, fallbackAge?: number): number | string => {
    if (!birthday) return fallbackAge ?? 'N/A';

    const birthDate = new Date(birthday + 'T00:00:00');
    if (isNaN(birthDate.getTime())) return fallbackAge ?? 'N/A';

    const today = new Date();
    let computedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        computedAge--;
    }

    return computedAge;
};

export const resizeImageToBase64 = (file: File, maxWidth = 180, maxHeight = 180): Promise<string> => {
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

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // 85% quality
                    resolve(dataUrl);
                } else {
                    reject(new Error('Canvas context could not be created'));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
